var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mongoose = require('mongoose');
var User = mongoose.model('User');

passport.use(new LocalStrategy({
    usernameField: 'username'
  },
  function(username, password, done) {
    User.findOne({ Name: username }, function (err, user) {
      if (err) { return done(err); }

      /* Return if user not found in database */
      if (!user) {
        return done(null, false, {
          message: 'User not found. Please contact the administrator.'
        });
      }

      /* Return if password is wrong */
      user.validPassword(password,function (result) {
          if(!result)
               return done(null, false, {
                      message: 'Username/Password is wrong.'
                    });
          else
              return done(null, user);
      });

    });
  }
));