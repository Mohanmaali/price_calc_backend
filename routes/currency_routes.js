const express = require("express");
const Router = express.Router();

const {
  add_currency,
  get_all_currency,
  get_single_currency,
  update_currency,
  delete_currency,
  currency_assigned_to,
} = require("../controllers/currency_controllers");
const auth = require("../middleware/auth");
const role_auth = require("../middleware/role_auth");

Router.route("/add").post(role_auth(), add_currency);
Router.route("/get_all").get(role_auth(), get_all_currency);
Router.route("/get_one/:id").get(role_auth(), get_single_currency);
Router.route("/update/:id").patch(role_auth(), update_currency);
Router.route("/delete/:id").delete(role_auth(), delete_currency);
Router.route("/assigned-currency/:id").get(role_auth(), currency_assigned_to);

module.exports = Router;
