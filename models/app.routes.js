/*
    File Name: app.routes.js
    Student Name: Kristi Goxhaj
    StudentID: 301147545
    Date: 27/10/2022
*/

var express = require('express');
var router = express.Router();

const User = require('../models/User.model');
const Contact = require('../models/Contact.model');

const {
  ensureAuthenticated,
  forwardAuthenticated
} = require('../config/auth');

/* GET home page. */
router.get('/', forwardAuthenticated, function (req, res, next) {
  res.render('index', { page_title: 'Home', user: req.user, });
});
/* GET home page. */
router.get('/about-me', forwardAuthenticated, function (req, res, next) {
  res.render('about-me', { page_title: 'About Me', user: req.user, });
});
/* GET home page. */
router.get('/projects', forwardAuthenticated, function (req, res, next) {
  res.render('projects', { page_title: 'Projects', user: req.user, });
});
/* GET home page. */
router.get('/services', forwardAuthenticated, function (req, res, next) {
  res.render('services', { page_title: 'Services', user: req.user, });
});
/* GET home page. */
router.get('/contact-me', forwardAuthenticated, function (req, res, next) {
  res.render('contact-me', { page_title: 'Contact Me', user: req.user, });
});
/* GET home page. */
router.post('/contact-me', function (req, res, next) {
  let {
    first_name,
    last_name,
    email,
    phone_number,
    message } = req.body;

  const newContact = new Contact({
    first_name,
    last_name,
    email,
    phone_number,
    message
  });

  newContact
    .save()
    .then(contact => {
      req.flash(
        'success_msg',
        'You are now registered and can log in'
      );
      res.redirect('/contact-me');
    })
    .catch(err => console.log(err));
});

module.exports = router;
