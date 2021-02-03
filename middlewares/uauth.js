//check if the user has linked their account

const roblox = require("../modules/roblox");
const redis = require("../modules/redis");
const User = require("../models/User");
const Joi = require("@hapi/joi");


module.exports = async (req, res, next) => {
  const { error } = Joi.string()
    .alphanum()
    .allow([" ", "_"])
    .required()
    .validate(req.headers.username);

  if (error)
    return res.status(400).json({
      status: "error",
      error: "Invalid username! Make sure your username is spelled correctly!",
    });

  try {
    let cached = await redis.getCachedUser(req.headers.username);

    if (cached) {
      req.user = cached;
      return next();
    }

    let rid = await roblox.getIdFromUser(req.headers.username);
    let user = await User.findOne({
      username: { $regex: new RegExp(req.headers.username, "i") },
    });

    if (!user) {
      //TODO: get user avatars and store them
      user = new User({
        username: req.headers.username.toLowerCase(),
        rid: rid,
        image:
          "https://tr.rbxcdn.com/c3ee609e91804ee2f15c6375355a381a/150/150/AvatarHeadshot/Png",
      });

      await user.save();
    }

    await redis.setCachedUser(user);

    req.user = user;
  } catch (error) {
    console.error(error);
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
