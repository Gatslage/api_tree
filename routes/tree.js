const express=require('express')
const router=express.Router()
const multer = require('multer')
const fs = require('fs')

const User = require('../models/user')
const Tree=require('../models/tree');
const{Member,Detail}=require('../models/member')
const{Event,Participation}=require('../models/event')

const { TreeCreateValidation } = require('../validations/tree_validation');
const jwtverify = require('../middlewares/jwtverify');
const{RoleVerify}=require('../middlewares/tree_roles')


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './images/tree')
    },
    filename: (req, file, cb) => {
        let pre = file.originalname.split('.')[0].toString()
        let inter = Date.now().toString()
        let sufix = "."+file.originalname.split('.').pop().toString()
        cb(null, pre + inter + sufix)
    }
})

const uploader = multer({ storage: storage, limits: { fileSize: 2000000 } })


router.get("/all_tree",RoleVerify(['admin']),jwtverify,(req,res)=>{
    var trees=Tree.find()
    .then((result)=>{
        return res.status(200).json(result)
    }).catch((err)=>{
        console.log(err)
        return res.status(400).json({reason_final:"Problème lors de l'extraction des données concernant les arbres"})
    })
    ;
    
})

router.post("/specific_tree",(req,res)=>{
    var trees=Tree.find(req.body)
    .then((result)=>{
        return res.status(200).json(result)
    }).catch((err)=>{
        console.log(err)
        return res.status(400).json({final_reason:"Problème lors de l'extraction des données concernant les arbres"})
    })
    ;
    
})


router.post("/tree_search",async (req,res)=>{
    regex_resp= req.body.search?req.body.search: ""
    let conditions={}
    if(req.body.name && req.body.description){
        conditions={$or:[{name:{$regex:regex_resp}},{description:{$regex:regex_resp}}]}
    }else if(req.body.name){
        conditions={name:{$regex:regex_resp}}
    }else if (req.body.description){
        conditions={description:{$regex:regex_resp}}
    }
    conditions={...conditions,visibility:true}
    try{
        var result=await Tree.find(conditions)

        return res.status(200).json(result)
    }catch(err){
        console.log(err)
        return res.status(400).json({final_reason:"Problème lors de l'extraction de la recherche des des arbres correspondants "})
    }
    ;
    
})

router.post("/create_tree",(req,res)=>{
    const necessary={
            name:req.body.name,
            description:req.body.description,
            visibility:req.body.visibility
    }
    const {error}=TreeCreateValidation(necessary)
    if(error)return res.status(400).json({'final_reason':error.details[0].message})
    const new_tree=new Tree(
        {...req.body,super_admins:[req.body.owner]});
    new_tree.save()

    .then(async (re)=>{
        await User.updateOne({ _id: req.body.owner }, { $push: { "trees_super_admin" : re._id }})
        await User.updateOne({ _id: req.body.owner }, { $push: { "trees_creates" : re._id } })
        return res.status(200).send(re)
    }).catch((err)=>{
        console.log(err)
        return res.status(400).json({final_reason:'problème interne, reesayez la creation plustard'})
    })
    
    
})

router.put("/update_tree/:treeId",(req,res)=>{
    if (req.body.allow_users || req.body.hereditary_diseases)return res.status(400).json({'final_reason':'allow_users et hereditary_diseases ne peuvent être modifié par cette route,consulter la route tree_diseases pour hereditary diseases'})
    Tree.updateOne({ _id: req.params.treeId }, req.body)
    .then((tree_n) => {
        
        res.status(200).json({'final_reason':'modification reussie','data':tree_n})
    }).catch((err) => {
        console.log('erreurr:' + err.message)
        res.status(400).json({ 'final_reason': err.message })
    })
})

