var dbUtil =  require('./dbUtil.js');

var logObj = {
    "selector": {
     "category": "log"
      }
   };

var logObj2 = {
    "selector": { 
        "category": "log"
        /*"date": {
              "$gte": "2017-09-23T10:00",
              "$lt": "2017-09-24T12:00"
          }*/
    },
    "sort": [
       {
          "date": "asc"
       }
    ]
  };

module.exports = {
    create,
    findLast,
    find,
    update,
    remove,
    saveLog,
    findLogs
}

function findLast(json){
    var myobj = JSON.parse(JSON.stringify(logObj2));
    myobj.selector.type = json.type;
    myobj.limit = 1;
    return new Promise(function (resolve, reject) {
        dbUtil.queryDoc(myobj).then(function(value) {
            var doc = null;
            if(value && value.docs.length > 0){
                doc = value.docs[0];
            }
            resolve(doc);
        }, function(reason) {
            reject(reason);
        });
    })
}

function find(json){
    var myobj = JSON.parse(JSON.stringify(logObj2));
    if (json.type) {
        myobj.selector.type = json.type;
    }
    if (json.createTime) {
        myobj.selector.createTime = json.createTime;
    }
    console.log('query log json : ' + JSON.stringify(myobj));
    return new Promise(function (resolve, reject) {
        dbUtil.queryDoc(myobj).then(function(value) {
            var deviceList = [];
            if(value.docs.length > 0){
                deviceList = value.docs;
            }
            resolve(deviceList);
        }, function(reason) {
            reject(reason);
        });
    })
}

function saveLog(json, callback) {
    create(json).then(function(value) {
        return callback(null, value);
    }, function(reason) {
        return callback(reason, null);
    });
}

function findLogs (json, callback) {
    find(json).then(function(value) {
        return callback(null, value);
    }, function(reason) {
        return callback(reason, null);
    });
}

function create(json){
    json.category = 'log';
    console.log('query json : ' + JSON.stringify(json));
    return new Promise(function (resolve, reject) {
        dbUtil.insert(json).then(function(value) {
            // on fulfillment(已實現時)
            console.log("#### Insert log success :"+value);
            resolve(value);
        }, function(reason) {
            console.log("???? Insert log fail :" + reason);
            reject(reason);
        }); 
    })
}
  
function remove(json){
    var myobj = JSON.parse(JSON.stringify(mapObj)); 
    myobj.selector.deviceType = json.deviceType;
    console.log('del log myobj : ' + JSON.stringify(myobj));
    return new Promise(function (resolve, reject) {
        dbUtil.queryDoc(myobj).then(function(value) {
            var mapList = [];
            if(value.docs.length > 0){
                mapList = value.docs;
            }
            var mapDoc;
            if( mapList.length > 0) {
                mapDoc = mapList[0];
                dbUtil.removeDoc(mapDoc._id, mapDoc._rev).then(function(value) {
                    resolve('ok');
                }, function(reason) {
                    reject(reason);
                }); 
            } else {
                reject('Can not find log');
            }
            
          }, function(reason) {
            reject(reason);
          });
    })
}
  
function update(condition, json){
    var myobj = JSON.parse(JSON.stringify(mapObj)); 
    myobj.selector.deviceType = condition.deviceType;
    console.log('update log myobj : ' + JSON.stringify(myobj));
    return new Promise(function (resolve, reject) {
        dbUtil.queryDoc(myobj).then(function(value) {
            var logList = [];
            if(value.docs.length > 0){
                logList = value.docs;
            }
            var logDoc = logList[0];
            console.log('logDoc._id : ' + logDoc._id)
            //zone.deviceList = newZone.deviceList;
            if (json.createTime) {
                logDoc.reateTime = json.createTime;
            }
            dbUtil.insert(logDoc).then(function(value) {
                // on fulfillment(已實現時)
                console.log("#### Update log success :"+ JSON.stringify(value));
                resolve(value);
            }, function(reason) {
                // on rejection(已拒絕時)
                console.log("???? Update log fail :" + reason);
                reject(reason);
            });
        }, function(reason) {
            reject(reason);
        }); 
    })
}