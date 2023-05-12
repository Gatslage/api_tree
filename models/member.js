const mongoose=require('mongoose')
const Schema=mongoose.Schema

var MemberSchema=new mongoose.Schema({
    first_name:{
        type:String,
        required:true
    },
    last_name:{
        type:String,
        required:true
    },
    sex:{
        type:String,
        max:1},
    birth_date:{
        type:Date,
        required:false
    },
    dead_date:{type:Date,required:false},
    tree:{
        type:Schema.Types.ObjectId,
        ref:"Tree",
        required:true
    },
    user:{
        type:Schema.Types.ObjectId,
        ref:"User"
    },
    target_parent:{
        type:Schema.Types.ObjectId,
        ref:"Member"
    },
    second_parent:{
        sex:{type:String},
        name:{type:String},
        birth_date:{type:Date},
        dead_date:{type:Date}
    },
    image:String,
    adopted:{ type:Boolean,default:false}
})

const DetailSchema=new mongoose.Schema({
    member:{
        type:Schema.Types.ObjectId,
        ref:"Member"
    },
    weight:Number,
    height:Number,
    phone:Number,
    religion:String,
    marital_status:String,
    adress:[{name:String,value:String}],
    biography:[{name:String,description:String,start_date:Date,end_date:Date}],
    locations_deplacement:[{name:String,city:String,status:String,description:String,start_date:Date,end_date:Date,image:String}],
    weddings:[{name:String,partner:String,start_date:Date,end_date:Date,image:String}],
    body_and_health:[{name:String,description:String}]


})

const member=mongoose.model('Member',MemberSchema)
const detail=mongoose.model('Detail',DetailSchema)
module.exports={Member:member,Detail:detail}