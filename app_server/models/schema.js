/* *
 * Model for 'schema' collection
 */
var mongoose = require('mongoose');
var Schema = mongoose.model('Schema', {}, 'schema');
var allMetricModels = [];

Schema
    .find({
        'type': 'metrics'
    })
    .exec(function (err, metrics) {
        if (!err) {
            for (var i = 0; i < metrics.length; i++) {
                var modelName = JSON.parse(JSON.stringify(metrics[i])).name;
                allMetricModels[modelName] = mongoose.model(modelName, {}, modelName);
            }
        }
        else
            console.log(err);
    });

module.exports = allMetricModels;