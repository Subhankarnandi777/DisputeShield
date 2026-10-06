# Architecture and Verified PayPal API notes

## Verified PayPal API Notes

### Orders v2
- **Create Order**: `POST /v2/checkout/orders`
  - Payload must specify `intent: "CAPTURE"`.
  - `purchase_units` must contain `amount` with `currency_code` and `value`.
  - Response contains the `id` of the created order.
- **Capture Order**: `POST /v2/checkout/orders/{id}/capture`
  - Needs `Content-Type: application/json`.
  - Empty body `{}` is usually fine or not providing one, but `PayPal-Request-Id` is recommended for idempotency.
  - Returns `status: "COMPLETED"` and the `purchase_units[0].payments.captures[0].id` which is the capture ID we'll need for refunds/disputes.
