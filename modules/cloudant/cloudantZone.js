var dbUtil =  require('./dbUtil.js');

var zoneObj = {
  "selector": {
    "category": "zone"
    }
};

var zoneObj2 = {
    "selector": {
       "category": "zone"
    },
    "fields": [
       "zoneId",
       "name",
       "deviceList",
       "createUser",
       "createTime",
       "updateUser",
       "updateTime"
    ],
    "sort": [
       {
          "createTime": "asc"
       }
    ]
 };

 module.exports = {
  create,
  findLast,
  find,
  update,
  remove
}

function findLast(json){
  var myobj = JSON.parse(JSON.stringify(zoneObj2));
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
  var myobj = JSON.parse(JSON.stringify(zoneObj2));
  if (json.zoneId) {
      myobj.selector.zoneId = json.zoneId;
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
  json.category = 'zone';
  json.updateUser = null;
  
  return new Promise(function (resolve, reject) {
    //Check repeat zoneId
    var myobj = JSON.parse(JSON.stringify(zoneObj)); 
    myobj.selector.zoneId = json.zoneId;
    console.log('query zone myobj : ' + JSON.stringify(myobj));
    dbUtil.queryDoc(myobj).then(function(value) {
      var zoneList = [];
      if(value.docs.length > 0){
        reject("Has same zoneId");
        return;
      }
      dbUtil.insert(json).then(function(value) {
        // on fulfillment(已實現時)
          console.log("#### Insert zone success :"+value);
          resolve(value);
      }, function(reason) {
          console.log("???? Insert zone fail :" + reason);
          reject(reason);
      }); 
    }, function(reason) {
      reject(reason);
    });
  })
}

function remove(json){
  var myobj = JSON.parse(JSON.stringify(zoneObj)); 
  myobj.selector.zoneId = json.zoneId;
  console.log('delete zone myobj : ' + JSON.stringify(myobj));
  return new Promise(function (resolve, reject) {
      dbUtil.queryDoc(myobj).then(function(value) {
          var zoneList = [];
          if(value.docs.length > 0){
            zoneList = value.docs;
          }
          var zoneDoc;
          if( zoneList.length > 0) {
              zoneDoc = zoneList[0];
              dbUtil.removeDoc(zoneDoc._id, zoneDoc._rev).then(function(value) {
                  resolve('ok');
              }, function(reason) {
                  reject(reason);
              }); 
          } else {
              reject('Can not find zone');
          }
          
        }, function(reason) {
          reject(reason);
        });
  })
}

function update(condition, json){
  var myobj = JSON.parse(JSON.stringify(zoneObj)); 
  myobj.selector.zoneId = condition.zoneId;
  console.log('updateZone myobj : ' + JSON.stringify(myobj));
  return new Promise(function (resolve, reject) {
      dbUtil.queryDoc(myobj).then(function(value) {
          var zoneList = [];
          if(value.docs.length > 0){
            zoneList = value.docs;
          }
          var zoneDoc = zoneList[0];
          console.log('zoneDoc._id : ' + zoneDoc._id)
          //zone.deviceList = newZone.deviceList;
          if (json.deviceList) {
            zoneDoc.deviceList =  json.deviceList;
          }
          if (json.name) {
            zoneDoc.name =  json.name;
          }
          zoneDoc.updateTime = json.updateTime;
          zoneDoc.updateUser = json.updateUser;
          dbUtil.insert(zoneDoc).then(function(value) {
              // on fulfillment(已實現時)
              console.log("#### Update zone success :"+ JSON.stringify(value));
              resolve(value);
          }, function(reason) {
              // on rejection(已拒絕時)
              console.log("???? Update zone fail :" + reason);
              reject(reason);
          });
      }, function(reason) {
          reject(reason);
      }); 
  })
}