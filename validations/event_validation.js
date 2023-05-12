const hapiJoi=require('@hapi/joi')


module.exports={EventCreateValidation:(data)=>{
    
        //so memberevent or familyevent
    eventSchema={
        name:hapiJoi.string().min(4).max(60).required(),
        description:hapiJoi.string().min(4).max(500).required(),
        location:hapiJoi.string().min(2).max(60).required(),
        owner:hapiJoi.string().required(),
        tree:hapiJoi.string().required(),
        type_event:hapiJoi.string().min(11).max(11).required(),
    }

    return hapiJoi.validate(data)
}}