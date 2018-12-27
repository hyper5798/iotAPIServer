var dbUtil =  require('./dbUtil.js');

var profileObj = {
  "selector": {
    "category": "profile"
    }
};

var profileObj2 = {
    "selector": {
       "category": "profile"
    },
    "fields": [
       "macAddr",
       "notify",
       "control",
       "controlDevice",
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
  var myobj = JSON.parse(JSON.stringify(profileObj2));
  myobj.selector.macAddr = json.macAddr;
  myobj.limit = 1;
  return new Promise(function (resolve, reject) {
      dbUtil.queryDoc(myobj).then(function(value) {
          var doc = null;
          if(value && value.docs.length > 0){
             doc  = value.docs[0];
          }
          resolve(doc);
      }, function(reason) {
          reject(reason);
      });
  })
}

function find(json){
  var myobj = JSON.parse(JSON.stringify(profileObj2));
  if (json.macAddr) {
    myobj.selector.macAddr = json.macAddr;
  }
  if (json.controlDevice) {
    myobj.selector.controlDevice = json.controlDevice;
  }
  return new Promise(function (resolve, reject) {
      dbUtil.queryDoc(myobj).then(function(value) {
          var doc = null;
          if(value.docs.length > 0){
            doc = value.docs;
          }
          resolve(doc);
      }, function(reason) {
          reject(reason);
      });
  })
}

function create(json){
  json.category = 'profile';
  json.updateUser = null;
  json.updateTime = null;
  
  return new Promise(function (resolve, reject) {

    var myobj = JSON.parse(JSON.stringify(profileObj)); 
    myobj.selector.macAddr = json.macAddr;

    console.log('query profile myobj : ' + JSON.stringify(myobj));
    dbUtil.queryDoc(myobj).then(function(value) {
      if(value.docs.length > 0){
        reject("Has same profile");
        return;
      }
      dbUtil.insert(json).then(function(value) {
        // on fulfillment(已實現時)
          console.log("#### Insert profile success :"+value);
          resolve(value);
      }, function(reason) {
          console.log("???? Insert profile fail :" + reason);
          reject(reason);
      }); 
    }, function(reason) {
      reject(reason);
    });
  })
}

function remove(json){
  var myobj = JSON.parse(JSON.stringify(profileObj)); 
  myobj.selector.macAddr = json.macAddr;
  console.log('delete profile myobj : ' + JSON.stringify(myobj));
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
              reject('Can not find profile');
          }
          
        }, function(reason) {
          reject(reason);
        });
  })
}

function update(condition, json){
  var myobj = JSON.parse(JSON.stringify(profileObj)); 
  myobj.selector.macAddr = condition.macAddr;
  console.log('updateZone myobj : ' + JSON.stringify(myobj));
  return new Promise(function (resolve, reject) {
      dbUtil.queryDoc(myobj).then(function(value) {
        var list = [];
        if(value.docs.length > 0){
          list = value.docs;
        }
        var doc = list[0];
        console.log('doc._id : ' + doc._id)
        //profile.profile = newZone.profile;
        if (json.notify) {
            doc.notify =  json.notify;
        }
        if (json.control) {
            doc.control =  json.control;
        }
        doc.updateTime = json.updateTime;
        doc.updateUser = json.updateUser;
        dbUtil.insert(doc).then(function(value) {
            // on fulfillment(已實現時)
            console.log("#### Update profile success :"+ JSON.stringify(value));
            resolve(value);
        }, function(reason) {
            // on rejection(已拒絕時)
            console.log("???? Update profile fail :" + reason);
            reject(reason);
        });
      }, function(reason) {
          reject(reason);
      }); 
  })
}