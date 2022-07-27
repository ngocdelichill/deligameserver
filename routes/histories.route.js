const express = require('express');
var bodyParser = require('body-parser');
const router = express.Router();
var jsonParser = bodyParser.json();
const auth = require('../auth/auth');
const history = require('../controllers/history.controller');

// a simple test url to check that all of our files are communicating correctly.
router.get('/test', history.test);
router.post('/game-history',history.game);

module.exports = router;
