const mongoose=require('mongoose')
const Schema=mongoose.Schema

var AlertSchema=new mongoose.Schema({
    message:{
        type:String,
        required:true
    },
    subject:{
        type:String,
        required:true
    },
    date:{type:Date},
    sender:{
        type:Schema.Types.ObjectId,
        ref:"User"
    },
    receiver:{
        type:Schema.Types.ObjectId,
        ref:"User"
    }
    
})

module.exports={Alert:mongoose.model('Alert',AlertSchema)}