const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");
const cron = require("node-cron");
const redis = require("../modules/redis");
const roblox = require("../modules/roblox");

//TODO: implement proxies
const main = async () => {
  try {
    let groups = await redis.getGroups();
    let validatedGroups = [];

    if (!groups) return await redis.setStock(0);
    
    const enumerate = async () => {
      try {
        let total = validatedGroups.reduce((p, c) => {
          return p + c.balance;
        }, 0);
  
        await redis.setStock(total);
      } catch (error) {
        console.error(error);
    Sentry.captureException(error);
      }
    };

    const checkBalance = async (position) => {
      let group = groups[position];

      if (!group) return enumerate();

      try {
        group.balance = await roblox.getGroupBalance(group.gid, group.cookie);
        validatedGroups.push(group);
      } catch (error) {
        if (error.retry) {
          checkBalance(position);
        } else {
          checkBalance(position + 1);
        }
      }
    };

    checkBalance(0);
  } catch (error) {
    console.error(error);
    Sentry.captureException(error);
  }
};

module.exports.init = () => {
  cron.schedule("0-59/30 * * * * *", async () => {
    try {
      await main();
    } catch (error) {
      console.error(error);
    Sentry.captureException(error);
    }
  });
};
