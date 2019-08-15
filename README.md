# nodejs-rest-api-mysql
**A node.js API server for MySQL** - It can perform CRUD (Create, Read, Update, Delete) operations using HTTP Methods (POST, GET, PUT, and DELETE) for RESTful Services.

- RESTful
- Basic API Authentication
- SQL Injection cleaning
- Pagination Support
- Easy to setup

##Configure
```javascript
config.port = 8000;

//Authentication
config.auth = false;



##Update Features
- [1.0.14]新增control box命令
- [1.0.13]處理NBIOT上報格式
- [1.0.12]Fix FS write issu
- [1.0.11]修改token驗證流程降低DB存取次數
- [1.0.10]將解析從DB取得map改為init()時放入陣列
- [1.0.9]新增控制回復功能

##Install socket.io & socket.io-client
- npm install socket.io --save
- npm install socket.io-client --save

##Thank you.
Arjun | arjunkomath@gmail.com
