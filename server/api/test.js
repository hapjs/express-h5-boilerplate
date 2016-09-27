
module.exports = {
	
	'/updateRow': function(req, res, params, opt) {
		this.updateRow({
			res: res,
			table: 't_test',
			value: {
				name: '10170'
			},
			where: {
				id: '10170'
			},
			success: opt.success,
			error: opt.error
		});
	},

	'/deleteRow': function(req, res, params, opt){
		this.deleteRow({
			res: res,
			table: 't_test',
			where: { id: '10166' },
			success: opt.success,
			error: opt.error
		});
	},

	'/insertRow': function(req, res, params, opt){
		this.insertRow({
			res: res,
			table: 't_test',
			value: { name: '0' },
			success: opt.success,
			error: opt.error
		});
	},

	'/sql': function(req, res, params, opt){
		this.getRows({
			res: res,
			size: 0,
			table: 't_pro',
			where: {
				name: 'like ' + req.headers.token,
			},
			success: opt.success,
			error: opt.error
		});
	},

	'/xss': function(req, res, params){
		res.send(params);
	},

	'/userinfo': function(req, res, params, opt){
		res.send(opt.userinfo);
	},

	'/list': {
		// 参数字段
		fields: [
			// 参数名name，验证规则required
			'name:required', 
			// 参数名date，验证规则date
			'date:date',
			// 指定参数的中文名称、校验规则、以及值处理函数
			{
				key: 'hahaha',
				// label主要用于校验失败时的提示信息
				label: '哈哈哈',
				// 验证规则可以有多个，可以是内置的require之类，也可以是自定义的函数
				valid: [
					// 必填
					'require',
					// 自定义验证规则，如果返回一个字符串则表示错误信息，如无表示验证通过 
					function(val, field){
						return val.match(/^\d{4}-\d{2}-\d{2}$/) ? null : field.label + '字段必须是日期格式';
					}
				],
				// 对params取得的值进行修改，再返回给程序
				value: function(val, field){
					return val;
				}
			}
		],
		// 处理函数
		router: function(req, res, params, opt) {

			this.getRows({
				res: res,
				page: params.page,
				size: params.size,
				table: 't_test',
				orderBy: 'id',
				success: opt.success,
				error: opt.error
			});
		}
	},

	'/yy': function(req, res, params, opt){
		// yy ---> list
		this.run('test/list', req, res, params, opt);
	},

	'/xx': function(req, res, params, opt){
		// xx ---> yy
		this.run('test/yy', req, res, params, {
			success: function(data){
				/* 输出结果
				{
				  "code": 0,
				  "message": "操作成功",
				  "data": {
				    "yy": {
				      "size": 20,
				      "page": 1,
				      "total": 0,
				      "list": []
				    }
				  }
				}
				*/
				this.success(res, {
					yy: data
				});
				
			}.bind(this)
		});
	}

};
