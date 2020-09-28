/**
 * Model for Ingest Collection
 */

const mongoose = require('mongoose');

// Create Ingest Schema
const ingestSchema = new mongoose.Schema({
    JobsIngested: Boolean,
    NodesIngested: Boolean
});

// Export Ingest Model
module.exports = mongoose.model('Ingest', ingestSchema, 'ingest');
