const router = require("express").Router();
const Joi = require("@hapi/joi");
const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");

const uauth = require("../middlewares/uauth");
const roblox = require("../modules/roblox");
const User = require("../models/User");

router.get("/api/v1/user/info", uauth, (req, res) => {
  delete req.user._id;
  delete req.user.__v;

  res.status(200).json({
    status: "success",
    result: req.user,
  });
});

router.post("/api/v1/user/link", async (req, res) => {
  try {
    const { error } = Joi.object({
      username: Joi.string()
        .alphanum()
        .allow(" ", "_")
        .required()
        .label("Username"),
      referrer: Joi.string().alphanum().allow(" ", "_").label("Referrer"),
    }).validate();

    if (error)
      return res.status(400).json({
        status: "error",
        error:
          "Invalid username! Make sure you spelled it correctly and try again!",
      });

    let rid = await roblox.getIdFromUser(req.body.username);
    let user = await User.findOne({
      username: { $regex: new RegExp(req.body.username, "i") },
    });

    if (!user) {
      user = new User({
        username: req.body.username.toLowerCase(),
        rid,
        referrer: req.body.referrer || "NONE",
      });

      await user.save();
    }

    res.status(200).json({
      status: "success",
      result: {
        message: "Account linked successfully!",
      },
    });
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
});

module.exports = router;
