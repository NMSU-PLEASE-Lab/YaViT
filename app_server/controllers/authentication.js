/**
 * Authentication Model For generating token
 */
const passport = require('passport');
const mongoose = require('mongoose');
let User = mongoose.model('User');

let sendJSONresponse = (res, status, content) => {
  res.status(status);
  res.json(content);
};

module.exports.login = (req, res) => {
  passport.authenticate('local', (err, user, info) => {
    let token;

    /* If Passport throws/catches an error */
    if (err) {
      res.status(404).json(err);
      return;
    }

    /* If a user is found */
    if(user){
      token = user.generateJwt();
      res.status(200);
      res.json({"token" : token});
    } else {
      /* If user is not found */
      res.status(401).json(info);
    }
  })(req, res);
};