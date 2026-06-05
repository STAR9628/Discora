import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)
  ) {
    await Sentry.init({
      dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV ?? "development",
    });
  }
}
