/**
 *Controller for request relating to metrics like meminfo, vmstat, papi etc
 */
const mongoose = require('mongoose');
// const allMetricModels = [];
// const cursor = require('../models/cursor');
const db = require('../models/db.js');
const moment = require('moment');
const _ = require('underscore');
let MongoClient = require('mongodb').MongoClient;
let Schema = mongoose.model('Schema', {}, 'schema');

/**
 * Fetch metrics schema from 'schema' collection
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.getMetricsSchema = (req, res) => {
    /* Mongoclient was used because dynamic collection name throwed error in moongoose */
    MongoClient.connect(db.dbURI, {}, (err, db) => {
        db
        .collection('schema')
        .find({
            'type': 'metrics'
        })
        .toArray((err, metrics) => {
            if (!err) {

                let finished = _.after(metrics.length, () => res.status(200).json(metrics));

                for (let i = 0; i < metrics.length; i++) {
                    if (err)
                        return res.status(400).json({"message": err});
                        
                    (function (i, metricname) {
                        db
                        .collection(metricname)
                        .find({}, {"Timestamp": 1})
                        .sort({"Timestamp": 1})
                        .limit(1)
                        .toArray( (err, data) => {
                            if (!err)
                                metrics[i]['MinTime'] = data[0].Timestamp;
                            finished();
                        });
                    }(i, metrics[i]['name']));
                }
            } else
                return res.status(400).json({"message": err});
        });
    });
};


/**
 * Get metrics data according to request filters
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.getMetricsData = (req, res) => {
    let requestObj = JSON.parse(req.query.filters);
    if (requestObj.dateTo == "")
        requestObj.dateTo = moment().valueOf();


    /* Mongoclient was used because dynamic collection name throwed error in moongoose */
    MongoClient.connect(db.dbURI, {}, (err, db) => {
        if (err)
            return res.status(400).json({"message": err});

        let filterObj = {};

        filterObj["_id"] = 0;
        filterObj["Timestamp"] = 1;
        filterObj[requestObj.metricValue] = 1;

        let fromTime = 0;
        let toTime = 0;

        fromTime = requestObj.dateFrom;
        toTime = requestObj.dateTo;

        let sortOrder = 1;
        let timeDiff = toTime - fromTime;
        let metricCollection;
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
                filterObj).sort({Timestamp: sortOrder}).toArray( (err, data) => {
                if (!err) {
                    let resp = {};
                    if (sortOrder == -1)
                        data.reverse();

                    resp.data = data.map( (item) => {
                        return [item.Timestamp, item[requestObj.metricValue]];
                    });

                    return res.status(200).json(resp);
                } else {
                    db.close();
                    return res.status(400).json({
                        "message": err
                    });
                }
            });
        }
        catch (err) {
            return res.status(400).json({"message": err});
        }
    });
};
/**
 * Fetch job metric schema from 'dynamic_schema' collection
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.getJobMetricsSchema = (req, res) => {
    /* Mongoclient was used because dynamic collection name throwed error in moongoose */
    MongoClient.connect(db.dbURI, {}, (err, db) => {
        db.collection('dynamic_schema')
        .find({
            '$and': [{'Jobid': parseInt(req.query.jobId)}]
        })
        .toArray( (err, metrics) => {
            if (!err) {
                return res.status(200).json(metrics);
            } else
                return res.status(400).json({"message": err});
        });
    });
};

/**
 * Get job metrics data according to request filters
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.getJobMetricsData = (req, res) => {
    let requestObj = JSON.parse(req.query.filters);
    if (requestObj.dateTo === "")
        requestObj.dateTo = moment().valueOf();


    /* Mongoclient was used because dynamic collection name throwed error in moongoose */
    MongoClient.connect(db.dbURI, {}, (err, db) => {
        if (err)
            return res.status(400).json({"message": err});

        let filterObj = {};

        filterObj["_id"] = 0;
        filterObj["Timestamp"] = 1;
        filterObj[requestObj.metricValue] = 1;

        let fromTime = 0;
        let toTime = 0;

        fromTime = requestObj.dateFrom;
        toTime = requestObj.dateTo;

        let sortOrder = 1;
        let timeDiff = toTime - fromTime;
        let metricCollection;
        let rawData = true;

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

        let filters = {};

        filters["Jobid"] = parseInt(requestObj.jobId);
        filters["NodeId"] = parseInt(requestObj.nodeId);

        if(typeof requestObj.processId!=='undefined')
            filters["ProcessId"] = parseInt(requestObj.processId);

        filters["Timestamp"] = {
            $gte: fromTime,
            $lte: toTime
        };

        try {
            metricCollection.find(filters,
                filterObj).sort({Timestamp: sortOrder}).toArray( (err, data) => {
                if (!err) {
                    let resp = {};
                    if (sortOrder == -1)
                        data.reverse();

                    resp.data = data.map( (item) => {
                        return [item.Timestamp, item[requestObj.metricValue]];
                    });

                    return res.status(200).json(resp);
                } else {
                    db.close();
                    return res.status(400).json({ "message": err});
                }
            });
        }
        catch (err) {
            return res.status(400).json({ "message": err});
        }
    });
};
/**
 * Get processIds for a job with spapi
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.getProcessIds = (req, res) => {

    /* Mongoclient was used because dynamic collection name throwed error in moongoose */
    MongoClient.connect(db.dbURI, {}, (err, db) => {
        if (err)
            return res.status(400).json({ "message": err});

        let metricCollection = db.collection(req.query.type + ".hourly");

        try {
            metricCollection.aggregate([
                {
                    '$match': {'Jobid': parseInt(req.query.jobId)}
                },
                {
                    '$group': {
                        '_id': {"NodeId": "$NodeId"},
                        'ProcessIds': {"$push": "$ProcessId"}
                    }
                },
                {
                    '$project': {
                        '_id': '$_id.NodeId',
                        'ProcessIds': '$ProcessIds'
                    }
                }

            ], (err, data) => {
                if (!err) {
                    return res.status(200).json(data);
                }
                else {
                    db.close();
                    return res.status(400).json({ "message": err});
                }
            });
        }
        catch (err) {
            return res.status(400).json({ "message": err});
        }
    });
};


/**
 * Get SPAPI overview
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.getSpapiOverview = (req, res) => {
    let filterParams = {};

    if (typeof req.query.jobId !== 'undefined' && req.query.jobId !== '')
        filterParams["_id.Jobid"] = parseInt(req.query.jobId);

    MongoClient.connect(db.dbURI, {}, (err, db) => {
        db
        .collection('spapi.overview')
        .find(filterParams, {})
        .sort({})
        .limit(parseInt(req.body.length))
        .skip(parseInt(req.body.start))
        .toArray( (err, records) => {
            if (err)
                return res.status(400).json({ "message": err});

            return res.status(200).json(records);
        });
    });
};



