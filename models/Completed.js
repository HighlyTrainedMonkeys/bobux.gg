//completed offer(to see how many offers were completed today)
const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  oid: {
    //offer id
    type: String,
    required: true,
  },
  offerwall: {
    //offerwall name
    type: String,
    required: true,
  },
  rid: {
    //roblox id
    type: String,
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

module.exports = mongoose.model("Completed", schema);
