var moment = require('moment');
var _ = require('lodash');
var request = require('request');
var config = require('../../config/index');
var rsa = require("node-bignumber");
var key = new rsa.Key();

var nosClient = require('../nos.js');
var fs = require('fs');
var multiparty = require('multiparty');
var shell = 'shell';
var python = 'python';
var key = 'key';
var devIps = 'dev:ips';

var NOS_HOST = 'nos.126.net';
var NOS_ACCESS_SECRET = '8d71ee2b54c24eb0aebddcf9ee4e3e33';
var NOS_ACCESS_ID = 'a482b6932c684630b4c0e6390b69da6c';
var NOS_BUCKET_NAME = "duobao";

var client = new nosClient({
	access_secret: NOS_ACCESS_SECRET,
	access_id: NOS_ACCESS_ID,
	host: NOS_HOST
});

// 对输出结果进行格式化
function responseFormat(obj) {

	var temp;

	// 如果是数组或者对象，遍历处理
	if (typeof obj === 'object') {

		_.forEach(obj, function(n, key) {
			obj[key] = responseFormat(n);
		}.bind(this));

		// 字符型
	} else if (typeof obj === 'string') {

		// 如果是符合日期格式的字符串
		if (obj.match(/^\d{4}\-\d{2}\-\d{2}/)) {
			temp = moment(obj);
			if (temp.isValid()) {
				return temp.format('YYYY-MM-DD HH:mm:ss');
			};
		};

	};

	// 如果是日期对象
	// 转换成年月日时分秒
	if (moment.isDate(obj)) {
		return moment(obj).format('YYYY-MM-DD HH:mm:ss');
	};

	return obj;
};

// 类似于Object.assign，区别在于undefined型的值会被抛弃
function assign(dest, src){
	var args = arguments, index = 1, key;
	if(args.length < 2 || !dest) return dest;
	src = args[index];
	while(src){
		for(key in src) if(src.hasOwnProperty(key)){
			if(typeof src[key] === 'undefined') continue;
			dest[key] = src[key];
		};
		index++;
		src=args[index];
	};
	return dest;
};

var tokenTimer = null;

