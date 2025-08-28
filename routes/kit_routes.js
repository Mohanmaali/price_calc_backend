const express = require("express");
const Router = express.Router();

const {
  add_kit,
  search_system,
  search_group,
  search_subgroup,
  get_all_kit,
  get_single_kit,
  update_kit,
  delete_kit,
  kit_price_list,
  refresh_pl,
  search_kit,
  get_kit_system,
  generate_kit_pl,
  search_subsystems,
  add_kit_package,
  get_single_kit_package,
  update_kit_package,
  kit_assigned_to,
  get_kit_avlb_for_package,
  create_duplicate_kit,
  refresh_kit_package_price_list,
  get_kit_package_pl,
  get_kit_packages,
} = require("../controllers/kit_controllers");
const auth = require("../middleware/auth");
const role_auth = require("../middleware/role_auth");
const upload = require("../middleware/photo_middleware");

Router.route("/input/add").post(role_auth(), upload.single("photo"), add_kit);
Router.route("/input/get").get(role_auth(), get_all_kit);
Router.route("/input/get/:id").get(role_auth(), get_single_kit);
Router.route("/input/update/:id").patch(
  role_auth(),
  upload.single("photo"),
  update_kit
);
Router.route("/input/assigned/:id").get(role_auth(), kit_assigned_to);
Router.route("/input/delete/:id").delete(role_auth(), delete_kit);
Router.route("/search-system").get(role_auth(), search_system);
Router.route("/search-subsystem").get(role_auth(), search_subsystems);
Router.route("/search-group").get(role_auth(), search_group);
Router.route("/search-kit").get(auth, search_kit);
Router.route("/get-system").get(auth, get_kit_system);
Router.route("/search-subgroup").get(role_auth(), search_subgroup);
Router.route("/price_list").get(auth, kit_price_list);
Router.route("/generate_pl").get(auth, generate_kit_pl);
Router.route("/price_list/refresh").get(auth, refresh_pl);
Router.route("/create-duplicate").post(
  role_auth(),
  upload.single("photo"),
  create_duplicate_kit
);

//packages
Router.route("/package/add").post(role_auth(), add_kit_package);
Router.route("/packages/get").get(role_auth(), get_kit_packages);
Router.route("/package/get_one/:id").get(role_auth(), get_single_kit_package);
Router.route("/package/update/:id").post(role_auth(), update_kit_package);
Router.route("/package/available").get(role_auth(), get_kit_avlb_for_package);
//package pl
Router.route("/package/price_list/genrate-price-list").get(
  auth,
  refresh_kit_package_price_list
);
Router.route("/package/price_list/get").get(auth, get_kit_package_pl);

module.exports = Router;
