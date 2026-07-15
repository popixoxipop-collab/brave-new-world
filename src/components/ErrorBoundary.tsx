"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Optional label for logging / UI */
  name?: string;
  fallback?: ReactNode;
};

type State = {
  error: Error | null;
};

/**
 * Catches render errors in the subtree so a single panel crash
 * does not blank the entire app.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.name ? `:${this.props.name}` : ""}]`, error, info.componentStack);
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          role="alert"
          className="flex min-h-[40vh] flex-col items-center justify-center gap-3 bg-[#02040a] px-6 text-center text-slate-200"
        >
          <p className="text-sm font-medium text-amber-100/90">화면을 표시하지 못했습니다</p>
          <p className="max-w-md text-xs leading-5 text-slate-400">
            {this.state.error.message || "Unexpected render error"}
          </p>
          <button
            type="button"
            onClick={this.reset}
            className="rounded-lg border border-sky-300/30 bg-sky-950/40 px-3 py-1.5 text-xs text-sky-100 transition hover:border-sky-200/50"
          >
            다시 시도
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
