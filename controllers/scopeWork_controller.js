const Scope_Work = require("../models/scopeWork_Model");

const addScope = async (req, res) => {
  try {
    const { scope_work, selectedDept, selectedTeamId } = req.body;
    const { scope_of_work, order } = scope_work
    if (!scope_of_work || !selectedDept.id || !order) {
      return res.status(400).json({ mssg: "All Fields Are Mandatory" });
    }

    const normalizedName = scope_of_work.trim().toLowerCase();

    const isScopeNameIsExist = await Scope_Work.findOne({
      department: selectedDept.id, // Filter by department
      scope_of_work: { $regex: `^${normalizedName}$`, $options: 'i' } // Case-insensitive exact match
    });

    if (isScopeNameIsExist) {
      return res.status(400).json({
        mssg: "Scope of Work already exists in this department"
      });
    }

    if (selectedTeamId !== "null") {
      const new_type = await Scope_Work.create({
        scope_of_work,
        department: selectedDept.id,
        teamId: selectedTeamId,
        order
      });
    } else {
      const new_type = await Scope_Work.create({
        scope_of_work,
        department: selectedDept.id,
        // teamId: selectedTeamId,
        order
      });
    }


    return res.status(200).json({ mssg: "Client Type Added" });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      // success:false,
      mssg: error?.message
    })
  }
};

const getScope = async (req, res) => {
  try {
    const { departmentId, scopeOfWork, teamId } = req.query;

    const filter = {};
    if (departmentId && departmentId !== "null" && departmentId !== "undefined") {
      filter.department = departmentId;
    }

    if (scopeOfWork && scopeOfWork.trim().length > 0) {
      filter.scope_of_work = { $regex: scopeOfWork.trim(), $options: "i" }; // case-insensitive search
    }

    if (teamId && teamId !== "null" && teamId !== "undefined") {
      filter.teamId = teamId
    }

    // const data = await Scope_Work.find(filter).populate("department").populate("teamId");
    const data = await Scope_Work.find(filter)
      .populate({ path: "department", select: "_id name" })
      .populate({ path: "teamId", select: "_id name" });

    res.status(200).json({ data });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};

const getScopeById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await Scope_Work.findById(id).populate("department").populate('teamId');
    res.status(200).json({ data });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};

const updateScope = async (req, res) => {
  try {
    const { scope_work, selectedDept, selectedTeamId } = req.body
    const order = Number(scope_work?.order)
    const { scope_of_work } = scope_work
    const { id } = req.params;

    const normalizedName = scope_of_work.trim().toLowerCase();

    const isScopeNameIsExist = await Scope_Work.findOne({
      _id: { $ne: id },
      department: selectedDept.id,
      scope_of_work: { $regex: `^${normalizedName}$`, $options: 'i' } // Case-insensitive match
    });

    if (isScopeNameIsExist) {
      return res.status(400).json({
        mssg: "Scope of Work already exists in this department"
      });
    }


    if (selectedTeamId !== null) {
      const data = await Scope_Work.findByIdAndUpdate(id, { scope_of_work, department: selectedDept.id, teamId: selectedTeamId, order: order }, {
        new: true,
      });
    } else {
      const data = await Scope_Work.findByIdAndUpdate(id, { scope_of_work, department: selectedDept.id, order: order }, {
        new: true,
      });
    }

    res.status(200).json({ mssg: "Data Updated" });
  } catch (error) {
    console.log("err", error);
    res.status(500).json({
      mssg: error?.message
    })
  }
};

const deleteScope = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await Scope_Work.findByIdAndDelete(id);
    res.status(200).json({ mssg: "Data Deleted", data });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};

module.exports = {
  addScope,
  getScope,
  getScopeById,
  updateScope,
  deleteScope,
};
