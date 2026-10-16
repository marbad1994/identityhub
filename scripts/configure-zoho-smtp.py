#!/usr/bin/env python3
"""Configure IdentityHub's existing Zoho EU mailbox without exposing its password."""
import getpass
import os
from pathlib import Path
import re
import shutil
import smtplib
import ssl
import tempfile
import warnings

HOST = "smtppro.zoho.eu"
MAILBOX = "admin@makketing.com"


def verify_smtp(password):
    # Authenticate only: this does not send an email.
    with smtplib.SMTP_SSL(HOST, 465, context=ssl.create_default_context(), timeout=20) as smtp:
        smtp.login(MAILBOX, password)


def configure(path, password, verify=verify_smtp):
    path = Path(path)
    original = path.read_text()
    if not password or any(char in password for char in "\r\n\0"):
        raise ValueError("Enter the Zoho app password without line breaks.")
    verify(password)
    values = dict(SMTP_HOST=HOST, SMTP_PORT="465", SMTP_USER=MAILBOX,
                  SMTP_PASSWORD=password, SMTP_FROM_EMAIL=MAILBOX, SMTP_USE_TLS="true")
    pattern = re.compile(r"^\s*(?:export\s+)?(?:" + "|".join(values) + r")\s*[=:]")
    lines = [line for line in original.splitlines() if not pattern.match(line)]
    # Compose uses single-quoted values literally, including dollar signs.
    for key, value in values.items():
        lines.append(key + "='" + value.replace("'", "\\'") + "'")
    descriptor, backup = tempfile.mkstemp(prefix=path.name + ".before-smtp-", dir=path.parent)
    os.close(descriptor)
    shutil.copyfile(path, backup)
    os.chmod(backup, 0o600)
    descriptor, temporary = tempfile.mkstemp(prefix=path.name + ".smtp-", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", newline="\n") as output:
            output.write("\n".join(lines) + "\n")
        os.chmod(temporary, 0o600)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    return backup


if __name__ == "__main__":
    try:
        warnings.simplefilter("error", getpass.GetPassWarning)
        password = getpass.getpass("Zoho app password (hidden): ")
        backup = configure(Path("/opt/identityhub/.env"), password)
        print("SMTP authentication passed. SMTP settings saved; backup:", backup)
    except (EOFError, KeyboardInterrupt):
        raise SystemExit("Cancelled; SMTP settings were not saved.")
    except Exception as error:
        # SMTP response text can contain account details; report only type/code.
        code = getattr(error, "smtp_code", None)
        raise SystemExit(f"SMTP setup failed ({type(error).__name__}" +
                         (f", code {code}" if code else "") + "). Application was not restarted.")
