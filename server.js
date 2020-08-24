// modules
const express   = require('express');
const app       = express();
const server    = require('http').createServer(app);
const io        = require('socket.io').listen(server);
const morgan    = require('morgan');
const favicon   = require('serve-favicon');

// For development purposes only
const SERVER_PORT = process.env.PORT || 5000; // set port

// Root path
rootPath = __dirname;

// log requests to console
app.use(morgan('dev')); 

// parses incoming requests with URL-encoded payloads
app.use(express.urlencoded({extended: true}));

// parses incoming requests with JSON payloads
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

//start app
server.listen( app.listen(SERVER_PORT, (err) => {
    try {
        console.log("Listening on port " + SERVER_PORT);
    } catch (error) {
        console.log(err);
    }
}));

// Bring in the data model
require('./app_server/models/db');

// Bring in the Passport app_config after model is defined
require('./app_server/config/passport');

// Bring in the routes for the API
require('./app_server/routes/api')(app, io);

// expose app
exports = module.exports = app;