//check if the user has linked their account

const roblox = require("../modules/roblox");
const User = require("../models/User");
const Joi = require("@hapi/joi");

//TODO: cache the user info in redis
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
    let rid = await roblox.getIdFromUser(req.headers.username);
    let user = await User.findOne({
      username: { $regex: new RegExp(req.headers.username, "i") },
    });

    if (!user) {
      user = new User({
        username: req.headers.username.toLowerCase(),
        rid: rid,
      });

      await user.save();
    }

    req.user = user;
  } catch (error) {
    console.error(error);
    if(error.code || error.code == "INVALID_USERNAME") return res.status(400).json({
      status: "error",
      error: "Invalid username!"
    });

    return res.status(500).json({
      status: "error",
      error: "Internal error! Please try again!",
    });
  }

  next();
};
