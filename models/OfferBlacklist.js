//blacklist offers by term
const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  term: {
    type: String,
    required: true,
  }
});

module.exports = mongoose.model("OfferBlacklist", schema);