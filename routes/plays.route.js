const express = require('express');
var bodyParser = require('body-parser');
const router = express.Router();
var jsonParser = bodyParser.json();
const auth = require('../auth/auth');
const play = require('../controllers/play.controller');

// a simple test url to check that all of our files are communicating correctly.
router.get('/test', play.test);
router.get('/deli-finance',play.finance);
router.get('/ready',play.ready);
router.post('/roll',play.roll);
router.get('/dice',play.dice);
router.post("/next",play.next);
router.get('/auction',play.auction);
router.post("/bid",play.bid);
router.post("/choose_color",play.choose_color);

router.get('/deli-chinese-chess',play.chinesechess);
router.get('/dev-deli-chinese-chess',play.devchinesechess);
router.get('/chess_start',play.chess_start);
router.post('/chess_mankey',play.chess_mankey);
module.exports = router;