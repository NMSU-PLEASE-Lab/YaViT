/**
 *Controller for request relating to job
 */
var _ = require('underscore');
var mongoose = require('mongoose');
var Job = mongoose.model('Job', {"_id": Number}, 'job');
var NodeJob = mongoose.model('NodeJob', {}, 'node_job');
var ctrlNode = require('../controllers/node-controller');
var moment = require('moment');
require("moment-duration-format");
var MongoClient = require('mongodb').MongoClient;


/**
 * Get count of total jobs particular or all users
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.jobsCount = function (req, res) {
    var filterParams = {};
    if (typeof req.query.owner !== 'undefined')
        filterParams = {"owner": req.query.owner};
    if (typeof req.query.app_name !== 'undefined' && req.query.app_name !== '')
        filterParams.ApplicationName = req.query.app_name;
    Job
        .count(filterParams, function (err, count) {
            if (err)
                return res.status(400).json({
                    "message": err
                });
            return res.status(200).json(count);
        });

};


/**
 * Get list of unique JobsName by filterParams
 * Name in job collection is an application
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.getJobsName = function (req, res) {
    var filterParams = {};
    if (typeof req.query.nextId !== 'undefined') {
        req.query.nextId = parseInt(req.query.nextId);
        if (req.query.nextId == -1)
            return res.status(200).json([]);
    }

    if (typeof req.query.owner !== 'undefined') {
        filterParams.owner = req.query.owner
    }
    if (typeof req.query.dateFrom !== 'undefined' && typeof req.query.dateTo !== 'undefined') {
        filterParams.queue_time = {
            $gte: parseInt(req.query.dateFrom),
            $lte: parseInt(req.query.dateTo)
        };
    }
    filterParams.name = {$ne: null};

    Job
        .distinct("name", filterParams, {'name': -1}).exec(function (err, jobs) {
        if (err)
            return res.status(400).json({
                "message": err
            });
        return res.status(200).json(jobs);

    });

};

/**
 * Get list of unique JobsName by filterParams
 * Name in job collection is an application
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.getJobsNameCursored = function (req, res) {
    var filterParams = {};
    if (typeof req.query.nextId !== 'undefined') {
        req.query.nextId = parseInt(req.query.nextId);
        if (req.query.nextId == -1)
            return res.status(200).json([]);
    }

    if (typeof req.query.owner !== 'undefined') {
        filterParams.owner = req.query.owner
    }
    if (typeof req.query.dateFrom !== 'undefined' && typeof req.query.dateTo !== 'undefined') {
        filterParams.queue_time = {
            $gte: parseInt(req.query.dateFrom),
            $lte: parseInt(req.query.dateTo)
        };
    }
    filterParams.name = {$ne: null};

    Job
        .distinct("name", filterParams, {'name': -1}).exec(function (err, jobs) {
        if (err)
            return res.status(400).json({
                "message": err
            });
        var next = 0;
        if (typeof req.query.nextId == 'undefined' || req.query.nextId == 0) {
            if (jobs.length <= 100)
                next = -1;
            else
                next = 100;
            return res.status(200).json(
                {"nextId": next, "data": jobs.slice(0, 100)}
            );
        }
        else {
            jobs = jobs.slice(req.query.nextId, req.query.nextId + 101);

            if (jobs.length <= 100)
                next = -1;
            else {
                jobs = jobs.slice(0, 100);
                next = req.query.nextId + 100;
            }
            return res.status(200).json({"nextId": next, "data": jobs});
        }

    });

};

/**
 * Get List of job runs by name and user if provided
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.getJobRunsByName = function (req, res) {
    var filterParams = {};
    filterParams.name = req.query.name;
    if (typeof req.query.owner !== 'undefined')
        filterParams.owner = req.query.owner;
    Job
        .find(filterParams, {
            "_id": 1,
            "queue_time": 1,
            "start_time": 1,
            "end_time": 1
        }).sort({"_id": -1}).exec(function (err, jobs) {
        if (err)
            return res.status(400).json({
                "message": err
            });
        return res.status(200).json(jobs);
    });
};


/**
 * Get all jobs information based on filters provided
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.getJobs = function (req, res) {
    var filterParams = {};
    if (req.body.dateFrom !== 0 && req.body.dateTo !== 0)
        filterParams.queue_time = {$gte: parseInt(req.body.dateFrom), $lte: parseInt(req.body.dateTo)};

    if (typeof req.body.app_name !== 'undefined' && req.body.app_name !== '')
        filterParams.ApplicationName = req.body.app_name;

    if (typeof req.body.owner !== 'undefined' && req.body.owner !== '')
        filterParams.owner = req.body.owner;

    if (req.body.search.value.trim() != "") {
        if (req.body.searchColumn.length == 1) {
            var regex = new RegExp(req.body.search.value.trim(), "i");
            filterParams[req.body.searchColumn[0]] = regex;
        }
        else {
            filterParams['$or'] = [];
            req.body.searchColumn.forEach(function (entry) {
                var obj = {};
                if (entry == "_id")
                    if (!isNaN(parseInt(req.body.search.value.trim()))) {
                        obj[entry] = parseInt(req.body.search.value.trim());
                        filterParams['$or'].push(obj);
                    }

                else
                    regex = new RegExp(req.body.search.value.trim(), "i");
                    obj[entry] = regex;
                    filterParams['$or'].push(obj);
            });
        }
    }
    var sortParams = {};
    req.body.order.forEach(function (entry) {
        sortParams[req.body.columns[entry.column].data] = entry.dir == 'desc' ? -1 : 1;
    });
    Job
        .find(filterParams, {
            "_id": 1,
            "name": 1,
            "owner": 1,
            "queue_time": 1,
            "start_time": 1,
            "end_time": 1,
            "mem_bytes": 1,
            "mem_used": 1,
            "exit_status": 1,
            "metrices":1
        }).sort(sortParams).limit(parseInt(req.body.length)).skip(parseInt(req.body.start)).lean().exec(function (err, jobs) {
        if (err)
            return res.status(400).json({
                "message": err
            });

        NodeJob.find({
            "JobNumber": {
                "$in": _.pluck(jobs, '_id')
            }
        }, {
            "_id": -1,
            "NodeId": 1,
            "JobNumber": 1
        }).lean().exec(function (err, nodeJob) {
            if (err)
                return res.status(400).json({
                    "message": err
                });
            for (var i = 0; i < jobs.length; i++) {
                (function () {
                    const tmp_i = i;
                    jobs[tmp_i]['numberOfNodes'] = _.filter(nodeJob, function (item) {
                        return item.JobNumber == jobs[tmp_i]['_id'];
                    }).length;
                })();
                jobs[i]['duration'] = moment.duration(moment.unix(jobs[i]['end_time']).diff(moment.unix(jobs[i]['start_time']))).format("hh:mm:ss", {trim: false});
                if(typeof jobs[i].metrices=='undefined')
                    jobs[i].metrices = "";
            }
            Job.count(filterParams, function (err, count) {
                if (err)
                    return res.status(400).json({
                        "message": err
                    });
                var resp = {};
                resp.draw = req.body.draw;
                resp.recordsTotal = count;
                resp.recordsFiltered = count;
                resp.data = jobs;
                return res.status(200).json(resp);

            });

        });

    });
};

/**
 * Get Job run by Id
 * Provides all job data by particular id
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.getJobById = function (req, res) {
    var jobId = parseInt(req.query.jobId);

    Job
        .findOne({"_id": jobId}).lean().exec(function (err, job) {
        if (err)
            return res.status(400).json({
                "message": err
            });
        if (job == null)
            return res.status(400).json({
                "message": "No Job Found"
            });
        NodeJob.find({"JobNumber": jobId}).distinct('NodeId').exec(function (err, nodes) {
            if (err)
                return res.status(400).json({
                    "message": err
                });
            ctrlNode.getNodesByIds(nodes, function (nodesList) {
                job['nodes'] = nodesList;
                return res.status(200).json(job);

            });
        });
    });

};

/**
 * Get Currently Active(queued and running) Jobs
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.getActiveJobs = function (req, res) {
    var filterParams = {};
    filterParams['$or'] = [{end_time: {$exists: false}}, {end_time: ""}];
    if (typeof req.query.owner !== 'undefined')
        filterParams.owner = req.query.owner;
    if (typeof req.query.app_name !== 'undefined' && req.query.app_name != '')
        filterParams.ApplicationName = req.query.app_name;
    Job
        .find(filterParams, {
            "_id": 1,
            "name": 1,
            "owner": 1,
            "queue_time": 1,
            "start_time": 1
        }).sort({"_id": -1}).exec(function (err, jobs) {
        if (err)
            return res.status(400).json({
                "message": err
            });
        return res.status(200).json(jobs);

    });

};

/**
 * Get recent jobs(completed) limit 10
 * @param req
 * @param res
 */
