const express = require("express");
const Router = express.Router();

const {
  add_project,
  get_all_projects,
  get_single_project,
  update_project,
  get_project_with_code,
  move_code,
  delete_project,
  update_status,
  code_in_projects,
  revert_code,
  increase_required_qnt,
  project_pdf,
  import_excel_file,
  revert_issued_code,
  get_project_Client_name,
  get_Project,
  findCodeWithMilutipleSupplier,
} = require("../controllers/projects_controller");
const auth = require("../middleware/auth");
const role_auth = require("../middleware/role_auth");
const upload = require("../middleware/photo_middleware");

Router.route("/add").post(
  role_auth(),
  upload.fields([
    { name: "client_confirmation", maxCount: 1 },
    { name: "quotation_number", maxCount: 1 },
    { name: "files", maxCount: 10 },
    { name: "file", maxCount: 10 },
  ]),
  add_project
);
Router.route("/get").get(role_auth(), get_all_projects);
Router.route("/getProject").get(role_auth(), get_Project);
Router.route("/get/:id").get(role_auth(), get_single_project);
Router.route("/update/:id").patch(
  role_auth(),
  upload.fields([
    { name: "client_confirmation", maxCount: 1 },
    { name: "quotation_number", maxCount: 1 },
    { name: "files", maxCount: 10 },
  ]),
  update_project
);
Router.route("/update-status/:id").get(role_auth(), update_status);
Router.route("/delete/:id").delete(role_auth(), delete_project);
Router.route("/projects-with-code").post(role_auth(), get_project_with_code);
Router.route("/code-move/revert").post(role_auth(), revert_code);
Router.route("/code-move/revert-issued").post(role_auth(), revert_issued_code);
Router.route("/code-move/:code").post(role_auth(), move_code);
Router.route("/increase-required/:project").post(
  role_auth(),
  increase_required_qnt
);
Router.route("/proj-for-code/:code_id").get(role_auth(), code_in_projects);
Router.route("/generate-pdf/:id").get(role_auth(), project_pdf);
Router.route("/import").post(
  role_auth(),
  upload.single("file"),
  import_excel_file
);
Router.route("/getprojectbyname").get(role_auth(), get_project_Client_name);
Router.route("/code-with-many-supplier").post(
  role_auth(),
  upload.fields([
    { name: "client_confirmation", maxCount: 1 },
    { name: "quotation_number", maxCount: 1 },
    { name: "files", maxCount: 10 },
    { name: "file", maxCount: 10 },
  ]),
  findCodeWithMilutipleSupplier
);
module.exports = Router;
