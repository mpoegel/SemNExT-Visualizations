/// <reference path="../typings/tsd.d.ts" />

import express = require('express');
import controllers = require('./controllers/index');
import lessMiddleware = require('less-middleware');
var app = express();

var config = require('./config.json');

app.use(lessMiddleware(
	__dirname + '/public',
	{ force: true }
));

app.use('/', express.static(__dirname + '/public'));

app.use('/', controllers);

let server = app.listen(config.port, () => {
	let host = server.address().address,
		port = server.address().port;
	console.log('App running at http://%s:%s', host, port);
});

export = app;