//check if the user has linked their account
const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");
const roblox = require("../modules/roblox");
const redis = require("../modules/redis");
const User = require("../models/User");
const Joi = require("@hapi/joi");

module.exports = async (req, res, next) => {
  const { error } = Joi.string()
    .alphanum()
    .allow(" ", "_")
    .required()
    .validate(req.headers.username);

  if (error)
    return res.status(400).json({
      status: "error",
      error: "Invalid username! Make sure your username is spelled correctly!",
    });

  try {
    let cached = await redis.getCachedUser(req.headers.username);
    console.log(cached);

    if (cached) {
      req.user = cached;
      return next();
    }
    
    let user = await User.findOne({
      username: { $regex: new RegExp(req.headers.username, "i") },
    });

    console.log(user)

    if (user.banned) {
      return res.status(403).json({
        status: "error",
        error: "User banned!",
      });
    }

    if (!user) {
      let rid = await roblox.getIdFromUser(req.headers.username);
      let image = await roblox.getUserThumbnail(rid);
      
      user = new User({
        username: req.headers.username.toLowerCase(),
        rid: rid,
        image: image,
      });

      await user.save();
    }

    await redis.setCachedUser(user);

    req.user = user;
  } catch (error) {
    console.error(error);
    Sentry.captureException(error);
    if (error.code || error.code == "INVALID_USERNAME")
      return res.status(400).json({
        status: "error",
        error: "Invalid username!",
      });

    return res.status(500).json({
      status: "error",
      error: "Internal error! Please try again!",
    });
  }

  next();
};
