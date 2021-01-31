//offerwall routes for dynamically loading content
const router = require("express").Router();
const _ = require("lodash");

const offerwalls = require("../offerwalls.json");
const redis = require("../modules/redis");
const offerwall = require("../modules/offerwall");

router.get("/api/v1/offerwalls", (req, res) => {
  res.status(200).json({
    status: "success",
    result: _.pick(offerwalls, ["name", "displayName"]),
  });
});

router.get("/api/v1/offerwall/:name", async (req, res) => {
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
      result = await redis.getOfferwallCache(offerwallConfig.name);
    } else {
      result = offerwall.getOffers(offerwallConfig);
    }

    res.status(200).json({ status: "success", result });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      error: "Internal error! Please try again!",
    });
  }
});

module.exports = router;
