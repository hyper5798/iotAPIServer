var moment = require('moment-timezone');
var config = require('../config');
var debug = true;
var CryptoJS = require("crypto-js");
var async  = require('async');
var config = require('../config');
var mysqlTool = require('./mysqlTool.js');
var debug = isDebug();
var axios = require('axios');

var JsonFileTools = require('../modules/jsonFileTools.js');
var linebot = require('linebot');
var userPath = './public/data/friend.json';
var adminPath = './public/data/admin.json';
var mapPath = './public/data/map.json';
//Jason modify on 2018.05.06 for switch local and cloud db -- start
var dbMap = null;
var dbEvent = null;
var dbLog = null;
if (config.isCloudantDb) {
    dbMap = require('./cloudant/cloudantMap.js');
    dbEvent = require('./cloudant/cloudantEvent.js');
    dbLog = require('./cloudant/cloudantLog.js');
} else {
    dbMap = require('./mongo/mongoMap.js');
    dbEvent = require('./mongo/mongoDevice.js');
    dbLog = require('../modules/mongo/mongoLog.js');
}
//Jason modify on 2018.05.06 for switch local and cloud db -- end

var checkEvent = {};
var checkMap= {};
var checkToken = {};
init();

module.exports = {
    init,
    decode,
    encode,
    genToken,
    getUserTokenArr,
    checkDevice,
    parseMsgd,
    createMap,
    checkAndParseDeviceToken,
    checkAndParseToken,
    checkFormData,
    isDebug,
    isAuth,
    addJSON,
    getCurrentTime,
    httpGet,
    encodeBase64,
    decodeBase64,
    DateTimezone,
    getISODate,
    getMacString,
    addLog,
    sendAdminLineMessage,
    getType,
    getCurrentUTCDate
}

function init() {
    dbMap.find({}).then(function(docs) {
        if(docs) {
            for(let i=0; i<docs.length;++i){
                let map = docs[i];
                checkMap[map.deviceType] = map;
            }
            JsonFileTools.saveJsonToFile(mapPath, checkMap);
        }
        
    }, function(reason) {
        console.log(getCurrentTime() + ' init err : ' + reason);
    });
}

function httpGet(url, username, password) {
    const tok = username + ':' + password;
    const hash = encodeBase64(tok);
    const Basic = 'Basic ' + hash;
    axios.get(url, {headers : { 'Authorization' : Basic }})
    .then(response => {
        console.log(response.data.url);
        console.log(response.data.explanation);
        return response.data;
    })
    .catch(error => {
        console.log(error);
        return error;
    });
}

function isAuth () {
    return config.auth;
}

function isDebug () {
    return config.debug;
}

function encodeBase64 (codeStr) {
    return Buffer.from(codeStr).toString('base64');
}

function decodeBase64 (encodeStr) {
    return Buffer.from(encodeStr, 'base64').toString('ascii');
}

function decode (dataEncrypt, key) {
    try {				
        var encrypted  = CryptoJS.TripleDES.decrypt(dataEncrypt, key);
        return  encrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
        return null;
    }
} 

function encode (dataStr, key) {
    try {
        // create a 64-bit zero filled
        var iv = CryptoJS.lib.WordArray.create(64/8);
        var ciphertext = CryptoJS.TripleDES.encrypt(dataStr, key, {iv: iv});
        var encryptedBase64 = ciphertext.toString();
        return encryptedBase64;
    } catch (error) {
        return null;
    }
} 

function genToken(userInfo, dbUser, grps, callback) {
    let grpStr = '';
    let d = new Date();
    let nowSeconds = Math.round(d.getTime() / 1000);
    if(grps && grps.length > 0){
        for (let i = 0 ; i < grps.length ; i++) {
            grpStr += grps[i].grpId;
            if ( i < grps.length - 1)
                grpStr += ',';
        }
    }
    var payload = grpStr+':'+nowSeconds+":"+dbUser.userId+":"+dbUser.cpId+":"+dbUser.roleId+":"+dbUser.dataset;
    var token = encode (payload, config.tokenKey);
    return callback(token);
    /* try {
        // create a 64-bit zero filled
        var iv = CryptoJS.lib.WordArray.create(64/8);
        
        var ciphertext = CryptoJS.TripleDES.encrypt(payload, config.tokenKey, {iv: iv});
        var encryptedBase64 = ciphertext.toString();
        return callback(null, encryptedBase64);
    } catch (error) {
        return callback(error);
    } */
}

