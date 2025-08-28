const { default: mongoose } = require("mongoose")
const InquiryType = require("../models/inquiryType")
const ProjectInquiry = require("../models/project_inquiry_model")


const addInquiryType = async (req, res) => {
    try {
      const name = req.body.inquiryType
      const newInquiryType = await InquiryType.create({ name })
      return res.status(200).json(newInquiryType)
    } catch (error) {
      console.log(error)
      return res.status(500).json({mssg: error?.message || 'Internal server error'})
    }
  }
  
  const getInquiryType = async (req, res) => {
    try {
      const inquiryType = await InquiryType.find()
      return res.status(200).json(inquiryType)
    } catch (error) {
      console.log(error)
      return res.status(500).json({mssg: error?.message || 'Internal server error'})
    }
  }
  
  const getSingleInquiryType = async (req, res) => {
    try {
      const { id } = req.params
      const inquiryType = await InquiryType.findById(id)
      return res.status(200).json(inquiryType)
    } catch (error) {
      console.log(error)
      return res.status(500).json({mssg: error?.message || 'Internal server error'})
    }
  }
  
  const updateInquiryType = async (req, res) => {
    try {
      const { id } = req.params
      const name = req.body.inquiryType
  
      const inquiryType = await InquiryType.findByIdAndUpdate(id, { name })
      return res.status(200).json({
        success: true,
        data: inquiryType
      })
    } catch (error) {
      console.log(error)
      return res.status(500).json({
        success: false,
        mssg: error?.message || 'Internal server error'
      })
    }
  }
  
  const deleteInquiryType = async (req, res) => {
    try {
      const { id } = req.params;
      const isExistsInAnyInquiry = await ProjectInquiry.find({ inquiryType: new mongoose.Types.ObjectId(id) });
      if (isExistsInAnyInquiry?.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Inquiry type is assigned you not able to delete'
        })
      }
      const inquiryType = await InquiryType.findById(id);
      if (!inquiryType) {
        return res.status(400).json({
          success: false,
          message: 'Inquiry ype not found'
        })
      }
  
      const response = await InquiryType.findByIdAndDelete(id);
      res.status(201).json({
        success: true,
        message: 'Enquiry Type successfully deleted'
      })
    } catch (error) {
      console.log(error)
      return res.status(500).json({
        success: false,
        message: error?.message || 'Internal server error'
      })
    }
  }
  

  module.exports = {
    addInquiryType,
    getInquiryType,
    getSingleInquiryType,
    updateInquiryType,
    deleteInquiryType
  }