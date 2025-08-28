const jwt = require("jsonwebtoken");
const User_model = require("../models/user_model");
const Department = require("../models/department_model");
const Position = require("../models/position");

const routePermissions = {
  "/api/invite": "Invite",
  "/api/department": "Department",
  "/api/auth": "Invite",
  "/api/user": "Employee",
  "/api/currency": "Currency",
  "/api/raw_material": "Raw Material",
  "/api/extrusion": "Extrusion",
  "/api/organization": "Organization",
  "/api/finish": "Finish",
  "/api/group": "Group",
  "/api/hourly-rate": "Hourly Rate",
  "/api/raw-material": "Raw Material",
  "/api/material": "Material",
  "/api/system": "System",
  "/api/supplier": "Supplier",
  "/api/operation": "Operational Cost",
  "/api/packaging": "Packaging",
  "/api/unit": "Unit",
  "/api/pdf-fields": "PDF Format",

  // client
  "/api/client": "Clients",
  "/api/client/client-type": "Clients",

  //input
  "/api/accessories/input": "Input Entry",
  "/api/non-insulated-profile/input": "Input Entry",
  "/api/insulated-profile/input": "Input Entry",
  "/api/kit/input": "Input Entry",

  //Package
  "/api/accessories/package": "Package Entry",
  "/api/non-insulated-profile/package": "Package Entry",
  "/api/insulated-profile/package": "Package Entry",
  "/api/kit/package": "Package Entry",

  //Price List
  "/api/accessories/price_list": "Price List",
  "/api/non-insulated-profile/price_list": "Price List",
  "/api/insulated-profile/price_list": "Price List",
  "/api/kit/price_list": "Price List",

  //Package Price Lisr
  "/api/accessories/package/price-list": "Package Price List",
  "/api/non-insulated-profile/package/price-list": "Package Price List",
  "/api/insulated-profile/package/price-list": "Package Price List",
  "/api/kit/package/price-list": "Package Price List",

  "/api/combined_pl": "Export",
  "/api/stock": "Master Inventory",

  // project Inquiry
  "/api/project-inquiry": "Project Inquiry",
  "/api/project-inquiry-type" : "Project Inquiry Types",

  // project
  "/api/project": "Project",
  // "/api/scope": "Project",
  "/api/scope-of-work" : "Scope Of Work",

  // purchase order
  "/api/purchase-order": "Purchase Order",
  // "/api/notifications": "Purchase Order",

  "/api/inquiry": "Inquiry",
  "/api/actions": "Actions",
  
  // teams
  "/api/team": "Teams"
};

const methodMap = {
  POST: "create",
  GET: "read",
  PATCH: "update",
  DELETE: "delete",
  PUT: "update"
};

const getMergedTabs = (deptTabs, userTabs) => {
  const merged = {};

  deptTabs.forEach((tab) => {
    merged[tab.name] = { ...tab.toObject?.() || tab }; // <-- Convert to plain object
  });

  userTabs.forEach((override) => {
    const overridePlain = override.toObject?.() || override;
    if (merged[overridePlain.name]) {
      merged[overridePlain.name] = {
        ...merged[overridePlain.name],
        ...overridePlain,
      };
    } else {
      merged[overridePlain.name] = { ...overridePlain };
    }
  });

  return Object.values(merged);
};

const getUserWithPopulatedTabs = async (id) => {
  try {
    const user = await User_model.findById(id).lean();
    // console.log("User ",user);
    

    // Iterate through roleGroups and fetch position details (including tabs)
    const populatedRoleGroups = await Promise.all(
      user.roleGroups.map(async (group) => {
        const populatedPositions = await Promise.all(
          group.positions.map(async (pos) => {
            const positionDoc = await Position.findById(pos.positionId).lean();
            return {
              ...pos,
              tabs: positionDoc?.tabs || [],
              image: positionDoc?.image || "",
            };
          })
        );

        return {
          ...group,
          positions: populatedPositions,
        };
      })
    );

    const updatedUser = {
      ...user,
      roleGroups: populatedRoleGroups,
    };

    // return res.json(updatedUser);
    return updatedUser
  } catch (err) {
    console.error(err);
    // return res.status(500).json({ error: "Internal server error" });
    return {}
  }
};


