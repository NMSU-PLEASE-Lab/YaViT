/*
 * Model for 'user' collection
 */

var mongoose = require('mongoose');
var jwt = require('jsonwebtoken');
var pam = require('authenticate-pam');


var userSchema = new mongoose.Schema({
    Name: String,
    UserType: Number,
    UserTypeName: String
});


/**
 * Check if password is valid through pam authentication
 * @param password - User's password
 * @param callback - Callback function
 */
userSchema.methods.validPassword = function (password, callback) {
    // if(password =='ujjwal')
    //     return callback(true);
    pam.authenticate(this.Name, password, function (err) {
        console.log(err);
        callback(!err);
    });
};

/**
 *Generate user token after login success
 */
userSchema.methods.generateJwt = function () {
    var expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);

    return jwt.sign({
        _id: this._id,
        username: this.Name,
        usertype: this.UserType,
        usertype_name: this.UserTypeName,
        exp: parseInt(expiry.getTime() / 1000)
    }, "MY_SECRET");
};

mongoose.model('User', userSchema, 'user');