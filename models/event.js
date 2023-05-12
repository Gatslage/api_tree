const mongoose=require('mongoose')
const Schema=mongoose.Schema

var EventSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    location:String,
    owner:{type:Schema.ObjectId,ref:"Member"},
    date:Date,
    tree:{type:Schema.ObjectId,ref:"Tree"},
    images:[String],
    //so memberevent or familyevent
    type_event:String
})

const ParticipationSchema=new mongoose.Schema({
    event:{type:Schema.ObjectId,ref:"Event"},
    member:{type:Schema.ObjectId,ref:"Member"},
    role:String,
    valid:{

        type:Boolean,
        default:true
    }
})

module.exports={
    Event:mongoose.model('Event',EventSchema),
    Participation:mongoose.model('Participation',ParticipationSchema)

}