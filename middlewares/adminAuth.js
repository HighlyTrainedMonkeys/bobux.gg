//authenticate with firebase here
const admin = require("firebase-admin");

module.exports = async (req, res, next) => {
  try {
    let token = req.headers["authorization"];
    req.user = await admin.auth().verifyIdToken(token, true);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "error",
      error: error.message || "Internal error!",
    });
  }

  next();
};
