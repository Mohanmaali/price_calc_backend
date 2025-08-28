const express = require("express");
const Router = express.Router();

const {
  add_extrusion,
  get_extrusions,
  get_single_extrusion,
  update_extrusion,
  delete_extrusion,
  search_operation,
  get_crimping,
  operation_assigned_to,
} = require("../controllers/extrusion_controllers");
const auth = require("../middleware/auth");
const role_auth = require("../middleware/role_auth");

Router.route("/add").post(role_auth(), add_extrusion);
Router.route("/get_all").get(role_auth(), get_extrusions);
Router.route("/get_one/:id").get(role_auth(), get_single_extrusion);
Router.route("/update/:id").patch(role_auth(), update_extrusion);
Router.route("/delete/:id").delete(role_auth(), delete_extrusion);
Router.route("/search").get(role_auth(), search_operation);
Router.route("/get-crimping").get(role_auth(), get_crimping);
Router.route("/assigned-operation/:id").get(role_auth(), operation_assigned_to);

module.exports = Router;
