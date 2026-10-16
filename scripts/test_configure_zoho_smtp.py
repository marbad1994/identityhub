import importlib.util
from pathlib import Path
import smtplib
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("smtp_setup", Path(__file__).with_name("configure-zoho-smtp.py"))
setup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(setup)


class SmtpSetupTest(unittest.TestCase):
    def test_preserves_existing_credentials_and_origin_and_backs_up_original(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / ".env"
            original = ("# Keep production credentials\nTOKEN_ENCRYPTION_KEY=existing-key\n"
                        "POSTGRES_PASSWORD=existing-db-password\n"
                        "APP_ORIGIN=http://84.247.181.21:8316\nSMTP_HOST=\n"
                        "export SMTP_HOST = old.invalid\nSMTP_PASSWORD='old-password'\n")
            path.write_text(original)
            calls = []
            backup = setup.configure(path, "Test$Password'123", calls.append)
            self.assertEqual(calls, ["Test$Password'123"])
            self.assertEqual(Path(backup).read_text(), original)
            result = path.read_text()
            self.assertIn("TOKEN_ENCRYPTION_KEY=existing-key\n", result)
            self.assertIn("POSTGRES_PASSWORD=existing-db-password\n", result)
            self.assertIn("APP_ORIGIN=http://84.247.181.21:8316\n", result)
            self.assertEqual(result.count("SMTP_HOST="), 1)
            self.assertNotIn("old.invalid", result)
            self.assertNotIn("old-password", result)
            self.assertIn("SMTP_PASSWORD='Test$Password\\'123'\n", result)

    def test_authentication_failure_changes_no_files(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / ".env"
            path.write_text("APP_ORIGIN=http://84.247.181.21:8316\n")
            original = path.read_bytes()

            def rejected(_):
                raise smtplib.SMTPAuthenticationError(535, b"rejected")

            with self.assertRaises(smtplib.SMTPAuthenticationError):
                setup.configure(path, "TestPassword", rejected)
            self.assertEqual(path.read_bytes(), original)
            self.assertEqual(list(Path(directory).iterdir()), [path])

    def test_invalid_password_does_not_attempt_authentication(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / ".env"
            path.write_text("APP_ORIGIN=http://84.247.181.21:8316\n")
            calls = []
            for password in ("", "password\n", "password\0"):
                with self.assertRaises(ValueError):
                    setup.configure(path, password, calls.append)
            self.assertEqual(calls, [])


if __name__ == "__main__":
    unittest.main()
