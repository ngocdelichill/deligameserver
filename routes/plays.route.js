const express = require('express');
var bodyParser = require('body-parser');
const router = express.Router();
var jsonParser = bodyParser.json();
const auth = require('../auth/auth');
const play = require('../controllers/play.controller');

// a simple test url to check that all of our files are communicating correctly.
router.get('/test', play.test);

router.post('/ready', play.ready);
router.post('/deli-chinese-chess',play.chinesechess);

router.post('/chess_start',play.chess_start);
router.post('/chess_mankey',play.chess_mankey);
router.post('/chess-draw',play.chess_draw);
router.post('/chess-resign',play.chess_resign);
router.post('/chess-draw-response',play.chess_draw_response);

router.post('/check-match',play.check_match);


router.post('/deli-finance-bussiness', play.deli_finance_bussiness);
router.post('/delimono-start',play.deli_mono_start);
router.post('/delimono-roll-dice',play.roll_dice);
module.exports = router;