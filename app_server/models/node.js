/* 
 * Model for 'node' collection
 */

const mongoose = require('mongoose');
// var jwt = require('jsonwebtoken');

let nodeSchema = new mongoose.Schema({
    _id: Number,
    Name: String
});

mongoose.model('Node', nodeSchema, 'node');