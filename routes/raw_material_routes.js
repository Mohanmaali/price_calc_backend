const express = require("express");
const Router = express.Router();

const {
  add_raw_material,
  get_all_raw_material,
  get_single_raw_material,
  update_raw_material,
  delete_raw_material,
  raw_material_assigned_to,
  getAlloysForOperartion,
} = require("../controllers/raw_material_controllers");
const auth = require("../middleware/auth");
const role_auth = require("../middleware/role_auth");

Router.route("/add").post(role_auth(), add_raw_material);
Router.route("/get_all").get(role_auth(), get_all_raw_material);
Router.route("/get_single/:id").get(role_auth(), get_single_raw_material);
Router.route("/update/:id").patch(role_auth(), update_raw_material);
Router.route("/delete/:id").delete(role_auth(), delete_raw_material);
Router.route("/assigned-material/:id").get(role_auth(), raw_material_assigned_to);
Router.route("/get-all-alloys").get(role_auth(), getAlloysForOperartion);

module.exports = Router;
