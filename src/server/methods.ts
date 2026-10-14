import { PLATFORMS, type PlatformId } from "@/lib/platforms";
import { mailConfigured } from "./email";
import { enabledPlatforms } from "./platforms";

export type SignInMethod = PlatformId | "password";
export type MethodView = { id: SignInMethod; label: string };

const PASSWORD: MethodView = { id: "password", label: "Email" };

/** Every sign-in method this hub can offer right now, in display order. */
export function availableMethods(): MethodView[] {
  const enabled = new Set(enabledPlatforms());
  return [
    ...PLATFORMS.filter((p) => enabled.has(p.id)).map((p) => ({ id: p.id, label: p.label })),
    ...(mailConfigured() ? [PASSWORD] : []),
  ];
}

/** An app's chosen methods that are available; an empty choice means all of them. */
export function effectiveMethods(chosen: string[]): MethodView[] {
  const available = availableMethods();
  if (chosen.length === 0) return available;
  return available.filter((method) => chosen.includes(method.id));
}

export function isMethod(value: string): value is SignInMethod {
  return value === "password" || PLATFORMS.some((p) => p.id === value);
}
