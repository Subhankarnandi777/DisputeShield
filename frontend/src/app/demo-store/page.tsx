"use client";

import { useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { api } from "@/lib/api";

const PRODUCTS = [
  {
    id: "vintage-lens",
    name: "Vintage Camera Lens f/1.4",
    price: "149.99",
    desc: "A classic 50mm portrait lens in pristine condition. Perfect for photography enthusiasts.",
    emoji: "📷",
    category: "Electronics",
    risk: "Medium — digital goods delivery required",
  },
  {
    id: "handmade-pottery",
    name: "Handmade Ceramic Pottery Set",
    price: "89.00",
    desc: "Artisan-crafted earthenware bowl set, kiln-fired and food-safe. Ships fragile.",
    emoji: "🏺",
    category: "Home & Garden",
    risk: "Higher — physical item, breakage risk",
  },
  {
    id: "software-license",
    name: "Lifetime Software License",
    price: "299.00",
    desc: "One-time purchase for full commercial access. Instant digital delivery.",
    emoji: "💻",
    category: "Software",
    risk: "Lower — digital delivery with licence record",
  },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "test";

export default function DemoStore() {
  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0]);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [captureId, setCaptureId] = useState<string | null>(null);

  const createOrder = async () => {
    setMessage({ type: "info", text: "Creating order…" });
    const data = await api.createOrder(selectedProduct.price);
    setMessage({ type: "info", text: `Order created: ${data.order_id}` });
    return data.order_id;
  };

  const onApprove = async (data: { orderID: string }) => {
    setMessage({ type: "info", text: "Capturing payment…" });
    const result = await api.captureOrder(data.orderID);
    setCaptureId(result.capture_id);
    setMessage({
      type: "success",
      text: `✅ Payment captured! Status: ${result.status}. Capture ID: ${result.capture_id ?? "—"}`,
    });
  };

  const onError = (err: unknown) => {
    setMessage({ type: "error", text: `PayPal error: ${String(err)}` });
  };

  return (
    <>
      <div className="page-header gradient-hero">
        <div>
          <h1 className="page-title">🛒 Demo Storefront</h1>
          <div className="page-subtitle">
            Place a real PayPal sandbox order to generate a transaction — then raise a dispute
          </div>
        </div>
        <div
          className="badge badge-warning"
          style={{ fontSize: 12 }}
        >
          🏖 PayPal Sandbox Mode
        </div>
      </div>

      <div className="page-body">
        {/* Explainer */}
        <div className="alert alert-info" style={{ marginBottom: 24 }}>
          <span>ℹ</span>
          <div>
            <strong>How to create a dispute:</strong> Buy a product below using PayPal sandbox credentials,
            then go to your{" "}
            <a
              href="https://www.sandbox.paypal.com/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--brand-light)" }}
            >
              PayPal Sandbox buyer account
            </a>{" "}
            and open a dispute on the transaction. DisputeShield will receive it via webhook and begin analysis.
            Or, use the <strong>Simulate Dispute</strong> button in the sidebar for an instant demo.
          </div>
        </div>

        <div className="grid-2" style={{ gap: 24, alignItems: "start" }}>
          {/* Product selector */}
          <div>
            <div className="section-title" style={{ marginBottom: 16 }}>Choose a Product</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {PRODUCTS.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedProduct(p)}
                  style={{
                    cursor: "pointer",
                    padding: "16px",
                    borderRadius: "var(--radius)",
                    border: `2px solid ${selectedProduct.id === p.id ? "var(--brand)" : "var(--border)"}`,
                    background: selectedProduct.id === p.id ? "var(--bg-card-hover)" : "var(--bg-card)",
                    transition: "all 0.15s ease",
                    display: "flex",
                    gap: 14,
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ fontSize: 32, flexShrink: 0 }}>{p.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 14 }}>{p.name}</div>
                      <div style={{ fontWeight: 800, color: selectedProduct.id === p.id ? "var(--brand-light)" : "var(--text-primary)", fontSize: 16 }}>
                        ${p.price}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>{p.desc}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <span className="tag">{p.category}</span>
                      <span className="tag" style={{ color: "var(--text-muted)" }}>⚠ {p.risk}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Checkout panel */}
          <div>
            <div className="section-title" style={{ marginBottom: 16 }}>Checkout</div>
            <div className="card card-lg">
              {/* Order summary */}
              <div
                style={{
                  padding: "16px",
                  background: "var(--bg-elevated)",
                  borderRadius: "var(--radius-sm)",
                  marginBottom: 20,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
                  {selectedProduct.emoji} {selectedProduct.name}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--text-muted)" }}>Subtotal</span>
                  <span>${selectedProduct.price}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 4 }}>
                  <span style={{ color: "var(--text-muted)" }}>Shipping</span>
                  <span style={{ color: "var(--success)" }}>Free</span>
                </div>
                <div className="divider" />
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 16 }}>
                  <span>Total</span>
                  <span style={{ color: "var(--brand-light)" }}>${selectedProduct.price}</span>
                </div>
              </div>

              {/* PayPal buttons */}
              <PayPalScriptProvider
                options={{
                  clientId: CLIENT_ID,
                  currency: "USD",
                  components: "buttons",
                }}
              >
                <PayPalButtons
                  style={{ layout: "vertical", color: "blue", shape: "rect" }}
                  createOrder={createOrder}
                  onApprove={onApprove}
                  onError={onError}
                  key={selectedProduct.id} // Re-render on product change
                />
              </PayPalScriptProvider>

              {/* Status messages */}
              {message && (
                <div
                  className={`alert alert-${message.type === "success" ? "success" : message.type === "error" ? "danger" : "info"}`}
                  style={{ marginTop: 14 }}
                >
                  <span>{message.type === "success" ? "✅" : message.type === "error" ? "❌" : "ℹ"}</span>
                  <div>{message.text}</div>
                </div>
              )}

              {captureId && (
                <div style={{ marginTop: 14 }}>
                  <div className="alert alert-success">
                    <span>🎉</span>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>Order successfully captured!</div>
                      <div style={{ fontSize: 12 }}>
                        Now go to your{" "}
                        <a
                          href="https://www.sandbox.paypal.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "var(--success)" }}
                        >
                          PayPal sandbox buyer account
                        </a>{" "}
                        and open a dispute to trigger the DisputeShield agent.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sandbox credentials */}
            <div className="card" style={{ marginTop: 16 }}>
              <div className="section-title" style={{ marginBottom: 12 }}>Sandbox Test Credentials</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.8 }}>
                <div>📧 <strong>Buyer email:</strong> sb-buyer@example.com</div>
                <div>🔑 <strong>Password:</strong> (from your PayPal developer dashboard)</div>
                <div style={{ marginTop: 8, color: "var(--text-muted)" }}>
                  Create sandbox accounts at{" "}
                  <a
                    href="https://developer.paypal.com/developer/accounts"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--brand-light)" }}
                  >
                    developer.paypal.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
