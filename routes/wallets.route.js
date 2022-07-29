const express = require('express');
var bodyParser = require('body-parser');
const router = express.Router();
var jsonParser = bodyParser.json();
const auth = require('../auth/auth');
const wallet = require('../controllers/wallet.controller');

router.get('/test', wallet.test);
router.post('/add',jsonParser, wallet.add);
router.post('/remove',jsonParser, wallet.remove);
router.post('/detail',jsonParser, wallet.detail);
router.post('/all',jsonParser, wallet.all);

router.get('/')
router.post('/add-transaction',jsonParser, wallet.transaction_add);
router.post('/check-transaction',jsonParser, wallet.transaction_check);
module.exports = router;
