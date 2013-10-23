UserSchema.methods.update = function(data, callback) {
    	var loggedemail = this.email;
    	var userobj 	= this;
    	User.find({
    				$and:[
    					{email:data.email},
    					{email:{$ne:loggedemail}}	
    				]
				}, function(err, user) {
					if (err) {
						return callback(err);
					}
					if (Object.keys(user).length > 0) {
							//return callback(null, user);
							return callback(app.newTSVError('Email is already in use.')); 
					}
			_.extend(userobj, data);
			userobj.save(callback);
			return callback(null);
		});
    };
    UserSchema.statics.resendVerification = function(email, callback) {
        this.findOne({
            email:email
        }, function(err, user) {
            if (err) {
                return callback(err);
                //return callback && callback(err);
            }
            if (!user) {
                return callback(app.newTSVError('Email not found.'))
                //return callback && callback(app.newTSVError('Email not found.'))
            }
            notify.sendAccountVerifyEmail(email, app.config.baseUrl + '/#/confirmEmail/' + user.token);            
            return callback(null);
            //return callback && callback(null);
        });
    };
