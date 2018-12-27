var dbUtil =  require('./dbUtil.js');

var mapObj = {
    "selector": {
     "category": "map"
      }
   };

   var mapObj2 = {
    "selector": {
       "category": "map"
    }
 };

module.exports = {
    create,
    findLast,
    find,
    update,
    remove
}

function findLast(json){
    var myobj = JSON.parse(JSON.stringify(mapObj2));
    myobj.selector.deviceType = json.deviceType;
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
    var myobj = JSON.parse(JSON.stringify(mapObj2));
    if (json.deviceType) {
        myobj.selector.deviceType = json.deviceType;
    }
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

function create(json){
    json.category = 'map';
    json.updateUser  = null,
    json.updateTime  = null
    return new Promise(function (resolve, reject) {
        var myobj = JSON.parse(JSON.stringify(mapObj)); 
        myobj.selector.deviceType = json.deviceType;
        console.log('caeate map obj : ' + JSON.stringify(myobj));
        dbUtil.queryDoc(myobj).then(function(value) {
            if(value.docs.length > 0){
              reject("Has same type");
              return;
            }
            dbUtil.insert(json).then(function(value) {
                // on fulfillment(已實現時)
                console.log("#### Insert map success :"+value);
                resolve(value);
            }, function(reason) {
                console.log("???? Insert map fail :" + reason);
                reject(reason);
            }); 
          }, function(reason) {
            reject(reason);
          });
    })
}
  
function remove(json){
    var myobj = JSON.parse(JSON.stringify(mapObj)); 
    myobj.selector.deviceType = json.deviceType;
    console.log('del map myobj : ' + JSON.stringify(myobj));
    return new Promise(function (resolve, reject) {
        dbUtil.queryDoc(myobj).then(function(value) {
            var list = [];
            if(value.docs.length > 0){
                list = value.docs;
            }
            var doc;
            if( list.length > 0) {
                doc = list[0];
                dbUtil.removeDoc(doc._id, doc._rev).then(function(value) {
                    resolve('ok');
                }, function(reason) {
                    reject(reason);
                }); 
            } else {
                reject('Can not find map');
            }
            
          }, function(reason) {
            reject(reason);
          });
    })
}
  
function update(condition, json){
    var myobj = JSON.parse(JSON.stringify(mapObj)); 
    myobj.selector.deviceType = condition.deviceType;
    console.log('update map myobj : ' + JSON.stringify(myobj));
    return new Promise(function (resolve, reject) {
        dbUtil.queryDoc(myobj).then(function(value) {
            var list = [];
            if(value.docs.length > 0){
                list = value.docs;
            }
            var doc = list[0];
            console.log('doc._id : ' + doc._id)
            //zone.deviceList = newZone.deviceList;
            if (json.fieldName) {
                doc.fieldName =  json.fieldName;
            }
            if (json.map) {
                doc.map =  json.map;
            }
            if (json.typeName) {
                doc.typeName =  json.typeName;
            }
            if (json.profile) {
                doc.profile = json.profile;
            }
            dbUtil.insert(doc).then(function(value) {
                // on fulfillment(已實現時)
                console.log("#### Update map success :"+ JSON.stringify(value));
                resolve(value);
            }, function(reason) {
                // on rejection(已拒絕時)
                console.log("???? Update map fail :" + reason);
                reject(reason);
            });
        }, function(reason) {
            reject(reason);
        }); 
    })
}