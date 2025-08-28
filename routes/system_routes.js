const express = require("express");
const Router = express.Router();

const {
    add_system,
    get_all_systems,
    delete_system,
    get_single_system,
    update_system,
    assigned_systems,
    systems_assigned_to,
    combinedSystem,
} = require("../controllers/system_controllers");

const auth = require("../middleware/auth");
const role_auth = require("../middleware/role_auth");

Router.route("/add").post(role_auth(), add_system);
Router.route("/get_all").get(role_auth(), get_all_systems);
Router.route("/get_one/:id").get(role_auth(), get_single_system);
Router.route("/update/:id").patch(role_auth(), update_system);
Router.route("/delete/:id").delete(role_auth(), delete_system);
Router.route("/assigned-systems").get(role_auth(), assigned_systems);
Router.route("/assigned-to/:id").get(role_auth(), systems_assigned_to);
Router.route("/combined-system").get(role_auth(), combinedSystem);

module.exports = Router;
