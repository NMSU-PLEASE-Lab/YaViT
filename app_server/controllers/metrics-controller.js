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
    MongoClient.connect(db.dbURI, function (err, db) {
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
    MongoClient.connect(db.dbURI, function (err, db) {
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
 * Get metrics data according to request filters
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.getMetricsData2 = function (req, res) {
    var requestObj = JSON.parse(req.query.filters);
    if (requestObj.dateTo == "")
        requestObj.dateTo = moment().valueOf();

    /* Mongoclient was used because dynamic collection name throwed error in moongoose */
    MongoClient.connect(db.dbURI, function (err, db) {
        if (err)
            return res.status(400).json({
                "message": err
            });

        var filterObj = {};
        var cursorResponse = new cursor.cursorResponse();

        var requestCursor = requestObj.cursor;
        filterObj["_id"] = 0;
        filterObj["Timestamp"] = 1;
        filterObj[requestObj.metricValue] = 1;
        var fromTime = 0;
        var toTime = 0;
        var sortOrder = 1;
        if (typeof requestCursor === "undefined") {
            fromTime = requestObj.dateFrom;
            toTime = requestObj.dateTo;
        }
        else if (requestCursor > 0) {
            fromTime = requestCursor;
            toTime = requestObj.dateTo;
        }
        else {
            fromTime = requestObj.dateFrom;
            toTime = -requestCursor;
            sortOrder = -1;
        }


        var metricCollection = db.collection(requestObj.type);

        try {
            metricCollection.find({
                    "NodeId": parseInt(requestObj.nodeId),
                    "Timestamp": {
                        $gte: fromTime,
                        $lte: toTime
                    }
                },
                filterObj).sort({Timestamp: sortOrder}).limit(requestObj.count).toArray(function (err, data) {
                if (!err) {
                    var resp = {};

                    if (data.length == 0) {
                        resp.cursor = cursorResponse;
                        resp.data = [];
                        return res.status(200).json(resp);
                    }

                    if (sortOrder == -1)
                        data.reverse();

                    metricCollection.find({
                        "NodeId": parseInt(requestObj.nodeId),
                        "Timestamp": {
                            $gte: requestObj.dateFrom,
                            $lte: requestObj.dateTo
                        }
                    }, {"_id": 0, "Timestamp": 1}).sort({Timestamp: 1}).limit(1).toArray(function (err, firstData) {
                        if (err) {
                            db.close();
                            return res.status(400).json({
                                "message": err
                            });
                        }
                        metricCollection.find({
                            "NodeId": parseInt(requestObj.nodeId),
                            "Timestamp": {
                                $gte: requestObj.dateFrom,
                                $lte: requestObj.dateTo
                            }
                        }, {"_id": 0, "Timestamp": 1}).sort({Timestamp: -1}).limit(1).toArray(function (err, lastData) {
                            db.close();
                            if (err) {
                                return res.status(400).json({
                                    "message": err
                                });
                            }
                            cursorResponse.prev_cursor = data[0].Timestamp - 1;
                            cursorResponse.next_cursor = data[data.length - 1].Timestamp + 1;
                            cursorResponse.first_cursor = firstData[0].Timestamp;
                            cursorResponse.last_cursor = lastData[0].Timestamp;

                            if (cursorResponse.prev_cursor < requestObj.dateFrom || cursorResponse.prev_cursor == cursorResponse.first_cursor - 1)
                                cursorResponse.prev_cursor = 0;

                            if (cursorResponse.next_cursor > requestObj.dateTo || cursorResponse.next_cursor == cursorResponse.last_cursor + 1)
                                cursorResponse.next_cursor = 0;

                            resp.cursor = cursorResponse;
                            resp.data = data.map(function (item) {
                                return [item.Timestamp, item[requestObj.metricValue]];
                            });
                            return res.status(200).json(resp);
                        });

                    });

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