const role_auth = () => {
  return async (req, res, next) => {
    try {
      const header = req.header("Authorization");
      if (!header || !header.startsWith("Bearer ")) {
        return res
          .status(401)
          .json({ mssg: "Unauthorized: No token provided" });
      }

      const token = header.split(" ")[1];
      const verify = jwt.verify(token, process.env.JWT);

      const userRoleGroups = await getUserWithPopulatedTabs(verify?.id);
      const allPositions = userRoleGroups?.roleGroups?.flatMap(group => group.positions) || [];
      const allTabs = allPositions.flatMap(pos => pos.tabs || []);
      
      // Step 3: Merge tabs by name with OR logic on permissions
      const mergedTabsMap = allTabs.reduce((acc, tab) => {
        if (!acc[tab.name]) {
          acc[tab.name] = { ...tab };
        } else {
          acc[tab.name].read = acc[tab.name].read || tab.read;
          acc[tab.name].create = acc[tab.name].create || tab.create;
          acc[tab.name].update = acc[tab.name].update || tab.update;
          acc[tab.name].delete = acc[tab.name].delete || tab.delete;
          acc[tab.name].visibility = acc[tab.name].visibility || tab.visibility;
        }
        return acc;
      }, {});
      
      const mergedTabs = Object.values(mergedTabsMap);

      // const user = await User_model.findById(verify.id).populate("position");
      const user = await User_model.findById(verify.id);
      if (!user) {
        return res.status(401).json({ mssg: "Unauthorized: User not found" });
      }

      // Checking user atleast one position assigned
      const hasPositionInRoleGroups =  user?.roleGroups?.some(group => Array.isArray(group.positions) && group.positions.length > 0);

      // // Example usage:
      // if (hasPositionInRoleGroups) {
      //   console.log("User has at least one position in roleGroups.");
      // } else {
      //   console.log("User has no position in roleGroups.");
      // }
      

      if (!hasPositionInRoleGroups) {
        return res
          .status(403)
          .json({ mssg: "Unauthorized: No Position assigned" });
      }
      // const allowedTabs = user.position.tabs || [];
      const allowedTabs = mergedTabs || []
      const admin = verify?.isAdmin;
      // const allowedTabs = getMergedTabs(user.department.tabs || [], user.tabs || []);
      const requestPath = req.originalUrl.split("?")[0];
      const matchedRoute = Object.keys(routePermissions).find((route) => {
        return requestPath.startsWith(route);
      });

      if (!matchedRoute) {
        return res.status(403).json({
          mssg: "Access Denied: No permission mapping found for this endpoint.",
        });
      }

      const requiredTab = routePermissions[matchedRoute];
      const requiredPermission = methodMap[req.method];

      // console.log("Matched Route:", matchedRoute);
      // console.log("Required Tab:", requiredTab);
      // console.log("Required Permission:", requiredPermission);
      // console.log(allowedTabs)
      const allowedTabPermissions = allowedTabs.find(
        (itm) => itm.name === requiredTab && itm[requiredPermission]
      )
      if (
        // user.department.name === "Admin" ||
        // allowedTabPermissions
        admin ||
        allowedTabPermissions
      ) {
        req.user = user;
        req.allowedTabPermissions = allowedTabPermissions
        return next();
      }

      return res.status(403).json({
        mssg: "Access Denied: Your position does not have the necessary permissions to perform this operation.",
      });
    } catch (err) {
      console.error(err);
      return res.status(400).json({ error: err.message });
    }
  };
};

module.exports = role_auth;