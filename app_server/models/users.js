/*
 * Model for 'user' collection
 */

const mongoose  = require('mongoose');
const jwt       = require('jsonwebtoken');
const pam       = require('authenticate-pam');
let Schema      = mongoose.Schema;

let userSchema = new Schema({
    Name: String,
    UserType: Number,
    UserTypeName: String,
    Ingested: Boolean
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

// mongoose.model('User', userSchema, 'user');

module.exports = mongoose.model('User', userSchema, 'user');