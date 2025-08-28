const Router = require("express").Router();

const {
  add_coating,
  get_all_coatings,
  get_single_coating,
  update_coating,
} = require("../controllers/coating_controller");

const role_auth = require("../middleware/role_auth");

Router.route("/add").post(role_auth(), add_coating);
Router.route("/get").get(role_auth(), get_all_coatings);
Router.route("/get/:id").get(role_auth(), get_single_coating);
Router.route("/update/:id").post(role_auth(), update_coating);

module.exports = Router;
