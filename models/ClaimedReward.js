//claimed reward
//used to see what the users daily progress is
const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  rid: {
    //roblox id
    type: Number,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Number,
    required: true,
    default: Date.now(),
  },
});

module.exports = mongoose.model("ClaimedReward", schema);
