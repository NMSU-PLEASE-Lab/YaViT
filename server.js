// modules
const express = require('express');
const app = express();
const favicon = require('serve-favicon');
const server = require('http').createServer(app);
const io = require('socket.io').listen(server);
const bodyParser = require('body-parser');
const morgan = require('morgan');
// const passport = require('passport');

// For development purposes only
const SERVER_PORT = process.env.PORT || 5000; // set port

// Root path
rootPath = __dirname;

app.use(bodyParser.json()); // parse application/json
app.use(bodyParser.urlencoded({extended: true})); // parse application/x-www-form-urlencoded

app.use(morgan('dev')); //log requests to console

// set the static files location
app.use(express.static(__dirname + '/app_client', {
    setHeaders: (res, path) => {
        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.header('Expires', '-1');
        res.header('Pragma', 'no-cache');
    }
}));

// Set favicon
app.use(favicon(__dirname + '/app_client/includes/images/favicon.ico'));

// Bring in the data model
require('./app_server/models/db');

// Bring in the Passport app_config after model is defined
require('./app_server/config/passport');

// Bring in the routes for the API
require('./app_server/routes/api')(app,io);


//start app
server.listen( app.listen(SERVER_PORT, (err) => {
    if (err) {
        console.log(err);
    } else {
        console.log("Listening on port " + SERVER_PORT);
    }
}));

// expose app
exports = module.exports = app;