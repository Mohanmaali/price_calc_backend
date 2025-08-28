const Router = require("express").Router();

const {
  addGlass,
  get_glasses,
  get_single_glass,
  update_glass,
} = require("../controllers/glasses_controller");

const role_auth = require("../middleware/role_auth");

Router.route("/add").post(role_auth(), addGlass);
Router.route("/get").get(role_auth(), get_glasses);
Router.route("/get/:id").get(role_auth(), get_single_glass);
Router.route("/update/:id").post(role_auth(), update_glass);

module.exports = Router;
