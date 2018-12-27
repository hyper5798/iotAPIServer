var express = require('express');
var router = express.Router();
var async  = require('async');
var config = require('../config');
var util = require('../modules/util.js');
//Jason modify on 2018.05.06 for switch local and cloud db -- start
var dbMap = null;
if (config.isCloudantDb) {
    dbMap = require('../modules/cloudant/cloudantMap.js');
} else {
    dbMap = require('../modules/mongo/mongoMap.js');
}
//Jason modify on 2018.05.06 for switch local and cloud db -- end

module.exports = (function() {
    //Read 
	router.get('/maps', function(req, res) {
		var token = req.query.token;
        if ( token === undefined) {
			res.send({
				"responseCode" : '999',
				"responseMsg" : 'Missing parameter'
			});
			return false;
		}
		
        util.checkAndParseToken(token, res,function(err,result){
			if (err) {
				return;
			} else { 
				//Token is ok
                dbMap.find({}).then(function(data) {
					// on fulfillment(已實現時)
                    res.status(200);
					res.setHeader('Content-Type', 'application/json');
					if (data) {
						res.json({
							"responseCode" : '000',
							"responseMsg" : 'success',
							"size" : data.length,
							"data" : data
						});
					} else {
						res.json({
							"responseCode" : '000',
							"responseMsg" : 'success',
							"size" : 0,
							"data" : []
						});
					}
                }, function(reason) {
                    // on rejection(已拒絕時)
                    res.send({
                        "responseCode" : '999',
                        "responseMsg" : reason
                    }); 
                }); 
			}
		});
    });
    
	router.get('/maps/:type', function(req, res) {
		var token = req.query.token;
        var type = req.params.type;
        if (type === undefined || token === undefined) {
			res.send({
				"responseCode" : '999',
				"responseMsg" : 'Missing parameter'
			});
			return false;
		}
        var json = {'deviceType': type};
		
        util.checkAndParseToken(token, res,function(err,result){
			if (err) {
				return;
			} else { 
				//Token is ok
                dbMap.find(json).then(function(data) {
					// on fulfillment(已實現時)
                    res.status(200);
					res.setHeader('Content-Type', 'application/json');
					res.json({
                        "responseCode" : '000',
                        "data" : data
                    });
                }, function(reason) {
                    // on rejection(已拒絕時)
                    res.send({
                        "responseCode" : '999',
                        "responseMsg" : reason
                    }); 
                }); 
			}
		});
	});
    
    router.post('/maps', function(req, res) {
        var checkArr = ['token','deviceType','typeName','fieldName','map','createUser'];
        var obj = util.checkFormData(req, checkArr);
        if (obj === null) {
            res.send({
				"responseCode" : '999',
				"responseMsg" : 'Missing parameter'
			});
			return;
        } else if (typeof(obj) === 'string') {
            res.send({
				"responseCode" : '999',
				"responseMsg" : obj
			});
		}
		obj.createTime = util.getCurrentUTCDate();
		if (req.body.map) {
			if (util.getType(req.body.map) === 'string') {
				try {
					obj.map = JSON.parse(req.body.map);
				} catch (error) {
					res.send({
						"responseCode" : '404',
						"responseMsg" : error.message
					});
					return;
				}
			} else {
				obj.map = req.body.map;
			}
		}
		if (req.body.fieldName) {
			if (util.getType(req.body.fieldName) === 'string') {
				try {
					obj.fieldName = JSON.parse(req.body.fieldName);
				} catch (error) {
					res.send({
						"responseCode" : '404',
						"responseMsg" : error.message
					});
					return;
				}
			} else {
				obj.fieldName = req.body.fieldName;
			}
		}
        util.checkAndParseToken(req.body.token, res,function(err,result){
			if (err) {
				return;
			} else { 
				//Token is ok
                dbMap.create(obj).then(function(data) {
                    // on fulfillment(已實現時)
                    res.status(200);
					res.setHeader('Content-Type', 'application/json');
					res.json({
                        "responseCode" : '000',
                        "data" : 'Create map success'
                    });
                }, function(reason) {
                    // on rejection(已拒絕時)
                    res.send({
                        "responseCode" : '999',
                        "responseMsg" : reason
                    }); 
                }); 
			}
		});
	});

	router.put('/maps', function(req, res) {
        var checkArr = ['deviceType', 'updateUser'];
        var obj = util.checkFormData(req, checkArr);
        if (obj === null) {
            res.send({
				"responseCode" : '999',
				"responseMsg" : 'Missing parameter'
			});
			return;
        } else if (typeof(obj) === 'string') {
            res.send({
				"responseCode" : '999',
				"responseMsg" : obj
			});
			return;
		}
		obj.updateTime = util.getCurrentUTCDate();
        if (req.body.map) {
			if (util.getType(req.body.map) === 'string') {
				try {
					obj.map = JSON.parse(req.body.map);
				} catch (error) {
					res.send({
						"responseCode" : '404',
						"responseMsg" : error.message
					});
					return;
				}
			} else {
				obj.map = req.body.map;
			}
		}
		if (req.body.fieldName) {
			if (util.getType(req.body.fieldName) === 'string') {
				try {
					obj.fieldName = JSON.parse(req.body.fieldName);
				} catch (error) {
					res.send({
						"responseCode" : '404',
						"responseMsg" : error.message
					});
					return;
				}
			} else {
				obj.fieldName = req.body.fieldName;
			}
		}

		if (req.body.profile) {
			if (util.getType(req.body.profile) === 'string') {
				try {
					obj.profile = JSON.parse(req.body.profile);
				} catch (error) {
					res.send({
						"responseCode" : '404',
						"responseMsg" : error.message
					});
					return;
				}
			} else {
				obj.profile = req.body.profile;
			}
		}
		if (req.body.typeName) {
			obj.typeName = req.body.typeName;
		}
		delete obj.deviceType; 
        util.checkAndParseToken(req.body.token, res, function(err,result){
			if (err) {
				return;
			} else { 
				//Token is ok
                dbMap.update({"deviceType": req.body.deviceType}, obj).then(function(data) {
                    // on fulfillment(已實現時)
                    res.status(200);
					res.setHeader('Content-Type', 'application/json');
					res.json({
                        'responseCode' : '000',
                        'data' : 'Update map success'
                    });
                }, function(reason) {
                    // on rejection(已拒絕時)
                    res.send({
                        "responseCode" : '999',
                        "responseMsg" : reason
                    }); 
                }); 
			}
		});
	});

	//Delete by ID 
	router.delete('/maps', function(req, res) {
		var deviceType = null;
		var token = null;
		if (req.query.token) { 
			token = req.query.token;
		} else if (req.body.token) { 
			token = req.body.token;
		} else {
			res.send({
				"responseCode" : '999',
				"responseMsg" : 'Missing parameter'
			});
			return;
		}
		if (req.query.deviceType) { 
			deviceType = req.query.deviceType;
		} else if (req.body.deviceType) { 
			deviceType = req.body.deviceType;
		} else {
			res.send({
				"responseCode" : '999',
				"responseMsg" : 'Missing parameter'
			});
			return;
		}
		util.checkAndParseToken(token, res,function(err,result){
			if (err) {
				return;
			} else { 
				//Token is ok
                dbMap.remove({"deviceType": deviceType}).then(function(data) {
                    // on fulfillment(已實現時)
                    res.status(200);
					res.setHeader('Content-Type', 'application/json');
					res.json({
                        "responseCode" : '000',
                        "data" : 'Delete map success'
                    });
                }, function(reason) {
                    // on rejection(已拒絕時)
                    res.send({
                        "responseCode" : '999',
                        "responseMsg" : reason
                    }); 
                }); 
			}
		});
	});

	return router;

})();
     
