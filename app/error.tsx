"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="mx-auto max-w-md space-y-4 p-6 text-center">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          An unexpected error occurred. Please try again or return to the home page.
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-muted-foreground">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-md border px-6 text-sm font-medium hover:bg-accent"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
