// app.js
const express = require('express');
require("dotenv").config();
var cors = require('cors');
const app = express();
const auth = require("./auth/auth");
const bodyParser = require('body-parser');
const users = require('./routes/users.route');
const friends = require('./routes/friends.route');
const rooms = require('./routes/rooms.route');

// Use Node.js body parsing middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true,
}));

app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use('/users', users);
app.use('/friends',friends);
app.use('/rooms',rooms);

let port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log('Server is up and running on port numner ' + port);
});

// Configuring the database
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

