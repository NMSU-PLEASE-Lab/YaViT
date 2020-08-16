/**
 * Controller for 'node' collection
 */
const mongoose = require('mongoose');
const Node = mongoose.model('Node', {"_id": Number}, 'node');


/**
 * Get all nodes
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.allNodes = (req, res) => {
    Node
    .find()
    .sort({"_id": 1})
    .exec( (err, nodes) => {
        res.status(200).json(nodes);
    });
};

/**
 * Get all nodes by their ids
 * @param Ids - Ids (array) of nodes
 * @param callback - callback function
 */
module.exports.getNodesByIds = (Ids, callback) => {
    Node.find({
        "_id": {
            "$in": Ids
        }
    }).exec((err, nodes) => {
       return callback(nodes);
    });
};
