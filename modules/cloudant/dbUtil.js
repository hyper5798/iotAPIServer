const Cloudant = require('cloudant')
var config = require('../../config')
// Configure database connection
let cloudant = new Cloudant({
  account: config.cloudantAccount,
  password: config.cloudantPassword
})
let database = cloudant.db.use('agri')

/**
 * Create document in database.
 * ex:
 * {
 *   "doc":{
 *     "mac":"aaaaaa",
 *     "temp":"32",
 *     "humidity":"55",
 *     "recordTime":"2017-08-31T09:48:42.504104Z"
 *   }
 * }
 * @param {*} doc
 * @param string params
 */
function insert (doc, params) {
  return new Promise(function (resolve, reject) {
    database.insert(doc, params, function (error, response) {
      if (!error) {
        console.log('insert success', response)
        resolve(response)
      } else {
        console.log('insert error', error)
        reject(error)
      }
    })
  })
}
/**
 * query document by mongoDB style
 * ex:
 * {
 *   "selector": {
 *   "mac": "xxxxxx"
 *    },
 *   "limit": 10,
 *   "skip": 0
 * }
 * @param {*} query
 */
function queryDoc (query) {
  return new Promise(function (resolve, reject) {
    database.find(query, function (error, response) {
      if (!error) {
        if(response.docs){
          console.log('query Doc success : ', response.docs.length);
        }
        
        resolve(response)
      } else {
        console.log('queryDoc error', error)
        reject(error)
      }
    })
  })
}

/**
* Removes revision rev of docname from couchdb.
* ex:
* {
*   "selector": {
*   "mac": "xxxxxx"
*    },
*   "limit": 10,
*   "skip": 0
* }
* @param {*} query
*/
function removeDoc (docname,rev) {
 return new Promise(function (resolve, reject) {
   database.destroy(docname,rev, function (error, response) {
     if (!error) {
       console.log('removeDoc success', response)
       resolve(response)
     } else {
       console.log('removeDoc error', error)
       reject(error)
     }
   })
 })
}

module.exports = {
  insert,
  queryDoc,
  removeDoc
}
