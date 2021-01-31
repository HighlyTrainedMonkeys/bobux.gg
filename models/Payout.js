//payout logs
//used for statistics & seller payment tracking
const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  rid: { //roblox id
    type: Number,
    required: true,
  },
  sid: { //staff uid - NOT MONGODB _id!!
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
    default: Date.now()
  },
});

module.exports = mongoose.model("Payout", schema);