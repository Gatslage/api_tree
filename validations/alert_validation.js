const joi=require('@hapi/joi')

module.exports={AlertValidation:(data)=>{


    const trueSchema={
        message:joi.string().min(1).max(1000).required(),
        sender:joi.string().required(),
        receiver:joi.string().required(),
        date:joi.string().required()
    }
    return joi.validate(data,trueSchema)
}}