const express = require("express");
const Router = express.Router();
const role_auth = require("../middleware/role_auth");
const auth = require("../middleware/auth");
const {
  get_combined_price_list,
  get_combined_package_price_list,
} = require("../controllers/combined_price_list_controller");

Router.route("/get").get(role_auth(), get_combined_price_list);
Router.route("/package-get").get(role_auth(), get_combined_package_price_list);

module.exports = Router;
