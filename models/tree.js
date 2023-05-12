const { string } = require('@hapi/joi')
const mongoose=require('mongoose')
const Schema=mongoose.Schema

var TreeSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    description:{type:String,required:true},
    history:String,
    num_members:Number,
    allow_users:[{
        type:Schema.Types.ObjectId,
        ref:"User"
    }],
    owner:{
        type:Schema.Types.ObjectId,
        ref:"User"
    },
    first:{
        type:Schema.Types.ObjectId,
        ref:"Member"
    },
    visibility:Boolean,
    hereditary_diseases:[{name:String,description:String}],
    image:String,
    admins: [{
        type: Schema.Types.ObjectId,
        ref: "User"
    }],
    super_admins: [{
        type: Schema.Types.ObjectId,
        ref: "User"
    }]
    
})

module.exports=mongoose.model('Tree',TreeSchema)