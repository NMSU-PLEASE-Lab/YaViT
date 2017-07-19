/**
 * Controller for 'user' and related requests
 */
var mongoose = require('mongoose');
var User = mongoose.model('User');
var userTypes = {1: "Admin", 2: "User"};

/**
 * Get user information by id
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.userInfo = function (req, res) {

    if (!req.payload._id) {
        res.status(401).json({
            "message": "UnauthorizedError"
        });
    } else {
        User
            .findById(req.payload._id)
            .exec(function (err, user) {
                res.status(200).json(user);
            });
    }
};

/**
 * Add user to 'user' collection
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.addUser = function (req, res) {

    var newUser = new User({
        Name: req.body.Name,
        UserType: req.body.UserTypeOption.value,
        UserTypeName: userTypes[req.body.UserTypeOption.value]

    });
    User.find({"Name": req.body.Name}).exec(function (err, user) {
        if (err)
            return res.status(400).json({
                "message": err
            });
        if (user.length > 0)
            return res.status(400).json({
                "message": "User already exists."
            });
        newUser.save(function (err) {
            if (err) {
                res.status(400).json({
                    "message": err
                });
            }
            else {
                res.status(200).json({
                    "message": "success"
                });
            }
        });

    });

};

/**
 * Edit user (basically type of user)
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.editUser = function (req, res) {
    var updatedUser = new Object({
        Name: req.body.Name,
        UserType: req.body.UserTypeOption.value,
        UserTypeName: userTypes[req.body.UserTypeOption.value]

    });


    User.find({'UserType': 1}, function (err, users) {
        if (err)
            return res.status(400).json({
                "message": err
            });
        if (users.length <= 1)
            if (updatedUser.UserType == 2 && users[0].Name == updatedUser.Name)
                return res.status(400).json({
                    "message": "At least one admin is required."
                });
        User.update({_id: req.body._id}, updatedUser, {upsert: true}, function (err) {
            if (err) {
                res.status(400).json({
                    "message": err
                });
            }
            else {
                res.status(200).json({
                    "message": "success"
                });
            }
        });

    });


};

/**
 * Delete user (this deletes the monitoring user, not system user)
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.deleteUser = function (req, res) {
    User.find({'UserType': 1}, function (err, users) {
        if (err)
            return res.status(400).json({
                "message": err
            });
        if (users.length <= 1) {
            if (users[0]._id == req.body.id)
                return res.status(400).json({
                    "message": "At least one admin is required."
                });
        }
        User.findByIdAndRemove(req.body.id, function (err) {
            if (err) {
                return res.status(400).json({
                    "message": err
                });
            }
            else {
                return res.status(200).json({
                    "message": "success"
                });
            }
        });

    });


};

/**
 * Get all users according to filters
 * for angular data tables in admin interface
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.getAllUsers = function (req, res) {
    var filterParams = {};
    if (typeof req.body.search.value.trim() != "") {
        if (req.body.searchColumn.length == 1) {
            var regex = new RegExp(req.body.search.value.trim(), "i");
            filterParams[req.body.searchColumn[0]] = regex;
        }
        else {
            filterParams['$or'] = [];
            req.body.searchColumn.forEach(function (entry) {
                var obj = {};
                var regex = new RegExp(req.body.search.value.trim(), "i");
                obj[entry] = regex;
                filterParams['$or'].push(obj);
            });
        }
    }
    var sortParams = {};
    req.body.order.forEach(function (entry) {
        sortParams[req.body.columns[entry.column].data] = entry.dir == 'desc' ? -1 : 1;
    });
    User.find(filterParams).sort(sortParams).limit(parseInt(req.body.length)).skip(parseInt(req.body.start)).exec(function (err, users) {
        if (err)
            return res.status(400).json({
                "message": err
            });
        User.count(filterParams, function (err, count) {
            if (err)
                return res.status(400).json({
                    "message": err
                });
            var resp = {};
            resp.draw = req.body.draw;
            resp.recordsTotal = count;
            resp.recordsFiltered = count;
            resp.data = users;
            return res.status(200).json(resp);

        });

    });

};

/**
 * Get id of the user by their name
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.getUserIdByName = function (username,callback) {
    User.find({"Name":username},{"_id":1}).exec(function (err,user) {
       callback(JSON.parse(JSON.stringify(user))[0]._id);
    });
};