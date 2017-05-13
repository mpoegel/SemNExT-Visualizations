/**
 * server.ts
 * 
 * Main file that configures the settings on the server and then starts the 
 * server itself.
 */

import express = require('express');
import controllers = require('./controllers/index');
import lessMiddleware = require('less-middleware');
import bodyParser = require('body-parser');
import path = require('path');

var app = express();

let config = require('./config.json');

// Configure Less to compile the .less files in the /public directory 
app.use(lessMiddleware(
  path.join(__dirname + '/../public'),
  { force: true }
));
app.use(bodyParser.json({
  strict: false
}));
// serve the contents of the /public directory at the root
console.log(path.join(__dirname + '/../public'));
app.use('/', express.static(path.join(__dirname + '/../public')));
// load the route controllers
app.use('/', controllers);
// start up the server 
let server = app.listen(config.port, () => {
  let host = server.address().address,
      port = server.address().port;
  console.log('App running at http://%s:%s', host, port);
});

export = app;
