//start.js 文件
var express = require('express');
var cors = require('cors');
var app = express();

app.use(cors());

app.use(express.static('examples'));

app.get('/', function (req, res) {
  res.send('Hello World');
})

var server = app.listen(3100, function () {

  var host = server.address().address
  var port = server.address().port

  console.log("应用实例，访问地址为 http://%s:%s", host, port)

})