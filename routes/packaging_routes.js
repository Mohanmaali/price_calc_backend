const express = require("express");
const Router = express.Router();

const {
  add_material,
  get_material,
  get_single_material,
  update_material,
  delete_material,
  add_unit,
  get_units,
  get_single_unit,
  update_unit,
  get_unit_type,
  delete_unit,
  material_assigned_to,
} = require("../controllers/packaging_controller");
const auth = require("../middleware/auth");
const role_auth = require("../middleware/role_auth");

//materials
Router.route("/add").post(role_auth(), add_material);
Router.route("/get_all").get(role_auth(), get_material);
Router.route("/get_one/:id").get(role_auth(), get_single_material);
Router.route("/update/:id").patch(role_auth(), update_material);
Router.route("/delete/:id").delete(role_auth(), delete_material);
Router.route("/assigned-material/:id").get(role_auth(), material_assigned_to);

//units
Router.route("/unit/add").post(role_auth(), add_unit);
Router.route("/unit/get_all").get(role_auth(), get_units);
Router.route("/unit/get_one/:id").get(role_auth(), get_single_unit);
Router.route("/unit/update/:id").patch(role_auth(), update_unit);
Router.route("/unit/delete/:id").delete(role_auth(), delete_unit);
Router.route("/unit/get-unit-types").get(role_auth(), get_unit_type);
module.exports = Router;
