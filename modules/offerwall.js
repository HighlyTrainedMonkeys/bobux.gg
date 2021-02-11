const needle = require("needle");
const redis = require("./redis");
const ms = require("ms");

module.exports.getOffers = async (config, uid, ip) => {
  try {
    switch (config.name.toLowerCase()) {
      case "offertoro":
        return await getOffertoro(config, uid, ip);
      case "ayetstudios":
        return await getAyet(config, uid, ip);
      case "adgate":
        return await getAdgate(config, uid, ip);
    }
  } catch (error) {
    throw error;
  }
};

//cache results if config says to do so
const getOffertoro = async (config, uid, ip) => {};

const getAyet = async (config, uid, ip) => {
  try {
    let result = await needle(
      "get",
      `https://www.ayetstudios.com/offers/get/${config.offerwall_id}?apiKey=${config.apiKey}`,
      { json: true }
    );

    if (result.statusCode !== 200) throw "Error loading offerwall!";

    let formatted = result.body.offers.map((o) => {
      return {
        name: o.name,
        description: o.conversion_instructions_short,
        //usd: o.payout_usd,
        reward: Math.ceil(o.payout_usd * process.env.ROBUX_PER_DOLLAR),
        id: o.id,
        url: o.tracking_link,
        icon: o.icon,
      };
    });

    if(config.cache) {
      await redis.setOfferwallCache(config.name, {expiry: Date.now() + ms("15m"), offers: formatted});
    }

    return formatted;
  } catch (error) {
    throw error;
  }
};

const getAdgate = async (config, uid, ip) => {
  try {
    let result = await needle(
      "get",
      `https://wall.adgaterewards.com/apiv1/vc/${config.offerwall_id}/users/${uid}/offers?ip=${ip}`,
      { json: true }
    );

    if (result.statusCode !== 200) throw "Error loading offerwall!";

    let formatted = result.body.data.map((o) => {
      return {
        name: o.anchor,
        description: o.description,
        //usd: o.points,
        reward: Math.ceil(o.points * process.env.ROBUX_PER_DOLLAR),
        id: o.id,
        url: o.click_url,
        icon: o.icon_url,
      };
    });

    if(config.cache) {
      await redis.setOfferwallCache(config.name, {expiry: Date.now() + ms("15m"), offers: formatted});
    }

    return formatted;
  } catch (error) {
    throw error;
  }
};

const getCpx = async (config, uid, ip, ua) => {
  try {
    let result = await needle(
      "get",
      `https://live-api.cpx-research.com/api/get-surveys.php?app_id=${config.app_id}&ext_user_id=${uid}&subid_1=&subid_2=&output_method=api&ip_user=${ip}&user_agent=${ua}&limit=30&secure_hash=${config.secure_hash}`,
      { json: true }
    );

    if (result.statusCode !== 200) throw "Error loading offerwall!";

    let formatted = result.body.surveys.map((o) => {
      return {
        name: "CPX Research Task",
        description: "Take a survey and earn",
        //usd: o.points,
        reward: Math.ceil(o.payout_publisher_usd * process.env.ROBUX_PER_DOLLAR),
        id: o.id,
        url: o.href,
        icon: "https://i.imgur.com/5shjgYF.png",
      };
    });

    if(config.cache) {
      await redis.setOfferwallCache(config.name, {expiry: Date.now() + ms("15m"), offers: formatted});
    }

    return formatted;
  } catch (error) {
    throw error;
  }
};
