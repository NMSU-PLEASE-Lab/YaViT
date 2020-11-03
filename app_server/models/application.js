/**
 * Model for Application collection
 */
const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
    _id: String,
    Name : {
        type: String,
        unique: true
    },
    
},
{
    versionKey: false // You should be aware of the outcome after set to false
});

module.exports = mongoose.model('Application', applicationSchema, 'application');
