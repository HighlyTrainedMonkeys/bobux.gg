const whitelist = require("../whitelist.json");

module.exports = (req, res, next) => {
  if (!whitelist.includes(req.ipAddress))
    return res.status(403).json({
      status: "error",
      error: "Unauthorized!",
    });

  next();
};
