const jwt=require('jsonwebtoken')
require('dotenv').config()

module.exports=(req,res,next)=>{
    //on doit verifier le token uniquement dans le cas ou il s'est deja connecté 
    //or lorsqu'il y'a register et login il ne l'a pas encore fait
    if(req.path.includes("auth/login")||req.path.includes("auth/register"))return next()
    //maintenant que nous sommes sur qu'il est entrain d'essayer d'acceder à une route accedable apres connexion on verifie le token
    const token=req.header('auth-token')
    if(!token)return res.status(400).json({'final_reason':'jwt expired'})
    jwt.verify(token,process.env.JWT_SECRET_CODE,(err,data)=>{
        if(err)return res.status(400).json({'final_reason':'jwt expired'})
        req.user=data;
        return next();
    } )
}