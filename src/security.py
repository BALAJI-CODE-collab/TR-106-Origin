from __future__ import annotations

import base64
import hashlib
import os

try:
    from cryptography.fernet import Fernet, InvalidToken
except Exception:  # pragma: no cover
    Fernet = None  # type: ignore[assignment]
    InvalidToken = Exception  # type: ignore[assignment]


class DataProtector:
    """Encrypts/decrypts sensitive text with a key from environment."""

    _PREFIX = "enc::"

    def __init__(self, env_var: str = "CHATBOT_ENCRYPTION_KEY") -> None:
        self._fernet = None
        raw = os.getenv(env_var, "").strip()
        if not raw or Fernet is None:
            return

        # Derive a stable Fernet key from any passphrase-like input.
        digest = hashlib.sha256(raw.encode("utf-8")).digest()
        key = base64.urlsafe_b64encode(digest)
        self._fernet = Fernet(key)

    @property
    def enabled(self) -> bool:
        return self._fernet is not None

    def encrypt_text(self, text: str) -> str:
        if not self._fernet:
            return text
        token = self._fernet.encrypt(text.encode("utf-8")).decode("utf-8")
        return f"{self._PREFIX}{token}"

    def decrypt_text(self, value: str) -> str:
        if not value.startswith(self._PREFIX):
            return value
        if not self._fernet:
            return value
        token = value[len(self._PREFIX) :]
        try:
            return self._fernet.decrypt(token.encode("utf-8")).decode("utf-8")
        except InvalidToken:
            return value
