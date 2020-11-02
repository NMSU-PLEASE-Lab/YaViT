/**
 * Model for Jobs collection
 */
const mongoose = require('mongoose');

const nodeJobSchema = new mongoose.Schema({
    _id: Number,
    NodeId : Number,
    JobNumber : Number
},
{
    versionKey: false // You should be aware of the outcome after set to false
});

// Export NodeJob Model
module.exports = mongoose.model('NodeJob', nodeJobSchema, 'node_job');
