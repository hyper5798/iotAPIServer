var mqtt = require('mqtt');
var config = require('../config');
var util = require('./util.js');
var schedule = require('node-schedule');
var io = require('socket.io-client');
var socket = io.connect('http://localhost:8000', {reconnect: true});

socket.on('connect',function(){
    socket.emit('mqtt_sub','**** mqtt_sub socket cient is ready');
});

function scheduleCronstyle(){
    schedule.scheduleJob('30 25 11 * * *', function(){
				console.log('scheduleCronstyle:' + new Date());
				util.sendAdminLineMessage();
    }); 
}

scheduleCronstyle();

//Jason add for fix Broker need to foward message to subscriber on 2018-04-01
var options = {
	port: config.mqttPort,
    host: config.mqttHost,
    username: config.mqttName,
    password: config.mqttPassword,
	protocolId: 'MQIsdp',
	protocolVersion: 3
};

var client = mqtt.connect(options);
client.on('connect', function()  {
	console.log(new Date() + ' ***** MQTT connect...' + client.clientId);
    client.subscribe(config.mytopic);
});

client.on('message', function(topic, msg) {
	console.log(new Date() + ' ****** topic:'+topic);
	console.log('message:' + msg.toString());
	if(isSensorData(msg) == true) {
		//Parse sensor data
		/*util.parseMsgd(msg.toString(), function(err, message){

			if(err) {
				return;
			} else {
			  if (message) {
				console.log(util.getCurrentTime() + ' *** Publish parse and sendmessage OK');
			  }
			  return;
			}
		});*/
		console.log(util.getCurrentTime() + ' parse sensor data');
	} else {
		console.log(util.getCurrentTime() + ' ***** controller return message');
	}
});

client.on('disconnect', function() {
	console.log(new Date() + ' ****** mqtt disconnect' );
});

function isSensorData(msg){
	let arr = JSON.parse(msg);
    let obj = arr[0];
    let data = obj.data;
	let buff = new Buffer(data, 'hex');
	let header = buff[0];
	if( header> 249 && header < 255) {
		return true;
	} else {
		if(header == 170) {
			let command = buff[2];
			let code = buff[3];
			if(command == 129 && code == 2) {
				let mac = obj.macAddr;
				let number = buff[1];
				sendWSMessage(mac, number, command);
			}
		}
		return false;
	}
}

function sendWSMessage(mac,number, command) {
	var message = {mac: mac, number: number, command: command};
	socket.emit('update_command_status', message);
}