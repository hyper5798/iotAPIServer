var express = require('express');
var router = express.Router();
var async = require('async');
var config = require('../config');
var mqttClient = require('../modules/mqttClient.js');
var util = require('../modules/util.js');
//Mysql database API
var io = require('socket.io-client');
var socket = io.connect('http://localhost:8000', { reconnect: true });
var cmdStatus = {};

socket.on('connect', function () {
	socket.emit('mqtt_sub', '**** mqtt_client socket cient is ready');
});

socket.on('update_command_status', function (data) {
	console.log("update_command_status :" + JSON.stringify(data));
	var obj = cmdStatus[data.mac];
	if (obj.number == data.number) {
		if ((obj.command == "up" || obj.command == "stop" || obj.command == "down") && (data.command == 129)) {
			obj.status = true;
		}
	}
});

socket.on('update_pin_status', function (data) {
	console.log("update_pin_status :" + JSON.stringify(data));
	if (cmdStatus[data.mac] == undefined) {
		cmdStatus[data.mac] = {};
	}
	if (cmdStatus[data.mac]['pin'] == undefined) {
		cmdStatus[data.mac]['pin'] = {};
	}
	cmdStatus[data.mac]['pin'] = data.status;
});

module.exports = (function () {
	//Pagination settings
	var paginate = config.paginate;
	var page_limit = config.page_limit;

	//Send mqtt control message
	router.post('/mqtt', function (req, res) {

		var message = req.body.message;
		var token = req.body.token;
		if (message === undefined) {
			res.send({
				"responseCode": '999',
				"responseMsg": 'Missing parameter'
			});
			return false;
		}
		var topic = 'GIOT-GW/DL/0001C497BC0C094';
		if (req.body.topic) {
			topic = req.body.topic;
		}
		util.checkAndParseToken(token, res, function (err, result) {
			if (err) {
				res.send({
					"responseCode": '999',
					"responseMsg": err
				});
				return false;
			} else {
				//Token is ok
				console.log('post /control : user token vrerify is OK');
				mqttClient.sendMessage(topic, message);
				res.send({
					"responseCode": '000',
					"responseMsg": 'send message ok'
				});
			}
		});
	});

	router.post('/motor', function (req, res) {
		var checkArr = ['gwid', 'mac', 'command', 'number'];
		var actInfo = util.checkFormData(req, checkArr);
		if (actInfo === null) {
			res.send({
				"responseCode": '999',
				"responseMsg": 'Missing parameter'
			});
			return;
		}

		if (actInfo.number === undefined) {
			actInfo.number = 0;
		} else {
			actInfo.number = parseInt(actInfo.number, 16);
		}

		var token = req.body.token;
		var tmp = { "macAddr": "0000000005010bfb", "data": "AA010102020102088E", "id": "1111111111", "extra": { "port": 1, "txpara": "22" } };
		tmp.macAddr = actInfo.mac;
		tmp.data = getData(actInfo.command, actInfo.number);
		if (tmp.data === null) {
			res.send({
				"responseCode": '999',
				"responseMsg": 'The command is incorrect'
			});
			return;
		}
		actInfo.status = false;
		cmdStatus[actInfo.mac] = actInfo;
		var topic = 'GIOT-GW/DL/' + actInfo.gwid;
		var message = JSON.stringify([tmp]);

		util.checkAndParseToken(token, res, function (err, result) {
			if (err) {
				res.send({
					"responseCode": '999',
					"responseMsg": err
				});
				return;
			} else {
				//Token is ok
				console.log('post /control : user token vrerify is OK');
				mqttClient.sendMessage(topic, message);
				res.send({
					"responseCode": '000',
					"responseMsg": 'send message ok'
				});
			}
		});
	});

	router.post('/command_status', function (req, res) {
		var checkArr = ['gwid', 'mac', 'command', 'number'];
		var actInfo = util.checkFormData(req, checkArr);
		if (actInfo === null) {
			res.send({
				"responseCode": '999',
				"responseMsg": 'Missing parameter'
			});
			return;
		}
		if (actInfo.number === undefined) {
			actInfo.number = 0;
		} else {
			actInfo.number = parseInt(actInfo.number, 16);
		}

		var obj = cmdStatus[actInfo.mac];
		if (obj === undefined) {
			res.send({
				"responseCode": '998',
				"responseMsg": 'The command not set'
			});
		}
		if (obj.command !== actInfo.command) {
			res.send({
				"responseCode": '997',
				"responseMsg": 'The command is incorrect'
			});
			return;
		}
		if (obj.number !== actInfo.number) {
			res.send({
				"responseCode": '996',
				"responseMsg": 'The number is incorrect'
			});
			return;
		}

		var token = req.body.token;

		util.checkAndParseToken(token, res, function (err, result) {
			if (err) {
				res.send({
					"responseCode": '999',
					"responseMsg": err
				});
				return false;
			} else {
				//Token is ok
				console.log('post /control : user token vrerify is OK');
				if (obj.status) {
					res.send({
						"responseCode": '000',
						"responseMsg": 'command status ok'
					});
				} else {
					res.send({
						"responseCode": '995',
						"responseMsg": 'Controller did not respond'
					});
				}
			}
		});
	});

	router.post('/pin_output', function (req, res) {
		var checkArr = ["gwid", "mac", "number", "pin", "command"];
		var actInfo = util.checkFormData(req, checkArr);
		if (actInfo === null) {
			res.send({
				"responseCode": '999',
				"responseMsg": 'Missing parameter'
			});
			return;
		}
		if (actInfo.number === undefined) {
			actInfo.number = 0;
		} else {
			actInfo.number = parseInt(actInfo.number, 16);
		}
		var token = req.body.token;
		var tmp = { "macAddr": "", "data": "", "id": "1111111111", "extra": { "port": 1, "txpara": "22" } };
		tmp.macAddr = actInfo.mac;
		tmp.data = getPinData(actInfo);

		var topic = 'GIOT-GW/DL/' + actInfo.gwid;
		var message = JSON.stringify([tmp]);
		actInfo.status = false;
		actInfo.pin = actInfo.pin + "";
		if (cmdStatus[actInfo.mac] == undefined) {
			cmdStatus[actInfo.mac] = {};
		}
		if (cmdStatus[actInfo.mac]['pin'] == undefined) {
			cmdStatus[actInfo.mac]['pin'] = {};
		}
		cmdStatus[actInfo.mac]['pin'][actInfo.pin] = actInfo;

		util.checkAndParseToken(token, res, function (err, result) {
			if (err) {
				res.send({
					"responseCode": '999',
					"responseMsg": err
				});
				return;
			} else {
				//Token is ok
				console.log('post /control/v1/pin_output : user token vrerify is OK');
				mqttClient.sendMessage(topic, message);
				res.send({
					"responseCode": '000',
					"responseMsg": 'send message ok'
				});
			}
		});
	});

	router.post('/pin_sync', function (req, res) {
		//test 
		var checkArr = ["gwid", "mac", "number"];
		var actInfo = util.checkFormData(req, checkArr);
		if (actInfo === null) {
			res.send({
				"responseCode": '999',
				"responseMsg": 'Missing parameter'
			});
			return;
		}
		if (actInfo.number === undefined) {
			actInfo.number = 0;
		} else {
			actInfo.number = parseInt(actInfo.number, 16);
		}
		if (cmdStatus[actInfo.mac] == undefined) {
			cmdStatus[actInfo.mac] = {};
		}
		if (cmdStatus[actInfo.mac]['pin'] != undefined) {
			delete cmdStatus[actInfo.mac]['pin'];
		}
		var token = req.body.token;
		var tmp = {"macAddr": "000000001401663e", "data": "AA000316198E", "id": "1111111111", "extra": { "port": 1, "txpara": "22" }};
		tmp.macAddr = actInfo.mac;
		tmp.data = getPinSyncData(actInfo);
		if (tmp.data === null) {
			res.send({
				"responseCode": '999',
				"responseMsg": 'The command is incorrect'
			});
			return;
		}
		var topic = 'GIOT-GW/DL/' + actInfo.gwid;
		var message = JSON.stringify([tmp]);

		util.checkAndParseToken(token, res, function (err, result) {
			if (err) {
				res.send({
					"responseCode": '999',
					"responseMsg": err
				});
				return;
			} else {
				console.log('post /control/v1/pin_sync : user token vrerify is OK');
				mqttClient.sendMessage(topic, message);
				res.send({
					"responseCode": '000',
					"responseMsg": 'send message ok'
				});
			}
		});
	});

	router.post('/pin_status', function (req, res) {
		var checkArr = ["mac"];
		var actInfo = util.checkFormData(req, checkArr);
		if (actInfo === null) {
			res.send({
				"responseCode": '999',
				"responseMsg": 'Missing parameter'
			});
			return;
		}
		if (actInfo.number === undefined) {
			actInfo.number = 0;
		} else {
			actInfo.number = parseInt(actInfo.number, 16);
		}
		var token = req.body.token;


		if (cmdStatus[actInfo.mac] == undefined || cmdStatus[actInfo.mac]['pin'] == undefined) {
			let err = "No " + actInfo.mac + " pin status, please make pin_sync";
			res.send({
				"responseCode": '999',
				"responseMsg": 'No pin status, please make pin synchronization'
			});
			return;
		}
		let data = cmdStatus[actInfo.mac]['pin'];

		util.checkAndParseToken(token, res, function (err, result) {
			if (err) {
				res.send({
					"responseCode": '999',
					"responseMsg": err
				});
				return;
			} else {
				console.log('post /control/v1/pin_status : user token vrerify is OK');
				res.send({
					"responseCode": '000',
					"responseMsg": 'get pin status ok',
					data: data
				});
			}
		});
	});

	return router;

})();

