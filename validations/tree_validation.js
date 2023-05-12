const joi=require('@hapi/joi')

module.exports={TreeCreateValidation:(data)=>{
    const schema={
        name:joi.string().min(5).max(100).required(),
        description:joi.string().min(15).max(500),
        visibility:joi.boolean().required()
    }
    return joi.validate(data,schema)
}}