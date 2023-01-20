const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
    clientID: '539908134890-li76ho5kh0cbpvlsjstpimqri34ucono.apps.googleusercontent.com',
    clientSecret: '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',
    callbackURL: 'http://localhost:5000/auth/google/callback'
},
    function (accessToken, refreshToken, profile, cb) {
        // Save the user's information to your database
        // and create a session for the user
    }
));

// app.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    function (req, res) {
        // Successful authentication, redirect to the home page
        res.redirect('/');
    });

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

app.get('/profile', ensureAuthenticated, function (req, res) {
    res.render('profile', { user: req.user });
});

app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});