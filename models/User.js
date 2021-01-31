//just roblox users that have been linked to the site
//bans, baLance, referrals and other user stats

const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  rid: {
    type: Number,
    required: true,
  },
  balance: {
    type: Number,
    required: true,
    default: 0,
  },
  earned: {
    type: Number,
    required: true,
    default: 0,
  },
  referrals: {
    type: Number,
    required: true,
    default: 0,
  },
  referrer: {
    type: String,
    required: true,
    default: "NONE",
  },
  referralEarned: {
    type: Number,
    required: true,
    default: 0,
  },
  banned: {
    type: Boolean,
    required: true,
    default: false,
  },
  registrationTimestamp: {
    type: Number,
    required: true,
    default: Date.now(),
  },
});

module.exports = mongoose.model("User", schema);
