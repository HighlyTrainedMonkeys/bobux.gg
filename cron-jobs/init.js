//initialize all cron jobs
//just something to keep the main app file clean
const fs = require("fs");

module.exports.init = () => {
  let files = fs.readdirSync(__dirname).filter((f) => f !== "init.js");

  files.forEach((file) => {
    console.log(`Initializing ${file}...`);
    require(`${__dirname}/${file}`).init();
  });
};
