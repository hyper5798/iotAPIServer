var express = require('express');
var router = express.Router();
var async  = require('async');
var config = require('../config');
var mqttClient = require('../modules/mqttClient.js');
var util = require('../modules/util.js');
//Mysql database API
var io = require('socket.io-client');
var socket = io.connect('http://localhost:8000', {reconnect: true});
var cmdStatus = {};

socket.on('connect',function(){
	socket.emit('mqtt_sub','**** mqtt_client socket cient is ready');
});

socket.on('update_command_status', function (data) {
	console.log("@@@@ mqttClient :"+JSON.stringify(data)); 
	var obj = cmdStatus[data.mac];
	if(obj.number == data.number) {
		if( (obj.command == "up" || obj.command == "stop" || obj.command == "down") && (data.command == 129) )  {
			//obj.status = true;
		}
	}
});

module.exports = (function() {
	//Pagination settings
	var paginate = config.paginate;
	var page_limit = config.page_limit;

    //Send mqtt control message
	router.post('/mqtt', function(req, res) {
		
        var message = req.body.message;
        var token = req.body.token;
        if (message === undefined) {
			res.send({
				"responseCode" : '999',
				"responseMsg" : 'Missing parameter'
			});
			return false;
        }
        var topic = 'GIOT-GW/DL/0001C497BC0C094';
        if (req.body.topic) {
            topic = req.body.topic;
        }
        util.checkAndParseToken(token, res, function(err,result){
			if (err) {
				res.send({
					"responseCode" : '999',
					"responseMsg" : err
				});
				return false;
			} else { 
				//Token is ok
                console.log('post /control : user token vrerify is OK');
				mqttClient.sendMessage(topic,message);	
				res.send({
					"responseCode" : '000',
					"responseMsg" : 'send message ok'
				});	  
			}
		});
	});
	
	router.post('/motor', function(req, res) {
		var checkArr = ['gwid','mac', 'command', 'number'];
        var actInfo = util.checkFormData(req, checkArr);
        if (actInfo === null) {
            res.send({
				"responseCode" : '999',
				"responseMsg" : 'Missing parameter'
			});
			return;
        }
		
		if(actInfo.number === undefined) {
			actInfo.number = 0;
		} else {
			actInfo.number = parseInt(actInfo.number, 16);
		}
		
		var token = req.body.token;
		var tmp = {"macAddr":"0000000005010bfb","data":"AA010102020102088E","id":"1111111111","extra":{"port":1,"txpara":"22"}};
		tmp.macAddr = actInfo.mac;
		tmp.data = getData(actInfo.command, actInfo.number);
		if(tmp.data === null) {
			res.send({
				"responseCode" : '999',
				"responseMsg" : 'The command is incorrect'
			});
			return;
		}
		actInfo.status = false;
		cmdStatus[actInfo.mac] = actInfo;
        var topic = 'GIOT-GW/DL/'+ actInfo.gwid;
		var message = JSON.stringify([tmp]);
		
        util.checkAndParseToken(token, res, function(err,result){
			if (err) {
				res.send({
					"responseCode" : '999',
					"responseMsg" : err
				});
				return;
			} else { 
				//Token is ok
                console.log('post /control : user token vrerify is OK');
				mqttClient.sendMessage(topic,message);	
				res.send({
					"responseCode" : '000',
					"responseMsg" : 'send message ok'
				});	  
			}
		});
	});
	
	router.post('/command_status', function(req, res) {
		var checkArr = ['gwid','mac', 'command', 'number'];
        var actInfo = util.checkFormData(req, checkArr);
        if (actInfo === null) {
            res.send({
				"responseCode" : '999',
				"responseMsg" : 'Missing parameter'
			});
			return;
        }
		if(actInfo.number === undefined) {
			actInfo.number = 0;
		} else {
			actInfo.number = parseInt(actInfo.number, 16);
		}
		
		var obj = cmdStatus[actInfo.mac];
		if (obj === undefined) {
            res.send({
				"responseCode" : '998',
				"responseMsg" : 'The command not set'
			}); 
        }
		if(obj.command !== actInfo.command ) {
			res.send({
				"responseCode" : '997',
				"responseMsg" : 'The command is incorrect'
			});
			return;
		}
		if(obj.number !== actInfo.number ) {
			res.send({
				"responseCode" : '996',
				"responseMsg" : 'The number is incorrect'
			});
			return;
		}
		
		var token = req.body.token;
		
        util.checkAndParseToken(token, res, function(err,result){
			if (err) {
				res.send({
					"responseCode" : '999',
					"responseMsg" : err
				});
				return false;
			} else { 
				//Token is ok
                console.log('post /control : user token vrerify is OK');
				if(obj.status) 
				{
					res.send({
						"responseCode" : '000',
						"responseMsg" : 'command status ok'
					});	
				} else {
					res.send({
						"responseCode" : '001',
						"responseMsg" : 'Controller did not respond'
					});
				}
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
    if(flag === "stop") {
        a6 = 0x00;//Praraeter 1 : 捲揚停
    } else if(flag === "down") {
        a6 = 0x01;//Praraeter 1 : 捲揚降
    } else if(flag === "up") {
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

function toStr(value) {
    let str = '';
    if (value < 0x10) {
        str = '0' + value.toString(16);
    } else {
        str = value.toString(16);
    }
    return str.toUpperCase();
}