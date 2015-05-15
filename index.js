'use strict';
var config = require('./config');
var app = require('koa')();
var http = require('http').createServer(app.callback());
http.listen(config.port, () => console.log('Listening on', config.port));

var Server = require('./Server');
var chatServer = new Server(http);