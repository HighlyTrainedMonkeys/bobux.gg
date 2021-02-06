const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  gid: { //gid = group id
    type: Number,
    required: true,
  },
  cookie: {
    type: String,
    required: true,
  },
  sid: { //sid = staff uid - NOT MONGODB _id!!
    type: String,
    required: true,
  },
  stockerName: {
    type: String,
    required: true,
  }
});

module.exports = mongoose.model("Group", schema);