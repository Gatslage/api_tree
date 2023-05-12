const express=require('express');
const app=express();
const mongoose=require('mongoose')
const bodyparser=require('body-parser');
const dotenv=require('dotenv')
dotenv.config()
app.use(bodyparser.json())


app.get('/',(req,res)=>{
    res.json('page acceuil')
})
//ROUTES
const authrouter = require('./routes/auth.Js');
const treerouter=require('./routes/tree.js')
const memberrouter=require('./routes/member.js')
const eventrouter=require('./routes/event.js')
const alertrouter=require('./routes/alert.js')
//MIDDLEWARES VALIDATION DE ROUTES
const JwtVerify=require("./middlewares/jwtverify")
const {LogicalMemberLife,LogicalEventLife}=require("./middlewares/family_logical_verification")

//MIDDLEWARES ROUTES


app.use('/apitree/user',authrouter)
app.use('/apitree/tree',treerouter)
app.use('/apitree/member', memberrouter)
app.use('/apitree/event', eventrouter)
app.use('/apitree/alert',alertrouter)


    mongoose.set('strictQuery', false);
    mongoose.connect(process.env.STR_LOCAL_CONNECTION, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        })
        .then(()=>{
                console.log('MongoDB Connected...');
        })
        .catch((err)=>{
            console.error("hhhhhhh"+err.message);
            process.exit(1);
        }) ;

    

app.listen(3000,()=>console.log('serveur lancer'))
//NOTES IMPORTANTES
//les images ne doivent depassé 2mo sinon une erreur 413 sera envoyé par multer