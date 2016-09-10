var express = require('express');
var mysql = require('mysql');
var fs = require('fs');
var bodyParser = require('body-parser');
var httpLogger = require('morgan');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var _ = require('lodash');
var helmet = require('helmet');
var xss = require('xss');
var cache = require('memory-cache');
var events = require('events');
var config = require('../config/index');
var agent = require('./agent/agent');
var db = require('./db');
var tools = require('./tools');
var stringValidate = require('./lib/string-validate');

// 打印debug信息
var debug = tools.debug;
var error = tools.error;
// 对输出结果进行格式化
var responseFormat = tools.responseFormat;
// api缓存
var apiCaches = {},
	apiCacheEvent = new events.EventEmitter();
//
apiCacheEvent.setMaxListeners(0);

// 创建一个服务器
var Server = function(cfg, callback) {

	var app = this.app = express();
	app.all('*',function (req, res, next) {
	  res.header('Access-Control-Allow-Origin', '*');
	  res.header('Access-Control-Allow-Headers', 'Content-Type, Content-Length, Authorization, Accept, X-Requested-With , yourHeaderFeild');
	  res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');

	  if (req.method == 'OPTIONS') {
	    res.send(200); /让options请求快速返回/
	  }
	  else {
	    next();
	  }
	});
	// 默认参数
	cfg = Object.assign({
		port: config.port
	}, cfg);

	// 日志
	if(config.debug){
		app.use(httpLogger('dev'));
	};

	app.use(cookieParser());

	// session
	app.use(session({
		secret: 'keyboard cat',
		resave: true,
		saveUninitialized: true
	}));
	app.use('/datasource', agent({
        url: function(req){
            return config.agent.path('/datasource' + req.url);
        },
        headers: {
        	'accept-encoding': 'utf-8'
        }
    }));
	app.use('/dataservice', agent({
        url: function(req){
            return config.agent.path('/dataservice' + req.url);
        },
        headers: {
        	'accept-encoding': 'utf-8'
        }
    }));
	// for parsing application/x-www-form-urlencoded
	app.use(bodyParser.urlencoded({
		extended: true
	}));

	// for parsing application/json
	app.use(bodyParser.json());

	// 设置安全相关的HTTP头
	app.use(helmet());
	app.use(helmet.contentSecurityPolicy({
	  // // Specify directives as normal.
	  // directives: {
	  //   defaultSrc: ["'self'", 'default.com'],
	  //   scriptSrc: ["'self'", "'unsafe-inline'"],
	  //   styleSrc: ['self'],
	  //   imgSrc: ['self', 'data:'],
	  //   sandbox: ['allow-forms', 'allow-scripts'],
	  //   reportUri: '/report-violation',
	  //   objectSrc: [] // An empty array allows nothing through
	  // },
	  // Content-Security-Policy, X-WebKit-CSP, and X-Content-Security-Policy.
	  setAllHeaders: true
	}));

	// 静态文件服务器
	app.use(express.static('./client/'));

	// 保存所有api
	this._apis = {};

	app.all('*', function(req, res, next){
		var bioms = req.session.bioms;
		// 判断cookie是否失效
		if(!req.cookies || !req.cookies.bioms){
			req.session.bioms = null;
			return next();
		};
		
		//如果cookie没有失效，则更新cookie时间
		console.info('cookie'+req.cookies.bioms);
		if(bioms){
			var hour = config.timeout;
			req.session.cookie.expires = new Date(Date.now() + hour);
			req.session.cookie.maxAge = hour;
			// res.cookie('bioms', bioms, { 
			// 	expires: new Date(Date.now() + 1000*60*3), 
			// 	maxAge: new Date(Date.now() + 1000*60*20),
			// 	httpOnly: true
			// });
		};
		//req.session.cookie.expires = new Date(Date.now() + 1000*5);
		next();
	});

	// 挂载api接口
	_mountApis(this, app);

	// 挂载db方法
	/*
		// 创建数据库连接，执行callback函数，然后关闭连接
		connection(callback)

		// 对sql语句进行格式化
		sqlFormat(sql, values)

		// 数据库查询
		query(sql, values, callback)

		// 批量查询
		batQuery(sqls, values, callback)

		// 批量插入
		batInsert(table, values, callback)

		// 查询操作
		select(opt)

		// 查询列表并返回结果
		getRows(opt)

		// 查询一条记录并返回结果
		getRow(opt)

		insertRow(opt)

		updateRow(opt)

		deleteRow(opt)
	*/
	this.mixin(db);

	// 监听
	app.listen(cfg.port, function() {

		if (typeof callback === 'function') {
			callback();
		};

		if (config.schedule) {
			messageSchedule.start(this);
			adOnSchedule.start(this);
			adOffSchedule.start(this);
		};

		console.log('http://localhost:' + cfg.port);
	}.bind(this));
};

