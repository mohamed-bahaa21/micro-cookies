var express = require('express');
var router = express.Router();

const fs = require('fs');
const moment = require('moment');
// const mdq = require('mongo-date-query');
const json2csv = require('json2csv').parse;
const path = require('path')
const fields = ['stationID', 'sessionStartTime', 'sessionEndTime', 'cookiesCount'];

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const WSession = require('../models/WSession.model');

require('./authenticate');

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
  res.redirect('/profile')
})

passport.serializeUser((user, done) => {
  done(null, user.id);
})

passport.deserializeUser((user, done) => {
  done(null, user);
})

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}

function forwardAuthenticated(req, res, next) {
  if (!req.isAuthenticated()) {
    return next();
  }
  res.redirect('/profile');
}

/* GET home page. */
router.get('/', forwardAuthenticated, function (req, res, next) {
  res.render('index', { title: 'Micro Cookies' });
});

/* GET profile page. */
router.get('/profile', ensureAuthenticated, function (req, res) {
  res.render('profile', { title: 'Micro Cookies' });
});

/* GET logout. */
router.get('/logout', ensureAuthenticated, function (req, res) {
  req.logout(function (err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

/* GET export csv. */
router.get('/exports/csv', ensureAuthenticated, function (req, res) {
  WSession.find().then((sessions) => {
    let csv
    try {
      csv = json2csv(sessions, { fields });
    } catch (err) {
      return res.status(500).json({ err });
    }
    const dateTime = moment().format('YYYYMMDDhhmmss');
    const filePath = path.join(__dirname, "..", "public", "exports", "csv-" + dateTime + ".csv")
    console.log('====================================');
    console.log(filePath);
    console.log('====================================');
    fs.writeFile(filePath, csv, function (err) {
      if (err) {
        return res.json(err).status(500);
      }
      else {
        setTimeout(function () {
          fs.unlinkSync(filePath); // delete this file after 30 seconds
        }, 30000)
        return res.json("/exports/csv-" + dateTime + ".csv");
      }
    });

    // }
  })
})

/* GET verify controller. */
router.get('/api/create_session', function (req, res, next) {
  let current_stationID = req.body.stationID || req.headers['stationID']
  WSession.count({}, function (err, count) {
    current_stationID = count + 1
  })

  // if (req.params.private_key == "123") {
  let newSession = new WSession({
    stationID: `${current_stationID}`,
    cookiesCount: 0,
    sessionStartTime: Date.now(),
    sessionEndTime: Date.now(),
  })
  newSession.save()

    .then((err) => {
      req.session.workingSession = newSession;
      res.send("New session created.")
    }).catch(err => {
      res.send('error creating new session.')
    })

  // } else {
  //   res.send('private_key unmatched.')
  // }
});

/* POST add a new cookie. */
router.get('/api/add_cookie', function (req, res, next) {
  let current_stationID = req.body.stationID || req.headers['stationID'] || '1'
  let newCookiesCount;
  if (!req.session.workingSession) {
    WSession.findOne({ stationID: current_stationID }).then(wsession => {
      newCookiesCount = wsession.cookiesCount + 1;
      wsession.cookiesCount = newCookiesCount;

      wsession.save().then((err, result) => {
        if (err) {
          res.send(err)
        } else {
          res.send('cookie was added to ', current_stationID);
        }
      })

    })
  } else {
    newCookiesCount = req.session.workingSession.cookiesCount + 1;

    WSession.findOneAndUpdate({ stationID: current_stationID }, { cookiesCount: newCookiesCount })
      .then((err) => {
        if (err) res.send("error adding a cookie")
        res.send('cookie was added to ', current_stationID);
      })
  }
});

/* POST close session. */
router.get('/api/close_session', function (req, res, next) {
  let current_stationID = req.body.stationID || req.headers['stationID'] || '1'
  WSession.findOneAndUpdate({ stationID: current_stationID }, { sessionEndTime: Date.now() })
    .then(err => {
      if (err) return res.send(err)
      res.send('cookie was added to ', current_stationID);
    })
    .catch(err => {
      res.send(err)
    })
});

module.exports = router;