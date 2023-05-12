const express = require('express')
const router = express.Router()
const multer = require('multer')
const fs = require('fs')

const { Event, Participation } = require('../models/event')
const { Member } = require('../models/member');
const { Detail } = require('../models/member')
const Tree = require('../models/tree')
const { MemberCreateValidation } = require('../validations/member_validation');
const jwtverify = require('../middlewares/jwtverify');
const { roles_verify } = require('../middlewares/tree_roles')
const {LogicalMemberLife}=require('../middlewares/family_logical_verification')

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './images/member')
    },
    filename: (req, file, cb) => {
        let pre = file.originalname.split('.')[0].toString()
        let inter = Date.now().toString()
        let sufix = "."+file.originalname.split('.').pop().toString()
        cb(null, pre + inter + sufix)
    }
})

const uploader = multer({ storage: storage, limits: { fileSize: 2000000 } })



router.get("/all_member", (req, res) => {
    var members = Member.find()
        .then((result) => {
            return res.status(200).json(result)
        }).catch((err) => {
            console.log(err)
            return res.status(400).json({ reason_final: "Problème lors de l'extraction des données concernant les membres de cet arbre" })
        })
        ;

})

router.post("/specific_member", (req, res) => {
    var members = Member.find(req.body)
        .then((result) => {
            return res.status(200).json(result)
        }).catch((err) => {
            console.log(err)
            return res.status(400).json({ final_reason: "Problème lors de l'extraction des données concernant les membres de cet arbre" })
        })
        ;

})
//,roles_verify(["member","admin","super_admin"])
router.get("/member_detail/:memberId", (req, res) => {
    Detail.findOne({ member: req.params.memberId })
        .then((result) => {
            return res.status(200).json(result)
        }).catch((err) => {
            console.log(err)
            return res.status(400).json({ final_reason: "Problème lors de l'extraction des données concernant les les detail  de ce membre" })
        })
        ;
})

router.post("/member_search/:treeId", async (req, res) => {
    regex_resp = req.body.search ? req.body.search : ""
    let conditions = {}
    if (req.body.first_name && req.body.last_name) {
        conditions = { $or: [{ first_name: { $regex: regex_resp } }, { last_name: { $regex: regex_resp } }] }
    } else if (req.body.first_name) {
        conditions = { first_name: { $regex: regex_resp } }
    } else if (req.body.last_name) {
        conditions = { last_name: { $regex: regex_resp } }
    }

    conditions = { ...conditions, tree: req.params.treeId }
    try {
        var result = await Member.find(conditions)

        return res.status(200).json(result)
    } catch (err) {
        console.log(err)
        return res.status(400).json({ final_reason: "Problème lors de l'extraction de la recherche des membres " })
    }
    ;

})

///prend en corp min et max pour l'intervalle de date puis les boleen birth_date et dead_date pour ou chercher
router.post("/member_date/:treeId", async (req, res) => {
    regex_resp = req.body.search ? req.body.search : ""
    let conditions = {}
    if (req.body.min && req.body.max) {
        conditions = { $gte: new Date(req.body.min), $lte: new Date(req.body.max) }
        console.log(new Date(req.body.min))
    } else if (req.body.min) {
        conditions = { $gte: new Date(req.body.min) }
    } else if (req.body.max) {
        conditions = { $lte: new Date(req.body.max) }

    } else {
        return res.status(400).json({ final_reason: "pour le filtre de date vous devez choisir au moins une date min ou une date max" })
    }
    let final_conditions = {}
    if (req.body.birth_date && req.body.dead_date) {
        final_conditions = { $or: [{ birth_date: conditions }, { dead_date: conditions }] }
    } else if (req.body.birth_date) {
        final_conditions = { birth_date: conditions }
    } else if (req.body.dead_date) {
        final_conditions = { dead_date: conditions }
    }
    conditions = { ...conditions, tree: req.params.treeId }
    try {
        var result = await Member.find(conditions)

        return res.status(200).json(result)
    } catch (err) {
        console.log(err)
        return res.status(400).json({ final_reason: "Problème lors de l'extraction de la recherche des membres " })
    }
    ;

})




router.get("/all_events/:memberId", (req, res) => {
    Event.find({ owner: req.params.memberId })
        .then((result) => {
            return res.status(200).json(result)
        }).catch((err) => {
            console.log(err)
            return res.status(400).json({ final_reason: "Problème lors de l'extraction des données concernant les les evennements  de ce membre" })
        })
        ;
})

router.get("/all_participations/:memberId", (req, res) => {
    Participation.find({ member: req.params.memberId })
        .then((result) => {
            return res.status(200).json(result)
        }).catch((err) => {
            console.log(err)
            return res.status(400).json({ final_reason: "Problème lors de l'extraction des données concernant les les participations  de ce membre" })
        })
        ;
})