function getUserTokenArr (token) {
    var tokenStr = decode(token, config.tokenKey);
    var tArr = tokenStr.split(':');
    return tArr;
}

function getDeviceTokenArr (token) {
    var tokenStr = decode(token, config.tokenKey);
    var tArr = tokenStr.split(':');
    return tArr;
}
  
function checkDevice(mac, callback) {
    var datas = db.getDevices(mac, function(err, devices){
        if (err) {
          // console.log('getDevices fail : ' + err);
          return callback(err);
        }
        // console.log('getDevices success : \n' + JSON.stringify(devices));
        return (null,devices);
    })
}

function parseMsgd(message, callback) {
    var obj = null;
    try {
        if (getType(message) === 'string') {
            var mesObj = JSON.parse(message);
            if (getType(mesObj) === 'array') {
                obj = mesObj[0];
            } else if (getType(mesObj) === 'object') {
                obj = mesObj;
            }
        } else if (getType(message) === 'array'){
            obj = message[0];
        } else if (getType(mesObj) === 'object') {
            obj = message;
        }
        var fport = obj.fport.toString();
        //Get data attributes
        var mData = obj.data;
        var mMac  = obj.macAddr;
        if (checkEvent[mMac] === undefined) {
            checkEvent[mMac] = obj;
        } else if (isRepeatEvent(checkEvent[mMac], obj)) {
            // It's repeat event 
            console.log('Repeat event drop!!!');
            return;
        }
       
        /*var mRecv = obj.time;
        var recvDate = getMyDate(mRecv);
        var timestamp = recvDate.getTime();
        var tMoment = (moment.unix(timestamp/1000)).tz(config.timezone);
        var mDate = tMoment.format('YYYY-MM-DD HH:mm:ss');*/
        var mRecv;
        if(obj.time) {
            mRecv = obj.time;
        } else {
            mRecv = getCurrentUTCDate();
        }
        var utcMoment = moment.utc(mRecv);
        var timestamp = utcMoment.valueOf();
        var tMoment = (moment.unix(timestamp/1000)).tz(config.timezone);
        var mDate = tMoment.format('YYYY-MM-DD HH:mm:ss');
        // var mRecv = obj.time;
        // var mRecv = new Date( utcMoment.format("YYYY-MM-DDTHH:mm:ss") );
        
    
        console.log('mRecv : '+  mRecv);
        console.log('mDate : '+ mDate);
        var mExtra;
        if(obj.time) {
            mExtra = {'gwip': obj.gwip,
                  'gwid': obj.gwid,
                  'rssi': obj.rssi,
                  'snr' : obj.snr,
                  'fport': obj.fport,
                  'frameCnt': obj.frameCnt,
                  'channel': obj.channel};
        } else {
            mExtra = {
                  'fport': obj.fport,
                  'frameCnt': obj.frameCnt};
        }
    } catch (error) {
        return callback({"error": "message is unable paser"});
    }

    //Parse data
    if(mExtra.fport){
        var mType = mExtra.fport.toString();
        let map = checkMap[mType];
        // dbMap.findLast({'deviceType': mType}).then(function(doc) {
            // console.log('docs : ' + typeof doc);
            if(map) {
                var mInfo = getTypeData(mData,map);
                if (debug) {
                    console.log(getCurrentTime() + 'Information : ' + JSON.stringify(mInfo));
                }
                
                if(mInfo){
                    var msg = {macAddr: mMac, data: mData, timestamp: timestamp, recv: mRecv, date: mDate, extra: mExtra};
                    console.log('**** '+msg.date +' mac:'+msg.macAddr+' => data:'+msg.data+'\nfport:'+mExtra.fport+' info:'+JSON.stringify(mInfo));
                    msg.information=mInfo;
                    
                    if (debug) {
                        console.log(getCurrentTime() + ' parseMsgd message : ' + JSON.stringify(msg));
                    }
                    // sendLineMessage(mDate + ' newmessage');
                    /*if (doc.profile) {
                        toCheckNotify(mInfo, doc.profile, mMac);
                    }*/
                    dbEvent.create(msg).then(function(doc) {
                        console.log(getCurrentTime() + ' save event success');
                    }, function(reason) {
                        console.log(getCurrentTime() + ' save event err : ' + reason);
                    });
                    return callback(null, msg);
                } else {
                    if (debug) {
                        console.log(new Date() + 'parseMsgd info is not exist');
                    }
                    return callback({"error": "Information is not exist"});
                }
            } else {
                if (debug) {
                    console.log(new Date() + 'No map for type '+ mType);
                }
                return callback({"error" : "No map of type " + mType});
            }
            
    /*    }, function(reason) {
            if (debug) {
                console.log(new Date() + 'parseMsgd findLast err : ' + reason);
            }
            return callback({"error": reason});
        });*/
    } else {
        if (debug) {
            console.log(new Date() + 'parseMsgd fport is not exist');
        }
        return callback({"error": "fport is not exist"});
    }
}

