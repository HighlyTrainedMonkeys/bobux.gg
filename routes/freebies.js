//daily rewards, giveaways, etc
const router = require("express").Router();
const moment = require("moment");
const parser = require("cron-parser");
const Joi = require("@hapi/joi");
const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");
const ms = require("ms");

const ClaimedReward = require("../models/ClaimedReward");
const Completed = require("../models/Completed");
const User = require("../models/User");
const Code = require("../models/Code");

const uauth = require("../middlewares/uauth");

const redis = require("../modules/redis");
const captcha = require("../modules/hcaptcha");

router.get("/api/v1/giveaway/meta", uauth, async (req, res) => {
  try {
    let entries = (await redis.getGiveawayEntries()) || [];
    let info = await redis.getGiveawayInfo();
    let endTime = parser.parseExpression("0 */2 * * *");

    //TODO: verify this works!
    let summed = entries.reduce((p, c) => {
      let user = p.find((u) => u.uid == c);
      let index = p.findIndex((u) => u.uid == c);

      if (!user) {
        return p.push({
          uid: c,
          entries: 1,
          chance: (100 / entries.length) * 1,
        });
      }

      p[index].chance = (100 / entries.length) * (user.chance + 1);
      return p[index].entries++;
    }, []);

    //TODO: IMPORTANT! USER PROFILE IMAGES NEED TO BE CACHED FOR USE HERE!
    let top = summed.sort((a, b) => {
      return a.entries - b.entries;
    });

    res.status(200).json({
      status: "success",
      result: {
        ending: ms(endTime.next().getTime() - Date.now(), { long: true }),
        top,
        amount: info.amount,
        lastWinner: info.lastWinner,
      },
    });
  } catch (error) {
    console.error(error);
    Sentry.captureException(error);
    res.status(500).json({
      status: "error",
      error: "Internal error!",
    });
  }
});

router.post("/api/v1/giveaway/enter", uauth, async (req, res) => {
  try {
    // const { error } = Joi.object({
    //   token: Joi.string().required().label("Captcha token"),
    // }).validate(req.body);

    // if (error)
    //   return res.status(400).json({
    //     status: "error",
    //     error: "Please solve the captcha!",
    //   });

    //await captcha.verifyCaptcha(req.body.token, req.ipAddress);
    await redis.addGiveawayEntry(req.user.rid);

    res.status(200).json({
      status: "success",
      result: {
        message: "Added giveaway entry successfully!",
      },
    });
  } catch (error) {
    console.error(error);
    Sentry.captureException(error);
    if (error.CAPTCHA_CODE)
      return res.status(500).json({
        status: "error",
        error: error.message,
      });

    res.status(500).json({
      status: "error",
      error: "Internal error! Please try again!",
    });
  }
});

router.post("/api/v1/promocode/redeem", uauth, async (req, res) => {
  try {
    const { error } = Joi.object({
      token: Joi.string().required().label("Captcha token"),
      code: Joi.string()
        .alphanum()
        .allow(" ", "_", "-")
        .required()
        .label("Promocode"),
    }).validate(req.body);

    if (error)
      return res.status(400).json({
        status: "error",
        error: error.details[0].message,
      });

    await captcha.verifyCaptcha(req.body.token, req.ipAddress);

    let code = await Code.findOne({ code: req.body.code });

    if (!code)
      return res.status(400).json({
        status: "error",
        error: "Invalid promocode!",
      });

    if (code.users.includes(req.user.rid))
      return res.status(400).json({
        status: "error",
        error: "You cannot redeem a promocode more than once!",
      });

    if (code.expiry >= Date.now()) {
      await code.remove();
      return res.status(400).json({
        status: "error",
        error: "Invalid promocode!",
      });
    }

    await Code.findOneAndUpdate(
      { code: req.body.code },
      { $push: { users: req.user.rid } }
    );

    await User.findOneAndUpdate(
      { rid: req.user.rid },
      {
        $inc: { balance: code.amount },
      }
    );

    res.status(200).json({
      status: "success",
      result: {
        message: "Redeemed promocode successfully!",
      },
    });
  } catch (error) {
    console.error(error);
    Sentry.captureException(error);
    if (error.CAPTCHA_CODE)
      return res.status(500).json({
        status: "error",
        error: error.message,
      });

    res.status(500).json({
      status: "error",
      error: "Internal error! Please try again!",
    });
  }
});

