const request = require("request");
const needle = require("needle");

//TODO: possibly proxify these?

module.exports.getGroupIcon = async (gid) => {
  try {
    let result = await needle(
      "get",
      `https://thumbnails.roblox.com/v1/groups/icons?groupIds=${gid}&size=150x150&format=Png`,
      {
        json: true,
      }
    );

    if (
      result.statusCode !== 200 ||
      result.body.data.length < 1 ||
      body.data[0].state !== "Completed"
    )
      return "https://t1.rbxcdn.com/3ea55b7468646f685e8cc65cbf0be9f6";

    return body.data[0].imageUrl;
  } catch (error) {
    throw error;
  }
};

module.exports.getGroupIconOLD = (gid) => {
  return new Promise((res, rej) => {
    request.get(
      `https://thumbnails.roblox.com/v1/groups/icons?groupIds=${gid}&size=150x150&format=Png`,
      {
        json: true,
      },
      (error, response, body) => {
        if (error)
          return rej({
            retry: true,
            message:
              "There was an error communicating with the Roblox server! Please try again!",
            RBX_ERR_CODE: "NETWORK_ERROR",
          });

        if (response.statusCode !== 200)
          return res("https://t1.rbxcdn.com/3ea55b7468646f685e8cc65cbf0be9f6");

        if (body.data.length < 1)
          return res("https://t1.rbxcdn.com/3ea55b7468646f685e8cc65cbf0be9f6");

        if (body.data[0].state !== "Completed")
          return res("https://t1.rbxcdn.com/3ea55b7468646f685e8cc65cbf0be9f6");

        res(body.data[0].imageUrl);
      }
    );
  });
};

module.exports.getIdFromUser = async (username) => {
  try {
    let result = await needle(
      "get",
      `https://api.roblox.com/users/get-by-username?username=${username}`,
      { json: true }
    );

    if (result.statusCode !== 200)
      throw {
        retry: true,
        message:
          "There was an error communicating with the Roblox server! Please try again!",
        RBX_ERR_CODE: "NETWORK_ERROR",
      };

    //we check to see if success is equal to false because when its successful
    //it doesnt return the "success" property
    if (result.body.success == false)
      throw {
        retry: false,
        message: "User not found!",
        RBX_ERR_CODE: "USER_NOT_FOUND",
      };

    return result.body.Id;
  } catch (error) {
    throw error;
  }
};

module.exports.getIdFromUserOLD = (username) => {
  return new Promise((res, rej) => {
    //convert
    //TODO: enable proxies on this!!
    request.get(
      `https://api.roblox.com/users/get-by-username?username=${username}`,
      {
        json: true,
        //proxy: `http://${proxy}`,
      },
      (error, response, body) => {
        if (error)
          return rej({
            retry: true,
            message:
              "There was an error communicating with the Roblox server! Please try again!",
            RBX_ERR_CODE: "NETWORK_ERROR",
          });

        if (response.statusCode !== 200)
          return rej({
            retry: false,
            message: "Internal error!",
            RBX_ERR_CODE: "INTERNAL_ERROR",
          });

        if (body.success == false)
          return rej({
            retry: false,
            message: "User not found!",
            RBX_ERR_CODE: "USER_NOT_FOUND",
          });

        res(body.Id);
      }
    );
  });
};

//TODO: finish this and test it
module.exports.groupPayout = async (cookie, gid, amount, username) => {
  try {
    let result = await needle(
      "post",
      `https://groups.roblox.com/v1/groups/${gid}/payouts`,
      {
        headers: {
          Cookie: `.ROBLOSECURITY=${cookie}`,
        },
        json: true,
      }
    );

    let xsrf = result.headers["x-csrf-token"];
  } catch (error) {
    throw error;
  }
};

module.exports.getCookieInfo = async (cookie) => {
  try {
    let result = await needle(
      "get",
      "https://www.roblox.com/mobileapi/userinfo",
      {
        json: true,
        headers: {
          Cookie: `.ROBLOSECURITY=${cookie}`,
        },
      }
    );

    if (typeof result.body !== "object")
      throw {
        retry: false,
        message: "Invalid cookie or account banned!",
        RBX_ERR_CODE: "INVALID_COOKIE",
      };

    return result.body;
  } catch (error) {
    throw error;
  }
};

module.exports.getGroupBalance = async (gid, cookie) => {
  try {
    let result = await needle(
      "get",
      `https://economy.roblox.com/v1/groups/${gid}/currency`,
      {
        headers: {
          Cookie: `.ROBLOSECURITY=${cookie}`,
        },
        json: true,
      }
    );

    if (result.statusCode !== 200)
      throw {
        retry: false,
        message: result.body.errors[0].message,
        RBX_ERR_CODE: "FUND_CHECK_FAILED",
      };

    return parseInt(result.body.robux);
  } catch (error) {
    throw error;
  }
};

module.exports.verifyMembership = async (rid, gid) => {
  try {
    let result = await needle(
      "get",
      `https://api.roblox.com/users/${rid}/groups`,
      { json: true }
    );

    if (result.body.length < 1)
      throw {
        retry: false,
        message:
          "You have not joined the group! Please join the group and try again!",
        RBX_ERR_CODE: "USER_NOT_IN_GROUP",
      };

    let group = result.body.find((g) => g.Id == gid);

    if (!group)
      throw {
        retry: false,
        message:
          "You have not joined the group! Please join the group and try again!",
        RBX_ERR_CODE: "USER_NOT_IN_GROUP",
      };

    return "User is in the group!";
  } catch (error) {
    throw error;
  }
};

module.exports.verifyOwnership = async (rid, gid) => {
  try {
    let result = await needle(
      "get",
      `https://groups.roblox.com/v1/groups/${gid}`,
      {
        json: true,
      }
    );

    if (result.statusCode !== 200)
      throw {
        retry: false,
        message: result.body.errors[0].message,
        RBX_ERR_CODE: "OWNERSHIP_CHECK_FAILED",
      };

    if (!result.body.owner)
      throw {
        retry: false,
        message: "Group has no owner!",
        RBX_ERR_CODE: "NO_OWNER",
      };

    if (result.body.owner.userId !== rid)
      throw {
        retry: false,
        message: "You are not the owner of that group!",
        RBX_ERR_CODE: "USER_NOT_OWNER",
      };

    return result.body;
  } catch (error) {
    throw error;
  }
};
