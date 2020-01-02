var mqtt = require('mqtt');
var config = require('../config');
var util = require('./util.js');
var schedule = require('node-schedule');
var io = require('socket.io-client');
var socket = io.connect('http://localhost:8000', {reconnect: true});
var dbEvent = require('../modules/cloudant/cloudantEvent.js');

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
//cleanCloudantDB();

function cleanCloudantDB() {
	var json = {"category": "event","recv":{"$lte": "2019-01-15 00:00:00Z+8"}};
	dbEvent.find(json, false, 0, 500, "desc").then(function(list) {
		removeEvent(list);
	}, function(reason) {
		// on rejection(已拒絕時)
		console.log(reason);
	});
}

function removeEvent(list) {
	list.forEach(function(obj){
		setTimeout(function() {
			dbEvent.remove(obj).then(function(result) {
				//console.log("OK");
			}, function(reason) {
				// on rejection(已拒絕時)
				//console.log(reason);
			});
		}, 1000);

	});
	console.log("**************************Finuish");
}

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
	console.log(new Date() + ' ***** MQTT connect topic :' + config.mytopic);
    client.subscribe(config.mytopic);
});

client.on('message', function(topic, msg) {
	// console.log(new Date() + ' ****** topic:'+topic);
	let obj = (JSON.parse(msg.toString()))[0];
	let message = "mac :" + obj.macAddr + ", time : " + obj.time + ", gwid : " + obj.gwid;
	message = message + ", frameCnt : " + obj.frameCnt + ", fport : " + obj.fport;
	//console.log('message: ' + message );
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
			} else if(command == 131 && code == 22) {
				let mac = obj.macAddr;
				let number = buff[1];
				let status = buff[5];
				sendWSMessage2(mac, number, status);
			}
		}
		return false;
	}
}

function sendWSMessage(mac,number, command) {
	var message = {mac: mac, number: number, command: command};
	socket.emit('reply_command_status', message);
}

function sendWSMessage2(mac,number, status) {
	var message = {mac: mac, number: number, status: status};
	socket.emit('reply_pin_status', message);
}