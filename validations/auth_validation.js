const joi=require('@hapi/joi')


const registerV=(data)=>{
    const schema={
        
        name:joi.string().min(3).max(60).required(),
        password:joi.string().min(3).max(20).required(),
        email:joi.string().min(6).required()
    }

    return joi.validate(data,schema)
}

const loginV=(data)=>{
    const schema={
        password:joi.string().min(3).max(20).required(),
        email:joi.string().min(6).required()
    }
    return joi.validate(data,schema)
}

module.exports={
    registerValidator:registerV,loginValidator:loginV
}