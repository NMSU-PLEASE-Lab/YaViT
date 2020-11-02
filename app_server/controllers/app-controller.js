/**
 * Controller for 'application' collection
 */

const mongoose          = require('mongoose');
const Application         = require('../models/application');
let ApplicationUser     = mongoose.model('ApplicationUser', {}, 'application_user');
const ctrlUser          = require('../controllers/user-controller');
const ctrlJob           = require('../controllers/job-controller');
const _                 = require('underscore');

/**
 * Count number of application for all/single user
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.applicationCount = (req, res) => {
    if (typeof req.query.username !== 'undefined') {
        ctrlUser.getUserIdByName(req.query.username, (userId) => {
            ApplicationUser
            .countDocuments({"UserID": userId})
            .exec( (err, count) => {
                console.log(count, 'Here--------');
                if (err)
                    return res.status(400).json({
                        "message": err
                    });
                res.status(200).json(count);
            });
        })
    } else {
        ApplicationUser
        .countDocuments()
        .exec( (err, count) => {
            if (err)
                return res.status(400).json({
                    "message": err
                });
            res.status(200).json(count);
        });
    }
};

/**
 * Get currently active applications
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.activeApplications = (req, res) => {
    ctrlJob.distinctActiveApplications(req.query.username, (apps) => {
        return res.status(200).json(apps);
    });
};

/**
 * Get Applications for all/single user
 * Using different filters for displaying in angular data table
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.getApplications = (req, res) => {

    if (typeof req.body.username !== 'undefined') {
        let filterParams = {};
        filterParams.UserName = req.body.username;
        if (req.body.search.value.trim() != "") {
            if (req.body.searchColumn.length == 1) {
                let regex = new RegExp(req.body.search.value.trim(), "i");
                filterParams.ApplicationName = regex;
            }
        }

        ApplicationUser
        .find(filterParams, {"_id": -1, "ApplicationName": 1})
        .sort({"_id": -1})
        .limit(parseInt(req.body.length)).skip(parseInt(req.body.start))
        .lean()
        .exec((err, appusers) => {
            if (err)
                return res.status(400).json({"message": err});

            ctrlJob.getJobsByAppNameAndUser(_.pluck(appusers, 'ApplicationName'), req.body.username, (jobs) => {
                for (let i = 0; i < appusers.length; i++) {
                    (function () {
                        const tmp_i = i;
                        appusers[tmp_i]['NumberOfJobs'] = _.filter(jobs, (item) => {
                            return item.ApplicationName == appusers[tmp_i]['ApplicationName'];
                        }).length;
                    })();
                }

                ApplicationUser.countDocuments(filterParams, (err, count) => {
                    if (err)
                        return res.status(400).json({"message": err});

                    let resp = {};

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
module.exports.averageSuccessRateOfApplications = (req, res) => {
    ctrlJob.getAvgSuccessRateByApplication(req.query.username, (apps) => {
        let resp = [];
        resp = apps.map((item) => {
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
module.exports.averageRuntimeOfApplications = (req, res) => {
    ctrlJob.averageRuntimeByApplication(req.query.username, (apps) => {
        let resp = [];
        resp = apps.map( (item) => {
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
module.exports.runQualityOfApplications = (req, res) => {
    ctrlJob.runQualityByApplication(req.query.username, (apps) => {
        let resp = {};

        resp['Applications'] = [];
        resp['Healthy'] = [];
        resp['Abnormal'] = [];
        resp['Critical'] = [];
        resp['Failed'] = [];
        resp['NoQuality'] = [];

        apps.forEach((item) => {
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