function createMap () {
    var myobj = {
        type        : '17',
        typeName    : '土壤溫濕酸鹼電導感測',
        fieldName   :  {
                            "temperature": "溫度",
                            "ph": "酸鹼度",
                            "water": "水含量",
                            "ec": "電導度"
                        },
        map         :   { 
                            "ph": [4, 8, 11],
                            "water": [14, 18, 100],
                            "temperature": [ 18, 22, 100],
                            "ec": [22, 26, 1000]
                        },
        createUser  : 'Jason'
    };
    dbMap.create(myobj).then(function(docs) {
        console.log('docs : ' + JSON.stringify(docs));
    }, function(reason) {
        console.log('err : ' + reason);
    });
}

function getTypeData(data,mapObj) {
    if (mapObj === undefined|| mapObj === null) {
        return null;
    }
    try {
        var obj = mapObj.map;
        var info = {};
        var keys = Object.keys(obj);
        var count = keys.length;
        for(var i =0;i<count;i++){
            //console.log( keys[i]+' : '+ obj[keys[i]]);
            let parseData =  getIntData(obj[keys[i]],data);
            info[keys[i]] = parseData.toFixed(2);
            // console.log(keys[i] + ' : ' + info[keys[i]]);
        }
        return info;
    } catch (error) {
        return null;
    }
}

function getIntData(arrRange,initData){
    var ret = {};
    var start = arrRange[0];
    var end = arrRange[1];
    var diff = arrRange[2];
    var data = parseInt(initData.substring(start,end),16);
    // example : 
    // diff = "data/100"
    // data = 2000
    // eval(diff) = 2000/100 = 20
    
    return eval(diff);
}

function convertTime(dateStr){
    //method 1 - use convert function
    //var d = new Date();
    var d = new Date(dateStr);
    var d_ts = d.getTime(); //Date.parse('2017-09-12 00:00:00'); //get time stamp
    // console.log("showSize :"+ d);
    // console.log("showPos d_ts : " + d_ts);
    return d_ts;
}

function getType(p) {
    if (Array.isArray(p)) return 'array';
    else if (typeof p == 'string') return 'string';
    else if (p != null && typeof p == 'object') return 'object';
    else return 'other';
}

function saveMsgToDB (msg) {
    mongoDevice.create(msg).then(function(docs) {
        console.log('saveMsgToDB docs : ' + JSON.stringify(docs));
    }, function(reason) {
        console.log('saveMsgToDB err : ' + reason);
    });
}

