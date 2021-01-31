const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  paid: {
    type: Number,
    required: true,
    default: 0,
  },
});

module.exports = mongoose.model("Stats", schema);
