#!/usr/bin/env node
//======================================================
// File: server.js
// Descr: Nodejs server for Varnish Visualizer
// Author: Magnus Persson
// Date: 2019-02-07
//======================================================

//======================================================
// Configuration
//======================================================
var version = "0.1";
var port = 3000;

//======================================================
// Initialization
//======================================================
var server = require("http");
var express = require('express');
// var amqp = require('amqplib/callback_api'); // For use with RabbitMQ
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var geoip = require('geoip-lite');
const { spawn } = require('child_process')
const child = spawn('varnishncsa', ['-F', '%{VSL:ReqHeader:x-cache[1]}x|%{VSL:ReqHeader:x-cache[2]}x']);

// Async Iteration available since Node 10
(async () => {
	for await (const data of child.stdout) {
		if (data.toString().match("-") != null ) {
			continue;
		}
		var d = data.toString().replace(/\n/, '').split("|");
		var ip = d[0];
		var geo = geoip.lookup(ip);
		if (geo != null ) {
			io.emit("data", { msg: ip+"|"+ geo.city+"|"+geo.ll[0]+","+geo.ll[1]+"|"+d[1] });
			//console.log(ip+"|"+ geo.city+"|"+geo.ll[0]+","+geo.ll[1]+"|"+d[1]);
		}
  };
  try{
  }catch(e){
    console.log(e.stack);
  }
})();

console.log("===================================");
console.log("Server for Varnish Visualizer");
console.log("Author: Magnus");
console.log("Version: " + version);
console.log("===================================");
console.log("Started server on port " + port);

app.use(express.static('public'))

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

// For use with RabbitMQ VMOD
//amqp.connect('amqp://test:test@127.0.0.1:5672', function (err, conn) {
//    if (conn == null) {
//        console.log(err);
//        console.log("Failed to connect o RabbitMQ.")
//        process.exit(-1);
//    }
//    conn.createChannel(function (err, ch) {
//        var q = 'test';
//
//        ch.assertQueue(q, { durable: false });
//        console.log("Waiting for messages in queue %s.", q);
//        ch.consume(q, function (msg) {
//            io.emit("data", { msg: msg.content.toString() });
//        }, { noAck: true });
//    });
//});

io.on('connection', function (socket) {
    var ip = socket.handshake.address;
    console.log("Incoming connection from " + ip);
});

http.listen(port, function () {
});
