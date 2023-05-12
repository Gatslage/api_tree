const express=require('express')
const router=express.Router()
const {Event,Participation}=require('../models/event')
const {Alert}=require('../models/alert');
const {AlertValidation}=require('../validations/alert_validation')
const jwtverify = require('../middlewares/jwtverify');
const {roles_verify}=require('../middlewares/tree_roles')

router.get("/all_alert/:userId",(req,res)=>{
    var alerts=Alert.find({receiver:req.params.userId}).sort({"_id":-1})
    .then((result)=>{
        return res.status(200).json(result)
    }).catch((err)=>{
        console.log(err)
        return res.status(400).json({reason_final:"Problème lors de l'extraction des données concernant les membres de cet arbre"})
    })
    ;
     
})

router.get("/alerts_by_sender/:userId/:senderId/:limit",(req,res)=>{

    regex_resp= req.body.search?req.body.search: ""
    var alerts=Alert.find({receiver:req.params.userId,sender:req.params.senderId,$or:[{message:{$regex:regex_resp}},{subject:{$regex:regex_resp}}]}).sort({"_id":-1}).limit(parseInt(req.params.limit))
    .then((result)=>{
        return res.status(200).json(result)
    }).catch((err)=>{
        console.log(err)
        return res.status(400).json({final_reason:"Problème lors de l'extraction des données concernant les messages de cet utilisateur"})
    })
    ;
    
})

router.get("/conversation/:userId/:senderId/:limit",async (req,res)=>{
    regex_resp= req.body.search?req.body.search: ""
    try{
        var alerts_send_by_him=await Alert.find({receiver:req.params.userId,sender:req.params.senderId,$or:[{message:{$regex:regex_resp}},{subject:{$regex:regex_resp}}]}).sort({"_id":-1}).limit(parseInt(req.params.limit))
        var alerts_send_by_me=await Alert.find({receiver:req.params.senderId,sender:req.params.userId,$or:[{message:{$regex:regex_resp}},{subject:{$regex:regex_resp}}]}).sort({"_id":-1}).limit(parseInt(req.params.limit))
        let tab_conversation=[...alerts_send_by_him,...alerts_send_by_me]
        tab_conversation=tab_conversation.sort((a,b)=>{
            return a.date-b.date
        }).reverse()
        console.log(tab_conversation)
        return res.status(200).json(tab_conversation)
    }catch(err){
        console.log(err)
        return res.status(400).json({final_reason:"Problème lors de l'extraction des données concernant les messages de cette conversation"})
    }
    ;
    
})

router.post("/global_messages_filter/:userId/:limit",(req,res)=>{
    regex_resp= req.body.search?req.body.search: ""

    var alerts=Alert.find({receiver:req.params.userId,$or:[{message:{$regex:regex_resp}},{subject:{$regex:regex_resp}}]}).sort({"_id":-1}).limit(parseInt(req.params.limit))
    .then((result)=>{
        return res.status(200).json(result)
    }).catch((err)=>{
        console.log(err)
        return res.status(400).json({final_reason:"Problème lors de l'extraction des données concernant les messages de cet utilisateur"})
    })
    ;
    
})

router.post("/alert_date_limit/:userId/:limit",(req,res)=>{
    var conditions={}
    if(req.body.min && req.body.max){
        conditions={date:{$gte:new Date(req.body.min),$lte:new Date(req.body.max)}}
        console.log(new Date(req.body.min))
    }else if(req.body.min){
        conditions={date:{$gte:new Date(req.body.min)}}
    }else if (req.body.max){
        conditions={date:{$lte:new Date(req.body.max)}}

    }else{
        return res.status(400).json({final_reason:"pour le filtre de date vous devez choisir au moins une date min ou une date max"})
    }
    
    var alerts=Alert.find(conditions).sort({"_id":-1}).limit(parseInt(req.params.limit))
    .then((result)=>{
        return res.status(200).json(result)
    }).catch((err)=>{
        console.log(err)
        return res.status(400).json({final_reason:"Problème lors de l'extraction des données concernant les messages dans cet intervalle de date"})
    })
    ;
    
})

router.post("/create_alert",(req,res)=>{
    const necessary={
            message:req.body.message,
            sender:req.body.sender,
            receiver:req.body.receiver,
            date:req.body.date
    }
    const {error}=AlertValidation(necessary)
    if(error)return res.status(400).json({'final_reason':error.details[0].message})
    const new_alert=new Alert(
        req.body);
    new_alert.save()
    .then((re)=>{
        return res.status(200).send(re)
    }).catch((err)=>{
        console.log(err)
        return res.status(400).json({final_reason:'problème interne, reesayez la creation plustard'})
    })
    
    
})



module.exports=router