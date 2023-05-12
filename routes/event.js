const multer=require('multer')
const router=require('express').Router()
const fs=require('fs')

const {Event,Participation}=require('../models/event')
const {EventCreateValidation}=require('../validations/event_validation')
const jwtverify = require('../middlewares/jwtverify');
const{RoleVerify}=require('../middlewares/tree_roles')
const {LogicalEventLife}=require("../middlewares/family_logical_verification")

function UniqueNamePrecessor(name){
    let pre_name=name.split(".")[0]
    let ext="."+name.split(".").pop().toString()
    let inter= Date.now().toString()
    return pre_name+inter+ext
}

let storage=multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null,'./images/event')
    },
    filename:(req,file,cb)=>{
        let pre_name=file.originalname.split(".")[0]
        let ext="."+ file.originalname.split(".").pop().toString()
        let inter= Date.now().toString()
        cb(null,pre_name+inter+ext)
    }
})


let uploader=multer({storage:storage,
    limits:{fileSize:2000000}
})


router.get("/all_event",(req,res)=>{
    var events=Event.find()
    .then((result)=>{
        return res.status(200).json(result)
    }).catch((err)=>{
        console.log(err)
        return res.status(400).json({reason_final:"Problème lors de l'extraction des données concernant les evennements de cet arbre"})
    })
    ;
    
})

router.get("/image/:eventId/:number",async (req,res)=>{
    //dans le front on devra faire une boucle qui incremente un chiffre qui sera placer dans la requête à la position :number 
    //et dans cette boucle on ajoute apres reponse l'image recu dans un tableau de reception creé au prealable
    // on verifie apres chaque reponse que (res.final_reason != 'end_tab' ) avant d'inserer le potentiel fichier recu dans le tab et si ce n'est pas different alors on break
    let images=(await Event.findOne({_id:req.params.eventId},"images")).images
    if(images.length>req.params.number ){
        let imageName=images[req.params.number]
        console.log(__dirname+'/../images/event/'+imageName)
        res.download(__dirname+'/../images/event/'+imageName)

        //res.sendFile("./images/event/"+imageName)
    }else{
        res.status(400).json({final_reason:"end_tab"})
    }
})

router.post("/specific_event",(req,res)=>{
    var events=Event.find(req.body)
    .then((result)=>{
        return res.status(200).json(result)
    }).catch((err)=>{
        console.log(err)
        return res.status(400).json({final_reason:"Problème lors de l'extraction des données concernant les evennements"})
    })
    ;
    
})

//le corps doit avoir un search correspondant a la recherche mais aussi name,description,location qui sont des booleen d'activation et family par true ou false
router.post("/event_search/:family/:treeId",async (req,res)=>{
    regex_resp= req.body.search?req.body.search: ""
    let conditions={}
    if(req.body.name && req.body.description && req.body.location){
        conditions={$or:[{name:{$regex:regex_resp}},{description:{$regex:regex_resp}},{location:{$regex:regex_resp}}]}
    }else if(req.body.name){
        conditions={name:{$regex:regex_resp}}
    }else if (req.body.description){
        conditions={description:{$regex:regex_resp}}
    }else if (req.body.location){
        conditions={location:{$regex:regex_resp}}
    }


    if(req.params.family=="true"){
        conditions={...conditions,type_event:"familyevent"}
    }else{
        conditions={...conditions,type_event:"memberevent"}
    }
    conditions={...conditions,tree:req.params.treeId}

    try{
        var result=await Event.find(conditions)

        return res.status(200).json(result)
    }catch(err){
        console.log(err)
        return res.status(400).json({final_reason:"Problème lors de l'extraction de la recherche des evennements correspondants "})
    }
    ;
    
})

router.post("/event_date/:family/:treeId",(req,res)=>{
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
    


    if(req.params.family=="true"){
        conditions={...conditions,type_event:"familyevent"}
    }else{
        conditions={...conditions,type_event:"memberevent"}
    }
    conditions={...conditions,tree:req.params.treeId}
    

    var alerts=Event.find(conditions)
    .then((result)=>{
        return res.status(200).json(result)
    }).catch((err)=>{
        console.log(err)
        return res.status(400).json({final_reason:"Problème lors de l'extraction des données concernant les messages dans cet intervalle de date"})
    })
    ;
    
})

//,roles_verify(["member","admin","super_admin"])
router.get("/all_participations/:eventId",(req,res)=>{
    Participation.find({event:req.params.eventId})
    .then((result)=>{
        return res.status(200).json(result)
    }).catch((err)=>{
        console.log(err)
        return res.status(400).json({final_reason:"Problème lors de l'extraction des données de participation  de ce membre"})
    })
    ;
})




