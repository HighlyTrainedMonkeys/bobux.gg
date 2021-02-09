//authenticate with firebase here
const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");
const admin = require("firebase-admin");

module.exports = async (req, res, next) => {
  try {
    let token = req.headers["authorization"];
    req.user = await admin.auth().verifyIdToken(token, true);
  } catch (error) {
    console.error(error);
    Sentry.captureException(error);
    return res.status(500).json({
      status: "error",
      error: error.message || "Internal error!",
    });
  }

  next();
};
