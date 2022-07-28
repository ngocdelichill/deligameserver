const express = require('express');
var bodyParser = require('body-parser');
const router = express.Router();
var jsonParser = bodyParser.json();
const auth = require('../auth/auth');
const wallet = require('../controllers/wallet.controller');

router.get('/test', wallet.test);
router.post('/add',jsonParser, wallet.add);
router.post('/remove',jsonParser, wallet.remove);
module.exports = router;
