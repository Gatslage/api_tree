const { Event } = require("../models/event");
const { Member } = require("../models/member");

module.exports= {"RoleVerify": (...permitted_roles) =>async (req, res, next,) => {
    permitted_roles=permitted_roles.map((role)=>role.toString())
    user_roles = []
    if (req.params.eventId) {
        console.log('on est dans event')
        try{
                    that_event=await Event.findOne({ _id: req.params.eventId })

                console.log('on a trouvé l\'event dans le trees acces '+ req.user.trees_access[0] +' maintenant on va chercher '+req.user.trees_access.includes(that_event.tree.toString()))
                if (req.user.trees_access.includes(that_event.tree.toString())) {
                    console.log('sommes nous entrer ici? dans access')
                    user_roles.push('access');
                    if (req.user.trees_super_admin.includes(that_event.tree.toString())) {
                        user_roles.push('super_admin');
                    console.log('sommes nous entrer ici? même dans super')

                    } else {
                        if (that_event.type_event == 'memberevent') {
                            if (req.user.trees_members.includes(that_event.owner.toString())) user_roles.push('member');
                            console.log('sommes nous entrer ici?nous netions pas super '+req.user.trees_members+' avec le '+that_event.owner.toString())
                        } else if (that_event.type_event == 'familyevent') {
                            if (req.user.trees_admin.includes(that_event.tree.toString())) user_roles.push('admin');
                        }
            
                    }
                }
        }catch(err){
                res.status(400).json({'final_reason':'problem into server,try again later'})
            }
    // }else if(req.params.family){

    }else if(req.params.memberId){
        try{
                    that_member=await Member.findOne({_id:req.params.member})
            if(req.user.trees_access.includes(that_member.tree.toString())){
                user_roles.push('access');
                if (req.user.trees_super_admin.includes(that_member.tree.toString())) {
                    user_roles.push('super_admin');
                }else {
                    if (req.user.trees_members.includes(that_member.user.toString())) user_roles.push('member');
                }
            }
        }catch(err){
            res.status(400).json({'final_reason':'problem into server,try again later'})
        }
    }else if(req.params.treeId){
        if(req.user.trees_access.includes(req.params.tree)){
            user_roles.push('access')
            if(req.user.trees_super_admin.includes(req.params.tree.toString()))user_roles.push('super_admin')
            if(req.user.trees_admin.includes(req.params.tree.toString()))user_roles.push('admin')
        }
    }else{
        //case create or search event by member 
        if(req.body.type_event=='memberevent' || req.body.owner!=""){
            if(req.user.trees_super_admin.includes(req.body.tree.toString()))user_roles.push('super_admin')
            if(req.user.trees_members.includes(req.body.owner.toString()))user_roles.push('member')
        }
        //case create or search event or member by administrators or access_user
        if(req.body.tree){
            if(req.user.trees_access.includes(req.body.tree.toString())){
                user_roles.push('access')
                if(req.user.trees_super_admin.includes(req.body.tree.toString()))user_roles.push('super_admin')
                if(req.user.trees_admin.includes(req.body.tree.toString()))user_roles.push('admin')
            }
        }
    }

    //maintenant on filtre pour voir si les l'un des roles de l'utilisateur est compatible avec la liste acceptable
    //de role passer en paramètre
    console.log(user_roles+' utilisateur')
    console.log(permitted_roles+' les roles permis')
    console.log(user_roles.map((role)=>permitted_roles.includes(role.toString())))
    console.log('type user '+ typeof user_roles[0]+"  type du permited "+typeof permitted_roles[0])
    if(user_roles.map((role)=>permitted_roles.includes(role.toString())).filter((response)=>response==true).length>0){
        next()
    }else{
        res.status(400).json({"final_reason":"Désolé,vous n'avez pas les droits d'acces à cet élement"})
    }
}} 