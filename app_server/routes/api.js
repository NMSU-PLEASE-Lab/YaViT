/*
 This file contains all routes for node.js for this application
 */

/*Modules*/
var express = require('express');
var router = express.Router();
var jwt = require('express-jwt');
var auth = jwt({
    secret: 'MY_SECRET',
    userProperty: 'payload'
});

/* Controllers*/
var ctrlProfile = require('../controllers/user-controller');
var ctrlAuth = require('../controllers/authentication');
var ctrlNode = require('../controllers/node-controller');
var ctrlMetrics = require('../controllers/metrics-controller');
var ctrlJob = require('../controllers/job-controller');
var ctrlApp = require('../controllers/app-controller');
var ctrlEvent = require('../controllers/events-controller');

module.exports = function (app) {

    /*On default server root server index file*/
    app.get('/', function (req, res) {
        res.sendFile(rootPath + '/app_client/index.html');
    });

    app.post('/api/login', ctrlAuth.login);

    app.post('/api/addNewUser', ctrlProfile.addUser);

    app.post('/api/editUser', ctrlProfile.editUser);

    app.post('/api/deleteUser', ctrlProfile.deleteUser);

    app.post('/api/getAllUsers', ctrlProfile.getAllUsers);

    app.post('/api/getJobs', ctrlJob.getJobs);

    app.get('/api/getMetricsSchema', ctrlMetrics.getMetricsSchema);

    app.get('/api/getMetricsData', ctrlMetrics.getMetricsData);

    app.get('/api/getJobMetricsSchema', ctrlMetrics.getJobMetricsSchema);

    app.get('/api/getJobMetricsData', ctrlMetrics.getJobMetricsData);

    app.get('/api/getProcessIds', ctrlMetrics.getProcessIds);


    app.get('/api/getJobsCount', ctrlJob.jobsCount);

    app.get('/api/allNodes', ctrlNode.allNodes);

    app.get('/api/getJobsName', ctrlJob.getJobsName);

    app.get('/api/getJobRunsByName', ctrlJob.getJobRunsByName);

    app.get('/api/getJobById', ctrlJob.getJobById);

    app.get('/api/getActiveJobs', ctrlJob.getActiveJobs);

    app.get('/api/getRecentJobs', ctrlJob.getRecentJobs);

    app.get('/api/getRunQualityAndRuntimeByConfiguration', ctrlJob.runQualityAndRuntimeByConfiguration);

    app.get('/api/getEventsMetadata', ctrlEvent.getEventsMetaData);

    app.get('/api/getEventsData', ctrlEvent.getEventsData);

    app.post('/api/getApplications', ctrlApp.getApplications);

    app.get('/api/getApplicationsCount', ctrlApp.applicationCount);

    app.get('/api/getActiveApplications', ctrlApp.activeApplications);

    app.get('/api/getAverageEfficiencyOfApplications', ctrlApp.averageSuccessRateOfApplications);

    app.get('/api/getAverageRunTimeOfApplications', ctrlApp.averageRuntimeOfApplications);

    app.get('/api/getRunQualityOfApplications', ctrlApp.runQualityOfApplications);


};

