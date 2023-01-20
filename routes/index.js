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

function check_private_key(req, res, next) {
  let private_key = req.body.private_key
  if (private_key !== process.env.RSA_ENC) {
    return
  } else {
    next();
  }
}

/* GET create or stop the session. */
router.get('/api/trigger_session', function (req, res, next) {
  check_private_key(req, res, next)

  let current_stationID = req.body.stationID || req.headers['stationID'] || req.params.stationID
  if(!current_stationID) res.json({msg: "No stationID was found."})

  WSession.findOne({ stationID: `${current_stationID}` }, function (err, session) {
    // if (err) return next(err);

    // for development
    if (process.env.ENVIRONMENT == "development") {
      if (!current_stationID || current_stationID == undefined || typeof current_stationID != String) {
        WSession.count({}, function (err, count) {
          current_stationID = count + 1
        })
      }
    }

    if (!session) {
      let newSession = new WSession({
        stationID: `${current_stationID}`,
        cookiesCount: 0,
        sessionStartTime: Date.now(),
        sessionEndTime: Date.now(),
      })

      newSession.save()
        .then((result) => {
          console.log("New session created.")
          res.json({ msg: 'New session created.', current_stationID })
        })

    } else {
      session.sessionEndTime = Date.now()
      session.save()
        .then(err => {
          // if(err) return res.send(err)
          console.log('closed session ', current_stationID)
          res.json({ msg: 'Closed the session.', current_stationID })
        })
    }
  });
});

/* POST add a new cookie. */
router.get('/api/add_cookie', function (req, res, next) {
  check_private_key(req, res, next)

  let current_stationID = req.body.stationID || req.headers['stationID'] || req.params.stationID
  if (!current_stationID) res.redirect('/')

  WSession.findOne({ stationID: current_stationID }).then(wsession => {
    if (!wsession) res.send('no stationID could be found')
    let newCookiesCount = wsession.cookiesCount + 1;
    wsession.cookiesCount = newCookiesCount;

    wsession.save().then((err, result) => {
      res.json({ msg: 'added a new cookie.' })
    })
  })

});

/* POST close session. */
router.get('/api/close_session', function (req, res, next) {
  check_private_key(req, res), next;

  let current_stationID = req.body.stationID || req.headers['stationID'] || req.params.stationID
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