module.exports.getRecentJobs = function (req, res) {
    var filterParams = {};
    filterParams['$and'] = [{end_time: {$exists: true}}, {end_time: {$ne: ""}}];

    if (typeof req.query.owner !== 'undefined')
        filterParams.owner = req.query.owner;
    if (typeof req.query.app_name !== 'undefined' && req.query.app_name != '')
        filterParams.ApplicationName = req.query.app_name;
    Job
        .find(filterParams, {
            "_id": 1,
            "name": 1,
            "owner": 1,
            "queue_time": 1,
            "start_time": 1,
            "end_time": 1,
            "exit_status": 1
        }).sort({"end_time": -1}).limit(10).lean().exec(function (err, jobs) {
        if (err)
            return res.status(400).json({
                "message": err
            });

        NodeJob.find({
            "JobNumber": {
                "$in": _.pluck(jobs, '_id')
            }
        }, {
            "_id": -1,
            "NodeId": 1,
            "JobNumber": 1
        }).lean().exec(function (err, nodeJob) {
            if (err)
                return res.status(400).json({
                    "message": err
                });
            for (var i = 0; i < jobs.length; i++) {
                (function () {
                    const tmp_i = i;
                    jobs[tmp_i]['numberOfNodes'] = _.filter(nodeJob, function (item) {
                        return item.JobNumber == jobs[tmp_i]['_id'];
                    }).length;
                })();
                jobs[i]['duration'] = moment.duration(moment.unix(jobs[i]['end_time']).diff(moment.unix(jobs[i]['start_time']))).format("hh:mm:ss", {trim: false});
            }
            return res.status(200).json(jobs);
        });


    });

};

