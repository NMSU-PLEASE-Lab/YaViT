/**
 *  Modules
 */
const config = require('../lib/config');
const mongoose = require('mongoose');
mongoose.Promise = require('bluebird'); /*Promise is deprecated in recent monoogse versions so separate promise package is required */

// const dbURI = `mongodb://${config.db.host}:${config.db.port}/${config.db.db_name}`;
let gracefulShutdown;

let db = {};

db.dbURI = `mongodb://${config.db.host}:${config.db.port}/${config.db.db_name}`;

// Connect to DB
mongoose.connect(db.dbURI, config.db.mongoOptions);

// Connection Events
mongoose.connection.on('connected', () => console.log('\x1b[36m%s\x1b[0m','Mongoose connected to ' + db.dbURI) );
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

module.exports = db;
