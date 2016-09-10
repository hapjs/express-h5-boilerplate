var config = {	// 数据库信息
	database: {
		test: {
			"host": 'mysql.xxx.com',
			"database": "xxx",
			"user": "yyy",
			"password": "zzz"
		},
		prod: {
            "host": 'mysql.xxx.com',
            "database": "xxx",
            "user": "yyy",
            "password": "zzz"
		},
	}[env],
};

module.exports = config;