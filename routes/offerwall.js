//offerwall routes for dynamically loading content
const Joi = require("@hapi/joi");
const router = require("express").Router();
const _ = require("lodash");
const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");

const offerwalls = require("../offerwalls.json");
const redis = require("../modules/redis");
const offerwall = require("../modules/offerwall");
const auth = require("../middlewares/uauth");

router.get("/api/v1/offerwalls", (req, res) => {
  res.status(200).json({
    status: "success",
    result: _.pick(offerwalls, ["name", "displayName"]),
  });
});

router.get("/api/v1/offerwall/:name", auth, async (req, res) => {
  let ip = req.headers["cf-connecting-ip"] || req.ip;
  let ua = req.headers['user-agent'];
  
  let { error } = Joi.string().ip().required().validate(ip);

  if (error)
    return res.status(400).json({
      status: "error",
      error: "Invalid IP header supplied!",
    });

  try {
    let offerwallConfig = offerwalls.find(
      (o) => o.name.toLowerCase() == req.params.name.toLowerCase()
    );

    if (!offerwallConfig)
      return res.status(400).json({
        status: "error",
        error: "Invalid offerwall!",
      });

    let result;

    if (offerwallConfig.cache) {
      let cached = await redis.getOfferwallCache(offerwallConfig.name);

      if (!cached || !cached.expiry || cached.expiry < Date.now()) {
        result = await offerwall.getOffers(offerwallConfig, req.user.rid, ip, ua);
      } else {
        result = cached.offers;
      }
    } else {
      result = await offerwall.getOffers(offerwallConfig, req.user.rid, ip, ua);
    }

    res.status(200).json({
      status: "success",
      result: {
        offers: result,
      },
    });
  } catch (error) {
    console.error(error);
    Sentry.captureException(error);
    res.status(500).json({
      status: "error",
      error: "Internal error! Please try again!",
    });
  }
});

module.exports = router;
