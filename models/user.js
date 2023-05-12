const mongoose = require('mongoose')
const Schema = mongoose.Schema

var UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    first_name: String,
    last_name: String,
    email: {
        type: String,
        required: true
    },
    trees_creates: [
        {
            type: Schema.Types.ObjectId,
            ref: "Tree"
        }
    ],
    trees_access: [
        {
            type: Schema.Types.ObjectId,
            ref: "Tree"
        }
    ],
    trees_admin: [{
        type: Schema.Types.ObjectId,
        ref: "Tree"
    }],
    trees_super_admin: [{
        type: Schema.Types.ObjectId,
        ref: "Tree"
    }],
    trees_members: [{
        type: Schema.Types.ObjectId,
        ref: "Member"
    }],
    image:String,
    active: {
        type: Boolean,
        default: true

    }

})

module.exports = mongoose.model('User', UserSchema)