/**
 * Controller for 'user' and related requests
 */
const mongoose  = require('mongoose');
const User      = mongoose.model('User');
let userTypes   = {1: "Admin", 2: "User"};

/**
 * Get user information by id
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.userInfo = (req, res) => {

    if (!req.payload._id) {
        res.status(401).json({"message": "UnauthorizedError"});
    } else {
        User
        .findById(req.payload._id)
        .exec( (err, user) => {
            res.status(200).json(user);
        });
    }
};

/**
 * Add user to 'user' collection
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.addUser = (req, res) => {

    let newUser = new User({
        Name: req.body.Name,
        UserType: req.body.UserTypeOption.value,
        UserTypeName: userTypes[req.body.UserTypeOption.value],
        Ingested: false
    });

    User.find({"Name": req.body.Name}).exec( (err, user) => {
        if (err)
            return res.status(400).json({"message": err});

        if (user.length > 0)
            return res.status(400).json({"message": "User already exists."});

        newUser.save( (err) => {
            if (err) {
                res.status(400).json({"message": err});
            } else {
                res.status(200).json({"message": "success"});
            }
        });
    });
};

/**
 * Edit user (basically type of user)
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.editUser = (req, res) => {
    let updatedUser = new Object({
        Name: req.body.Name,
        UserType: req.body.UserTypeOption.value,
        UserTypeName: userTypes[req.body.UserTypeOption.value]

    });

    User.find({'UserType': 1}, (err, users) => {
        if (err)
            return res.status(400).json({"message": err});

        if (users.length <= 1)
            if (updatedUser.UserType == 2 && users[0].Name == updatedUser.Name)
                return res.status(400).json({"message": "At least one admin is required."});

        User.update({_id: req.body._id}, updatedUser, {upsert: true}, (err) => {
            if (err) {
                res.status(400).json({"message": err});
            } else {
                res.status(200).json({"message": "success"});
            }
        });
    });
};

/**
 * Delete user (this deletes the monitoring user, not system user)
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.deleteUser = (req, res) => {

    User.find({'UserType': 1}, (err, users) => {
        if (err)
            return res.status(400).json({"message": err});

        if (users.length <= 1) {
            if (users[0]._id == req.body.id)
                return res.status(400).json({"message": "At least one admin is required."});
        }

        User.findByIdAndRemove(req.body.id, (err) => {
            if (err) {
                return res.status(400).json({"message": err});
            } else {
                return res.status(200).json({"message": "success"});
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
module.exports.getAllUsers = (req, res) => {
    let filterParams = {};
        sortParams = {};

    if (typeof req.body.search.value.trim() != "") {
        if (req.body.searchColumn.length == 1) {
            let regex = new RegExp(req.body.search.value.trim(), "i");
            filterParams[req.body.searchColumn[0]] = regex;
        } else {
            filterParams['$or'] = [];
            req.body.searchColumn.forEach( (entry) => {
                let obj = {};
                let regex = new RegExp(req.body.search.value.trim(), "i");
                obj[entry] = regex;
                filterParams['$or'].push(obj);
            });
        }
    }

    req.body.order.forEach((entry) => {
        sortParams[req.body.columns[entry.column].data] = entry.dir == 'desc' ? -1 : 1;
    });

    User
    .find(filterParams)
    .sort(sortParams)
    .limit(parseInt(req.body.length))
    .skip(parseInt(req.body.start))
    .exec( (err, users) => {
        if (err)
            return res.status(400).json({"message": err});

        User.count(filterParams, (err, count) => {
            if (err)
                return res.status(400).json({"message": err});

            let resp = {};

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
module.exports.getUserIdByName = (username,callback) => {
    User.find({"Name":username},{"_id":1}).exec((err,user) => {
       callback(JSON.parse(JSON.stringify(user))[0]._id);
    });
};