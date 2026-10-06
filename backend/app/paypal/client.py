"""Thin async PayPal REST client: bearer auth, retries on 429/5xx, idempotency header."""
import uuid

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import Settings, get_settings
from app.paypal.auth import TokenProvider
from app.paypal.errors import PayPalError


class _Retryable(Exception):
    pass


class PayPalClient:
    def __init__(self, settings: Settings | None = None, tokens: TokenProvider | None = None):
        self.settings = settings or get_settings()
        self.tokens = tokens or TokenProvider(self.settings)

    @retry(
        retry=retry_if_exception_type(_Retryable),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=0.5, max=4),
        reraise=True,
    )
    async def request(
        self,
        method: str,
        path: str,
        *,
        json: dict | None = None,
        params: dict | None = None,
        idempotency_key: str | None = None,
    ) -> dict:
        token = await self.tokens.get_token()
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        if method.upper() in {"POST", "PATCH", "PUT"}:
            # Same key on retries => PayPal treats the write as idempotent (verify per endpoint in docs)
            headers["PayPal-Request-Id"] = idempotency_key or str(uuid.uuid4())
        async with httpx.AsyncClient(base_url=self.settings.paypal_base_url, timeout=30) as client:
            resp = await client.request(method, path, json=json, params=params, headers=headers)
        if resp.status_code in (429, 500, 502, 503, 504):
            raise _Retryable(f"PayPal transient error {resp.status_code}")
        if resp.status_code >= 400:
            try:
                details = resp.json()
            except ValueError:
                details = {"body": resp.text}
            raise PayPalError(f"PayPal API error {resp.status_code}", resp.status_code, details)
        return resp.json() if resp.content else {}
