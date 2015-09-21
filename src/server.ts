/// <reference path="../typings/tsd.d.ts" />


let express = require('express'),
	app = express();


app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
	res.sendfile(__dirname + '/public/index.html');
});

let server = app.listen(8000, () => {
	let host = server.address().address,
		port = server.address().port;
	console.log('App running at http://%s:%s', host, port);
});