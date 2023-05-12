const express = require("express")


const { Event, Participation } = require('../models/event')
const { Member } = require('../models/member')
const { Detail } = require('../models/member')
const Tree = require('../models/tree');


async function logical_event_life(req,res,next){
    if(req.path.includes("/create_event")){
        //on verifie si la date existe car si ce n'est pas le cas alors la requête sera bloqué plus tard dans les validations de formes et de fond
        //ce qui nous concerne ici est la validation de la logique de fonctionnement, l'adequation du système avec des faits reels
        if(req.body.date && req.body.owner && req.body.type_event && req.body.type_event=="memberevent"){
            let owner_act=await Member.findOne({_id:req.body.owner},"birth_date dead_date")
            let birth_full=new Date(owner_act.birth_date)
            let death_full=new Date(owner_act.dead_date)
            let event_date=new Date(req.body.date)
            console.log(owner_act)
            if(event_date<birth_full || event_date>death_full)return res.status(400).send({final_reason:"cette date d'evennement est incompatible avec la naissance ou le deces de son createur"})
        }
    }else if(req.path.includes("/update_event")){
        //verifions d'abord si la date est incluse dans la modification
        if(req.body.date){
            //si il y'a modification on verifie pour la compatibilité avec le owner et les participants
            //init
            let event_act_p=await Event.findOne({_id:req.params.eventId,type_event:"memberevent"},"owner").populate("owner","birth_date dead_date")
            let event_date;
            if(event_act_p){
                let birth_full=new Date(event_act_p.owner.birth_date)
                let death_full=new Date(event_act_p.owner.dead_date)
                event_date=new Date(req.body.date)
                console.log(event_act_p.date)
                if(event_date<birth_full || event_date>death_full) return res.status(400).send({final_reason:"cette nouvelle date d'evennement est incompatible avec la date de naissance ou de decès de son createur"})

            }else{
                event_act_p=await Event.findOne({_id:req.params.eventId,type_event:"familyevent"},"owner").populate("owner","birth_date dead_date")
                event_date=new Date(event_act_p.date)
            }
            //maintenant on verifies les participants de la même facon mais en l
            let participations_act_p=await Participation.find({event:req.params.eventId},"member _id").populate("member","birth_date first_name dead_date")
            participations_act_p.forEach(pt => {
                let birth_full=new Date(pt.member.birth_date)
                let death_full=new Date(pt.member.dead_date)
                if(event_date<birth_full || event_date>death_full) return res.status(400).send({final_reason:"cette nouvelle date d'evennement est incompatible avec "+ pt.member.first_name+ "qui se trouve être un participant, regarder sa date de naissance ou de décès"})
            });


            
        }

    }else if(req.path.includes("/add_participation")){
        //d'abord on verifie si ce qui nous interresse cad le member est bien present sinon on passe
        if(req.body.member){
            let member_act=await Member.findById(req.body.member,"birth_date first_name dead_date")
            let event_act=await Event.findOne({_id:req.params.eventId},"date")
            if(member_act && event_act){
                            let event_date=new Date(event_act.date)
            let birth_full=new Date(member_act.birth_date)
            let death_full=new Date(member_act.dead_date) 
            if(event_date<birth_full || event_date>death_full)return res.status(400).send({final_reason:"la date de cet evennement est incompatible avec "+ member_act.first_name+ ", regarder sa date de naissance ou de décès"})
        
            }
}
    }
    //res.status(400).send("pause")
    return next()
}

