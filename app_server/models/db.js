/**
 *  Modules
 */
const mongoose = require('mongoose');

mongoose.Promise = require('bluebird'); /*Promise is deprecated in recent monoogse versions so separate promise package is required */

const dbURI = 'mongodb://127.0.0.1:27017/hpc_monitoring';

let gracefulShutdown;

let mongoOptions = {
    useNewUrlParser: true, 
    useUnifiedTopology: true,
    useCreateIndex: true 
};

// (async () => {
//     try {
//         await mongoose.connect(dbURI, mongoOptions);
//     } catch (error) {
//         // handleError(error);
//         console.log('Mongoose connection error: ' + error)
//     }
// })();



// // Connect to DB
mongoose.connect(dbURI, mongoOptions);

// Connection Events
mongoose.connection.on('connected', () => console.log('Mongoose connected to ' + dbURI) );
mongoose.connection.on('error', (err) => console.log('Mongoose connection error: ' + err) );
mongoose.connection.on('disconnected', () =>  console.log('Mongoose disconnected') );

// Capture App termination/restart events (To be called when process is restarted or terminated) 
gracefulShutdown = (msg, callback) => {
    mongoose.connection.close(() => {
        console.log('Mongoose disconnected through ' + msg);
        callback();
    });
};

// For nodemon restarts
process.once('SIGUSR2', () => {
    gracefulShutdown('nodemon restart', () => {
        process.kill(process.pid, 'SIGUSR2');
    });
});

// For app termination
process.on('SIGINT', () => {
    gracefulShutdown('app termination', () => {
        process.exit(0);
    });
});

/* YOUR SCHEMAS & MODELS */
require('./users');

module.exports.dbURI = dbURI;