function checkAndParseDeviceToken (token, res, callback) {
	if (!token) {
        res.send({
            "responseCode" : '999',
            "responseMsg" : 'Missing parameter'
        });
        return callback(true);
	} else if (token.length < 1){
        res.send({
            "responseCode" : '999',
            "responseMsg" : 'token length error'
        });
		return callback(true);
	}
		
	// Decrypt 
	console.log('token :\n' + token);
    var ar = getDeviceTokenArr(token);
    if (ar.length !== 5) {
        res.send({
            "responseCode" : '999',
            "responseMsg" : 'Token error'
        });
        return callback(true);
	}
    var ts = ar[1];
    var actInfo = {};
    actInfo['mac'] = ar[0];
    actInfo['ts'] = ar[1];
    actInfo['deviceId'] = ar[2];
    actInfo['grpId'] = ar[3];
    actInfo['roleId'] = ar[4];
    mysqlTool.getProperties('CERT_EXPIRE', function(err, result){
        if(err) {
            res.send({
                "responseCode" : '404',
                "responseMsg" : err
            });
            return callback(true);
        }
        if(result.length <= 0) {
            res.send({
                "responseCode" : '404',
                "responseMsg" : 'No properties data'
            });
            return callback(true);
        }
        try {
            var period = Number(result[0].p_value);
            let d = new Date();
            let nowSeconds = Math.round(d.getTime() / 1000);
            let loginSeconds = parseInt(actInfo.ts);
            let subVal = nowSeconds - loginSeconds;
            if( subVal > period || subVal < 0 ){
                res.send({
                    "responseCode" : '404',
                    "responseMsg" : 'Token expired'
                });
            }
            return callback(null, actInfo);
        } catch (error) {
            res.send({
                "responseCode" : '404',
                "responseMsg" : error
            });
            return callback(true);
        }
    });
}

function checkAndParseToken (token, res, callback) {
	if (!token) {
        res.send({
            "responseCode" : '999',
            "responseMsg" : 'Missing token'
        });
        return callback(true);
	} else if (token.length < 1){
        res.send({
            "responseCode" : '999',
            "responseMsg" : 'token length error'
        });
		return callback(true);
	}
		
	// Decrypt 
    console.log('token :\n' + token);
    try {
        var tArr = getUserTokenArr(token);
    } catch (error) {
        res.send({
            "responseCode" : '999',
            "responseMsg" : 'token parse error' + error.message
        })
    }
    if (tArr.length < 5) {
        res.send({
            "responseCode" : '999',
            "responseMsg" : 'token parse error'
        })
    }
    
    var ts = tArr[1];
    var actInfo = {};
    actInfo['grp'] = tArr[0];
    actInfo['ts'] = Number(tArr[1]);
    actInfo['userId'] = Number(tArr[2]);
    actInfo['cpId'] = Number(tArr[3]);
    actInfo['roleId'] = Number(tArr[4]);
    actInfo['dataset'] = Number(tArr[5]);
    var d = new Date()
    var nowSeconds = Math.round(d.getTime() / 1000)
    var loginSeconds = parseInt(ts)
    let subVal = nowSeconds - loginSeconds;
    if(checkToken[tArr[2]]) {
        let tokenData = checkToken[tArr[2]];
        if(tokenData.token == token) {
            if( subVal > tokenData.period || subVal < 0 ){
                res.send({
                    "responseCode" : '404',
                    "responseMsg" : 'Token expired'
                });
                delete checkToken[tArr[2]];
                return callback(true);
            } else {
                return callback(null, tokenData.data);
            }
        }
    } 
    
	async.waterfall([
		function(next){
			mysqlTool.getHistory(token, function(err1, result1){
                if(result1.length <= 0) {
                    res.send({
                        "responseCode" : '404',
                        "responseMsg" : 'User already logout'
                    });
                    return callback(true);
                }
                next(err1, result1);
			});
		},
		function(rst1, next){
			mysqlTool.getProperties('TOKEN_EXPIRE', function(err2, result2){
                next(err2, [rst1, result2[0]]);
			});
		}
	], function(errs, results){
		if(errs) {
            res.send({
                "responseCode" : '404',
                "responseMsg" : 'Query token data fail'
            });
            return callback(true);
        }
        
        //Get properties check
        if (results[1].length < 1) {
            res.send({
                "responseCode" : '404',
                "responseMsg" : 'No properties data'
            });
            return callback(true);
        }
        try {
            var period = Number(results[1].p_value);      
            if( subVal > period || subVal < 0 ){
                res.send({
                    "responseCode" : '404',
                    "responseMsg" : 'Token expired'
                });
                return callback(true);
            }else{
                let grpStr = actInfo.grp
                let ar = grpStr.split(',')
                let accessFlg = false
                let OAFlg = false
                for(let i = 0 ; i < ar.length ; i++){
                    //For admin (group)
                    if(ar[i] === '22'|| ar[i] === '30'){
                        accessFlg = true
                    }
                    if(ar[i] === '8'){
                        OAFlg = true
                    }
                }
                //Jason add for agri information
                if(config.isAgri) {
                    accessFlg = true
                }
                if (accessFlg) {
                    var data = {
                        "OAFlg" : OAFlg,
                        "userInfo" : actInfo
                    };
                    checkToken[tArr[2]] = {token: token, data: data, period: period};
                    return callback(null, data);
                } else {
                    res.send({
                        "responseCode" : '401',
                        "responseMsg" : 'no permission to access'
                    });
                    return callback(true);
                }
            }
        } catch (error) {
            res.send({
                "responseCode" : '404',
                "responseMsg" : error.message
            });
            return callback(true);
        }
	});
}

