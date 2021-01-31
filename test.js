const needle = require("needle");
const roblox = require("./modules/roblox");

let username = "mosquitowo";

(async () => {
  try {
    let result = await roblox.getIdFromUser(username);
    console.log(result);
  } catch (error) {
    console.error(error);
  }
})();
