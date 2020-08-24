/* *
 * Model for 'schema' collection
 */
const mongoose  = require('mongoose');
const Schema    = mongoose.model('Schema', {}, 'schema');

let allMetricModels = [];

Schema
.find({
    'type': 'metrics'
})
.exec((err, metrics) => {
    if (!err) {
        for (let i = 0; i < metrics.length; i++) {
            let modelName = JSON.parse(JSON.stringify(metrics[i])).name;
            allMetricModels[modelName] = mongoose.model(modelName, {}, modelName);
        }
    }
    else
        console.log(err);
});

module.exports = allMetricModels;