router.put("/update_array/:treeId/:operation",(req,res)=>{
    if (!req.params.treeId || !req.params.operation)return res.status(400).json({'final_reason':'vous devez specifié id et operation'})
    if (!['add','remove'].includes(req.params.operation) )return res.status(400).json({'final_reason':'operation ne peut être uniquement "add" ou "remove"'})

    if(req.params.operation=='add'){
        Tree.updateOne({_id:req.params.treeId},{$push:{hereditary_diseases:{name:req.body.name,description:req.body.description}}})
        .then(() => {
            res.status(200).json({'final_reason':'ajout maladie familiale reussie'})
        }).catch((err) => {
            console.log('erreurr:' + err.message)
            res.status(400).json({ 'final_reason': err.message })
        })
    }else{
        Tree.updateOne({_id:req.params.treeId},{$pull:{hereditary_diseases:{name:req.body.name}}})
        .then(() => {
            res.status(200).json({'final_reason':'suppression maladie familiale reussie'})
        }).catch((err) => {
            console.log('erreurr:' + err.message)
            res.status(400).json({ 'final_reason': err.message })
        })
    } 
})
router.delete("/delete_tree/:treeId",async (req,res)=>{
    if(!req.params.treeId)return res.status(400).json({'final_reason':'probleme interne'})
    //on recupère l'arbre actuel puis on retire son id dans tout les tabs d'acces chez les utilisateurs
    const this_tree=await Tree.findOne({_id:req.params.treeId})
    this_tree.allow_users.forEach(async elt=>{
        await User.updateOne({ _id: elt }, { $pull: { "trees_access" : req.params.treeId }})
    })
    this_tree.admins.forEach(async elt=>{
        await User.updateOne({ _id: elt }, { $pull: { "trees_admin" : req.params.treeId }})
    })
    this_tree.super_admins.forEach(async elt=>{
        await User.updateOne({ _id: elt }, { $pull: { "trees_super_admin" : req.params.treeId }})
    })
    await User.updateOne({ _id: req.body.owner }, { $pull: { "trees_creates" : req.params.treeId } })

    //ensuite on supprime tout les members et events liés à lui
    await Member.find({tree:req.params.treeId}).forEach(async elt=>{
       await Detail.deleteMany({member:elt._id})
        await Member.deleteOne({_id:elt._id})
    })
    await Event.find({tree:req.params.treeId}).forEach(async elt=>{
        await Participation.deleteMany({event:elt._id})
        await Event.deleteOne({_id:elt._id})
    })

//avant de le supprimer lui même
    Tree.deleteOne({_id:req.params.treeId})
    .then(async ()=>{
        
        console.log('Bien supprimé')
        return res.status(200).json({'final_reason':'suppression effectué avec succès'})
    }).catch((err)=>{
        console.log("'l'erreur lors de la suppression ${err}" )
        return res.status(400).json({'final_reason':'probleme interne'})
    })
})

router.put('/add_profil/:treeId', uploader.single('image'), async (req, res) => {
    
    try {
        result = await Tree.findByIdAndUpdate({ _id: req.params.treeId }, { image: req.file.filename })
        console.log(result.image)
        if (result.image != "" && result.image != null) {
            fs.unlink('./images/tree/' + result.image, async (err) => {
                if (err) {
                    //si il ny'a pas de suppression alors on doit remettre le nom de l'image en base de donnée 
                    //puisque celle si existe toujours dans les fichiers
                    old_name = result.image
                    console.error(err);
                    await Tree.updateOne({ _id: req.params.treeId }, { image: old_name })
                    //avant on supprime le fichier chargé
                    fs.unlink( './images/tree/' + req.file.filename.toString(), (err) => {
                        if (err) {
                            console.error(err);
                            
                        }
                    })
                    return res.status(200).json({ final_reason: "operation de modification impossible pour l'instant" })
                    
                }else{
                    return res.status(200).json({ final_reason: "operation d'ajout de profil effectué avec succes" })
                    
                }
            })
        }else{
            return res.status(200).json({ final_reason: "operation d'ajout de profil effectué avec succes" })

        }
    } catch (err) {
        //en cas d'erreur on supprime d'abord le fichier image enregistrer precedemment

        // chemin du fichier à supprimer
        const filePath = './images/tree/' + req.file.filename.toString();

        // suppression du fichier
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error(err);
                
            }
        })
            //si le probleme venait de la suppression de l'ancien fichier on doit remettre son nom
            return  res.status(200).json({ final_reason: "problème serveur reessayez plus tard" });
    }

    


})
router.get('/image_profil/:treeId',async (req,res)=>{
    file_name=await
    Tree.findById(req.params.treeId,"image").
    then((tree)=>{
        res.download(__dirname+'/../images/tree/'+tree.image)
    }).
    catch((err)=>{
    res.status(400).json({final_reason:"surcharge serveur fichiers, reessayez dans  2 minutes"})
    })
})

router.delete('/delete_profil/:treeId', (req, res) => {
    Tree.findByIdAndUpdate(id = req.params.treeId, update = { image: "" }).
        then((result) => {
            //verifions deja si l'image de profil n'est deja pas vide
            if (result.image) {
                //on enregistre l'ancien nom au cas ou on doit remettre si on parviens pas à supprimer le fichier
                old_img_name = result.image
                fs.unlink('./images/tree/' + old_img_name, async (err) => {
                    if (err) {
                        //si il ny'a pas de suppression alors on doit remettre le nom de l'image en base de donnée 
                        //puisque celle si existe toujours dans les fichiers
                        console.error(err);
                        await Tree.updateOne({ _id: req.params.treeId }, { image: old_img_name })
                        //ensuite on retourne l'erreur
                        return res.status(400).json({ final_reason: "problème server de fichier, réessayez plustard" });
                    } else {
                        return res.status(200).json({ final_reason: "profil d'arbre retiré avec succes" })

                    }
                })
            } else {
                return res.status(200).json({ final_reason: "cadre de profil deja vide" })
            }


        }).
        catch((err) => {
            console.log(err + "  ddddddddddddddddd")
            return res.status(400).json({ final_reason: "problème server de base de donnée, réessayez plustard" })
        })
})

module.exports=router