var tools = {
	// 发送post请求
	post: function(opt){
		opt = Object.assign({
			url: '',
			data: '',
			headers: {},
			form: {},
			success: function(){},
			error: function(){}
		}, opt);
		console.info(opt);
		//
		try{
			request.post({
				url: opt.url,
				headers: opt.headers,
				form: opt.data
			}, function(err, res, body){
				console.info('POST------BODY MESSAGE ==== ' + body);
				console.info('POST------ERROR MESSAGE ==== ' + err);
				var opt = this, data;
				if(typeof opt.success === 'function'){
					try{
						data = JSON.parse(body);
					}catch(e){};
					//
					if(data){
						opt.success(data);
					}else{
						opt.error('请求失败');
					};
				};
			}.bind(opt));
		}catch(e){
			opt.error('请求失败');
		}
	},
	get: function (opt) {
		var url = opt.url;
		var data = opt.data;
		url = this.formatUrl(url,data);
		console.info('GET URL' + url);
		request.get(url, function ( err, res, body ) {
			console.info('GET------BODY MESSAGE ==== ' + body);
			console.info('GET------ERROR MESSAGE ==== ' + err);
			var opt = this, data;
			if(typeof opt.success === 'function'){
				try{
					data = JSON.parse(body);
				}catch(e){};
				//
				if(data){
					opt.success(data);
				}else{
					opt.error('请求失败');
				};
			};
		}.bind(opt));
	},
	formatUrl : function ( url, param ) {
		if (param != null && typeof param === 'object'){
			var index = 0;
			url += '?';
			var str = '';
			for(var key in param){
				if( param[key] != undefined ) {
					if( index == 0 ) {
						str += key+'='+param[key];
					}else{
						str += '&'+key+'='+param[key];
					}
					index++;
				}
			}
			// str = encodeURIComponent(str);
		}
		return url + str;
	},
	login: function(opt){
		//
		tools.post({
			url: 'https://sit-apfront.wjjr.cc/login',
			headers: {
				'ihome-imei': opt.imei || 'server-transpond'
			},
			data: {
				loginName: opt.loginName || '',
				password: opt.password || ''
			},
			success: function(json){
				if(json.code === 0){
					opt.success(json.data);
				}else{
					opt.error(json.message || '登录失败');
				}
			},
			error: function(){
				opt.error('登录失败');
			}
		});
	},
	getUserinfo: function(opt){
		
		//
		// tools.post({
		// 	url: config.hosts.ap + 'customer/query/session',
		// 	headers: {
		// 		'ihome-token': opt.token
		// 	},
		// 	success: function(json){
		// 		var data = json.data;
		// 		if(json.code === 0 && data){
		// 			data = {
		// 				channelNo : data.channelNo,
		// 				userid : data.customerId,
		// 				loginName : data.loginName,
		// 				username : data.loginName,
		// 				merchantNo : data.merchantNo,
		// 				outCustomerId : data.outCustomerId,
		// 				sourceNo : data.sourceNo
		// 			};
		// 			opt.success(data);
		// 		}else{
		// 			opt.error(json.message || '无法获得登录状态');
		// 		}
		// 	},
		// 	error: function(){
		// 		opt.error('无法获得登录状态');
		// 	}
		// });
	},
	// 获取token
	token: function(req, token){
		var session = req.session || {};
		return session.token || '';
	},
	//获取省份信息
	getAreaBase : function(opt) {

		//
		tools.post({
			url: config.hosts.ct + 'areaBase/queryChildrenArea',
			data: {
				grade : opt.grade,
				parentId : opt.parentId,
				productCode : opt.productCode
			},
			success: function(json){
				var data = json.data;
				if(json.code === 0 && data){
					opt.success(data);
				}else{
					opt.error(json.message || '查询失败');
				}
			},
			error: function(){
				opt.error('查询失败');
			}
		});
	},
	//获取密钥
	generate : function() {
		// var key = new rsa.Key();
		// Generate a key
		key.generate(512, "10001");
		return {
			key : key,
			n : rsa.linebrk(key.n.toString(16),64),
			d : rsa.linebrk(key.d.toString(16),64),
			p : rsa.linebrk(key.p.toString(16),64),
			q : rsa.linebrk(key.q.toString(16),64),
			dmp1 : rsa.linebrk(key.dmp1.toString(16),64),
			dmq1 : rsa.linebrk(key.dmq1.toString(16),64),
			coeff : rsa.linebrk(key.coeff.toString(16),64)
		}
	},
	createId : function() {
		var d = new Date().getTime();
	    var uuid = 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
	        var r = (d + Math.random()*16)%16 | 0;
	        d = Math.floor(d/16);
	        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
	    });
	    return uuid;
	},
	decrypt : function( obj, params ) {
		console.info(obj);
		// var key = obj.key;
		var str = key.decrypt(params.sign);
		var message = rsa.linebrk(str, 64);
		var f = this.formatRSAObj(params);
		if( message == f ) {
			return true;
		}else{
			return false;
		}
	},
	formatRSAObj : function( obj ) {
		var str = '';
		var index = 0;
		for( var key in obj ) {
			if( key != 'sign' ) {
				if( index == 0 ) {
					str += key + "=" + obj[key];
				}else{
					str += '=' + key + "=" + obj[key];
				}
				index++;
			}
		}
		return str;
	},
	formatParam : function( obj ) {
		var str = '';
		var index = 0;
		for( var key in obj ) {
			if( index == 0 ) {
				str += key + "=" + obj[key];
			}else{
				str += '=' + key + "=" + obj[key];
			}
			index++;
		}
		return str;
	},
	upload : function(req, res, params, path, opt) {
		// create a form to begin parsing
		var form = new multiparty.Form({
			uploadDir: path
		});

		form.on('error', opt.next);

		// listen on field event for title
		form.on('field', function(name, val) {
			console.log('field name: ' + name);
			console.log('field val: ' + val);
		});

		form.on('file', function(name, file) {
			console.log('size: '+ file.size);
			console.log("name: " + name);
			console.log("file path: " + file.path);
			console.log("file origin name: " + file.originalFilename);
			fs.renameSync(file.path, path + file.originalFilename);

			console.log('uploading');
			client.uploadFile(NOS_BUCKET_NAME, path + file.originalFilename, file.originalFilename, function(err) {
				if (err) {
					res.send({
						code: 1,
						message: '上传失败',
						data: null
					});
				} else {
					var link = "http://" + NOS_HOST + '/' + NOS_BUCKET_NAME + '/' + file.originalFilename;
					res.send({
						code: 0,
						message: '上传成功',
						data: link,
						size : (file.size / (1024 * 1024)).toFixed(2) + 'M'
					});
				}
			});
		});
		form.parse(req);
	},
	//
	assign: assign,
	//
	responseFormat: responseFormat,
	//
	debug: config.debug ? console.info : function(){},
	//
	warn: config.debug ? console.info : function(){},
	//
	error: config.debug ? console.info : function(){},
	//
	params2array: function(params){
		var array = [], temp = {}, head;

		_.forEach(params, function(vals, name){
			temp[name] = vals.split(',');
			head = head || temp[name];
		});

		_.forEach(head, function(){
			array.push({});
		});

		_.forEach(temp, function(vals, name){
			_.forEach(vals, function(val, index){
				var item = array[index];
				item[name] = val;
			});
		});

		return array;
	}
};

module.exports = tools;
