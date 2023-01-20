var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.serializeUser((user, done) => {
    done(null, user.id);
})

passport.deserializeUser((user, done) => {
    done(null, user);
})

let local_callback = "http://localhost:3000/google/callback"
let heroku_callback = 'https://micro-cookies.herokuapp.com/google/callback'

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: heroku_callback
},
    function (accessToken, refreshToken, profile, cb) {
        // Register user here.
        console.log(profile);
        cb(null, profile);
    }
));