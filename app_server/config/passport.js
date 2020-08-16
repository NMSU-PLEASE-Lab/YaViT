const passport = require('passport');
const mongoose = require('mongoose');
let User = mongoose.model('User');
let LocalStrategy = require('passport-local').Strategy;

passport.use(new LocalStrategy({usernameField: 'username'}, (username, password, done) => {
    User.findOne({ Name: username }, (err, user) => {
      if (err) { return done(err); }

      /* Return if user not found in database */
      if (!user) {
        return done(null, false, {message: 'User not found. Please contact the administrator.'});
      }

      /* Return if password is wrong */
      user.validPassword(password, (result) => {
          if(!result)
               return done(null, false, {message: 'Username/Password is wrong.'});
          else
            return done(null, user);
      });
    });
  }
));