async function logical_member_life  (req, res, next) {
    console.log(res.statusCode)
    //initialisons mod_participations qui est un tableau qui servira à faire invalidé des participations d'evennement dans le cas ou certains participant non propriétaire modifieront
    //modifieront leurs dates de naissance ou décès et ne seront plus compatible avec la date de l'event dont il sont participants
    //mais l'evennement n'etant pas à eux on ne peut supprimer la participations mais juste signalé une invalidité et laissé le propriétaire jugé quoi faire
    let mod_participations=[]
    if (req.path.includes("create_member")) {
        if (req.body.birth_date && req.body.dead_date) {
            //traitons d'abord le cas de la date de naissance et de deces
            birth_year = new Date(req.body.birth_date).getFullYear()
            dead_year = new Date(req.body.dead_date).getFullYear()
            if ((dead_year - birth_year) < 0) return res.status(400).send({ final_reason: "cet individu ne peut être né apres son décès, on ne prend pas en compte le phenomène de reincarnation" })

        }
        //le sexe des deux parents
        if ((req.body.target_parent && req.body.second_parent )) {
            parent = await Member.findOne({ _id: req.body.target_parent })
            if (parent.sex && req.body.second_parent.sex) {
                if (parent.sex.toLowerCase() == req.body.second_parent.sex.toLowerCase()) return res.status(400).send({ final_reason: "les parents d'un individu ne peuvent avoir le même sexe" })
            }
        }
        //la date des parents en fonction de l'enfant
        if (req.body.birth_date && (req.body.target_parent || req.body.second_parent)) {
            birth_year = new Date(req.body.birth_date)
            //on verifie les naissances
            if (req.body.second_parent && req.body.second_parent.birth_date) {
                second_year = new Date(req.body.second_parent.birth_date)
                if (second_year >=birth_year) return res.status(400).send({ final_reason: "un parent ne peut être né apres son enfant" })
            }

            if (req.body.target_parent) {
                parent = await Member.findOne({ _id: req.body.target_parent })
                if (parent.birth_date) {
                    first_year = new Date(parent.birth_date)
                    if (first_year>= birth_year) return res.status(400).send({ final_reason: "un parent ne peut être né apres son enfant" })
                }
            }
            //on verifie les deces
            if (req.body.second_parent && req.body.second_parent.dead_date) {
                second_year = new Date(req.body.second_parent.dead_date)
                if (req.body.second_parent.sex && req.body.second_parent.sex.toLowerCase() == "f") {
                    if (second_year <birth_year) return res.status(400).send({ final_reason: "une maman ne peut accouché ou parrainé un enfant etant morte morte avant la naissance de celui ci,verifiez la date de decès de la mère" })
                } else if (req.body.second_parent.sex && req.body.second_parent.sex.toLowerCase() == "m") {
                    if ((second_year.getFullYear() - birth_year.getFullYear() ) < -1) return res.status(400).send({ final_reason: "un père ne peut avoir concu un enfant avant de perdre la vie que au moins une année avant la naissance de l'enfant,verifiez la date de decès du père" })
                }

            }
            if (req.body.target_parent) {
                parent = await Member.findOne({ _id: req.body.target_parent })
                if (parent.dead_date && parent.sex) {
                    first_year = new Date(parent.dead_date)
                    if (parent.sex.toLowerCase() == "f") {
                        if (first_year <birth_year) return res.status(400).send({ final_reason: "une maman ne peut accouché ou parrainé un enfant etant morte morte avant la naissance de celui ci,verifiez la date de decès de la mère" })
                    } else {
                        if ((first_year.getFullYear() - birth_year.getFullYear()) < -1) return res.status(400).send({ final_reason: "un père ne peut avoir concu un enfant avant de perdre la vie que au moins une année avant la naissance de l'enfant,verifiez la date de decès du père" })
                    }
                    console.log(birth_year +"ffffffffffff")
                    console.log(first_year +"bbbbbbbbb")
                }
            }

        }
    } else if (req.path.includes("update_member")) {
        //d'abord on recupère les evennements et participations qui conernent notre individus en vue de faire plus bas des tests d'integrité
        //dans l'exemple de es ce un individu est mentioner dans un evennement qui s'est deroulé avant sa naissance
        let events_act=await Event.find({owner:req.params.memberId},"date")
        let participations_act=await Participation.find({member:req.params.memberId},"event _id").populate("event","date")


        //la date de naissance et deces de l'individu
        if (req.body.birth_date && req.body.dead_date) {
            birth_full=new Date(req.body.birth_date)
            death_full= new Date(req.body.dead_date)
            //on verifie d'abord la compatibilité entre les 2 dates humainement parlant
            birth_year = new Date(req.body.birth_date).getFullYear()
            dead_year = new Date(req.body.dead_date).getFullYear()
            if ((dead_year - birth_year) < 0) return res.status(400).send({ final_reason: "cet individu ne peut être né apres son décès, on ne prend pas en compte le phenomène de reincarnation" })
            //ensuite on verifie avec les evennements appartenants à cet individu 
            events_act.forEach((ev)=>{
                if(new Date(ev.date)<birth_full || new Date(ev.date)>death_full)return res.status(400).send({ final_reason:"cet individu possède des evennements qui se sont passés avant cette date de naissance ou apres cette date de deces"})
            })
            //pour le cas des participations si il y'a problème les dites participations seront declarés invalides 
            console.log(participations_act)
            participations_act.forEach((pt)=>{
                if(new Date(pt.event.date)<birth_full || new Date(pt.event.date) >death_full){
                                //on met en place les id en question pour faire la modifications apres si tous se passe bien car si tous se passe pas bien 
                                //cette date sera changer plustard donc on aura mis illegalement les pieds sur l'intégrités des données
                                mod_participations.push(pt._id)
                }
            })

        } else if (req.body.birth_date && !req.body.dead_date) {
            birth_full=new Date(req.body.birth_date)
            //meme si la modification concerne une seule des 2 dates nous devons verifier si la 2eme existe deja
            const mem = await Member.findOne({ _id: req.params.memberId })
            if (mem.dead_date) {
                birth_year = new Date(req.body.birth_date).getFullYear()
                dead_year = new Date(mem.dead_date).getFullYear()
                if ((dead_year - birth_year) < 0) return res.status(400).send({ final_reason: "cet individu ne peut être né apres son décès, on ne prend pas en compte le phenomène de reincarnation" })
            }
                        //ensuite on verifie avec les evennements appartenants à cet individu avec sa date de naissance  ou de decès
                        events_act.forEach((ev)=>{
                            if(new Date(ev.date)<birth_full)return res.status(400).send({ final_reason:"cet individu possède des evennements qui se sont passés avant cette date de naissance"})
                            
                        })
                        //pour le cas des participations si il y'a problème les dites participations seront declarés invalides 
                        
                        participations_act.forEach((pt)=>{
                            //console.log(participations_act + "  4444444444444")
                            if(new Date(pt.event.date)<birth_full){
                                //on met en place les id en question pour faire la modifications apres si tous se passe bien car si tous se passe pas bien 
                                //cette date sera changer plustard donc on aura mis illegalement les pieds sur l'intégrités des données
                                mod_participations.push(pt._id)
                            }
                            ///console.log("555555"+mod_participations)
                        })

        } else if (!req.body.birth_date && req.body.dead_date) {
            
            death_full= new Date(req.body.dead_date)
            //meme si la modification conerne une seule des 2 dates nous devons verifier si la 2eme existe deja
            const mem = await Member.findOne({ _id: req.params.memberId })
            if (mem.birth_date) {
                dead_year = new Date(req.body.dead_date).getFullYear()
                birth_year = new Date(mem.birth_date).getFullYear()
                if ((dead_year - birth_year) < 0) return res.status(400).send({ final_reason: "cet individu ne peut être né apres son décès, on ne prend pas en compte le phenomène de reincarnation" })
            }
                        //ensuite on verifie avec les evennements appartenants à cet individu 
                        events_act.forEach((ev)=>{
                            if( new Date(ev.date)>death_full)return res.status(400).send({ final_reason:"cet individu possède des evennements qui se sont passés apres cette date de deces"})
                        })
                        //pour le cas des participations si il y'a problème les dites participations seront declarés invalides 
                        participations_act.forEach((pt)=>{
                            if( new Date(pt.event.date) >death_full){
                                                                //on met en place les id en question pour faire la modifications apres si tous se passe bien car si tous se passe pas bien 
                                //cette date sera changer plustard donc on aura mis illegalement les pieds sur l'intégrités des données
                                mod_participations.push(pt._id)
                            }
                        })


        }
        //le sexe des deux parents
        if ((req.body.target_parent || req.body.second_parent)) {

            //prenons d'abord tout cas ou le target est la seul ou avec le second
            if (req.body.target_parent) {
                parent = await Member.findOne({ _id: req.body.target_parent })
                //cas ou ils sont 2
                if (req.body.second_parent && parent && parent.sex && req.body.second_parent.sex) {
                    if (parent.sex.toLowerCase() == req.body.second_parent.sex.toLowerCase()) return res.status(400).send({ final_reason: "les parents d'un individu ne peuvent avoir le même sexe" })

                } else {
                    //cas ou il est seul
                    const mem = await Member.findOne({ _id: req.params.memberId })
                    if (mem.second_parent.sex && parent.sex) {
                        if (parent.sex.toLowerCase() == mem.second_parent.sex.toLowerCase()) return res.status(400).send({ final_reason: "les parents d'un individu ne peuvent avoir le même sexe" })
                    }

                }

            } else {
                //le cas alors ou il n'ya que le second dans le corps
                //cherchons le target de l'individu modifier
                const mem = await Member.findOne({ _id: req.params.memberId })
                if (mem.target_parent) {
                    parent = await Member.findOne({ _id: mem.target_parent })
                    if (parent.sex && req.body.second_parent.sex) {
                        if (parent.sex.toLowerCase() == req.body.second_parent.sex.toLowerCase()) return res.status(400).send({ final_reason: "les parents d'un individu ne peuvent avoir le même sexe" })
                    }
                }

            }

        }
        //verification dates morts et naissances des parents en fonction de la naissance de l'enfant
        //ici à chaque niveau on verifie si le concerné est parmi les paramètre de modification sinon on le prend en memoire
        if (req.body.birth_date || req.body.target_parent || req.body.second_parent) {
            const mem = await Member.findOne({ _id: req.params.memberId })
            birth_year=mem.birth_date?new Date(mem.birth_date):null
            if(req.body.birth_date)birth_year =  new Date(req.body.birth_date) 
            
            if (birth_year) {
                //on verifie les naissances
                second_year= mem.second_parent && mem.second_parent.birth_date?new Date(mem.second_parent.birth_date):null
                if(req.body.second_parent && req.body.second_parent.birth_date)second_year = new Date(req.body.second_parent.birth_date) 
                
                if (second_year) {
                    if (second_year >= birth_year) return res.status(400).send({ final_reason: "un parent ne peut être né apres son enfant" })
                }
                parent = req.body.target_parent ? await Member.findOne({ _id: req.body.target_parent }) : await Member.findOne({ _id: mem.target_parent })
                if (parent) {

                    if (parent.birth_date) {
                        first_year = new Date(parent.birth_date)
                        if (first_year >= birth_year) return res.status(400).send({ final_reason: "un parent ne peut être né apres son enfant" })
                    }
                }
                //on verifie les deces
                second_dead_year=mem.second_parent && mem.second_parent.dead_date? new Date(mem.second_parent.dead_date):null
                if(req.body.second_parent && req.body.second_parent.dead_date)second_dead_year =  new Date(req.body.second_parent.dead_date) 
                
                if (second_dead_year) {
                    second_sex = req.body.second_parent && req.body.second_parent.sex ? req.body.second_parent.sex :mem.second_parent.sex
                    if (second_sex) {
                        if (second_sex.toLowerCase() == "f") {
                            if (second_dead_year < birth_year) return res.status(400).send({ final_reason: "une maman ne peut accouché ou parrainé un enfant etant morte morte avant la naissance de celui ci,verifiez la date de decès de la mère" })
                        } else if (second_sex.toLowerCase() == "m") {
                            if ((second_dead_year.getFullYear() - birth_year.getFullYear()) < -1) return res.status(400).send({ final_reason: "un père ne peut avoir concu un enfant avant de perdre la vie que au moins une année avant la naissance de l'enfant,verifiez la date de decès du père" })
                        }
                    }
                }
                parent = req.body.target_parent ? await Member.findOne({ _id: req.body.target_parent }) : await Member.findOne({ _id: mem.target_parent })
                if (parent) {

                    if (parent.dead_date && parent.sex) {
                        first_year = new Date(parent.dead_date)
                        if (parent.sex.toLowerCase() == "f") {
                            if (first_year < birth_year  ) return res.status(400).send({ final_reason: "une maman ne peut accouché ou parrainé un enfant etant morte morte avant la naissance de celui ci,verifiez la date de decès de la mère" })
                        } else {
                            if ((first_year.getFullYear() - birth_year.getFullYear()) < -1) return res.status(400).send({ final_reason: "un père ne peut avoir concu un enfant avant de perdre la vie que au moins une année avant la naissance de l'enfant,verifiez la date de decès du père" })
                        }

                    }
                }


            }

           
        }
    }else if(req.path.includes("delete_member")){

        let tree_mem= await Tree.findOne({"first": req.params.memberId })
        console.log(tree_mem)

        if(tree_mem)return res.status(400).send({ final_reason: "impossible de supprimer le premier membre d'un arbre genealogique, essayez plutôt de le modifier" })

    }

    //ENFIN SI LE PROGRAMME N'A PAS BLOQUER SUR UNE ERREUR DE  LOGIQUE ALORS ON RETOURNE LE NEXT TOUT EST EN ORDRE

    //on effectuer d'abord les potentielles  modifications de mod_participations
    if(res.statusCode==200){
            if(mod_participations.length>0)mod_participations.forEach(async pt=> await Participation.updateOne({_id:pt._id},{valid:false}))  
            return next()
    }
    console.log(res.statusCode)

}

module.exports={LogicalMemberLife:logical_member_life,LogicalEventLife:logical_event_life}