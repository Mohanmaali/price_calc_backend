const express = require("express");
const Router = express.Router();

const {
    get_actions,
    get_single_actions,
    get_actions_filter_data,
    get_action,
    create_new_actions
} = require("../controllers/actions_controllers");
const auth = require("../middleware/auth");
const role_auth = require("../middleware/role_auth");

Router.route("/create-updated").get(create_new_actions);


Router.route("/").get(role_auth(), get_actions);
Router.route("/for-supplier").get(role_auth(), get_action);
Router.route("/get-filter-data").get(role_auth(), get_actions_filter_data);
Router.route("/:code").get(role_auth(), get_single_actions);

module.exports = Router;
