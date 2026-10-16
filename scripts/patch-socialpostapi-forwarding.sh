#!/usr/bin/env bash
# Apply only the forwarding changes from SocialPostAPI commit 4257beb, keeping server edits.
set -euo pipefail
SPA_DIR="${1:?usage: patch-socialpostapi-forwarding.sh /path/to/SocialPostAPI}"
UPSTREAM_PATCH="$(cd "$(dirname "$0")" && pwd)/patches/socialpostapi-forwarding.patch"

if grep -q 'def _identity_hub_forward' "$SPA_DIR/app/api/v1/connect.py" &&
  grep -q 'IDENTITY_HUB_URL:' "$SPA_DIR/app/config.py"; then
  echo "SocialPostAPI's source already includes callback forwarding."
  exit 0
fi
command -v python3 >/dev/null || { echo "python3 is required to validate the patch." >&2; exit 1; }
PATCH_FILE="$(mktemp)"
trap 'rm -f "$PATCH_FILE"' EXIT
# Preserve the server's extended URL imports and custom ConnectStartResponse.
# Only unchanged context lines are adapted; the upstream additions stay intact.
python3 - "$SPA_DIR/app/api/v1/connect.py" "$UPSTREAM_PATCH" "$PATCH_FILE" <<'PY'
from pathlib import Path
import sys

source = Path(sys.argv[1]).read_text().splitlines()
patch = Path(sys.argv[2]).read_text()
for context, prefix in [
    ("from urllib.parse import urlencode", "from urllib.parse import "),
    ('@router.get("/{platform}/start")', '@router.get("/{platform}/start"'),
]:
    matches = [line for line in source if line.startswith(prefix)]
    if len(matches) != 1:
        raise SystemExit(f"Expected one source line starting with {prefix!r}; no files changed.")
    patch = patch.replace("\n " + context + "\n", "\n " + matches[0] + "\n")
Path(sys.argv[3]).write_text(patch, newline="\n")
PY

# git apply checks the complete patch before writing; conflicts leave both files untouched.
git -C "$SPA_DIR" apply --check "$PATCH_FILE"
BACKUP_DIR="$(mktemp -d "$SPA_DIR/.identityhub-forwarding-backup.XXXXXX")"
cp -p "$SPA_DIR/app/api/v1/connect.py" "$BACKUP_DIR/connect.py"
cp -p "$SPA_DIR/app/config.py" "$BACKUP_DIR/config.py"
git -C "$SPA_DIR" apply "$PATCH_FILE"

if ! python3 - "$SPA_DIR/app/api/v1/connect.py" "$SPA_DIR/app/config.py" <<'PY'
import ast
import pathlib
import sys

for name in sys.argv[1:]:
    source = pathlib.Path(name).read_text()
    compile(source, name, "exec")
    tree = ast.parse(source)
    if name.endswith("connect.py"):
        helper = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == "_identity_hub_forward")
        callback = next(node for node in tree.body if isinstance(node, ast.AsyncFunctionDef) and node.name == "connect_callback")
        assert "request" in [arg.arg for arg in callback.args.args]
        assert isinstance(callback.body[0], ast.Assign)
        assert isinstance(callback.body[0].value, ast.Call)
        assert callback.body[0].value.func.id == helper.name
PY
then
  cp -p "$BACKUP_DIR/connect.py" "$SPA_DIR/app/api/v1/connect.py"
  cp -p "$BACKUP_DIR/config.py" "$SPA_DIR/app/config.py"
  echo "Validation failed; the original server files were restored." >&2
  exit 1
fi
echo "Callback forwarding applied. Original server files saved in $BACKUP_DIR"
