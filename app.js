// app.js
const express = require('express');
require("dotenv").config();
var cors = require('cors');
var path = require('path');
const app = express();

app.set('view engine', 'ejs');
const auth = require("./auth/auth");
const bodyParser = require('body-parser');
const users = require('./routes/users.route');
const friends = require('./routes/friends.route');
const rooms = require('./routes/rooms.route');
const plays = require('./routes/plays.route');
const history = require('./routes/histories.route');
const wallet = require('./routes/wallets.route');
let port = process.env.PORT || 3003;
//socket.io
const http = require('http').Server(app);
const io = require('socket.io')(http, {
    cors: {
        //origin: `http://localhost:${port}`,
        origin: [`http://127.0.0.1:5500`,`http://localhost:3000`,`https://deligamesdemo.vercel.app`,`https://deligames.vercel.app`],
        methods: ["GET", "POST"],
        transports: ['websocket', 'polling'],
        credentials: true
    },
    allowEIO3: true
});
const SocketServices = require('./services/socket');

global._io = io;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true,
}));
app.use(express.static(path.join(__dirname, 'assets')));
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use('/users', users);
app.use('/friends',friends);
app.use('/rooms',rooms);
app.use('/plays',plays);
app.use('/histories',history);
app.use('/wallets',wallet);

const dbConfig = 'mongodb+srv://hankite:62424436@cluster0.gayzc.mongodb.net/?retryWrites=true&w=majority';
const mongoose = require('mongoose');

mongoose.connect(dbConfig, {
    useNewUrlParser: true
}).then(() => {
    console.log("Successfully connected to the database");
}).catch(err => {
    console.log('Could not connect to the database. Exiting now...', err);
    process.exit();
});

global._io.on('connection', SocketServices.connection)
http.listen(port, () => {
    console.log(`Socket.IO server running at port: ${port}`);
});
