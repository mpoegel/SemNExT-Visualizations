/// <reference path="../typings/tsd.d.ts" />

import express = require('express');
var app = express();

app.use(express.static(__dirname + '/public'));

import controllers = require('./controllers/index');

app.use('/', controllers);

let server = app.listen(8000, () => {
	let host = server.address().address,
		port = server.address().port;
	console.log('App running at http://%s:%s', host, port);
});

export = app;