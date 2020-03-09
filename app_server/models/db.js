/**
 *  Modules
 */
var mongoose = require('mongoose');
/*Promise is depreciated in recent monoogse versions so separate promise package is required */
mongoose.Promise = require('bluebird');

var gracefulShutdown;
var dbURI = 'mongodb://127.0.0.1:27017/hpc_monitoring';

var mongoOptions =
    {
        db: {safe: true},
        server: {
            socketOptions: {
                keepAlive: 60000
            }
        }
    };

mongoose.connect(dbURI,mongoOptions);

/*CONNECTION EVENTS*/
mongoose.connection.on('connected', function () {
    console.log('Mongoose connected to ' + dbURI);
});
mongoose.connection.on('error', function (err) {
    console.log('Mongoose connection error: ' + err);
});
mongoose.connection.on('disconnected', function () {
    console.log('Mongoose disconnected');
});

/* CAPTURE APP TERMINATION/RESTART EVENTS */
/* To be called when process is restarted or terminated */
gracefulShutdown = function (msg, callback) {
    mongoose.connection.close(function () {
        console.log('Mongoose disconnected through ' + msg);
        callback();
    });
};
/* For nodemon restarts */
process.once('SIGUSR2', function () {
    gracefulShutdown('nodemon restart', function () {
        process.kill(process.pid, 'SIGUSR2');
    });
});
/* For app termination */
process.on('SIGINT', function () {
    gracefulShutdown('app termination', function () {
        process.exit(0);
    });
});

/* YOUR SCHEMAS & MODELS */
require('./users');

module.exports.dbURI = dbURI;
