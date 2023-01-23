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
        return res.redirect("/exports/csv-" + dateTime + ".csv");
      }
    });

    // }
  })
})

function check_private_key(req, res, next) {
  let private_key = req.body.private_key
  if (private_key !== process.env.RSA_ENC) {
    console.log('here1');
    return res.json({ msg: "Please, Make sure the private_key is valid." })
  } else {
    console.log('here2');
    return;
  }
}

function development_current_stationID(current_stationID) {
  // for development
  if (process.env.ENVIRONMENT == "development") {
    if (!current_stationID || current_stationID == undefined || typeof current_stationID != String) {
      WSession.count({}, function (err, count) {
        let new_current_stationID = count + 1
        return new_current_stationID;
      })
    }
  }
}

/* GET create or stop the session. */
router.get('/api/trigger_session', async function (req, res, next) {
  // console.log(req.body);
  check_private_key(req, res, next)

  let current_stationID = req.body.stationID || req.headers['stationID'] || req.params.stationID
  if (current_stationID == undefined) res.json({ msg: "Please send the stationID." })

  let find_session = await WSession.findOne({ stationID: `${current_stationID}` });

  // for development
  development_current_stationID(current_stationID)

  // case: no session was found with that ID
  if (!find_session) {
    let newSession = new WSession({
      stationID: `${current_stationID}`,
      cookiesCount: 0,
      sessionStartTime: Date.now(),
      sessionEndTime: undefined,
    })

    let save_newSession = await newSession.save();
    if (save_newSession) return res.status(200).json({ msg: 'New session created.', current_stationID })
  }

  // case: session was found with that ID
  if (find_session) {
    // case: session end time was undefined
    if (find_session.sessionEndTime == undefined) {
      find_session.sessionEndTime = Date.now()
      let save_currentSession = await find_session.save()
      if (save_currentSession) return res.json({ msg: 'Closed the session.', current_stationID })
    }

    // case: session end time was updated before
    if (find_session.sessionEndTime != undefined) {
      return res.json({ msg: 'We found data with the same stationID and has been closed. Should we create another session with the same ID, Or update the sessionEndTime.' })
    }
  }

});

/* POST add a new cookie. */
router.get('/api/add_cookie', async function (req, res, next) {
  check_private_key(req, res, next)

  let current_stationID = req.body.stationID || req.headers['stationID'] || req.params.stationID
  if (current_stationID == undefined) res.json({ msg: "Please send the stationID." })

  // for development
  development_current_stationID(current_stationID)

  let find_session = await WSession.findOne({ stationID: `${current_stationID}` });

  // case: no session was found with that ID
  if (!find_session) {
    let newSession = new WSession({
      stationID: `${current_stationID}`,
      cookiesCount: 1,
      sessionStartTime: Date.now(),
      sessionEndTime: undefined,
    })

    let save_newSession = await newSession.save();
    if (save_newSession) return res.status(200).json({ msg: 'New session created, and one cookie was added.', current_stationID })
  }

  // case: session was found with that ID
  if (find_session) {
    // case: session end time was undefined
    if (find_session.sessionEndTime == undefined) {
      find_session.cookiesCount += 1;

      let save_currentSession = await find_session.save()
      if (save_currentSession) return res.json({ msg: 'Added a new cookie.', current_stationID })
    }

    // case: session end time was updated before
    if (find_session.sessionEndTime !== undefined) {
      return res.json({ msg: "You can't add new cookies. This session was closed" })
    }
  }

});

/* POST close session. */
// router.get('/api/close_session', function (req, res, next) {
//   check_private_key(req, res), next;

//   let current_stationID = req.body.stationID || req.headers['stationID'] || req.params.stationID
//   WSession.findOneAndUpdate({ stationID: current_stationID }, { sessionEndTime: Date.now() })
//     .then(err => {
//       if (err) return res.send(err)
//       res.send('cookie was added to ', current_stationID);
//     })
//     .catch(err => {
//       res.send(err)
//     })
// });

module.exports = router;