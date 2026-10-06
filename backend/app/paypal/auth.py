"""OAuth2 client-credentials token cache for the PayPal REST API (sandbox)."""
import time

import httpx

from app.config import Settings, get_settings
from app.paypal.errors import PayPalAuthError


class TokenProvider:
    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()
        self._token: str | None = None
        self._expires_at: float = 0.0

    async def get_token(self) -> str:
        # refresh 60s before expiry
        if self._token and time.time() < self._expires_at - 60:
            return self._token
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{self.settings.paypal_base_url}/v1/oauth2/token",
                auth=(self.settings.paypal_client_id, self.settings.paypal_client_secret),
                data={"grant_type": "client_credentials"},
                headers={"Accept": "application/json"},
            )
        if resp.status_code != 200:
            raise PayPalAuthError("Failed to obtain PayPal token", resp.status_code, {"body": resp.text})
        data = resp.json()
        self._token = data["access_token"]
        self._expires_at = time.time() + int(data.get("expires_in", 300))
        return self._token
