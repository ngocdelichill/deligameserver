const express = require('express');
var bodyParser = require('body-parser');
const router = express.Router();
var jsonParser = bodyParser.json();
const auth = require('../auth/auth');
const room = require('../controllers/room.controller');

// a simple test url to check that all of our files are communicating correctly.
router.get('/test', room.test);
router.post('/create',room.create);
router.get('/list',room.list);
router.post('/join',room.join);
router.post('/out',room.out);
router.get('/search',room.search);
router.patch('/update',room.update);

module.exports = router;
