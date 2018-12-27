var express = require('express');
var router = express.Router();
var async  = require('async');
var config = require('../config');
var mysqlTool = require('../modules/mysqlTool.js');
var util = require('../modules/util.js');
//Mysql database API

module.exports = (function() {
	//Pagination settings
	var paginate = config.paginate;
	var page_limit = config.page_limit;

    //Get roles
	router.get('/', function(req, res) {
		var token = req.query.token;
        if (token === undefined) {
			res.send({
				"responseCode" : '999',
				"responseMsg" : 'Missing parameter'
			});
			return false;
		}
    });

    //New or Update roles (if roleId = -1 for new roles)
	router.post('/', function(req, res) {
		var checkArr = ['token', 'roleId', 'roleName', 'dataId'];
        var obj = util.checkFormData(req, checkArr);
        if (obj === null) {
            res.send({
				"responseCode" : '999', 
				"responseMsg" : 'Missing parameter'
			});
			return;
        }
    });

    //Delete roles
	router.delete('/', function(req, res) {
		var checkArr = ['token', 'roleId'];
        var roleId = null;
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
		if (req.query.roleId) { 
			roleId = req.query.roleId;
		} else if (req.body.roleId) { 
			roleId = req.body.roleId;
		} else {
			res.send({
				"responseCode" : '999',
				"responseMsg" : 'Missing parameter'
			});
			return;
		}
        if (obj === null) {
            res.send({
				"responseCode" : '999', 
				"responseMsg" : 'Missing parameter'
			});
			return;
        }
    });

	return router;

})();
     
