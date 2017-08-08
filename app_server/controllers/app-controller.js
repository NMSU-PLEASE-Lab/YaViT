/**
 * Controller for 'application' collection
 */

var mongoose = require('mongoose');
var Application = mongoose.model('Application', {}, 'application');
var ApplicationUser = mongoose.model('ApplicationUser', {}, 'application_user');
var ctrlUser = require('../controllers/user-controller');
var ctrlJob = require('../controllers/job-controller');
var _ = require('underscore');


/**
 * Count number of application for all/single user
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.applicationCount = function (req, res) {
    if (typeof req.query.username !== 'undefined') {
        ctrlUser.getUserIdByName(req.query.username, function (userId) {
            ApplicationUser
                .count({"UserID": userId})
                .exec(function (err, count) {
                    if (err)
                        return res.status(400).json({
                            "message": err
                        });
                    res.status(200).json(count);
                });
        })
    }
    else
        ApplicationUser
            .count()
            .exec(function (err, count) {
                if (err)
                    return res.status(400).json({
                        "message": err
                    });
                res.status(200).json(count);
            });

};

/**
 * Get currently active applications
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.activeApplications = function (req, res) {
    ctrlJob.distinctActiveApplications(req.query.username, function (apps) {
        return res.status(200).json(apps);
    });

};

/**
 * Get Applications for all/single user
 * Using different filters for displaying in angular data table
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.getApplications = function (req, res) {

    if (typeof req.body.username !== 'undefined') {
        var filterParams = {};
        filterParams.UserName = req.body.username;
        if (req.body.search.value.trim() != "") {
            if (req.body.searchColumn.length == 1) {
                var regex = new RegExp(req.body.search.value.trim(), "i");
                filterParams.ApplicationName = regex;
            }
        }
        ApplicationUser
            .find(filterParams, {"_id": -1, "ApplicationName": 1})
            .sort({"_id": -1})
            .limit(parseInt(req.body.length)).skip(parseInt(req.body.start))
            .lean()
            .exec(function (err, appusers) {
                if (err)
                    return res.status(400).json({
                        "message": err
                    });
                ctrlJob.getJobsByAppNameAndUser(_.pluck(appusers, 'ApplicationName'), req.body.username, function (jobs) {
                    for (var i = 0; i < appusers.length; i++) {
                        (function () {
                            const tmp_i = i;
                            appusers[tmp_i]['NumberOfJobs'] = _.filter(jobs, function (item) {
                                return item.ApplicationName == appusers[tmp_i]['ApplicationName'];
                            }).length;
                        })();
                    }

                    ApplicationUser.count(filterParams, function (err, count) {
                        if (err)
                            return res.status(400).json({
                                "message": err
                            });
                        var resp = {};
                        resp.draw = req.body.draw;
                        resp.recordsTotal = count;
                        resp.recordsFiltered = count;
                        resp.data = appusers;
                        return res.status(200).json(resp);

                    });

                });

            });
    }


};
/**
 * Get Average Success Rate of Applications
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.averageSuccessRateOfApplications = function (req, res) {
    ctrlJob.getAvgSuccessRateByApplication(req.query.username, function (apps) {
        var resp = [];
        resp = apps.map(function (item) {
            return [item.Name, item.Efficiency];
        });
        return res.status(200).json(resp);

    });

};

/**
 * Get Average Runtime
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.averageRuntimeOfApplications = function (req, res) {
    ctrlJob.averageRuntimeByApplication(req.query.username, function (apps) {
        var resp = [];
        resp = apps.map(function (item) {
            return [item.Name, item.AverageRunTime];
        });
        return res.status(200).json(resp);


    });

};

/**
 * Get Job Quality by application
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.runQualityOfApplications = function (req, res) {
    ctrlJob.runQualityByApplication(req.query.username, function (apps) {
        var resp = {};
        resp['Applications'] = [];
        resp['Healthy'] = [];
        resp['Abnormal'] = [];
        resp['Critical'] = [];
        resp['Failed'] = [];
        resp['NoQuality'] = [];
        apps.forEach(function (item) {
            resp['Applications'].push(item._id);
            resp['Healthy'].push(item.Healthy);
            resp['Abnormal'].push(item.Abnormal);
            resp['Critical'].push(item.Critical);
            resp['Failed'].push(item.Failed);
            resp['NoQuality'].push(item.NoQuality);
        });
        return res.status(200).json(resp);

    });

};