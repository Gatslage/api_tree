const joi=require('@hapi/joi')


const memberV=(data)=>{
    const schema={
        
        first_name:joi.string().min(3).max(100).required(),
        last_name:joi.string().min(3).max(100).required(),
        sex:joi.string().min(1).max(1).required(),
        tree:joi.string().required(),
    }

    return joi.validate(data,schema)
}



module.exports={
    MemberCreateValidation:memberV
}