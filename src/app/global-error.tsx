"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="bg-black min-h-screen text-white flex items-center justify-center">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
          <button
            onClick={() => reset()}
            className="bg-violet-500 hover:bg-violet-600 text-white px-6 py-3 rounded-xl"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
