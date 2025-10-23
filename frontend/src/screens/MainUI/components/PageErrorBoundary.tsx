/**
 * PageErrorBoundary Component
 * Catches React errors and displays them visibly instead of blank screen
 */

"use client";

import React from "react";

interface ErrorBoundaryState {
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class PageErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: undefined };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: 24,
            maxWidth: 800,
            margin: "0 auto",
            color: "#ef4444",
            background: "rgba(254, 226, 226, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: 8,
          }}
        >
          <h2 style={{ marginTop: 0, color: "#ef4444" }}>
            ⚠️ Something broke on the page
          </h2>
          <p style={{ color: "#94a3b8" }}>
            The app encountered an error. Check the browser console for details.
          </p>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              background: "rgba(15, 23, 42, 0.5)",
              padding: 12,
              borderRadius: 4,
              fontSize: 12,
              color: "#e2e8f0",
              overflow: "auto",
              maxHeight: 300,
            }}
          >
            {String(this.state.error?.stack || this.state.error?.message)}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 16,
              padding: "8px 16px",
              background: "#06b6d4",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

