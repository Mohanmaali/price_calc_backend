const express = require("express");
const Router = express.Router();

const {
  get_all_stocks,
  get_package_stock,
  get_stock_filter_data,
  get_for_prefill_lpo,
  get_all_loose_stock,
  get_code_from_ref,
  import_stock,
  update_open,
  package_pl,
  get_simple_package_filter_data,
  update_location,
  convert_package_to_loose,
  convert_loose_to_package,
  get_packages_list_for_loose,
  add_package,
  get_single_package,
  update_package,
  get_packages,
  acc_package_assigned_to,
  acc_loose_assigned_to,
  changeActivityStatus
} = require("../controllers/stock_controller");
const auth = require("../middleware/auth");
const role_auth = require("../middleware/role_auth");
const upload = require("../middleware/photo_middleware");

Router.route("/get").get(role_auth(), get_all_stocks);
Router.route("/get-package-stock").get(role_auth(), get_package_stock);
Router.route("/get-simple-filter-data").get(
  role_auth(),
  get_simple_package_filter_data
);
Router.route("/get-filter-data").get(role_auth(), get_stock_filter_data);
Router.route("/get-for-prefill-lpo").get(role_auth(), get_for_prefill_lpo);
Router.route("/get-loose").get(role_auth(), get_all_loose_stock);
Router.route("/get-code-from-ref/:ref").get(role_auth(), get_code_from_ref);
Router.route("/import").post(role_auth(), upload.single("file"), import_stock);
Router.route("/update-open/:id").patch(role_auth(), update_open);
Router.route("/update-location/:id").patch(role_auth(), update_location);
Router.route("/package/price-list").get(role_auth(), package_pl);
Router.route("/package/convert-to-loose").post(
  role_auth(),
  convert_package_to_loose
);

Router.route("/loose/convert-to-package").post(
  role_auth(),
  convert_loose_to_package
);
Router.route("/get-package-for-loose/:id").get(
  role_auth(),
  get_packages_list_for_loose
);

//packages
Router.route("/package/add").post(role_auth(), add_package);
Router.route("/packages/get").get(role_auth(), get_packages);
Router.route("/package/get_one/:id").get(
  role_auth(),
  get_single_package
);
Router.route("/package/update/:id").post(role_auth(), update_package);
// Router.route("/package/delete/:parentId/:packageId").delete(
//   role_auth(),
//   delete_package
// );
// Router.route("/loose/delete/:parentId/:packageId").delete(
//   role_auth(),
//   delete_loose
// );
Router.route("/package/assigned/:id").get(role_auth(), acc_package_assigned_to);
Router.route("/loose/assigned/:id").get(role_auth(), acc_loose_assigned_to);
Router.route("/change-activity-status").post(role_auth(), changeActivityStatus);

module.exports = Router;
