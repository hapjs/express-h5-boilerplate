var fs = require('fs');
var express = require('express');
var bodyParser = require('body-parser');
var session = require('express-session');
var argv = require('yargs').argv;
var config = require('../config');
var util = require('./util');
var serveStatic = require('./util/serve-static');
var port = argv.p || config.port || 3000;
var app = express();
var MINUTE = 1000*60;

// session
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    maxAge: MINUTE*30
}));

// for parsing application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
    extended: true
}));

// for parsing application/json
app.use(bodyParser.json());
app.use(bodyParser.raw());
//app.use(bodyParser.text({type:['text/xml','application/xml']}));


// http log
app.use(function timeLog(req, res, next) {
    util.log(req.method, req.url);
    next();
});

// 加载router中的路由文件
mount('./router');


// 静态文件服务器
app.all('*', require('./util/html-serve.js'));

// 静态文件
app.use(serveStatic(__dirname + '/../client/'));

// 404
app.all('*', function(req, res){
    res.redirect('/404.html');
});

// 开始监听端口
app.listen(port, function(){
    util.log('服务器启动', 'http://localhost:' + port);
});

//
function mount(dir){
	// 遍历api目录，读取每一个文件
	// 遍历文件中定义的每一个路由，以 /api/文件名/路由名 为路径加载路由
	fs.readdirSync(__dirname + '/' + dir).forEach(function(file, index) {
		var filename = file.substr(0, file.indexOf('.'));
		if (filename !== '') {
            app.use('/' + filename, require(dir + '/' + filename));
        };
	});
};
