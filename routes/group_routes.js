const express = require("express");
const Router = express.Router();

const role_auth = require("../middleware/role_auth");
const {
  add_group,
  get_groups,
  get_single_group,
  update_group,
  getCoatingsfromGroup,
  group_subgroup_assigned_to,
  delete_group,
} = require("../controllers/group_subgroup_controller");

Router.route("/add").post(role_auth(), add_group);
Router.route("/get-all").get(role_auth(), get_groups);
Router.route("/get/:id").get(role_auth(), get_single_group);
Router.route("/update/:id").patch(role_auth(), update_group);
Router.route("/get-coating").get(role_auth(), getCoatingsfromGroup);
Router.route("/assigned-group/:id").get(role_auth(), group_subgroup_assigned_to);
Router.route("/delete/:id").delete(role_auth(), delete_group);

module.exports = Router;
