/*
 This file contains all routes for node.js for this application
 */

/*Modules*/
const express = require('express');
const jwt = require('express-jwt');

// var router = express.Router();

// var auth = jwt({
//     secret: 'MY_SECRET',
//     userProperty: 'payload'
// });

/* App Controllers*/
const ctrlProfile = require('../controllers/user-controller');
const ctrlAuth = require('../controllers/authentication');
const ctrlNode = require('../controllers/node-controller');
const ctrlMetrics = require('../controllers/metrics-controller');
const ctrlJob = require('../controllers/job-controller');
const ctrlApp = require('../controllers/app-controller');
const ctrlEvent = require('../controllers/events-controller');

module.exports = (app, io) => {

    // On default server root server index file
    app.get('/', (req, res) => {
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

    app.get('/api/getSpapiOverview', ctrlMetrics.getSpapiOverview);

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


    // send realtime events to client
    io.sockets.on('connection', (socket) => {
        setInterval(() => {
            //send server time
            let now = new Date();
            socket.emit('server:time', now);
        }, 2000);
    });
};

