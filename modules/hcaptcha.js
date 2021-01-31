require("dotenv").config();

const needle = require("needle");

module.exports.verifyCaptcha = async (token, ip) => {
  try {
    let result = await needle(
      "post",
      `https://hcaptcha.com/siteverify?secret=${process.env.HCAPTCHA_SECRET}&response=${token}&remoteip=${ip}`,
      { json: true }
    );

    if (!result.body.success)
      throw {
        message: "Captcha failed! Try again!",
        CAPTCHA_CODE: "CAPTCHA_FAILED",
      };

    return "Captcha solved successfully!";
  } catch (error) {
    throw error;
  }
};