function initialisize_detail(id_member) {
    det = new Detail({
        member: id_member
    })
    det.save()
        .then(() => console.log('detail initialisé avec succes'))
        .catch(async () => {
            //si on parviens pas a initialiser alors on supprime le membre créé dans l'aborescence de code qui précède la fonction ci apres
            await Member.deleteOne({ _id: id_member })
            return res.status(400).json({ 'final_reason': 'Erreur lors de initialisation des details de membre' })
        })
}

router.post("/create_member",LogicalMemberLife,async (req, res) => {
    const necessary = {
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        sex: req.body.sex,
        tree: req.body.tree
    }
    const { error } = MemberCreateValidation(necessary)
    if (error) return res.status(400).json({ 'final_reason': error.details[0].message })
    //verifions si ils sont du meme arbre l'enfant et le parent
    if(req.body.target_parent){
        const par_tree=await Member.findOne({_id:req.body.target_parent},"tree").tree
        if(par_tree!=req.body.tree)return res.status(400).json({ 'final_reason': "le fils et le parent doivent appartenir au meme arbre" })
    }
    const new_member = new Member(
        req.body);
    new_member.save()
        .then(async (re) => {
            initialisize_detail(re._id)
            //on actualise le nombre de membre de l'arbre en comptant puis modifiant
            const num_members = await Member.find({ tree: req.body.tree }).length
            await Tree.updateOne({ _id: req.body.tree }, { num_members: num_members })
            //avant de retourner le resultat de creation
            return res.status(200).send(re)
        }).catch((err) => {
            console.log(err)
            return res.status(400).json({ final_reason: 'problème interne, reesayez la creation plustard' })
        })


})

router.put("/update_member/:memberId",LogicalMemberLife,async (req, res) => {
    if(req.body.target_parent){
        child_tree=req.body.tree?req.body.tree:await Member.findOne({_id:req.params.memberId},"tree").tree
        const par_tree=await Member.findOne({_id:req.body.target_parent},"tree").tree
        if(par_tree!=child_tree)return res.status(400).json({ 'final_reason': "le fils et le parent doivent appartenir au meme arbre" })
    }

    Member.updateOne({ _id: req.params.memberId }, req.body)
        .then(() => {
            res.status(200).json({ 'final_reason': 'modification reussie' })
        }).catch((err) => {
            console.log('erreurr:' + err.message)
            res.status(400).json({ 'final_reason': err.message })
        })
})

router.delete("/delete_member/:memberId",LogicalMemberLife, (req, res) => {
    if (!req.params.memberId) return res.status(400).json({ 'final_reason': 'probleme interne' })
    Member.deleteOne({ _id: req.params.memberId })
        .then(async () => {
            await Detail.deleteOne({ member: req.params.memberId })
            await Event.deleteMany({ owner: req.params.memberId })
            await Participation.deleteMany({ member: req.params.memberId })
            await Member.updateMany({"target_parent.target":req.params.memberId},{"target_parent.target":null,"target_parent.sex":null})
            console.log('roll')
            console.log('Bien supprimé')
            //on actualise le nombre de membre de l'arbre en comptant puis modifiant
            const num_members = await Member.find({ tree: req.body.tree }).length
            await Tree.updateOne({ _id: req.body.tree }, { num_members: num_members })
            return res.status(200).json({ 'final_reason': 'suppression effectué avec succès' })
        })
        .catch((err) => {
            console.log("'l'erreur lors de la suppression"+ err)
            return res.status(400).json({ 'final_reason': 'probleme interne' })
        })
})

router.put("/update_detail/:memberId", (req, res) => {
    if (req.body.adress || req.body.biography || req.body.locations_deplacement || req.body.weddings || req.body.body_and_health) return res.status(400).json({ 'final_reason': 'En ce qui concerne la modification d\'array dans les details de member, utilisés le chemin update_array' })
    Detail.updateOne({ member: req.params.memberId }, req.body)
        .then(() => {
            res.status(200).json({ 'final_reason': 'modification reussie' })
        }).catch((err) => {
            console.log('erreurr:' + err.message)
            res.status(400).json({ 'final_reason': err.message })
        })
})

