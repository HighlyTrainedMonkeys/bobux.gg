const router = require("express").Router();
const Joi = require("@hapi/joi");
const admin = require("firebase-admin");
const moment = require("moment");
const Discord = require("discord.js");

const adminAuth = require("../middlewares/adminAuth");

const redis = require("../modules/redis");
const hook = require("../modules/hook");
const roblox = require("../modules/roblox");

const Group = require("../models/Group");
const User = require("../models/User");
const Stats = require("../models/Stats");
const RegistrationCode = require("../models/RegistrationCode");
const Staff = require("../models/Staff");
const Payout = require("../models/Payout");

//total stock on site, user count, total paid
router.get("/api/v1/staff/stats", adminAuth, async (req, res) => {
  try {
    //disabled this because it doesnt matter if resellers see these details
    // if (!req.user.permissions.includes("ADMIN"))
    //   return res.status(403).json({
    //     status: "error",
    //     error: "Unauthorized!",
    //   });

    let users = await User.countDocuments({});
    let stock = await redis.getStock();
    let stats = await Stats.findOne({});

    let all = await redis.getGroups();
    let groups = req.user.permissions.includes("ADMIN")
      ? all
      : all.filter((g) => g.sid == req.user.uid);

    let currentTime = moment();
    let start = currentTime.startOf("day").subtract(7, "d").toDate().getTime();

    let payouts = await Payout.find({
      timestamp: { $gte: start },
      sid: req.user.uid,
    });

    let saleHistory = payouts.reduce((days, payout) => {
      let startOfDay = moment(payout.timestamp).startOf("day");
      let day = `${startOfDay.format("MMMM")} ${startOfDay.date()}`;

      if (!days[day]) days[day] = { total: 0, count: 0 };

      days[day].total += payout.amount;
      days[day].count++;
      return days;
    }, {});

    res.status(200).json({
      status: "success",
      result: {
        stats: {
          users,
          stock,
          paid: stats.paid,
          saleHistory,
        },
        groups,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      error: "Internal error!",
    });
  }
});

//implement register keys/tokens so we dont get spammed with registrations or something
router.post("/api/v1/staff/register", async (req, res) => {
  try {
    const { error } = Joi.object({
      username: Joi.string().alphanum().required().label("Username"),
      email: Joi.string().email().required().label("Email"),
      password: Joi.string().required().label("Password"),
      token: Joi.string().uuid().required().label("Registration token"),
    }).validate(req.body);

    if (error)
      return res.status(400).json({
        status: "error",
        error: error.details[0].message,
      });

    let registrationCode = await RegistrationCode.findOne({
      code: req.body.token,
    });

    if (!registrationCode)
      return res.status(400).json({
        status: "error",
        error: error.details[0].message,
      });

    await registrationCode.remove();

    let user = await admin.auth().createUser({
      displayName: req.body.username,
      email: req.body.email,
      password: req.body.password,
    });

    let staff = new Staff({
      uid: user.uid,
    });

    await admin
      .auth()
      .setCustomUserClaims(user.uid, { permissions: ["RESELLER"] });

    await staff.save();

    res.status(200).json({
      status: "success",
      result: {
        message: "Registration successful!",
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      error: "Internal error!",
    });
  }
});

//generate register keys so staff can make accounts
router.post(
  "/api/v1/staff/registrykey/generate",
  adminAuth,
  async (req, res) => {
    try {
      if (!req.user.permissions.includes("ADMIN"))
        return res.status(403).json({
          status: "error",
          error: "Unauthorized!",
        });

      let registrationCode = new RegistrationCode();

      let code = await registrationCode.save();

      res.status(200).json({
        status: "success",
        result: {
          code: code.code,
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        status: "error",
        error: "Internal error!",
      });
    }
  }
);

router.post("/api/v1/reseller/group/add", adminAuth, async (req, res) => {
  try {
    const { error } = Joi.object({
      id: Joi.number().integer().min(100).required().label("Group ID"),
      cookie: Joi.string().required().label("Roblox Cookie"),
    }).validate(req.body);

    if (error)
      return res.status(400).json({
        status: "error",
        error: error.details[0].message,
      });

    let info = await roblox.getCookieInfo(req.body.cookie);

    let { name, gid } = await roblox.verifyOwnership(info.UserID, req.body.id);
    let image = await roblox.getGroupIcon(gid);

    let group = new Group({
      name,
      image,
      gid,
      cookie: req.body.cookie,
      sid: req.user.uid,
      stockerName: req.user.displayName,
    });

    await group.save();

    let groups = await Group.find();

    await redis.updateGroups(groups);

    res.status(200).json({
      status: "success",
      result: {
        message: "Group added to the site successfully!",
      },
    });
  } catch (error) {
    console.error(error);
    res.status(error.RBX_ERR_CODE ? 400 : 500).json({
      status: "error",
      error: error.RBX_ERR_CODE ? error.message : "Internal error!",
    });
  }
});

router.post("/api/v1/reseller/group/remove", adminAuth, async (req, res) => {
  try {
    const { error } = Joi.object({
      id: Joi.number().integer().min(1000).required(),
    }).validate(req.body);

    if (error)
      return res.status(400).json({
        status: "error",
        error: "Please provide a valid group ID!",
      });

    let group = await Group.findOne({ gid: req.body.id, sid: req.user.uid });

    if (!group)
      return res.status(400).json({
        status: "error",
        error: "Group not onsite or not stocked by you!",
      });

    await group.remove();

    let groups = await Group.find();

    await redis.updateGroups(groups);

    res.status(200).json({
      status: "success",
      result: {
        message: "Group removed from site stock successfully!",
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      error: "Internal error!",
    });
  }
});

//type should be either paypal or bitcoin
//they should send their btc address or paypal email
//all this does is sends a webhook
router.post("/api/v1/reseller/payout/request", adminAuth, async (req, res) => {
  try {
    const { error } = Joi.object({
      method: Joi.valid(["paypal", "bitcoin"])
        .required()
        .label("Payout method"),
      address: Joi.string().required().label("Payment address"),
    }).validate(req.body);

    if (error)
      return res.status(400).json({
        status: "error",
        error: "Pick a valid payment method and try again!",
      });

    let staff = await Staff.findOne({ uid: req.user.uid });

    if (staff.balance > 1)
      return res.status(400).json({
        status: "error",
        error: "Cannot request a payout of zero!",
      });

    let embed = new Discord.MessageEmbed()
      .setTitle("Payout request!")
      .addField("Name", req.user.displayName, true)
      .addField("Amount", staff.balance, true);

    await hook.sendHook("Payout request", embed);

    res.status(200).json({
      status: "success",
      result: {
        message: "Sent payout request!",
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      error: "Internal error!",
    });
  }
});

router.post("/api/v1/staff/reseller/reset", adminAuth, async (req, res) => {
  try {
    if (!req.user.permissions.includes("ADMIN"))
      return res.status(403).json({
        status: "error",
        error: "Unauthorized!",
      });

    const { error } = Joi.object({
      email: Joi.string().email().label("Reseller email"),
    }).validate(req.body);

    if (error)
      return res.status(400).json({
        status: "error",
        error: error.details[0].message,
      });

    let user = await admin.auth().getUserByEmail(req.body.email);
    if (!user)
      return res.status(400).json({
        status: "error",
        error: "Invalid email!",
      });

    let seller = await Staff.findOneAndUpdate(
      { uid: user.uid },
      { balance: 0 },
      { new: true }
    );

    res.status(200).json({
      status: "success",
      result: {
        message: "Balance reset successfully!",
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      error: error.message || "Internal error!",
    });
  }
});

router.post("/api/v1/staff/user/ban/toggle", adminAuth, async (req, res) => {
  try {
    if (!req.user.permissions.includes("ADMIN"))
      return res.status(403).json({
        status: "error",
        error: "Unauthorized!",
      });

    const { error } = Joi.object({
      username: Joi.string().alphanum().allow(["_"]).label("Roblox Username"),
    }).validate(req.body);

    if (error)
      return res.status(400).json({
        status: "error",
        error: error.details[0].message,
      });

    let user = await User.findOne({
      username: { $regex: new RegExp(req.headers.username, "i") },
    });

    user.banned = !user.banned;

    await user.save();

    res.status(200).json({
      status: "success",
      result: {
        message: user.banned
          ? "User banned from the site successfully!"
          : "Ban revoked successfully!",
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      error: "Internal error!",
    });
  }
});

router.post("/api/v1/staff/user/info", adminAuth, async (req, res) => {
  try {
    if (!req.user.permissions.includes("ADMIN"))
      return res.status(403).json({
        status: "error",
        error: "Unauthorized!",
      });

    const { error } = Joi.object({
      username: Joi.string().alphanum().allow(["_"]).label("Roblox Username"),
    }).validate(req.body);

    if (error)
      return res.status(400).json({
        status: "error",
        error: error.details[0].message,
      });

    let user = await User.findOne({
      username: { $regex: new RegExp(req.body.username, "i") },
    });

    if (!user)
      return res.status(400).json({
        status: "error",
        error: "User not found",
      });

    res.status(200).json({
      status: "success",
      result: {
        user,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      error: "Internal error!",
    });
  }
});

//give/remove permissions such as RESELLER or ADMIN
router.post("/api/v1/staff/permissions/update", (req, res) => {});

router.post("/api/v1/staff/user/balance/set", adminAuth, async (req, res) => {
  try {
    if (!req.user.permissions.includes("ADMIN"))
      return res.status(403).json({
        status: "error",
        error: "Unauthorized!",
      });

    const { error } = Joi.object({
      username: Joi.string().alphanum().allow(["_"]).label("Roblox Username"),
      amount: Joi.number().integer().label("Amount"),
    }).validate(req.body);

    if (error)
      return res.status(400).json({
        status: "error",
        error: error.details[0].message,
      });

    let user = await User.findOneAndUpdate(
      {
        username: { $regex: new RegExp(req.body.username, "i") },
      },
      { balance: req.body.amount }
    );

    if (!user)
      return res.status(400).json({
        status: "error",
        error: "User not found",
      });

    res.status(200).json({
      status: "success",
      result: {
        message: "Balance updated successfully!",
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      error: "Internal error!",
    });
  }
});

module.exports = router;
