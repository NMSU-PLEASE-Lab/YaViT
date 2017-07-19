/**
 * Controller for 'node' collection
 */
var mongoose = require('mongoose');
var Node = mongoose.model('Node', {"_id": Number}, 'node');


/**
 * Get all nodes
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.allNodes = function (req, res) {
    Node.find()
        .sort({"_id": 1})
        .exec(function (err, nodes) {
            res.status(200).json(nodes);
        });


};

/**
 * Get all nodes by their ids
 * @param Ids - Ids (array) of nodes
 * @param callback - callback function
 */
module.exports.getNodesByIds = function (Ids, callback) {
    Node.find({
        "_id": {
            "$in": Ids
        }
    }).exec(function (err, nodes) {
       return callback(nodes);
    });
};