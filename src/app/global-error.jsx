"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="bg-black text-white min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-2xl font-semibold">Something went wrong</h2>
          <p className="text-white/70">An unexpected error was captured by monitoring.</p>
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 rounded bg-white text-black font-medium"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
