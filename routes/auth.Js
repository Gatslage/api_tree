const express = require('express')
const User = require('../models/user')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
require('dotenv').config()
const multer = require('multer')
const fs = require('fs')

const { registerValidator, loginValidator } = require('../validations/auth_validation')
const Tree = require('../models/tree')
const router = express.Router()

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './images/user')
    },
    filename: (req, file, cb) => {
        let pre = file.originalname.split('.')[0].toString()
        let inter = Date.now().toString()
        let sufix = "."+file.originalname.split('.').pop().toString()
        cb(null, pre + inter + sufix)
    }
})

const uploader = multer({ storage: storage, limits: { fileSize: 2000000 } })

router.post('/register', async (req, res) => {

    const { error } = registerValidator(req.body)
    if (error) return res.status(400).send(error.details[0].message)
    const a = await User.findOne({ email: req.body.email })
    console.log(a)
    if (a) return res.status(400).json({ 'final_reason': 'cet email est deja utilisé par un utilisateur' })
    const salt = await bcrypt.genSalt()
    crypt_password = await bcrypt.hash(req.body.password, salt)
    var actualUser = new User({
        name: req.body.name,
        email: req.body.email,
        password: crypt_password,
        trees_creates: [],
        trees_access: [],
        trees_admin: [],
        trees_members: [],
        trees_super_admin: []
    })
    user = actualUser.save()
    if (user) {
        return res.status(200).send(user)
    } else {

        return res.status(400).json({ 'final_reason': 'problème interne veuillez ressayez plus tard' })
    }


})

