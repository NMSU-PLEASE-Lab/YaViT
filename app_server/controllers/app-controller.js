/**
 * Controller for 'application' collection
 */

const mongoose          = require('mongoose');
const Application        = require('../models/application');
const ApplicationUser = require('../models/applicationuser');
const Job = require('../models/job');
const ctrlUser          = require('../controllers/user-controller');
const ctrlJob           = require('../controllers/job-controller');
const _                 = require('underscore');
const config            = require('../lib/config');

const App = {};
let computePerformanceStatsCounter = 0;

App.getPerformance = async () => {
    let nosOfJobs = config.jobs.maxJobPerformanceCount;
    let getApplications  = await Application.distinct('Name');
    let getJobsLimit =  await Job.find().sort({_id: -1}).limit((nosOfJobs > 0) ? nosOfJobs : null).exec();
    let nestedjobData = [];
    let appsWithJobs = {};
    let filtered = [];
    let count = 0;

    getJobsLimit.map( (obj, index) => {
        if(getApplications.indexOf(obj.ApplicationName) > -1){
            let newObj = {
                _id: obj._id,
                ApplicationName: obj.ApplicationName,
                performance: obj.performance
            }

            if(getApplications.indexOf(newObj.ApplicationName) > -1){
                nestedjobData.push(newObj);
            }
            appsWithJobs[obj.ApplicationName] = nestedjobData.map( item => {
                if(item.ApplicationName === obj.ApplicationName)
                    return {...item}
            }).filter( item => item !== undefined);
        }
    });


    for (let obj in appsWithJobs) {
        let strPerfs = "";
        let strIds = "";
        appsWithJobs[obj].map((item) => {
          let jobs = (strIds += "," + item._id).split(",").filter((item) => item !== "");
          let performance = (strPerfs += "," + item.performance).split(",").filter((item) => item != "");
      
          const { min, max, avg, performances } = App.computePerformanceStats({ 
                  performance: App.makePerformancesWhole(performance), 
                  length: appsWithJobs[obj].length
            });
      
          filtered[count] = {
            ApplicationName: obj,
            jobs: jobs,
            performance: performances,
            NumberOfJobs: appsWithJobs[obj].length,
            max: max,
            min: min,
            avg: avg,
            AveragePerformance: performances.map((item, index) => {
                if (item === App.closestMinVal(performances, avg)) {
                    return Number(jobs[index]);
                }
            }).filter((item) => item !== undefined)[0],
            HighestPerformance: performances.map((item, index) => {
                    if (item === max) {
                        return Number(jobs[index]);
                    }
                }).filter((item) => item !== undefined)[0],
                
            LowestPerformance: performances.map((item, index) => {
                    if (item === min) {
                        if (min !== max) {
                            return Number(jobs[index]);
                          } else {
                            return 0;
                          }
                    }
                }).filter((item) => item !== undefined)[0]
          };
        });

        count+= 1
    }

    return filtered;
};


App.computeArrAvg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

App.makePerformancesWhole = (arr) => arr.map((item) => Math.floor(item));

App.closestMinVal = (arr, avg) => {
    
    let gVal = Math.ceil(avg);
    let lVal = Math.floor(avg);
    let res = [];
    let result = 0;
  
    if (arr.indexOf(lVal) !== undefined && arr.indexOf(lVal) > -1) {
      result = arr[arr.findIndex((item) => item === lVal)];
      return result;
    } else if (arr.indexOf(gVal) !== undefined && arr.indexOf(gVal) > -1) {
      result = arr[arr.findIndex((item) => item === gVal)];
      return result;
    } else {
      let newVal = gVal;
      arr.forEach((item, index) => {
        if (newVal === item) {
          result = arr[index];
          return result;
        } else {
          if (arr.indexOf(newVal) > -1 && item <= gVal) {
            res.push(newVal);
          }
          newVal -= 0.01;
        }
      });
    }
    return res.length > 0 ? res.sort()[res.length - 1] : result;
};


App.computePerformanceStats = ( {performance, length} ) => {
    let result = {};
    let floatValues = [];

    computePerformanceStatsCounter += 1;

    performance.forEach((val) => floatValues.push(parseFloat(val)));

    if (computePerformanceStatsCounter === length) {
        result.max = Math.max(...floatValues);
        result.min = Math.min(...floatValues);
        result.avg = App.computeArrAvg(floatValues);

        computePerformanceStatsCounter = 0;
    }

    result.performances = floatValues;

    return result;
}

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
                // console.log(count, 'Here--------', userId);
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

            ctrlJob.getJobsByAppNameAndUser(_.pluck(appusers, 'ApplicationName'), req.body.username, async (jobs) => {
                for (let i = 0; i < appusers.length; i++) {
                    (function () {
                        const tmp_i = i;
                        appusers[tmp_i]['NumberOfJobs'] = _.filter(jobs, (item) => {
                            return item.ApplicationName == appusers[tmp_i]['ApplicationName'];
                        }).length;
                    })();
                }

                // Test insertion
                let newField = appusers.map(object => {
                    return {
                        ...object,
                        AveragePerformance: 0,
                        HighestPerformance: 0,
                        LowestPerformance: 0,
                    }
                });

                let perfData = await App.getPerformance();

                newField = newField.map((object, index) => {

                    let perfCheck = perfData[index] !== undefined ? perfData[index].ApplicationName : "";

                    if (perfCheck === object.ApplicationName && perfCheck !== undefined) {
                        let avgPerf = App.closestMinVal(perfData[index].performance, perfData[index].avg);
                        
                        return {
                            ...object,
                            NumberOfJobs: perfData[index].NumberOfJobs,
                            AveragePerformance: perfData[index].AveragePerformance || '',
                            HighestPerformance: perfData[index].HighestPerformance,
                            LowestPerformance: perfData[index].LowestPerformance
                        };
                    } else {
                        return object;
                    }
                });
                ApplicationUser.countDocuments(filterParams, (err, count) => {
                    if (err)
                        return res.status(400).json({"message": err});

                    let resp = {};

                    resp.draw = req.body.draw;
                    resp.recordsTotal = count;
                    resp.recordsFiltered = count;
                    resp.data = newField;

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