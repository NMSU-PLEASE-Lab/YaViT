/* 
 * Model for 'node' collection
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
// var jwt = require('jsonwebtoken');

let nodeSchema = new Schema({
    _id: Number,
    Name: String
});

mongoose.model('Node', nodeSchema, 'node');