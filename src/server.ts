/// <reference path="../typings/tsd.d.ts" />

import express = require('express');
import controllers = require('./controllers/index');
var app = express();

app.use('/', express.static(__dirname + '/public'));

app.use('/', controllers);

let server = app.listen(8032, () => {
	let host = server.address().address,
		port = server.address().port;
	console.log('App running at http://%s:%s', host, port);
});

export = app;