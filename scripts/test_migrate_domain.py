import importlib.util
import subprocess
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("domain_migration", Path(__file__).with_name("migrate-domain.py"))
migration = importlib.util.module_from_spec(spec)
spec.loader.exec_module(migration)


class DomainMigrationTest(unittest.TestCase):
    def test_health_accepts_the_hub_payload_and_rejects_a_database_failure(self):
        self.assertTrue(migration.service_ready(b'{"status":"ok"}'))
        self.assertTrue(migration.service_ready('{"ok": true}'))
        self.assertFalse(migration.service_ready(b'{"status":"database_unavailable"}'))
        self.assertFalse(migration.service_ready(b"not-json"))

    def test_origin_replacement_keeps_credentials_and_drops_every_previous_value(self):
        original = (
            "# keep\nTOKEN_ENCRYPTION_KEY=existing-key\n"
            "APP_ORIGIN=http://84.247.181.21:8316\n"
            "export APP_ORIGIN = https://old.example\n"
            "SMTP_PASSWORD='kept'\n"
        )
        result = migration.updated_env(original, "APP_ORIGIN", "https://identityhub.makketing.com")
        self.assertIn("TOKEN_ENCRYPTION_KEY=existing-key\n", result)
        self.assertIn("SMTP_PASSWORD='kept'\n", result)
        self.assertEqual(result.count("APP_ORIGIN="), 1)
        self.assertTrue(result.endswith("APP_ORIGIN=https://identityhub.makketing.com\n"))
        self.assertNotIn("84.247.181.21", result)
        self.assertNotIn("old.example", result)

    def test_only_a_bare_https_origin_is_accepted(self):
        for origin in (
            "http://identityhub.makketing.com",
            "https://identityhub.makketing.com/login",
            "https://user:pass@identityhub.makketing.com",
            "https://identityhub.makketing.com:8443",
        ):
            with self.assertRaises(ValueError):
                migration.Migration("hub", "social", origin)

    def test_caddy_config_search_finds_a_nested_host(self):
        adapted = {"apps": {"http": {"servers": {"srv0": {"routes": [{"match": [{"host": ["identityhub.makketing.com"]}]}]}}}}}
        self.assertTrue(migration.has_host(adapted, "identityhub.makketing.com"))
        self.assertFalse(migration.has_host(adapted, "other.example"))

    def test_domain_patch_matches_the_working_tree(self):
        patch = ROOT / "scripts" / "patches" / "identityhub-domain.patch"
        self.assertTrue(patch.is_file(), "scripts/patches/identityhub-domain.patch is missing")
        subprocess.run(
            ["git", "apply", "--reverse", "--check", str(patch)],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
        )


if __name__ == "__main__":
    unittest.main()
