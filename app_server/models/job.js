/**
 * Model for Jobs collection
 */
const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    _id: Number,
    ApplicationName : String,
    name : String,
    exit_status : String,
    groupname : String,
    mem_bytes : Number,
    fail_msg : String,
    queue : String,
    mem_used : String,
    node_req : String,
    end_time : Number,
    owner : String,
    queue_time : Number,
    slots : Number,
    ApplicationID : String,
    start_time : Number,
    walltime :String,
    nodeId : Number
},
{
    versionKey: false // You should be aware of the outcome after set to false
});

module.exports = mongoose.model('Job', jobSchema, 'job');
