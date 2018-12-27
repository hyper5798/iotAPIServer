var dbUtil =  require('./dbUtil.js');

var eventObj = {
    "selector": {
        "category":"event"
      }
   };

var eventObj2 = {
    "selector": {
        "category":"event"
      /*"date": {
              "$gte": "2017-09-23T10:00",
              "$lt": "2017-09-24T12:00"
          }*/
    },
    "sort": [
       {
          "recv": "asc"
       }
    ]
  };
  var asc = [
    {
       "recv": "asc"
    }
 ];

 var desc = [
    {
       "recv": "desc"
    }
 ];

  module.exports = {
    create,
    findLast,
    find
}

function findLast(json){
    var myobj = JSON.parse(JSON.stringify(eventObj2));
    myobj.selector.macAddr = json.macAddr;
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

function getQueryJSON(mac,from,to,flag){
	var time =  getCurrentTimestamp();
	//var now =  new Date(time);
	var now = moment.unix(time/1000);
	var last = moment.unix(time/1000);
	if (to === undefined && flag === 1){
		to = now.format("YYYY-MM-DD HH:mm");
	} else if (to === undefined && flag === 3){
		to = now.format("YYYY-MM-DD HH:mm");
		to = convertTime(to);
		console.log('to timestamp : ' + to + '\n date : ' + new Date(to));
	}
	if (from === undefined && flag === 1){
		from = now.format('YYYY-MM-DD 00:00');
	} else if (from === undefined && flag === 2){
		from = last.subtract(1, 'days');
		from = from.format('YYYY-MM-DD HH:MM');
	} else if (from === undefined && flag === 3){
		from = last.subtract(1, 'days');
		from = from.format('YYYY-MM-DD HH:MM');
		from = convertTime(from);
		console.log('from timestamp : ' + from + '\n date : ' + new Date(from));
	} 
	// device info 指定開始時間 - sensor無法送資料時用
    // from = "2018-01-01 00:00:00";
	var json = {'macAddr':mac, 'from': from, 'to': to}; 
	console.log('quer from mac : '+mac + " , from " + from + ' => to : ' + to);
	return json;
}

//find(json, paginate, offset, page_limit, sort)
function find(json, paginate, offset, page_limit, sort) {
    var myobj = JSON.parse(JSON.stringify(eventObj2));
    if (json.macAddr) {
        myobj.selector.macAddr = json.macAddr;
    }
    if (json.recv) {
        myobj.selector.recv = json.recv;
    }
    if (json.fport > 0) {
        myobj.selector.extra = {};
        myobj.selector.extra.fport = json.fport;
    }
    if(sort==='desc') {
        myobj.sort = desc;
    } else {
        myobj.sort = asc;
    }
    
    console.log('myobj.sort : ' + JSON.stringify(myobj.sort));
    console.log('query event : ' + JSON.stringify(myobj));
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
    json.category = 'event';
    return new Promise(function (resolve, reject) {
        dbUtil.insert(json).then(function(value) {
            // on fulfillment(已實現時)
            // console.log("#### Insert event success :"+value);
            resolve(value);
        }, function(reason) {
            // console.log("???? Insert event fail :" + reason);
            reject(reason);
        }); 
    })
}
  
/* function remove(json){
    var myobj = JSON.parse(JSON.stringify(eventObj)); 
    myobj.selector.macAddr = json.macAddr;
    console.log('delProfile myobj : ' + JSON.stringify(myobj));
    return new Promise(function (resolve, reject) {
        dbUtil.queryDoc(myobj).then(function(value) {
            var myList = [];
            if(value.docs.length > 0){
                myList = value.docs;
            }
            var myDoc;
            if( myList.length > 0) {
                myDoc = myList[0];
                dbUtil.removeDoc(myDoc._id, myDoc._rev).then(function(value) {
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
} */