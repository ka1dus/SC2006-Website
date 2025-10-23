/**
 * DiagBanner Component
 * Diagnostic banner to ensure page is visible and show environment status
 */

"use client";

interface DiagBannerProps {
  apiBase?: string;
  mapbox?: string;
}

export default function DiagBanner({ apiBase, mapbox }: DiagBannerProps) {
  const api = apiBase || "(unset)";
  const mb = mapbox ? "present" : "missing";

  return (
    <div
      style={{
        position: "fixed",
        top: 8,
        right: 8,
        zIndex: 1000,
        padding: "6px 10px",
        background: "rgba(15, 23, 42, 0.95)",
        border: "1px solid rgba(6, 182, 212, 0.4)",
        borderRadius: 8,
        fontSize: 11,
        color: "#e2e8f0",
        backdropFilter: "blur(8px)",
        fontFamily: "monospace",
      }}
    >
      <div style={{ fontWeight: "bold", color: "#06b6d4", marginBottom: 4 }}>
        ✅ Frontend OK
      </div>
      <div>API: {api}</div>
      <div>Mapbox: {mb}</div>
    </div>
  );
}

