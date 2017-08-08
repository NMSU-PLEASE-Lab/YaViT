/**
 *Controller for request relating to metrics like meminfo, vmstat, papi etc
 */
var mongoose = require('mongoose');
var MongoClient = require('mongodb').MongoClient;
var Schema = mongoose.model('Schema', {}, 'schema');
var allMetricModels = [];
var cursor = require('../models/cursor');
var db = require('../models/db.js');
var moment = require('moment');
var _ = require('underscore');


/**
 * Fetch metrics schema from 'schema' collection
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.getMetricsSchema = function (req, res) {
    /* Mongoclient was used because dynamic collection name throwed error in moongoose */
    MongoClient.connect(db.dbURI, {},function (err, db) {
        db.collection('schema')
            .find({
                'type': 'metrics'
            }).toArray(function (err, metrics) {
            if (!err) {
                var finished = _.after(metrics.length, function () {
                    return res.status(200).json(metrics);

                });
                for (var i = 0; i < metrics.length; i++) {
                    if (err)
                        return res.status(400).json({
                            "message": err
                        });
                    (function (i,metricname) {
                        db.collection(metricname).find({}, {"Timestamp": 1}).sort({"Timestamp": 1}).limit(1).toArray(function (err, data) {
                            if (!err)
                                metrics[i]['MinTime'] = data[0].Timestamp;
                            finished();
                        });
                    }(i, metrics[i]['name']));
                }
            }
            else
                return res.status(400).json({
                    "message": err
                });
        });
    });

};



/**
 * Get metrics data according to request filters
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.getMetricsData = function (req, res) {
    var requestObj = JSON.parse(req.query.filters);
    if (requestObj.dateTo == "")
        requestObj.dateTo = moment().valueOf();


    /* Mongoclient was used because dynamic collection name throwed error in moongoose */
    MongoClient.connect(db.dbURI,{}, function (err, db) {
        if (err)
            return res.status(400).json({
                "message": err
            });

        var filterObj = {};

        filterObj["_id"] = 0;
        filterObj["Timestamp"] = 1;
        filterObj[requestObj.metricValue] = 1;
        var fromTime = 0;
        var toTime = 0;
        fromTime = requestObj.dateFrom;
        toTime = requestObj.dateTo;

        var sortOrder = 1;
        var timeDiff = toTime - fromTime;
        var metricCollection;
        // if all or greater than one month data display daily average
        if (timeDiff > 2628000000) {
            metricCollection = db.collection(requestObj.type + ".daily");

        }
        //if greater than 1 day display hourly average
        else if (timeDiff > 86400000) {
            metricCollection = db.collection(requestObj.type + ".hourly");
        }
        //greater than 10 minutes display minutely average
        else if (timeDiff > 60000000) {
            metricCollection = db.collection(requestObj.type + ".minutely");
        }
        //display non average data
        else {
            metricCollection = db.collection(requestObj.type);
        }
        try {
            metricCollection.find({
                    "NodeId": parseInt(requestObj.nodeId),
                    "Timestamp": {
                        $gte: fromTime,
                        $lte: toTime
                    }
                },
                filterObj).sort({Timestamp: sortOrder}).toArray(function (err, data) {
                if (!err) {
                    var resp = {};
                    if (sortOrder == -1)
                        data.reverse();

                    resp.data = data.map(function (item) {
                        return [item.Timestamp, item[requestObj.metricValue]];
                    });
                    return res.status(200).json(resp);
                }
                else {
                    db.close();
                    return res.status(400).json({
                        "message": err
                    });
                }
            });
        }
        catch (err) {
            return res.status(400).json({
                "message": err
            });
        }
    });
};
/**
 * Fetch job metric schema from 'dynamic_schema' collection
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.getJobMetricsSchema = function (req, res) {
    /* Mongoclient was used because dynamic collection name throwed error in moongoose */
    MongoClient.connect(db.dbURI, {},function (err, db) {
        db.collection('dynamic_schema')
            .find({
                '$and':[{'Jobid': parseInt(req.query.jobId)},{'processedMax':{'$exists':true}}]
            }).toArray(function (err, metrics) {
            if (!err) {
                return res.status(200).json(metrics);
            }
            else
                return res.status(400).json({
                    "message": err
                });
        });
    });

};

/**
 * Get job metrics data according to request filters
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.getJobMetricsData = function (req, res) {
    var requestObj = JSON.parse(req.query.filters);
    if (requestObj.dateTo === "")
        requestObj.dateTo = moment().valueOf();


    /* Mongoclient was used because dynamic collection name throwed error in moongoose */
    MongoClient.connect(db.dbURI,{}, function(err, db) {
        if (err)
            return res.status(400).json({
                "message": err
            });

        var filterObj = {};

        filterObj["_id"] = 0;
        filterObj["Timestamp"] = 1;
        filterObj[requestObj.metricValue] = 1;
        var fromTime = 0;
        var toTime = 0;
        fromTime = requestObj.dateFrom;
        toTime = requestObj.dateTo;

        var sortOrder = 1;
        var timeDiff = toTime - fromTime;
        var metricCollection;
        var rawData = true;
        //if greater than 12 hours display hourly average
        if (timeDiff > 43200000) {
            metricCollection = db.collection(requestObj.type + ".hourly");
        }
        //greater than 10 minutes display minutely average
        else if (timeDiff > 60000000) {
            metricCollection = db.collection(requestObj.type + ".minutely");
        }
        //display non average data
        else {
            metricCollection = db.collection(requestObj.type);
        }


        try {
            metricCollection.find({
                    "Jobid": parseInt(requestObj.jobId),
                    "NodeId": parseInt(requestObj.nodeId),
                    "ProcessId": parseInt(requestObj.processId),
                    "Timestamp": {
                        $gte: fromTime,
                        $lte: toTime
                    }
                },
                filterObj).sort({Timestamp: sortOrder}).toArray(function (err, data) {
                if (!err) {
                    var resp = {};
                    if (sortOrder == -1)
                        data.reverse();

                    resp.data = data.map(function (item) {
                        return [item.Timestamp, item[requestObj.metricValue]];
                    });
                    return res.status(200).json(resp);
                }
                else {
                    db.close();
                    return res.status(400).json({
                        "message": err
                    });
                }
            });
        }
        catch (err) {
            return res.status(400).json({
                "message": err
            });
        }
    });
};
/**
 * Get processIds for a job with spapi
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.getProcessIds = function (req, res) {

    /* Mongoclient was used because dynamic collection name throwed error in moongoose */
    MongoClient.connect(db.dbURI,{}, function(err, db) {
        if (err)
            return res.status(400).json({
                "message": err
            });

        var metricCollection =  db.collection(req.query.type + ".hourly");
        try {
            metricCollection.aggregate([
                {
                    '$match':{'Jobid':parseInt(req.query.jobId)}
                },
                {
                    '$group':{
                        '_id':{"NodeId":"$NodeId"},
                        'ProcessIds':{"$push":"$ProcessId"}
                    }
                },
                {'$project':{
                    '_id':'$_id.NodeId',
                    'ProcessIds':'$ProcessIds'
                }}

            ],function (err, data) {
                if (!err) {
                    return res.status(200).json(data);
                }
                else {
                    db.close();
                    return res.status(400).json({
                        "message": err
                    });
                }
            });
        }
        catch (err) {
            return res.status(400).json({
                "message": err
            });
        }
    });
};



