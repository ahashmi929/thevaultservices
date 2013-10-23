account.update = function(data, callback) {
            forceNoCache = true;
            get('/account/update?' + data, function(err, user) {
                if (err) {
                    return callback(err);
                }
                if(user){
                	return callback(null,user);
                }
                $.extend(account.current, flatParamsToJson(data));
                return callback(null);
            });
        };
   account.validateEmail = function(email, callback) {
            forceNoCache = true;
            get('/account/validateEmail?email=' + email, callback);
        };
      account.resendVerification = function(email, callback) {
            forceNoCache = true;
            get('/account/resendVerfication?email=' + email, callback);
        };
