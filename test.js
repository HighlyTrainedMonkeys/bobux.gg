const needle = require("needle");

let config = {
  "name": "ayetstudios",
  "displayName": "Offerwall #3",
  "offerwall_id": "2848",
  "apiKey": "e7d38946b7cac057dfc63c675653f432",
  "robuxPerDollar": 40,
  "cache": true
};

const getAyet = async () => {
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
        usd: o.payout_usd,
        id: o.id,
        url: o.tracking_link,
        icon: o.icon,
      };
    });

    return formatted;
  } catch (error) {
    throw error;
  }
};

(async () => {
  let result = await getAyet();

  console.log(result);
})();