router.post("/create_event",LogicalEventLife,(req,res)=>{
    const necessary={
            name:req.body.name,
            description:req.body.description,
            location:req.body.location,
            owner:req.body.owner,
            tree:req.body.tree,
            //so memberevent or familyevent
            type_event:req.body.type_event,
    }
    const {error}=EventCreateValidation(necessary)
    if(error)return res.status(400).json({'final_reason':error.details[0].message})
    const new_event=new Event(
        req.body);
    new_event.save()
    .then((re)=>{
        return res.status(200).send(re)
    }).catch((err)=>{
        console.log(err)
        return res.status(400).json({final_reason:'problème interne, reesayez la creation plustard'})
    })
    
    
})

router.put("/add_image/:eventId",uploader.single('image'), async function (req, res) {
    console.log(req.file)
    let event_act =Event.updateOne({_id:req.params.eventId},{$push:{images:req.file.filename}})
    .then((r)=>{
        console.log("ça s'est bien passé")
        return res.status(200).json({final_reason:"operation d'ajout effectué avec succes"})
    })
    .catch((err)=>{
        //en cas d'erreur on supprime d'abord le fichier image enregistrer precedemment
        try{
                                // chemin du fichier à supprimer
            const filePath = './images/event/'+req.file.filename.toString();

            // suppression du fichier
            fs.unlink(filePath, (err) => {
            if (err) {
                console.error(err);
                return;
            }
            })
        }catch(err){
            console.log("le fichier lui meme ne s'etait pas enregistrer apparemment")
        }
        //maintenant on retourne un message pour signaler l'echec de la procedure
        return res.status(400).json({final_reason:"problème lors de l'ajout du fichier, l'evennement de reception n'existe pas"})
    })
})
    

router.post("/add_participation/:eventId",LogicalEventLife,async (req,res)=>{
    
    if(!req.body.member || !req.body.role)return res.status(400).json({'final_reason':'le participant et son role sont requis'})
    const verification=await Participation.findOne({member:req.body.member,event:req.params.eventId})
    if (verification) return res.status(400).json({ 'final_reason': 'membre poossédant deja un role' })
    const new_participation=new Participation(
        req.body);
        new_participation.save()
    .then((re)=>{
        return res.status(200).send(re)
    }).catch((err)=>{
        console.log(err)
        return res.status(400).json({final_reason:'problème interne, reesayez la creation plustard'})
    })
    
    
})

router.put("/update_event/:eventId",LogicalEventLife,jwtverify,RoleVerify(["admin"]), (req,res)=>{
    Event.updateOne({ _id: req.params.eventId }, req.body)
    .then(() => {
        res.status(200).json({'final_reason':'modification reussie'})
    }).catch((err) => {
        console.log('erreurr:' + err.message)
        res.status(400).json({ 'final_reason': err.message })
    })
})

router.delete("/delete_event/:eventId",LogicalEventLife,(req,res)=>{
    if(!req.params.eventId)return res.status(400).json({'final_reason':'probleme interne'})
    Member.deleteOne({_id:req.params.eventId})
    .then(async ()=>{
        console.log('roll event')
        await Participation.deleteMany({event:req.params.eventId})
        console.log('Bien supprimé')
        return res.status(200).json({'final_reason':'suppression effectué avec succès'})
    })
    .catch((err)=>{
        console.log("'l'erreur lors de la suppression ${err}" )
        return res.status(400).json({'final_reason':'probleme interne'})
    })
})
router.put("/delete_image/:eventId/:imageId",async function (req, res) {
    let event_act =Event.updateOne({_id:req.params.eventId},{$pull:{images:req.params.imageId}})
    .then((r)=>{
        console.log("ça s'est bien passé")
        
        try{
                // chemin du fichier à supprimer
            const filePath = './images/event/'+req.params.imageId;

            // suppression du fichier
            fs.unlink(filePath, (err) => {
            if (err) {
            console.error(err);
            return;
            }
            })
        }catch(err){
            console.log("erreur lors de la suppression physique")
        }
        return res.status(200).json({final_reason:"operation de suppression effectué avec succes"})
    })
    .catch((err)=>{
        //en cas d'erreur on supprime d'abord le fichier image enregistrer precedemment
        
        //maintenant on retourne un message pour signaler l'echec de la procedure
        return res.status(400).json({final_reason:"problème lors de la suppression du fichier"})
    })
})
 
router.delete("/delete_participation/:eventId/:memberId",LogicalEventLife,(req,res)=>{
    Participation.deleteMany({member:req.params.memberId,event:req.params.eventId})
    .then(async ()=>{
        console.log('Bien supprimé')
        return res.status(200).json({'final_reason':'suppression effectué avec succès'})
    })
    .catch((err)=>{
        console.log("'l'erreur lors de la suppression ${err}" )
        return res.status(400).json({'final_reason':'probleme interne'})
    })
})

module.exports=router