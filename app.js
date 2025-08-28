const express = require("express");
const cors = require("cors");
const bodyparser = require("body-parser");
const connect = require("./connect_db.js/connect");
const auth_routes = require("./routes/auth_routes");
const user_routes = require("./routes/user_routes");
const currency_routes = require("./routes/currency_routes");
const raw_material_routes = require("./routes/raw_material_routes");
const extrusion_routes = require("./routes/extrusion_routes");
const accessories_routes = require("./routes/accessories_routes");
const ins_profile_routes = require("./routes/ins_profile_routes");
const ni_profile_routes = require("./routes/ni_profile_routes");
const hourly_routes = require("./routes/hourly_routes");
const combined_pl = require("./routes/combined_pl_routes");
const kit_routes = require("./routes/kit_routes");
const stock_routes = require("./routes/stock_routes");
const purchase_routes = require("./routes/purchase_routes");
const project_routes = require("./routes/project_routes");
const project_inquiry_routes = require("./routes/project_inquiry_routes");
const notification_routes = require("./routes/notification_routes");
const packaging_routes = require("./routes/packaging_routes");
const inquiry_routes = require("./routes/inquiry_routes");
const group_routes = require("./routes/group_routes");
const client_routes = require("./routes/client_routes");
const unit_routes = require("./routes/unit_routes");
const logRoutes = require("./routes/log_routes");
const material_routes = require("./routes/material_routes");
const clientType_routes = require("./routes/clientType_route");
const scope_of_work = require("./routes/scopeWork_routes");
const department = require("./routes/department_route");
const organization = require("./routes/organization_route");
const pdf_fields = require("./routes/pdf_fields_routes");

const finish_routes = require("./routes/finish_routes");
const system_routes = require("./routes/system_routes");
const supplier_routes = require("./routes/supplier_routes");
const action_routes = require("./routes/action_routes");

const uitlity_routes = require("./routes/utility_routes")
const project_inquiry_types = require("./routes/project_inquiry_types_routes")
require("dotenv").config();
require("./cron")()

const app = express();

app.get("/", (req, res) => {
  return res.json("test");
});

app.use(express.json());
app.use(bodyparser.json());
app.use(
  cors({
    credentials: true,
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://phpstack-1164607-4084914.cloudwaysapps.com",
      "https://pricelist.webuilder.me",
      "https://price-list-calculator.ibrcloud.com",
      "https://phpstack-1164607-4576562.cloudwaysapps.com",
      "http://192.168.1.32:5173",
    ],
  })
);
app.use("/uploads", express.static("uploads"));
// app.use("/uploads", express.static(__dirname + "/uploads"));

//  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use("/api/auth", auth_routes);
app.use("/api/department", department);
app.use("/api/organization", organization);
app.use("/api/client", client_routes);
app.use("/api/clientType", clientType_routes);
app.use("/api/user", user_routes);
app.use("/api/currency", currency_routes);
app.use("/api/finish", finish_routes);
app.use("/api/group", group_routes);
app.use("/api/hourly-rate", hourly_routes);
app.use("/api/material", material_routes);
app.use("/api/raw-material", raw_material_routes);
app.use("/api/system", system_routes);
app.use("/api/supplier", supplier_routes);
app.use("/api/operation", extrusion_routes);
app.use("/api/packaging", packaging_routes);
app.use("/api/unit", unit_routes);
app.use("/api/scope-of-work", scope_of_work);

app.use("/api/accessories", accessories_routes);
app.use("/api/non-insulated-profile", ni_profile_routes);
app.use("/api/insulated-profile", ins_profile_routes);
app.use("/api/combined_pl", combined_pl);
app.use("/api/kit", kit_routes);
app.use("/api/stock", stock_routes);
app.use("/api/purchase-order", purchase_routes);
app.use("/api/project", project_routes);
app.use("/api/project-inquiry", project_inquiry_routes);
app.use("/api/project-inquiry-type", project_inquiry_types);

app.use("/api/notifications", notification_routes);
app.use("/api/actions", action_routes);
app.use("/api/inquiry", inquiry_routes);
app.use("/api/pdf-fields", pdf_fields);
app.use("/api/log", logRoutes);

app.use("/api/utility", uitlity_routes)


const PORT = process.env.PORT;
const start = async () => {
  try {
    await connect(process.env.MONGO_URL);
    const server = app.listen(PORT, () => {
      console.log(`app listening on port: ${PORT}`);
    });

    process.on("SIGINT", async () => {
      console.log("\nGracefully shutting down...");
      await mongoose.connection.close();
      server.close(() => {
        console.log("Server and MongoDB connections closed.");
        process.exit(0);
      });
    });
  } catch (error) {
    console.log(error);
  }
};
start();
