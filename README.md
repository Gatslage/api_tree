# API_TREE (Mongoose, Express js , node js)
Rest API intended to ensure the complete management of a modern family tree taking into account the media 
side. Main characteristics:
-- A black box of tests which has the role of keeping the adequacy of operations with real life, 
this is represented by 2 middlewares which capture each request before it ends up in the controllers.
 (verification of dates according to births and events, system for verifying the non-impact of
 a modification on the logical integrity of the family tree)
--system for assigning reading rights and partial administration, by the creator of the tree
--Management of family and personal events accompanied by images
--Profile image management at all levels (user, family tree profile, family member profile...)
-- management of information from the daily life of members (complete biography,
different places of residence, accident, health, etc.)
--palletes of verification of the updates of the information of each member
-- (etc)
