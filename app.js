const express = require("express");
const helmet = require("helmet");
const mongoose = require("mongoose");
const ioredis = require("ioredis");
const fs = require("fs");
const admin = require("firebase-admin");
const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");

Sentry.init({
  dsn: "https://b527502e32dc4fdc83245f5fdd10a069@o435421.ingest.sentry.io/5626944",
  tracesSampleRate: 1.0,
});

const serviceAccount = require("./fbkey.json");

const init = require("./cron-jobs/init");
const redis = require("./modules/redis");

const app = express();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

app.disable("x-powered-by");

app.use(express.json());
app.use(helmet());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
  res.header(
    "Access-Control-Allow-Headers",
    "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, Authorization, Authentication, Username"
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

    app.listen(5000, () => {
      console.log("HTTP server listening on port 5000!");
    });

    init.init();
  }
);
