//postbacks for offerwalls and gleam.io
require("dotenv").config();

const router = require("express").Router();
const Joi = require("@hapi/joi");

const whitelist = require("../middlewares/whitelist");

const User = require("../models/User");
const Completed = require("../models/Completed");

router.all(
  "/api/v1/postback/:rid/:oid/:name/:offerwall/:usd",
  whitelist,
  async (req, res) => {
    try {
      if (typeof req.params.id !== "number")
        return res.status(400).json({
          status: "error",
          error: "Invalid RID!",
        });

      if (typeof req.params.usd !== "number")
        return res.status(400).json({
          status: "error",
          error: "Invalid USD amount!",
        });

      if (
        Joi.string()
          .alphanum()
          .allow([" ", "-", "_"])
          .validate(req.params.offerwall).error
      )
        return res.status(400).json({
          status: "error",
          error: "Invalid offerwall name!",
        });

      if (
        Joi.string().alphanum().allow([" ", "-", "_"]).validate(req.params.name)
          .error
      )
        return res.status(400).json({
          status: "error",
          error: "Invalid offer name!",
        });

      if (
        Joi.string().alphanum().allow([" ", "-", "_"]).validate(req.params.oid)
          .error
      )
        return res.status(400).json({
          status: "error",
          error: "Invalid OID!",
        });

      let rate = parseInt(process.env.ROBUX_PER_DOLLAR);
      let conversion = Math.floor(parseFloat(req.params.usd) * rate);

      let user = await User.findOneAndUpdate(
        { rid: req.params.rid },
        {
          $inc: { balance: conversion },
          banned: conversion < 0 ? true : false, //if there is a chargeback, this bans the user
        },
        { new: true }
      );

      if (!user)
        return res.status(400).json({
          status: "error",
          error: "Invalid user!",
        });

      if (conversion > 0) {
        let completed = new Completed({
          name: req.params.name,
          oid: req.params.oid,
          offerwall: req.params.offerwall,
          rid: req.params.rid,
          amount: conversion,
        });

        await completed.save();
      }

      res.status(200).json({
        status: "success",
        result: {
          message:
            conversion > 0
              ? "Postback credited successfully!"
              : "User was banned successfully!",
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        status: "error",
        error: "Internal error!",
      });
    }
  }
);

module.exports = router;
