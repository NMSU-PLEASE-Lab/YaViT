// modules
const express   = require('express');
const app       = express();
const http      = require('http').createServer(app);
const io        = require('socket.io')(http);
const morgan    = require('morgan');
const favicon   = require('serve-favicon');
const ingestor  = require('./app_server/ingestor');
const config    = require('./app_server/lib/config');
const Helpers = require('./app_server/lib/helpers');

// Root path
rootPath = __dirname;

// log requests to console
app.use(morgan('dev')); 

// Parses incoming requests with URL-encoded payloads
app.use(express.urlencoded({extended: true}));

// Parses incoming requests with JSON payloads
app.use(express.json());

// Serve static assets such as HTML files, images, and so on.
app.use(express.static(__dirname + '/app_client', {
    setHeaders: (res, path) => {
        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.header('Expires', '-1');
        res.header('Pragma', 'no-cache');
    }
}));

// Set favicon
app.use(favicon(__dirname + '/app_client/includes/images/favicon.ico'));

// Start app
http.listen(config.server.httpPort, (err) => {
    try {
        console.log('\x1b[36m%s\x1b[0m', `The server is listening on port ${config.server.httpPort} in ${config.server.envName} mode`);
    } catch (error) {
        console.log(err);
    }
});

// Bring in the data model
require('./app_server/models/db');

// Bring in the Passport app_config after model is defined
require('./app_server/lib/passport');

// Bring in the routes for the API
require('./app_server/routes/api')(app, io);

// Ingestor driver to ingest SLURM data to DB
ingestor.init();
ingestor.recentJobsWorker();
ingestor.runningJobsWorker();

// expose app
exports = module.exports = app;