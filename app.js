const express = require("express");
const helmet = require("helmet");
const mongoose = require("mongoose");
const ioredis = require("ioredis");
const fs = require("fs");
const admin = require("firebase-admin");

const serviceAccount = require("./fbkey.json");

const init = require("./cron-jobs/init");
const redis = require("./modules/redis");

const app = express();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

app.use(express.json());
app.use(helmet());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "bobux.gg");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
  res.header(
    "Access-Control-Allow-Headers",
    "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, Authorization, Authentication"
  );

  next();
});

//dynamic route loading
fs.readdir("./routes", (error, files) => {
  files.forEach((file) => {
    app.use("/", require(`./routes/${file}`));
  });
});

redis.setConnection(new ioredis());

redis.setProxies(
  fs.readFileSync("proxies.txt").toString().replace(/\r/g, "").split(/\n/g)
);

mongoose.connect(
  "mongodb://127.0.0.1:27017/bobuxgg",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true,
  },
  async () => {
    console.log("Connected to MongoDB!");

    app.listen(3000, () => {
      console.log("HTTP server listening on port 3000!");
    });

    init.init();
  }
);
