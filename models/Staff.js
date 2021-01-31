//staff user - can be given permissions such as reseller or admin(handled by firebase)
const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
  },
  balance: {
    type: Number,
    required: true,
    default: 0,
  },
});

module.exports = mongoose.model("Staff", schema);