//----------------------------------------------------
// 核心工具函数
//----------------------------------------------------

// 复制一个对象的所有成员
Server.prototype.mixin = function(obj){

	_.forEach(obj, function(fn, key){
		if(typeof this[key] !== 'undefined'){
			debug('警告：Server的' + key + '方法被覆盖了');
		};

		if(typeof fn === 'function'){
			this[key] = fn.bind(this);
		}else{
			this[key] = fn;
		};
	}.bind(this));
};

//----------------------------------------------------
// 成员方法
//----------------------------------------------------

// 解码params
function decodeParams(params){
	_.forEach(params, function(val, key){
		val = decodeURIComponent(val);
		params[key] = val;
	});
	return params;
};

// 解码params
function xssParams(params){
	_.forEach(params, function(val, key){
		val = xss(val);
	});
	return params;
};


// 调用路由程序
Server.prototype.run = function(path, req, res, params, opt){
	var api = this._apis[path], token, userinfo, args = arguments;

	var writeCacheAndNext = function(token, userinfo){
		if(userinfo === 'expired'){
			this.req.userinfo = null;
		}else{
			this.req.userinfo = userinfo;
		};
		cache.put(token, userinfo, 10*60*1000);
		this.serv._run.apply(this.serv, this.args);
	}.bind({req: req, serv: this, args: args});

	if(!api){
		tools.error('没有找到名为"' + path + '"的路由');
		this.failure(res);
		return;
	};

	//
	if(typeof api === 'object'){
		// 需进行登录检测
		if(api.login === true){
			if(req.cookies.bioms) {
				// var bioms = req.cookies.bioms;
				// var sessionUser = req.session.userinfo;
				// var userinfo = null;
				// if( sessionUser != null ) {
				// 	userinfo = sessionUser[bioms];
				// }
				req.userinfo = {};
			}else{
				req.userinfo = null;
			};
			this._run.apply(this, args);
			return;
		};
	};

	this._run.apply(this, args);
};

Server.prototype._run = function(path, req, res, params, opt){
	var api = this._apis[path], fn, fields, err, cacheKey;

	if(!api){
		tools.error('没有找到名为"' + path + '"的路由');
		opt.error('参数错误');
		return;
	};

	//
	if(typeof api === 'object'){
		fn = api.router;
		fields = api.params;
		// 用户信息
		if(api.login){
			//
			if(!req.userinfo){
				opt.expired();
				return;
			};
		};
		// 缓存
		if( typeof api.cache === 'number' ) {
			// 缓存ID
			cacheKey = path + ':' + tools.formatParam(params);
			// 返回缓存或
			if( cache.get(cacheKey) != null ) {
				debug("get cache ====== " + cacheKey);
				opt.success(cache.get(cacheKey));
				return;
			}else{
				// 写入缓存
				var _success = opt.success;

				// 加入事件队列
				apiCacheEvent.once(cacheKey, function(data){
					this.success && this.success(data);
				}.bind({success: _success}));

				// 检查是否被标记为已发出请求
				if(apiCaches[cacheKey]){
					return;
				};
				apiCaches[cacheKey] = true;

				opt.success = function(data) {
					debug("write cache ======= " + this.key);
					cache.put(this.key, data, this.time);
					delete apiCaches[this.key];
					apiCacheEvent.emit(this.key, data);
					apiCacheEvent.removeAllListeners(this.key);
				}.bind({key: cacheKey, time: api.cache});
			}
		}
	}else{
		fn = api;
	};

	err = fieldsValidate(params, fields);
	if(err){
		this.failure(res, err);
		return;
	};

	// 传入用户信息
	opt = opt || {};
	opt.userinfo = req.userinfo;

	// 交给路由处理
	if (typeof fn === 'function') {
		fn.call(this, req, res, params, opt);
	}else{
		tools.error('名为"'+path+'"的路由参数不正确');
		this.failure(res);
		return;
	};
};

// 发送成功的json结果
Server.prototype.success = function(res, msg, data){
	if(typeof msg !== 'string'){
		data = msg;
		msg = '';
	};
	res.send({ code:0 , message: msg || '操作成功', data: responseFormat(data)});
};

