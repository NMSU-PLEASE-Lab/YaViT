/**
 * Model for Ingest Collection
 */
const mongoose = require('mongoose');

// Create Ingest Schema
const ingestSchema = new mongoose.Schema({
    JobsIngested: Boolean,
    NodesIngested: Boolean,
    NodeJobIngested: Boolean,
    ApplicationIngested: Boolean,
    ApplicationUserIngested: Boolean
},
{
    versionKey: false // You should be aware of the outcome after set to false
});

// Export Ingest Model
module.exports = mongoose.model('Ingest', ingestSchema, 'ingest');
