/* *
 * Model for 'node' collection
 */

var mongoose = require('mongoose');
var jwt = require('jsonwebtoken');
var nodeSchema = new mongoose.Schema({
    _id: Number,
    Name: String
});
mongoose.model('Node', nodeSchema, 'node');