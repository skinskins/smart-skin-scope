import { createRoot } from "react-dom/client";
import React from "react";
import App from "./App.tsx";
import "./index.css";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div style={{ padding: 24, fontFamily: "monospace", background: "#fff1f2", minHeight: "100vh" }}>
          <h2 style={{ color: "#b91c1c", marginBottom: 12 }}>React render error — check Console for full stack</h2>
          <pre style={{ color: "#7f1d1d", whiteSpace: "pre-wrap", fontSize: 13 }}>
            {(error as Error).message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
