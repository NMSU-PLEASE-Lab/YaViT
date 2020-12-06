/**
 * Model for Application collection
 */
const mongoose = require('mongoose');

const applicationUserSchema = new mongoose.Schema({
    _id: String,

    ApplicationName : {
        type: String,
        index: { unique: false }
    },

    UserID: {
        type: String,
        index: { unique: false }
    },
    
    ApplicationID: {
        type: String,
        index: { unique: false }
    },

    UserName: {
        type: String,
        index: { unique: false }
    },
    
},
{
    versionKey: false // You should be aware of the outcome after set to false
});

module.exports = mongoose.model('ApplicationUser', applicationUserSchema, 'application_user');
