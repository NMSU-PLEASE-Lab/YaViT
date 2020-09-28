/* 
 * Model for 'node' collection
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let nodeSchema = new Schema({
    _id: Number,
    Name: String
},
{
    versionKey: false // You should be aware of the outcome after set to false
});

module.exports = mongoose.model('Node', nodeSchema, 'node');