//get the available awards to claim
router.get("/api/v1/reward/meta", uauth, async (req, res) => {
  try {
    let milestones = [
      {
        offersRequired: 1,
        payout: 1,
        claimed: false,
        claimable: false,
      },
      {
        offersRequired: 5,
        payout: 5,
        claimed: false,
        claimable: false,
      },
      {
        offersRequired: 10,
        payout: 10,
        claimed: false,
        claimable: false,
      },
    ];

    let completed = await Completed.find({
      rid: req.user.rid,
      timestamp: { $gte: moment().startOf("day").unix() },
    });

    let claimed = await ClaimedReward.find({
      rid: req.user.rid,
      timestamp: { $gte: moment().startOf("day").unix() },
    });

    claimed.forEach((c) => {
      let milestone = milestones.find((m) => m.offersRequired == c.amount);
      let milestoneIndex = milestones.findIndex(
        (m) => m.offersRequired == c.amount
      );

      if (milestone) {
        milestones[milestoneIndex].claimed = true;
      }
    });

    milestones.forEach((milestone, i) => {
      if (!milestone.claimed && milestone.offersRequired >= completed.length) {
        milestones[i].claimable = true;
      }
    });

    res.status(200).json({
      status: "success",
      result: {
        completed: completed.length,
        milestones: milestones,
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

router.post("/api/v1/reward/claim", uauth, async (req, res) => {
  try {
    const { error } = Joi.object({
      milestone: Joi.number().integer().min(1).max(10).label("Reward"),
    }).validate(req.body);

    if (error)
      return res.status(400).json({
        status: "error",
        error: "You attempted to claim an invalid reward!",
      });

    let milestones = [
      {
        offersRequired: 1,
        payout: 1,
        claimed: false,
        claimable: false,
      },
      {
        offersRequired: 5,
        payout: 5,
        claimed: false,
        claimable: false,
      },
      {
        offersRequired: 10,
        payout: 10,
        claimed: false,
        claimable: false,
      },
    ];

    if (!milestones.find((m) => m.offersRequired == req.body.milestone))
      return res.status(400).json({
        status: "error",
        error: "Invalid reward selected!",
      });

    let completed = await Completed.find({
      rid: req.user.rid,
      timestamp: { $gte: moment().startOf("day").unix() },
    });

    if (completed.length < 1)
      return res.status(400).json({
        status: "error",
        error: "You must complete offers to redeem your daily rewards!",
      });

    let claimed = await ClaimedReward.find({
      rid: req.user.rid,
      timestamp: { $gte: moment().startOf("day").unix() },
    });

    claimed.forEach((c) => {
      let milestone = milestones.find((m) => m.offersRequired == c.amount);
      let milestoneIndex = milestones.findIndex(
        (m) => m.offersRequired == c.amount
      );

      if (milestone) {
        milestones[milestoneIndex].claimed = true;
      }
    });

    milestones.forEach((milestone, i) => {
      if (!milestone.claimed && milestone.offersRequired >= completed.length) {
        milestones[i].claimable = true;
      }
    });

    //reason i didnt create two of these is because the items in the array will most likely update
    //this prevents inconsistencies
    let selectedMilestone = milestones.find(
      (m) => m.offersRequired == req.body.milestone
    );

    if (selectedMilestone.claimed)
      return res.status(400).json({
        status: "error",
        error:
          "You have already claimed this reward today! Complete an offer tomorrow to claim it again!",
      });

    if (!selectedMilestone.claimable)
      return res.status(400).json({
        status: "error",
        error:
          "You cannot claim this reward yet! Complete more offers and come back later!",
      });

    let claimedReward = new ClaimedReward({
      rid: req.user.rid,
      amount: selectedMilestone.payout,
    });

    await claimedReward.save();

    await User.findOneAndUpdate(
      { rid: req.user.rid },
      { $inc: { balance: selectedMilestone.payout } }
    );

    res.status(200).json({
      status: "success",
      result: {
        message: "Reward claimed successfully!",
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
