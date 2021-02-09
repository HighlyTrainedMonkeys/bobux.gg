//withdrawals, preventing dupe payouts, etc
const router = require("express").Router();
const Joi = require("@hapi/joi");
const Discord = require("discord.js");
const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");

const uauth = require("../middlewares/uauth");
const redis = require("../modules/redis");
const roblox = require("../modules/roblox");
const hook = require("../modules/hook");

const User = require("../models/User");
const Staff = require("../models/Staff");
const Payout = require("../models/Payout");

//done - just missing discord webhooks
router.post("/api/v1/transactions/init", uauth, async (req, res) => {
  try {
    const { error } = Joi.object({
      username: Joi.string()
        .alphanum()
        .allow(" ", "_")
        .required()
        .label("Username"),
      amount: Joi.number().integer().min(1).required().label("Amount"),
    }).validate(req.body);

    if (error)
      return res.status(400).json({
        status: "error",
        error: error.details[0].message,
      });

    let transacting = await redis.isTransactionLocked(req.user.rid);

    if (transacting)
      return res.status(400).json({
        status: "error",
        error:
          "You already have a transaction in progress! Please complete the transaction or cancel it to continue!",
      });

    if (req.user.balance < req.body.amount)
      return res.status(400).json({
        status: "error",
        error:
          "You don't have enough balance to withdraw that amount! " +
            req.user.earned >
          0
            ? "Please try withdrawing a smaller amount!"
            : "Complete offers or join giveaways to earn R$ first!",
      });

    let stock = await redis.getStock();

    if (stock < req.body.amount)
      return res.status(400).json({
        status: error,
        error:
          "Not enough stock to complete the transaction! Please try withdrawing a smaller amount!",
      });

    let groups = await redis.getGroups();
    let selectedGroup = groups.find((g) => g.balance >= req.body.amount);

    if (!selectedGroup)
      return res.status(400).json({
        status: error,
        error:
          "No group with enough stock found to complete this transaction! Please try withdrawing a smaller amount!",
      });

    await redis.enableTransactionLock(req.user.rid);

    await redis.addTransaction(req.user.rid, {
      user: req.user,
      group: selectedGroup,
      amount: req.body.amount,
    });

    res.status(200).json({
      status: "success",
      result: {
        gid: selectedGroup.gid,
        image: selectedGroup.image,
        name: selectedGroup.name,
      },
    });
  } catch (error) {
    console.error(error);
    Sentry.captureException(error);
    res.status(500).json({
      status: "error",
      error: "Internal error! Please try again later!",
    });
  }
});

router.post("/api/v1/transactions/complete", uauth, async (req, res) => {
  try {
    let transacting = await redis.isTransactionLocked(req.user.rid);

    if (!transacting)
      return res.status(400).json({
        status: "error",
        error: "Could not complete transaction! Please try withdrawing again!",
      });

    let transaction = await redis.getTransaction(req.user.rid);
    let stock = await redis.getStock();

    if (stock < transaction.amount)
      return res.status(400).json({
        status: "error",
        error:
          "The site ran low on stock before your payout could be completed! ",
      });

    if (transaction.group.balance < transaction.amount)
      return res.status(400).json({
        status: "error",
        error:
          "The group no longer has enough R$ to pay you! Please try withdrawing again!",
      });

    let groups = await redis.getGroups();
    let selectedGroup = groups.find((g) => g.gid == transaction.group.gid);

    if (!selectedGroup)
      return res.status(400).json({
        status: "error",
        error:
          "The group is no longer on the site! Please try withdrawing again!",
      });

    await roblox.verifyMembership(
      transaction.user.username,
      transaction.group.gid
    );

    await roblox.groupPayout(
      transaction.group.cookie,
      transaction.amount,
      transaction.user.username
    );

    //subtract balance
    await User.findOneAndUpdate(
      { rid: req.user.rid },
      { $inc: { balance: -transaction.amount } }
    );

    //save payout to db
    let payout = new Payout({
      rid: req.user.rid,
      sid: transaction.group.sid,
      amount: transaction.amount,
    });

    await payout.save();
    //credit reseller
    await Staff.findOneAndUpdate(
      { sid: transaction.group.sid },
      { $inc: { balance: transaction.amount } }
    );

    //disable transaction lock and delete transaction

    await redis.removeTransaction(req.user.rid);
    await redis.disableTransactionLock(req.user.rid);

    let embed = new Discord.MessageEmbed()
      .setTitle("User withdrew bobux!")
      .addField("Username", req.user.username, true)
      .addField("Amount", transaction.amount, true);

    await hook.sendHook("Payout", embed);
    
    res.status(200).json({
      status: "success",
      result: {
        message: "Payout successful! Enjoy your R$!",
      },
    });
  } catch (error) {
    console.error(error);
    Sentry.captureException(error);
    res.status(500).json({
      status: "error",
      error: error.RBX_ERR_CODE
        ? error.message
        : "Internal error! Please try again!",
    });
  }
});

router.post("/api/v1/transactions/cancel", uauth, async (req, res) => {
  try {
    let transacting = await redis.isTransactionLocked(req.user.rid);

    if (!transacting)
      return res.status(400).json({
        status: "error",
        error: "Could not cancel transaction! You don't have one in progress!",
      });

    await redis.removeTransaction(req.user.rid);
    await redis.disableTransactionLock(req.user.rid);

    res.status(200).json({
      status: "success",
      result: {
        message: "Transaction cancelled successfully!",
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
