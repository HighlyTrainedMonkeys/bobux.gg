//cache offerwall results in redis so they load much faster when a user requests them
const configs = require("../offerwalls.json");
const offerwall = require("../modules/offerwall");
const redis = require("../modules/redis");
const cron = require("node-cron");

const main = async (configPosition) => {
  let toCache = configs.filter((c) => c.cache);
  let config = toCache[configPosition];

  if (!config) return;

  try {
    let offers = await offerwall.getOffers(config);
    await redis.setOffers(config.name.toLowerCase(), offers);
  } catch (error) {
    console.log(error);
    main(configPosition + 1);
  }
};

module.exports.init = () => {
  cron.schedule("0 */2 * * *", async () => {
    try {
      await main(0);
    } catch (error) {
      console.error(error);
    }
  });
};