router.put('/update_array/:memberId/:array/:operation', async (req, res) => {
    const array_trues = ["adress", "biography", "locations_deplacement", "weddings", "body_and_health"]
    const operation_trues = ["add", "remove"]
    if (!array_trues.includes(req.params.array)) return res.status(400).json({ "final_reason": "you want to modify unexpected array" })
    if (!operation_trues.includes(req.params.operation)) return res.status(400).json({ "final_reason": "you want to modify with unsuported operation" })
    //on arrange l'operation pour la base de donnée
    const array = req.params.array
    try {
        if (req.params.operation === "add") {
            console.log('bon ' + array + " " + req.params.memberId + " " + JSON.stringify({ $push: { array: req.body.value } }))
            switch (array) {
                case "adress":
                    await Detail.updateOne({ member: req.params.memberId }, { $push: { "adress": req.body.value } })

                    break;
                case "biography":
                    await Detail.updateOne({ member: req.params.memberId }, { $push: { "biography": req.body.value } })
                    break;
                case "locations_deplacement":
                    make_name = req.body.value.city.toString() + req.body.value.status.toString() + req.body.value.start_date.toString() + 'to' + req.body.value.end_date.toString()
                    await Detail.updateOne({ member: req.params.memberId }, { $push: { "locations_deplacement": { ...req.body.value, name: make_name } } })

                    break;
                case "weddings":
                    make_name = req.body.value.partner.toString() + req.body.value.start_date.toString() + 'to' + req.body.value.end_date.toString()
                    await Detail.updateOne({ member: req.params.memberId }, { $push: { "weddings": { ...req.body.value, name: make_name } } })

                    break;
                case "body_and_health":
                    await Detail.updateOne({ member: req.params.memberId }, { $push: { "body_and_health": req.body.value } })
                    break;
            }

        } else {
            switch (array) {
                case "adress":
                    await Detail.updateOne({ member: req.params.memberId }, { $pull: { "adress": { name: req.body.value.name } } })

                    break;
                case "biography":
                    await Detail.updateOne({ member: req.params.memberId }, { $pull: { "biography": { name: req.body.value.name } } })
                    break;
                case "locations_deplacement":
                    await Detail.updateOne({ member: req.params.memberId }, { $pull: { "locations_deplacement": { name: req.body.value.name } } })

                    break;
                case "weddings":
                    await Detail.updateOne({ member: req.params.memberId }, { $pull: { "weddings": { name: req.body.value.name } } })

                    break;
                case "body_and_health":
                    await Detail.updateOne({ member: req.params.memberId }, { $pull: { "body_and_health": { name: req.body.value.name } } })
                    break;
            }
        }

        res.status(200).json({ "final_reason": "operation reussie" })
    } catch (err) {
        res.status(400).json({ 'final_reason': err.message })
    }
})

router.put('/add_profil/:memberId', uploader.single('image'), async (req, res) => {
    
    try {
        result = await Member.findByIdAndUpdate({ _id: req.params.memberId }, { image: req.file.filename })
        console.log(result.image)
        if (result.image != "" && result.image != null) {
            fs.unlink('./images/member/' + result.image, async (err) => {
                if (err) {
                    //si il ny'a pas de suppression alors on doit remettre le nom de l'image en base de donnée 
                    //puisque celle si existe toujours dans les fichiers
                    old_name = result.image
                    console.error(err);
                    await Member.updateOne({ _id: req.params.memberId }, { image: old_name })
                    //avant on supprime le fichier chargé
                    fs.unlink( './images/member/' + req.file.filename.toString(), (err) => {
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
        const filePath = './images/member/' + req.file.filename.toString();

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
router.get('/image_profil/:memberId',async (req,res)=>{
    file_name=await
    Member.findById(req.params.memberId,"image").
    then((member)=>{
        res.download(__dirname+'/../images/member/'+member.image)
    }).
    catch((err)=>{
    res.status(400).json({final_reason:"surcharge serveur fichiers, reessayez dans  2 minutes"})
    })
})

router.delete('/delete_profil/:memberId', (req, res) => {
    Member.findByIdAndUpdate(id = req.params.memberId, update = { image: "" }).
        then((result) => {
            //verifions deja si l'image de profil n'est deja pas vide
            if (result.image) {
                //on enregistre l'ancien nom au cas ou on doit remettre si on parviens pas à supprimer le fichier
                old_img_name = result.image
                fs.unlink('./images/member/' + old_img_name, async (err) => {
                    if (err) {
                        //si il ny'a pas de suppression alors on doit remettre le nom de l'image en base de donnée 
                        //puisque celle si existe toujours dans les fichiers
                        console.error(err);
                        await Member.updateOne({ _id: req.params.memberId }, { image: old_img_name })
                        //ensuite on retourne l'erreur
                        return res.status(400).json({ final_reason: "problème server de fichier, réessayez plustard" });
                    } else {
                        return res.status(200).json({ final_reason: "profil retiré avec succes" })

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



module.exports = router