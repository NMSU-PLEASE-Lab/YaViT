// modules
var express = require('express');
var app = express();
var favicon = require('serve-favicon');
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var bodyParser = require('body-parser');
var morgan = require('morgan');
var passport = require('passport');


// app_config
var SERVER_PORT = 8000; // set port

// for development purposes only
// var SERVER_PORT = process.env.PORT || 8000; // set port

//root path
rootPath = __dirname;

app.use(bodyParser.json()); // parse application/json
app.use(bodyParser.urlencoded({extended: true})); // parse application/x-www-form-urlencoded

app.use(morgan('dev')); //log requests to console

// set the static files location
app.use(express.static(__dirname + '/app_client', {
    setHeaders: function (res, path) {
        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.header('Expires', '-1');
        res.header('Pragma', 'no-cache');
    }
}));
app.use(favicon(__dirname + '/app_client/includes/images/favicon.ico'));


// Bring in the data model
require('./app_server/models/db');


// Bring in the Passport app_config after model is defined
require('./app_server/config/passport');

//Bring in the routes for the API
require('./app_server/routes/api')(app);

// api
// require('./app_server/api')(app);


//start app
server.listen(app.listen(SERVER_PORT, function (err) {
    if (err) {
        console.log(err);
    } else {
        console.log("Listening on port " + SERVER_PORT);
    }
}));

//on socket.io connectin
io.sockets.on('connection', function (socket) {
    setInterval(function () {
        var now = new Date();
        socket.emit('server:time', now);
    }, 2000)

});


exports = module.exports = app; 	// expose app