const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");

Sentry.init({
  dsn: "https://b527502e32dc4fdc83245f5fdd10a069@o435421.ingest.sentry.io/5626944",
  tracesSampleRate: 1.0,
});



setTimeout(() => {
  try {
    foo();
  } catch (e) {
    console.error(error);
    Sentry.captureException(error);
    Sentry.captureException(error);
  }
}, 99);