router.put('/add_profil/:userId', uploader.single('image'), async (req, res) => {
    
    try {
        result = await User.findByIdAndUpdate({ _id: req.params.userId }, { image: req.file.filename })
        if (result.image != "" && result.image != null) {
            fs.unlink('./images/user/' + result.image, async (err) => {
                if (err) {
                    //si il ny'a pas de suppression alors on doit remettre le nom de l'image en base de donnée 
                    //puisque celle si existe toujours dans les fichiers
                    old_name = result.image
                    console.error(err);
                    await User.updateOne({ _id: req.params.userId }, { image: old_name })
                    //avant on supprime le fichier chargé
                    fs.unlink( './images/user/' + req.file.filename.toString(), (err) => {
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
        const filePath = './images/user/' + req.file.filename.toString();

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
router.get('/image_profil/:userId',async (req,res)=>{
    file_name=await
    User.findById(req.params.userId,"image").
    then((user)=>{
        res.download(__dirname+'/../images/user/'+user.image)
    }).
    catch((err)=>{
    res.status(400).json({final_reason:"surcharge serveur fichiers, reessayez dans  2 minutes"})
    })
})

router.delete('/delete_profil/:userId', (req, res) => {
    User.findByIdAndUpdate(id = req.params.userId, update = { image: "" }).
        then((result) => {
            //verifions deja si l'image de profil n'est deja pas vide
            if (result.image) {
                //on enregistre l'ancien nom au cas ou on doit remettre si on parviens pas à supprimer le fichier
                old_img_name = result.image
                fs.unlink('./images/user/' + old_img_name, async (err) => {
                    if (err) {
                        //si il ny'a pas de suppression alors on doit remettre le nom de l'image en base de donnée 
                        //puisque celle si existe toujours dans les fichiers
                        console.error(err);
                        await User.updateOne({ _id: req.params.userId }, { image: old_img_name })
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
router.post('/login', async (req, res) => {
    const { error } = loginValidator(req.body)
    const actualUser = await User.findOne({ email: req.body.email })
    if (!actualUser || !bcrypt.compare(req.body.password, actualUser.password)) return res.status(400).json({ 'final_reason': 'l\'email(ou le mot de passe) est incorrect' })

    jwt.sign({
        name: actualUser.name,
        email: actualUser.email,
        trees_admin: actualUser.trees_admin,
        trees_super_admin: actualUser.trees_super_admin,
        trees_members: actualUser.trees_members,
        trees_access: actualUser.trees_access
    },
        process.env.JWT_SECRET_CODE, { expiresIn: '1h' }, (err, token) => {
            if (err) return res.status(400).json({ 'final_reason': err.message })
            res.header('auth-token', token).send(token)

        })
})

router.post('/disconnect', async (req, res) => {
    res.header('auth-token', 'False').json({ 'final_reason': 'disconnected bb' })
})

router.put('/update/:userId', async (req, res) => {
    if (req.body.password) {
        const salt = await bcrypt.genSalt()
        const crypt_password = await bcrypt.hash(req.body.password, salt)
        req.body.password = crypt_password;
        console.log('pass apres crypt' + req.body.password)
    }
    User.updateOne({ _id: req.params.userId }, req.body)
        .then((new_user) => {
            res.status(200).json(new_user)
        }).catch((err) => {
            console.log('erreurr:' + err.message)
            res.status(400).json({ 'final_reason': err.message })
        })

})

router.put('/update_array/:userId/:array/:operation', async (req, res) => {
    const array_trues = ["trees_creates", "trees_access", "trees_admin", "trees_super_admin", "trees_members"]
    const operation_trues = ["add", "remove"]
    if (!array_trues.includes(req.params.array)) return res.status(400).json({ "final_reason": "you want to modify unexpected array" })
    if (!operation_trues.includes(req.params.operation)) return res.status(400).json({ "final_reason": "you want to modify with unsuported operation" })
    //on arrange l'operation pour la base de donnée
    const array = req.params.array
    try {
        if (req.params.operation === "add") {
            console.log('bon ' + array + " " + req.params.userId + " " + JSON.stringify({ $push: { array: req.body.value } }))
            switch (array) {
                case "trees_creates":
                    await User.updateOne({ _id: req.params.userId }, { $push: { "trees_creates": req.body.value } })

                    break;
                case "trees_access":
                    await User.updateOne({ _id: req.params.userId }, { $push: { "trees_access": req.body.value } })
                    await Tree.updateOne({ _id: req.body.value }, { $push: { "allow_users": req.params.userId } })
                    break;
                case "trees_admin":
                    await User.updateOne({ _id: req.params.userId }, { $push: { "trees_admin": req.body.value } })
                    await Tree.updateOne({ _id: req.body.value }, { $push: { "admins": req.params.userId } })
                    break;
                case "trees_super_admin":
                    await User.updateOne({ _id: req.params.userId }, { $push: { "trees_super_admin": req.body.value } })
                    await Tree.updateOne({ _id: req.body.value }, { $push: { "super_admins": req.params.userId } })

                    break;
                case "trees_members":
                    await User.updateOne({ _id: req.params.userId }, { $push: { "trees_members": req.body.value } })
                    break;
            }

        } else {
            switch (array) {
                case "trees_creates":
                    await User.updateOne({ _id: req.params.userId }, { $pull: { "trees_creates": req.body.value } })

                    break;
                case "trees_access":
                    await User.updateOne({ _id: req.params.userId }, { $pull: { "trees_access": req.body.value } })
                    await Tree.updateOne({ _id: req.body.value }, { $pull: { "allow_users": req.params.userId } })
                    break;
                case "trees_admin":
                    await User.updateOne({ _id: req.params.userId }, { $pull: { "trees_admin": req.body.value } })
                    await Tree.updateOne({ _id: req.body.value }, { $pull: { "admins": req.params.userId } })

                    break;
                case "trees_super_admin":
                    await User.updateOne({ _id: req.params.userId }, { $pull: { "trees_super_admin": req.body.value } })
                    await Tree.updateOne({ _id: req.body.value }, { $pull: { "super_admins": req.params.userId } })

                    break;
                case "trees_members":
                    await User.updateOne({ _id: req.params.userId }, { $pull: { "trees_members": req.body.value } })
                    break;
            }
        }

        res.status(200).json({ "final_reason": "operation reussie" })
    } catch (err) {
        res.status(400).json({ 'final_reason': err.message })
    }
})

router.put('/delete/:userId', (req, res) => {
    User.updateOne({ _id: req.params.userId }, { active: False })
        .then(() => {
            res.status(200).json({ final_reason: "operation reussie" })
        }).catch((err) => {
            res.status(400).json({ final_reason: "problème interne veuillez reessayer plustard" })
        })
})

router.get('/all_user', async (req, res) => {
    try {

        const all = await User.find({ active: true })
        console.log(all)
        res.status(200).json(all)
    } catch (e) {
        console.log('erreurrrr')
        res.status(400).json({ 'final_reason': err.message })
    }
})
router.post('/specific_user', (req, res) => {
    User.find(req.body)
        .then((result) => {
            res.status(200).json(result)
        }).catch((err) => {
            res.status(200).json(result)
        })
})

module.exports = router
