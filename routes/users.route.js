const express = require('express');
var bodyParser = require('body-parser')
const router = express.Router();
var jsonParser = bodyParser.json();
// Require the controllers WHICH WE DID NOT CREATE YET!!
const user = require('../controllers/user.controller');

// a simple test url to check that all of our files are communicating correctly.
router.get('/test', user.test);
router.post('/register',jsonParser, user.register);
router.post('/login',jsonParser, user.login);
router.post('/forgot_password',jsonParser, user.forgot_password);
router.get('/recovery_password',user.recovery_password);
router.put('/update_password', user.update_password);
router.put('/change_password', jsonParser,user.change_password);
router.post('/detail', user.details);
router.put('/update', user.update);
router.delete('/:id/delete', user.delete);
module.exports = router;
