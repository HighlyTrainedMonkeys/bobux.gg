//registration code for staff
const mongoose = require("mongoose");
const uuid = require("uuid").v4;

const schema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    default: uuid(),
  },
});

module.exports = mongoose.model("RegistrationCode", schema);
