import "./globals.css";
import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";

export const metadata = {
  title: "DisputeShield — AI Dispute Agent",
  description: "AI agent that helps small PayPal sellers win disputes and know when to refund.",
  keywords: ["PayPal disputes", "dispute management", "AI agent", "seller protection"],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <Sidebar />
          <div className="main-content">{children}</div>
        </div>
      </body>
    </html>
  );
}
