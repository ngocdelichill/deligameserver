const express = require('express');
var bodyParser = require('body-parser');
const router = express.Router();
var jsonParser = bodyParser.json();
const auth = require('../auth/auth');
const friend = require('../controllers/friend.controller');

// a simple test url to check that all of our files are communicating correctly.
router.get('/test', friend.test);
router.get('/search',friend.search);
router.post('/add',friend.add); 
router.post('/request_list',friend.request_list);
router.post('/invited_list',friend.invited_list);
router.post('/accept',friend.accept);
router.post('/remove',friend.remove);
module.exports = router;
