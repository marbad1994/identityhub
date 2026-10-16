#!/usr/bin/env python3
"""Move the existing IdentityHub deployment to HTTPS without switching Git commits."""
import argparse
import json
import os
from pathlib import Path
import re
import socket
import stat
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

ORIGIN = "https://identityhub.makketing.com"


def command(args, cwd=None, capture=False):
    result = subprocess.run(args, cwd=cwd, check=False, text=True,
                            stdout=subprocess.PIPE if capture else None,
                            stderr=subprocess.PIPE if capture else None)
    if result.returncode != 0:
        raise subprocess.CalledProcessError(result.returncode, args, result.stdout, result.stderr)
    return result.stdout if capture else ""


def service_ready(body):
    """The hub's health route returns {"status": "ok"} after a database check."""
    try:
        payload = json.loads(body)
    except ValueError:
        return False
    return payload.get("status") == "ok" or payload.get("ok") is True


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, new_url):
        return None


def fetch(url):
    try:
        response = urllib.request.build_opener(NoRedirect).open(url, timeout=10)
    except urllib.error.HTTPError as response:
        return response.code, dict(response.headers), response.read()
    with response:
        return response.status, dict(response.headers), response.read()


def has_host(value, host):
    if isinstance(value, dict):
        return host in value.get("host", []) or any(has_host(item, host) for item in value.values())
    return isinstance(value, list) and any(has_host(item, host) for item in value)


def caddy_file(mounts):
    target = Path("/etc/caddy/Caddyfile")
    for mount in sorted(mounts, key=lambda item: len(item["Destination"]), reverse=True):
        try:
            relative = target.relative_to(mount["Destination"])
        except ValueError:
            continue
        return Path(mount["Source"]) / relative
    raise RuntimeError("Caddy's mounted configuration file could not be located.")


def updated_env(content, key, value):
    pattern = re.compile(r"^\s*(?:export\s+)?" + re.escape(key) + r"\s*[=:]")
    lines = [line for line in content.splitlines() if not pattern.match(line)]
    return "\n".join(lines) + f"\n{key}={value}\n"


