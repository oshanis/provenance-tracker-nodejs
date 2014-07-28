// web.js
var express = require("express");
var logfmt = require("logfmt");
var app = express();

// Database Settings
var MongoClient = require('mongodb').MongoClient;

var mongoUri = process.env.MONGOLAB_URI ||
  process.env.MONGOHQ_URL ||
  'mongodb://localhost:27017/exampleDb';

var resource_log_collection;
var user_log_collection;
var derivative_log_collection;

// Connect to the db
module.exports = MongoClient.connect(mongoUri, function(err, db) {
    if(err) { return console.dir(err); }

    //Instantiate the users table to store their data
    resource_log_collection = db.collection('resource_log');
});



app.use(logfmt.requestLogger());

app.get('/', function(req, res) {
	res.send('HTTPA Provenance Tracker Gateway');
    });

var port = Number(process.env.PORT || 5000);
app.listen(port, function() {
	console.log("Listening on " + port);
    });