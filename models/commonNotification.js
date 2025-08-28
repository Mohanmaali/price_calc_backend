const { default: mongoose } = require("mongoose");

const commonNotification = new mongoose.Schema({
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User_model",
        required: true,
    },
    tab:{
        type:String,
        required:true
    },
    isRead:{
        type:Boolean,
        enum:[true, false],
        default:false
    },
    details:{
        type:String,
    }
},{
    timestamps:true
})

const CommonNotification_model = mongoose.model("CommonNotification_model", commonNotification);

module.exports = CommonNotification_model;