class Migration:
    def __init__(self, hub, social, origin=ORIGIN, caddy="makketing-caddy", backup_root="/var/backups"):
        self.hub, self.social = Path(hub).resolve(), Path(social).resolve()
        parsed = urllib.parse.urlsplit(origin)
        if parsed.scheme != "https" or not parsed.hostname or parsed.path not in ("", "/") or parsed.query or parsed.fragment or parsed.username or parsed.port:
            raise ValueError("Expected an HTTPS origin with no path, credentials, or port.")
        self.origin, self.host, self.caddy = origin.rstrip("/"), parsed.hostname, caddy
        self.patch = Path(__file__).with_name("patches") / "identityhub-domain.patch"
        self.backup_root = Path(backup_root)
        self.backup = None
        self.saved = {}
        self.proxy_changed = self.app_touched = self.api_touched = False
        self.old_image = self.old_tag = None

    def compose(self, directory, *args, capture=False):
        return command(["docker", "compose", *args], cwd=directory, capture=capture)

    def remember(self, path):
        path = Path(path)
        if path in self.saved:
            return
        if self.backup is None:
            self.backup_root.mkdir(parents=True, exist_ok=True)
            self.backup = Path(tempfile.mkdtemp(prefix="identityhub-domain-", dir=self.backup_root))
            os.chmod(self.backup, 0o700)
        if path.exists():
            data, mode = path.read_bytes(), stat.S_IMODE(path.stat().st_mode)
            copy = self.backup / f"{len(self.saved):02d}-{path.name}"
            copy.write_bytes(data)
            os.chmod(copy, 0o600)
        else:
            data, mode, copy = None, None, None
        self.saved[path] = (data, mode, copy)
        manifest = {str(key): str(value[2]) if value[2] else None for key, value in self.saved.items()}
        (self.backup / "manifest.json").write_text(json.dumps(manifest, indent=2))

    def set_origin(self, path, key):
        self.remember(path)
        path.write_text(updated_env(path.read_text(), key, self.origin))
        os.chmod(path, 0o600)

    def wait_health(self):
        deadline = time.monotonic() + 120
        while time.monotonic() < deadline:
            try:
                status, _, body = fetch(self.origin + "/api/health")
                if status == 200 and service_ready(body):
                    return
            except (OSError, ValueError, urllib.error.URLError):
                pass
            time.sleep(2)
        raise RuntimeError("HTTPS health check failed; check Caddy's certificate logs.")

    def verify(self):
        self.wait_health()
        status, _, body = fetch(self.origin + "/login")
        if status != 200 or b"Identity Hub" not in body:
            raise RuntimeError("The HTTPS login page did not load correctly.")
        status, headers, _ = fetch("http://127.0.0.1:8316/login?return_to=%2Fworkspace")
        location = next((value for key, value in headers.items() if key.lower() == "location"), "")
        if status != 302 or location != self.origin + "/login?return_to=%2Fworkspace":
            raise RuntimeError("The old IP login did not redirect to the HTTPS domain.")
        if fetch(self.origin + "/widget.js")[0] != 200:
            raise RuntimeError("The HTTPS sign-in widget was not reachable.")
        # These diagnostic callbacks do not contain usable platform codes.
        for platform in ("twitter", "tiktok"):
            for result in ({"error": "access_denied"}, {"code": "identityhub-domain-check"}):
                query = urllib.parse.urlencode({"state": "ihub_st_domain_check", **result})
                url = f"https://socialpostapi.makketing.com/api/connect/{platform}/callback?{query}"
                status, headers, _ = fetch(url)
                location = next((value for key, value in headers.items() if key.lower() == "location"), "")
                if status not in (302, 303, 307, 308) or location != f"{self.origin}/api/auth/callback/{platform}?{query}":
                    raise RuntimeError(f"{platform} callback did not forward to the HTTPS domain.")

    def migrate(self):
        for path in (self.hub / ".env", self.social / ".env", self.patch):
            if not path.is_file():
                raise RuntimeError(f"Required file is missing: {path}")
        addresses = {entry[4][0] for entry in socket.getaddrinfo(self.host, 443, socket.AF_INET)}
        if "84.247.181.21" not in addresses:
            raise RuntimeError("The new hostname does not resolve to 84.247.181.21 here yet.")
        inspect = json.loads(command(["docker", "inspect", self.caddy], capture=True))[0]
        proxy_file = caddy_file(inspect["Mounts"])
        if not proxy_file.is_file():
            raise RuntimeError("Caddy's mounted configuration is not a regular file.")
        command(["docker", "exec", self.caddy, "caddy", "validate", "--config", "/etc/caddy/Caddyfile"], capture=True)
        adapted = json.loads(command(["docker", "exec", self.caddy, "caddy", "adapt", "--config", "/etc/caddy/Caddyfile"], capture=True))
        upstream = None
        candidates = ["host.docker.internal"]
        candidates += [network.get("Gateway") for network in inspect["NetworkSettings"]["Networks"].values() if network.get("Gateway")]
        for host in dict.fromkeys(candidates):
            address = f"[{host}]" if ":" in host else host
            try:
                body = command(["docker", "exec", self.caddy, "wget", "-q", "-T", "5", "-O", "-", f"http://{address}:8316/api/health"], capture=True)
                if service_ready(body):
                    upstream = address + ":8316"
                    break
            except (subprocess.CalledProcessError, ValueError):
                pass
        if not upstream:
            raise RuntimeError("Caddy cannot reach IdentityHub on port 8316; no files changed.")
        self.compose(self.social, "exec", "-T", "--index", "1", "api", "python", "-c", "from app.api.v1.connect import _identity_hub_forward", capture=True)
        container = self.compose(self.hub, "ps", "-q", "app", capture=True).strip()
        app = json.loads(command(["docker", "inspect", container], capture=True))[0]
        self.old_image, self.old_tag = app["Image"], app["Config"]["Image"]

        git = ["git", "-C", str(self.hub), "apply"]
        try:
            command([*git, "--reverse", "--check", str(self.patch)], capture=True)
        except subprocess.CalledProcessError:
            command([*git, "--check", str(self.patch)], capture=True)
            for relative in re.findall(r"^\+\+\+ b/(.+)$", self.patch.read_text(), re.MULTILINE):
                path = (self.hub / relative).resolve()
                if self.hub not in path.parents:
                    raise RuntimeError("Source patch path is outside the hub checkout.")
                self.remember(path)
            command([*git, str(self.patch)])

        print("Building IdentityHub with HTTPS login and widget support...", flush=True)
        self.compose(self.hub, "build", "app")
        if not has_host(adapted, self.host):
            self.remember(proxy_file)
            with proxy_file.open("a") as output:
                output.write(f"\n# IdentityHub\n{self.host} {{\n    reverse_proxy {upstream}\n}}\n")
        # Reload also retries provisioning when the route existed before DNS did.
        self.proxy_changed = True
        command(["docker", "exec", self.caddy, "caddy", "validate", "--config", "/etc/caddy/Caddyfile"], capture=True)
        command(["docker", "exec", self.caddy, "caddy", "reload", "--config", "/etc/caddy/Caddyfile"], capture=True)
        print("Waiting for the HTTPS certificate and health check...", flush=True)
        self.wait_health()

        self.set_origin(self.hub / ".env", "APP_ORIGIN")
        self.set_origin(self.social / ".env", "IDENTITY_HUB_URL")
        self.app_touched = True
        self.compose(self.hub, "up", "-d", "--no-build", "--no-deps", "--force-recreate", "app")
        self.api_touched = True
        self.compose(self.social, "up", "-d", "--no-build", "--no-deps", "--force-recreate", "api")
        self.verify()
        print("Domain migration verified:", self.origin + "/login")
        print("SMTP settings, credentials, accounts, and provider callback registrations were preserved.")
        print("Backups:", self.backup or "No file changes were required")
        print("Sign in again at the HTTPS address. Use the newly generated HTTPS widget snippets.")

    def rollback(self):
        for path, (data, mode, _) in reversed(list(self.saved.items())):
            if data is None:
                path.unlink(missing_ok=True)
            else:
                path.write_bytes(data)
                os.chmod(path, mode)
        actions = []
        if self.old_image and self.old_tag:
            actions.append((["docker", "tag", self.old_image, self.old_tag], None))
        if self.app_touched:
            actions.append((["docker", "compose", "up", "-d", "--no-build", "--no-deps", "--force-recreate", "app"], self.hub))
        if self.api_touched:
            actions.append((["docker", "compose", "up", "-d", "--no-build", "--no-deps", "--force-recreate", "api"], self.social))
        if self.proxy_changed:
            actions.append((["docker", "exec", self.caddy, "caddy", "reload", "--config", "/etc/caddy/Caddyfile"], None))
        for args, cwd in actions:
            try:
                command(args, cwd=cwd, capture=True)
            except subprocess.CalledProcessError:
                print("Rollback needs attention:", " ".join(args))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--hub-dir", default="/opt/identityhub")
    parser.add_argument("--social-dir")
    parser.add_argument("--origin", default=ORIGIN)
    args = parser.parse_args()
    social = args.social_dir or next((path for path in ("/opt/SocialPostAPI", "/opt/socialpostapi") if (Path(path) / ".env").is_file()), None)
    if not social:
        raise SystemExit("SocialPostAPI's .env was not found.")
    migration = Migration(args.hub_dir, social, args.origin)
    try:
        migration.migrate()
    except (Exception, KeyboardInterrupt) as error:
        migration.rollback()
        detail = getattr(error, "stderr", None)
        extra = ""
        if isinstance(detail, str) and detail.strip():
            extra = " " + detail.strip().splitlines()[-1][:300]
        raise SystemExit(
            f"Migration stopped: {error}.{extra} Original configuration restored; "
            "review any rollback messages above."
        )


if __name__ == "__main__":
    main()
