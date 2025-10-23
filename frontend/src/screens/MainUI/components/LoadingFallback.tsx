/**
 * LoadingFallback Component
 * Visible loading state for Suspense boundaries
 */

"use client";

export default function LoadingFallback() {
  return (
    <div
      style={{
        padding: 24,
        textAlign: "center",
        color: "#94a3b8",
        minHeight: "200px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: "3px solid rgba(6, 182, 212, 0.3)",
          borderTop: "3px solid #06b6d4",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          marginBottom: 16,
        }}
      />
      <div style={{ fontSize: 16 }}>Loading map & data…</div>
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

