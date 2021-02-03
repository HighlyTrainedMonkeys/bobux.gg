//promocodes
const mongoose = require("mongoose");
const uuid = require("uuid").v4;

//TODO: implement different code types
const schema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  users: {
    type: Array,
    required: true,
    default: [] //array of RID's that have redeemed this code
  },
  expiry: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model("Code", schema);
