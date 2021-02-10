const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");
const cron = require("node-cron");
const redis = require("../modules/redis");

const User = require("../models/User");

const main = async () => {
  let entries = await redis.getGiveawayEntries();
  let info = await redis.getGiveawayInfo();
  let wid = entries[Math.floor(Math.random() * entries.length)]; //winner id

  let user = await User.findOneAndUpdate(
    { rid: wid },
    { $inc: { balance: info.amount } },
    { new: true }
  );

  await redis.setGiveawayInfo({
    amount: info.amount,
    lastWinner: user.username,
  });
};

module.exports.init = () => {
  cron.schedule("0 */2 * * *", async () => {
    try {
      let info = await redis.getGiveawayInfo();
      //TODO: make this configurable
      await redis.setGiveawayInfo({
        amount: 5,
        lastWinner: info ? info.lastWinner : "No one!",
      });
      await main();
    } catch (error) {
      console.error(error);
    Sentry.captureException(error);
    }
  });
};
