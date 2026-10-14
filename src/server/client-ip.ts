import { isIP } from "node:net";

/** Private and loopback ranges: the reverse proxy reaches the hub from one of these. */
const DEFAULT_TRUSTED = [
  "127.0.0.0/8",
  "10.0.0.0/8",
  "172.16.0.0/12",
  "192.168.0.0/16",
  "::1/128",
  "fc00::/7",
];

function toBigInt(ip: string): { value: bigint; bits: number } | null {
  const plain = ip.startsWith("::ffff:") && isIP(ip.slice(7)) === 4 ? ip.slice(7) : ip;
  if (isIP(plain) === 4) {
    return {
      value: plain.split(".").reduce((acc, part) => (acc << 8n) | BigInt(Number(part)), 0n),
      bits: 32,
    };
  }
  if (isIP(plain) === 6) {
    const [head, tail = ""] = plain.split("::");
    const left = head ? head.split(":") : [];
    const right = tail ? tail.split(":") : [];
    const groups = plain.includes("::")
      ? [...left, ...Array(8 - left.length - right.length).fill("0"), ...right]
      : left;
    return {
      value: groups.reduce((acc, group) => (acc << 16n) | BigInt(parseInt(group || "0", 16)), 0n),
      bits: 128,
    };
  }
  return null;
}

function inCidr(ip: string, cidr: string): boolean {
  const [range, prefixText] = cidr.split("/");
  const address = toBigInt(ip);
  const base = toBigInt(range);
  if (!address || !base || address.bits !== base.bits) return false;
  const prefix = Number(prefixText ?? address.bits);
  const shift = BigInt(address.bits - prefix);
  return address.value >> shift === base.value >> shift;
}

function trusted(ip: string): boolean {
  const list =
    process.env.TRUSTED_PROXIES?.trim()
      ?.split(",")
      .map((value) => value.trim())
      .filter(Boolean) ?? DEFAULT_TRUSTED;
  return list.some((cidr) =>
    inCidr(ip, cidr.includes("/") ? cidr : `${cidr}/${isIP(cidr) === 6 ? 128 : 32}`),
  );
}

/**
 * The client's IP. X-Forwarded-For is only believed when the direct peer is a
 * trusted proxy, and then the right-most untrusted entry wins, so a client
 * that connects straight to the public port cannot spoof its address.
 */
export function clientIp(peer: string | undefined, forwardedFor: string | null): string {
  const direct = peer ?? "unknown";
  if (!trusted(direct) || !forwardedFor) return direct;
  const hops = forwardedFor
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  for (let index = hops.length - 1; index >= 0; index -= 1) {
    if (!trusted(hops[index])) return hops[index];
  }
  return hops[0] ?? direct;
}
