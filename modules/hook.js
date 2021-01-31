const Discord = require("discord.js");
const hooks = require("../hooks.json");

module.exports.sendHook = async (name, content) => {
  try {
    let selected = hooks.find((h) => h.name == name);

    if (!selected) throw "Invalid webhook name!";

    let hook = new Discord.WebhookClient(selected.id, selected.token);

    await hook.send({ embed: content });
  } catch (error) {
    throw error;
  }
};
