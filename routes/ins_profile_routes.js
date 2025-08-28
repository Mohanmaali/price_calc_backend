const express = require("express");
const Router = express.Router();

const {
    search_insulated_input_code,
    get_weight_cost,
    add_insulated_input,
    get_insulated_input,
    get_single_insulted_input,
    delete_insulated_input,
    update_insulated_input,
    get_insulated_price_list,
    refresh_price_list,
    get_Insulated_SubSystems,
    generate_insulated_pl,
    add_insulated_package,
    get_single_insulated_package,
    update_insulated_package,
    ins_profile_assigned_to,
    get_ins_avlb_for_package,
    create_duplicate_ins,
    generate_insulated_package_pl,
    get_ins_package_pl,
    refresh_insulated_package_price_list,
    get_insulated_packages,
} = require("../controllers/ins_profile_controllers");
const auth = require("../middleware/auth");
const role_auth = require("../middleware/role_auth");
const upload = require("../middleware/photo_middleware");

//Insulated
Router.route("/input/search-code").get(
    role_auth(),
    search_insulated_input_code
);
Router.route("/input/get-weight-cost").get(role_auth(), get_weight_cost);
Router.route("/input/add").post(
    role_auth(),
    upload.single("photo"),
    add_insulated_input
);
Router.route("/input/get_all").get(role_auth(), get_insulated_input);
Router.route("/input/get_single/:id").get(
    role_auth(),
    get_single_insulted_input
);
Router.route("/input/assigned/:id").get(
    role_auth(),
    ins_profile_assigned_to
);
Router.route("/input/delete/:id").delete(role_auth(), delete_insulated_input);
Router.route("/input/create-duplicate").post(
    role_auth(),
    upload.single("photo"),
    create_duplicate_ins
);
Router.route("/input/update/:id").patch(
    role_auth(),
    upload.single("photo"),
    update_insulated_input
);

//INsulated Price List
Router.route("/price_list/get").get(role_auth(), get_insulated_price_list);
Router.route("/price_list/generate").get(role_auth(), generate_insulated_pl);
Router.route("/price_list/refresh").get(role_auth(), refresh_price_list);

//packages
Router.route("/package/add").post(role_auth(), add_insulated_package);
Router.route("/package/get").get(role_auth(), get_insulated_packages);
Router.route("/package/get_one/:id").get(
    role_auth(),
    get_single_insulated_package
);
Router.route("/package/update/:id").post(role_auth(), update_insulated_package);
Router.route("/package/available").get(role_auth(), get_ins_avlb_for_package);
//package pl
Router.route("/package/price-list/genrate-price-list").get(
    auth,
    refresh_insulated_package_price_list
);
Router.route("/package/price-list/get").get(role_auth(), get_ins_package_pl);

//Search Subsystem
Router.route("/input/search-subsystem").get(
    role_auth(),
    get_Insulated_SubSystems
);
module.exports = Router;