/**
 * Get all the jobs belonging to an application for a user
 * @param appnames - list of application names
 * @param user - username
 * @param callback - callback function
 */
module.exports.getJobsByAppNameAndUser = function (appnames, user, callback) {

    Job
        .find({"ApplicationName": {"$in": appnames}, "owner": user}, {"_id": -1, "ApplicationName": 1})
        .lean().exec(function (err, jobs) {
        return callback(jobs);

    });

};

/**
 * get distinct application names
 * @param owner  - username
 * @param callback - callback function
 */
module.exports.distinctActiveApplications = function (owner, callback) {
    var filterParams = {};
    filterParams['$or'] = [{end_time: {$exists: false}}, {end_time: ""}];
    if (typeof owner !== 'undefined')
        filterParams.owner = owner;
    Job
        .distinct("ApplicationName", filterParams, {}).lean().exec(function (err, apps) {
        return callback(apps);

    });
};

/**
 * Get success rate by application
 * Success rate is calculated based on failed and success jobs
 * @param owner - username
 * @param callback - callback function
 */
module.exports.getAvgSuccessRateByApplication = function (owner, callback) {
    var filterParams = {};
    if (typeof owner !== 'undefined')
        filterParams.owner = owner;
    Job.aggregate([
        {$match: filterParams},
        {
            $project: {
                ApplicationName: 1,
                success: {
                    $cond: [{$eq: ["$exit_status", "0"]}, 1, 0]
                },
                fail: {
                    $cond: [{$ne: ["$exit_status", "0"]}, 1, 0]
                }
            }
        },
        {
            $group: {
                _id: "$ApplicationName",
                success: {$sum: "$success"},
                fail: {$sum: "$fail"}
            }
        },
        {
            $project: {
                Name: "$_id",
                Efficiency: {$divide: [{$multiply: ["$success", 100]}, {$add: ["$success", "$fail"]}]}
            }
        },
        {$sort: {Name: 1}}
    ]).exec(function (err, apps) {
        return callback(apps)
    });
};

/**
 * Get average runtime for the application
 * Runtime is different of end and start time in job collection
 * @param owner - username
 * @param callback - callback function
 */
module.exports.averageRuntimeByApplication = function (owner, callback) {
    var filterParams = {};
    if (typeof owner !== 'undefined')
        filterParams.owner = owner;
    filterParams['$and'] = [{end_time: {$exists: true}}, {end_time: {$ne: ""}}];
    Job.aggregate([
        {$match: filterParams},
        {
            $project: {
                ApplicationName: 1,
                RunTime: {$divide: [{$subtract: ["$end_time", "$start_time"]}, 60]}
            }
        },
        {
            $group: {
                _id: "$ApplicationName",
                runTime: {$sum: "$RunTime"},
                count: {$sum: 1}
            }
        },
        {
            $project: {
                Name: "$_id",
                AverageRunTime: {$divide: ["$runTime", "$count"]}
            }
        },
        {$sort: {Name: 1}}
    ]).exec(function (err, apps) {
        return callback(apps)
    });

};
/**
 * Get Average number of nodes used for the application
 * @param owner - username
 * @param callback - callback function
 */
module.exports.averageNumberOfNodesByApplication = function (owner, callback) {
    var filterParams = {};
    if (typeof req.query.owner !== 'undefined')
        filterParams.owner = req.query.owner;
    MongoClient.connect(db.dbURI, function (err, db) {
        db.collection('job').find(filterParams, {
            "_id": 1,
            "ApplicationName": 1
        }).forEach(function (job) {
            job.numberOfNodes = db.collection('node_job').count({"JobNumber": job._id})
        }).toArray(function (err, data) {

        });

    });

};