// 发送失败的json结果
Server.prototype.failure = function(res, msg){
	res.send({ code:1 , message: msg || '操作失败'});
};

// 返回当前登录用户信息
Server.prototype.userinfo = function(req){
	return req.userinfo;
}

//----------------------------------------------------
// 私有函数
//----------------------------------------------------

// 挂载api接口
function _mountApis(serv, app) {

	// 遍历api目录，读取每一个文件
	// 遍历文件中定义的每一个路由，以 /api/文件名/路由名 为路径加载路由
	fs.readdirSync('./server/api').forEach(function(file, index) {
		var filename = file.substr(0, file.indexOf('.'));
		if (filename != '') {
			var apis = require('./api/' + filename),
				name, path, api;
			for (name in apis){
				if (apis.hasOwnProperty(name)) {
					path = filename + name;
					api = apis[name];
					// 把所有api记录到serv._apis中
					serv._apis[path] = api;
					// 如果路由是 /_开头的话，是私有方法，不能直接由HTTP调用
					if(name.match(/^\/_/)){
						continue;
					};
					// 挂载http接口到app上
					_mountHttpApis(serv, path, api, app);
				};
			};
		}
	});
};

// 把路径、路由挂载到app上
function _mountHttpApis(serv, path, route, app) {

	// 兼容get和post方式
	app.all('/api/' + path, function(route) {
		return function(req, res, next) {
			var fn, ps, params, send;

			//
			send = res.send.bind(res);

			//
			decodeParams(req.query);
			// 把路径参数、url参数、body参数组合成一个对象，作为第三个参数传给路由
			params = Object.assign({}, req.params, req.query, req.body);
			// xss过滤
			xssParams(params);
			// // %20改为空格
			// _.forEach(params, function(val, key){
			// 	if(val && val.replace){
			// 		params[key] = val.replace(/\%20/igm, ' ');
			// 	};
			// });
			// 打印每次请求的参数
			debug(params);

			//
			serv.run(path, req, res, params, {
				next: next,
				// 默认成功处理函数
				error: function error(err) {
					this.send({
						code: 1,
						message: err
					});
				}.bind({send:send}),
				// 默认失败处理函数
				success: function(data) {
					this.send({
						code: 0,
						message: '查询成功',
						data: responseFormat(data)
					});
				}.bind({send:send}),
				// 未登录处理函数
				expired: function() {
					this.send({
						code: 6,
						message: '未登录',
						data: null
					});
				}.bind({send:send})
			});
		};
	}(route));
};

// 参数字段校验
function fieldsValidate(params, field){

	var err = null;

	// 遍历字段
	_.forEach(field, function(field){
		var value, label;

		if(err) return;

		if(typeof field === 'string'){
			field = { key: field };
			if(/\:/.test(field.key)){
				field.key = field.key.split(':');
				field.valid = field.key[1].split('&');
				//
				field.key = field.key[0];
				label = field.key.match(/\(.*\)/);
				if(label){
					field.key = field.key.replace(/\(.*\)/, '');
					field.label = label[0].replace(/\(|\)/g, '');
				};
			};
		};

		if(!field || !field.key){
			throw '字段的key不能为空';
		};

		// label
		field.label = field.label || field.key;

		// value
		value = params[field.key];

		// field.value
		if(typeof field.value === 'function'){
			value = field.value(value);
		};

		// 确保value一定是字符串
		if(!value){
			value = '';
		}else{
			value = value + '';
		};

		// 遍历该字段的验证规则
		if(Array.isArray(field.valid)){
			field.valid.forEach(function(validator){
				var range = '';

				if(err) return;

				range = validator.match(/\[.*\]|\(.*\)/) || '';
				if(range){
					validator = validator.replace(/\[.*\]|\(.*\)/, '');
					range = range[0];
				};

				// 空值不校验required以外的规则
				if(validator !== 'required' && value === ''){
					return;
				};

				// 内置验证器
				if(typeof validator === 'string' && typeof stringValidate[validator] == 'function'){
					validator = function(val, field, range){
						return this(val, '[' + field.label + ']', range);
					}.bind(stringValidate[validator]);
				};

				// 检查验证器是否函数
				if(typeof validator !== 'function'){
					return;
				};

				err = validator(value, field, range);
			});
		};

	});

	return err;
};

//----------------------------------------------------
//
//----------------------------------------------------

module.exports = Server;
