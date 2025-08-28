const express = require("express");
const Router = express.Router();

const {
  add_hourly_rate,
  get_hourly_rate,
  delete_rate,
  get_single_rate,
  update_rate,
  hourly_rate_assigned_to,
} = require("../controllers/hourly_rate_controller");
const auth = require("../middleware/auth");
const role_auth = require("../middleware/role_auth");

Router.route("/add").post(role_auth(), add_hourly_rate);
Router.route("/get_all").get(role_auth(), get_hourly_rate);
Router.route("/get_one/:id").get(role_auth(), get_single_rate);
Router.route("/update/:id").patch(role_auth(), update_rate);
Router.route("/delete/:id").delete(role_auth(), delete_rate);
Router.route("/assigned-rate/:id").get(role_auth(), hourly_rate_assigned_to);

module.exports = Router;