function getData(flag, serialNum) {
	let a0 = 0xAA; // Header
	let a1 = serialNum; // Serial number
	let a2 = 0x01;//Command
	let a3 = 0x02;//Code
	let a4 = 0x02;//PL
	let a5 = 0x01;//Praraeter 1 : 控制捲揚機
	let a6;//Praraeter 2
	if (flag === "stop") {
		a6 = 0x00;//Praraeter 1 : 捲揚停
	} else if (flag === "down") {
		a6 = 0x01;//Praraeter 1 : 捲揚降
	} else if (flag === "up") {
		a6 = 0x02;//Praraeter 1 : 捲揚升
	} else {
		return null;
	}

	let a7 = a2 + a3 + a4 + a5 + a6; //Checksum
	let a8 = 0x8E;//End
	let test = toStr(a0) + toStr(a1) + toStr(a2) + toStr(a3) + toStr(a4) + toStr(a5);
	test = test + toStr(a6) + toStr(a7) + toStr(a8);
	return test;
}

function getPinData(info) {
	let a0 = 0xAA; // Header
	let a1 = info.number; // Serial number
	let a2 = 0x01;//Command
	let a3 = 0x03;//Code
	let a4 = 0x02;//PL
	let a5 = info.pin;//Praraeter 1 : pin
	if (info.command === "low") {
		a6 = 0x00;//Praraeter 2 : pin low
	} else if (info.command === "high") {
		a6 = 0x01;//Praraeter 2 : pin high
	}
	let a7 = a2 + a3 + a4 + a5 + a6; //Checksum
	let a8 = 0x8E;//End
	let test = toStr(a0) + toStr(a1) + toStr(a2) + toStr(a3) + toStr(a4) + toStr(a5);
	test = test + toStr(a6) + toStr(a7) + toStr(a8);
	return test;
}

function getPinSyncData(info) {
	let a0 = 0xAA; // Header
	let a1 = info.number; // Serial number
	let a2 = 0x03;//Command
	let a3 = 0x16;//Code
	let a4 = a2 + a3; //Checksum
	let a5 = 0x8E;//End
	let test = toStr(a0) + toStr(a1) + toStr(a2) + toStr(a3) + toStr(a4) + toStr(a5);
	return test;
}

function toStr(value) {
	let str = '';
	if (value < 0x10) {
		str = '0' + value.toString(16);
	} else {
		str = value.toString(16);
	}
	return str.toUpperCase();
}