import * as Sentry from "@sentry/nextjs";

const DEFAULT_SLOW_API_THRESHOLD_MS = Number(
  process.env.SLOW_API_THRESHOLD_MS || 1000
);

export async function monitorApiRoute(
  routeName,
  handler,
  slowThresholdMs = DEFAULT_SLOW_API_THRESHOLD_MS
) {
  const startTime = Date.now();

  return Sentry.startSpan({ name: `api:${routeName}`, op: "http.server" }, async () => {
    try {
      const result = await handler();
      const durationMs = Date.now() - startTime;

      if (durationMs > slowThresholdMs) {
        Sentry.captureMessage(`Slow API route detected: ${routeName}`, {
          level: "warning",
          tags: { route: routeName, kind: "api-slow" },
          extra: {
            durationMs,
            slowThresholdMs,
          },
        });
      }

      return result;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { route: routeName, kind: "api-error" },
      });
      throw error;
    }
  });
}