function checkFormData (req, checkArr) {
    try {
        var keys = '';
        var values = '';
        var keys = Object.keys(req.body);
        /* if (keys.length < checkArr.length) {
            return null;
        } */
        var count = 0;
        var json = {};
        keys.forEach(function(key,index) {
            // console.log('index : ' + index + ', key : ' + key );
            if(checkArr.indexOf(key) !== -1) {
                json[key] = req.body[key];
                count ++;
            }
        });
        //Not include token key
        if (count !== (checkArr.length)) {
            return null;
        } else {
            delete json.token;
            return json;
        }
    } catch (error) {
        return 'Parameter format error';
    }
}

function addJSON(obj1, obj2) {
    let keys = Object.keys(obj2);
    for (let i=0;i<keys.length; i++) {
        obj1[keys[i]] = obj2[keys[i]];
    }
    return obj1;
}

function getCurrentTime() {
    var utcMoment = moment.utc();
    var timestamp = utcMoment.valueOf();
    var tMoment = (moment.unix(timestamp/1000)).tz(config.timezone);
    var time = tMoment.format('YYYY-MM-DD HH:mm:ss');
    return time;
}

function getCurrentUTCDate() {
    // var utcMoment = moment.utc();
    // return new Date( utcMoment.format("YYYY-MM-DDTHH:mm:ss") );
    var utcMoment = moment.utc();
    return utcMoment.format('YYYY-MM-DDTHH:mm:ss'); 
}

//var utcMoment = moment.utc(obj.time);
//var timestamp = utcMoment.valueOf();
//var tMoment = (moment.unix(timestamp/1000)).tz(config.timezone);
//var mDate = tMoment.format('YYYY-MM-DD HH:mm:ss');

function DateTimezone(offset) {

    // 建立現在時間的物件
    var d = new Date();
    
    // 取得 UTC time
    var utc = d.getTime() + (d.getTimezoneOffset() * 60000);

    // 新增不同時區的日期資料
    return new Date(utc + (3600000*offset));

}

function getISODate(dateStr) {
    var utcMoment = moment.utc(dateStr);
    return new Date( utcMoment.format("YYYY-MM-DDTHH:mm:ss") );
}

function getMacString(mac) {
    if(mac.length === 8) {
        mac = '00000000' + mac;
    }
    return mac.toLowerCase();
}

function addLog (json) {
    if (!config.isAddLog) {
        //Bypass add log
        return;
    }
    if(json.recv === undefined || json.recv === null) {
        json.recv = getCurrentUTCDate();
    }
    if(json.date === undefined || json.date=== null) {
        json.date = getCurrentTime();
    }
    if(json.remark === undefined || json.remark === null) {
        json.remark= '';
    }

    if (json.createUser === undefined && json.userId) {
        var sqlStr = 'select * from api_user where userId=' + json.userId;
        mysqlTool.query(sqlStr, function(err, result){
            json.createUser = result[0].userName;
            dbLog.saveLog(json, function(err, result){
                if (err) {
                    console.log(getCurrentTime() + ' log ' + json.subject + ' fail ' + err);
                    return;
                }
                console.log(getCurrentTime() + ' log ' + json.subject + ' success');
            });
        });
    } else {
        dbLog.saveLog(json, function(err, result){
            if (err) {
                console.log(getCurrentTime() + ' log ' + json.subject + ' fail ' + err);
                return;
            }
            console.log(getCurrentTime() + ' log ' + json.subject + ' success');
        });
    }
}

