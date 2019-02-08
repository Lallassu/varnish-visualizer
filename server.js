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
var amqp = require('amqplib/callback_api');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

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

amqp.connect('amqp://test:test@127.0.0.1:5672', function (err, conn) {
    if (conn == null) {
        console.log(err);
        console.log("Failed to connect o RabbitMQ.")
        process.exit(-1);
    }
    conn.createChannel(function (err, ch) {
        var q = 'test';

        ch.assertQueue(q, { durable: false });
        console.log("Waiting for messages in queue %s.", q);
        ch.consume(q, function (msg) {
            io.emit("data", { msg: msg.content.toString() });
        }, { noAck: true });
    });
});

io.on('connection', function (socket) {
    var ip = socket.handshake.address;
    console.log("Incoming connection from " + ip);
});

http.listen(port, function () {
});