function sendLineMessage (msg) {
    var bot = linebot({
        channelId: config.channelId,
        channelSecret: config.channelSecret,
        channelAccessToken: config.channelAccessToken
    });
    var user = JsonFileTools.getJsonFromFile(userPath);
    if (user.friend.length > 0) {
        bot.multicast(user.friend, msg).then(function (data) {
            // success 
            console.log('push line :' + JSON.stringify(data));
        }).catch(function (error) {
            // error 
            console.log('push line error :' + error);
        });
    }
}

function getUTCDate () {
    var utcMoment = moment.utc();
    return new Date( utcMoment.format("YYYY-MM-DDTHH:mm:ss") );
 }

function getMyDate (dateStr) {
    var myMoment = moment(dateStr, "YYYY-MM-DDTHH:mm:ss");
    var utcMoment = myMoment.utc(dateStr);
    return new Date( utcMoment.format("YYYY-MM-DDTHH:mm:ss") );
 }

 // sendLineMessage(mDate + ' newmessage');
 function  toCheckNotify(info, profile, mac) {
    if (config.channelId ==='' || config.channelSecret ==='' || config.channelAccessToken ==='') {
        return;
    }
    var keys = Object.keys(info);
    var message = '';
    var recv = getCurrentUTCDate();
    var time = getCurrentTime();
    var hStr = '超過';
    var lStr = '低於';
    for (let i = 0; i < keys.length; ++i) {
        let obj = profile[keys[i]];
        let data = info[keys[i]];
        if (obj.high !== '' && data > Number(obj.high) ) {
            message = message + ' ' + obj.title + hStr + obj.high;
        }
        if (obj.low !== '' && data < Number(obj.low) ) {
            message = message + ' ' + obj.title + lStr + obj.low;
        }
    }
    if (message !== '') {
        var sqlStr = 'select * from api_device_info where device_type = "LoRaM"';
        mysqlTool.query(sqlStr, function(err, result){
            if (err) {
                console.log(err);
                return;
            } else if (result === undefined || result === null) {
                console.log('unable get device');
                return;
            }

            var name = '';
            var cpId = '';
            if (err || result.length === 0) {
                name = mac;
            } else {
                for (let i = 0; i < result.length; ++i) {
                    if (result[i].device_mac === mac) {
                        cpId = result[i].device_cp_id;
                        break;
                    }
                }
                if (name === '') {
                    name = mac;
                }
            }
            //Jason fix cpId is null unable conert to string cause crash issue on 2018.04.29
            if (cpId === '') {
                return;
            } 
            var json = {type:'notify', subject:'異常通知', content: message, createUser: name, cpId: cpId.toString()};
            addLog(json);
            message = time + ' 裝置:' + name + message;
            sendLineMessage(message);
        });
    }
 }

 function sendAdminLineMessage (msg) {
    var bot = linebot({
        channelId: config.channelId,
        channelSecret: config.channelSecret,
        channelAccessToken: config.channelAccessToken
    });
    try {
        var user = JsonFileTools.getJsonFromFile(adminPath);
        var msg = getCurrentTime() + ' : ' + 'connection ok';
        if (user === undefined || user.friend === undefined || user.friend.length === 0) {
            return;
        }
    } catch (error) {
        return;
    }
   
    if (user.friend.length > 0) {
        bot.multicast(user.friend, msg ).then(function (data) {
            // success 
            console.log('push line :' + JSON.stringify(data));
        }).catch(function (error) {
            // error 
            console.log('push line error :' + error);
        });
    }
}

function isRepeatEvent(checkObj, obj) {
    if (checkObj.frameCnt === obj.frameCnt) {
        var timestamp1 = moment.utc(checkObj.time).valueOf();
        var timestamp2 = moment.utc(obj.time).valueOf();
        var time = Math.abs(timestamp1 - timestamp2)/(60*1000);
        var checkTime = 10;
        if (time < checkTime) {
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
    return false;
}