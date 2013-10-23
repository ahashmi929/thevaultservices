tsv.model = (function() {
    var model = {
        timeout:60000
    };
    var baseUrl = model.baseUrl = window.location.protocol + "//" + window.location.host;
    var forceNoCache = false;
    var cache = {};
    var session = null;

    var send = function(method, path, data, callback) {
        $('#loadingIndicator').show();
        setTimeout(function() { //let the screen draw
            var url = baseUrl + path;
            tsv.log('model ' + method + ' ' + url);
            if (!forceNoCache && cache[url]) {
                tsv.log('from CACHE');
                $('#loadingIndicator').hide();
                return callback(null, cache[url]);
            }
            var options = {
                type:method,
                url: url,
                data:data,
                headers:session ? {'x-session':session} : {},
                success: function(json) {
                    if (json && json.session) {
                        session = json.session;
                    }
                    $('#loadingIndicator').hide();
                    forceNoCache = false;
                    tsv.log('!!!!caching url = ' + url);
                    cache[url] = json;
                    if (json.toast) {
                        bootbox.alert(json.toast);
                    }
                    callback(null, json);
                },
                error:function(xhr, textStatus, error) {
                    $('#loadingIndicator').hide();
                    var status = xhr.status;
                    tsv.log('error status code=' + status);
                    tsv.log('error textStatus=' + textStatus);
                    if (status === 400) {
                        tsv.log('got 400 with text=' + xhr.responseText);
                        tsv.presenter.displayErrorMessage(JSON.parse(xhr.responseText));
                    } else if (status === 401) {
                        tsv.presenter.handleUnauthorized();
                    } else if (status === 403) {
                        tsv.presenter.handleForbidden();
                    } else {
                        tsv.presenter.displayBigProblem();
                    }
                    return callback({});
                }
            };
            $.ajax(options);
        }, 0);
    };

    var post = function(path, data, callback) {
        forceNoCache = true;
        send('POST', path, data, callback);
    };

    var get = function(path, callback) {
        send('GET', path, null, callback);
    };

    model.get = get;

    var flatParamsToJson = function(params) {
        return JSON.parse('{"' + decodeURIComponent(params).replace(/\+/g, ' ').replace(/&/g, "\",\"").replace(/=/g, "\":\"") + '"}');
    };

    model.scheduleForceLoad = function() {
        forceNoCache = true;
    };

    model.usStates = function(callback) {
        get('/usStates', callback);
    };

    model.account = (function() {
        var account = {
            current:{},
            bank:{}
        };

        account.login = function(email, password, callback) {
            forceNoCache = true;
            post('/account/login',{email: email, password: password}, function(err, account) {
                model.account.current = account || {};
                callback(err, account);
            });
        };
        
        account.resendVerification = function(email, callback) {
            forceNoCache = true;
            get('/account/resendVerfication?email=' + email, callback);
        };

        account.resetPassword = function(email, callback) {
            forceNoCache = true;
            get('/account/resetPassword?email=' + email, callback);
        };

        account.logout = function() {
            forceNoCache = true;
            account.current = {};
            account.bank = {};
        };
        
        account.validateEmail = function(email, callback) {
            forceNoCache = true;
            get('/account/validateEmail?email=' + email, callback);
        };

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

        account.changePassword = function(password, callback) {
            forceNoCache = true;
            get('/account/changePassword?password=' + password, callback);
        };

        account.create = function(data, callback) {
            forceNoCache = true;
            get('/account/create?' + data, callback);
        };

        account.confirmEmail = function(token, callback) {
            forceNoCache = true;
            get('/account/verify?token=' + token, callback);
        };

        account.timezones = function(callback) {
            get('/timezones', callback);
        };

        account.updateBankAccount = function(data, callback) {
            post('/account/saveBankAccount', data, function(err) {
                if (err) {
                    return callback(err);
                }
                $.extend(account.bank, flatParamsToJson(data));
                return callback(null);
            });
        };

        account.getBankAccount = function(callback) {
            forceNoCache = true;
            get('/account/bankAccount', function(err, bank) {
                if (err) {
                    return callback(err);
                }
                tsv.log('bank='+bank+'BBB')
                account.bank = bank || {};
                tsv.log('bank='+bank+'BBB')
                return callback(null, bank);
            });
        };

        return account;
    })();

    model.nacha = (function() {
        var nacha = {};

        nacha.generateFile = function(callback) {
            forceNoCache = true
            get('/admin/nachaFiles/generate', callback);
        }

        return nacha;

    })();

    model.statements = (function() {
        var statements = {};

        statements.generate = function(callback) {
            forceNoCache = true;
            get('/admin/statements/generate', callback);
        }

        return statements;

    })();

    model.fees = (function() {
        var fees = {};

        fees.save = function(id,status,callback) {
            forceNoCache = true;
            get('/admin/fees/'+id+'/save?status='+status, callback);
        }

        return fees;

    })();

    model.jobs = (function() {
        var jobs = {
            current:[]
        };

        jobs.get = function(callback) {
            forceNoCache = true;
            get('/projects', function(err, jobs) {
                if (err) {
                    return callback(err);
                }
                model.jobs.current = jobs;
                tsv.log('jobs=' + JSON.stringify(jobs));
                callback(err, jobs);
            });
        };

        jobs.create = function(data, callback) {
            forceNoCache = true;
            get('/project/create?' + data, callback);
        };

        return jobs;
    })();

    model.job = (function() {
        var job = {
            current:null
        };

        job.get = function(id, callback) {
            forceNoCache = true;
            get('/project/' + id, function(err, job) {
                if (err) {
                    return callback(err);
                }
                model.job.current = job;
                callback(err, job);
            });
        };

        job.cancel = function(id, callback) {
            forceNoCache = true;
            get('/project/' + id + '/cancel', callback);
        };

        job.requestFunds = function(id, amount, attachmentPath, callback) {
            forceNoCache = true;
            get('/project/' + id + '/requestFunds?amount=' + amount+ '&attachmentPath='+attachmentPath, callback);
        };

        job.requestPayment = function(id, amount, attachmentPath, callback) {
            forceNoCache = true;
            get('/project/' + id + '/requestPayment?amount=' + amount+ '&attachmentPath='+attachmentPath, callback);
        };

        job.requestRefund = function(id, amount, attachmentPath, callback) {
            forceNoCache = true;
            get('/project/' + id + '/requestRefund?amount=' + amount+ '&attachmentPath='+attachmentPath, callback);
        };

        job.addFunds = function(id, amount, attachmentPath, callback) {
            forceNoCache = true;
            get('/project/' + id + '/addFunds?amount=' + amount+ '&attachmentPath='+attachmentPath, callback);
        };

        job.makePayment = function(id, amount, attachmentPath, callback) {
            forceNoCache = true;
            get('/project/' + id + '/makePayment?amount=' + amount+ '&attachmentPath='+attachmentPath, callback);
        };

        job.makeRefund = function(id, amount, attachmentPath, callback) {
            forceNoCache = true;
            get('/project/' + id + '/makeRefund?amount=' + amount+ '&attachmentPath='+attachmentPath, callback);
        };

        job.approveRequest = function(requestId, callback) {
            forceNoCache = true;
            get('/request/' + requestId + '/approve', callback);
        };

        job.denyRequest = function(requestId, callback) {
            forceNoCache = true;
            get('/request/' + requestId + '/deny', callback);
        };

        job.cancelRequest = function(requestId, callback) {
            forceNoCache = true;
            get('/request/' + requestId + '/cancel', callback);
        };

        job.resendRequest = function(requestId, callback) {
            forceNoCache = true;
            get('/request/' + requestId + '/resend', callback);
        };

        job.otherPartyInfo = function(id, callback) {
            forceNoCache = true;
            get('/project/' + id + '/otherPartyInfo', callback);
        };

        return job;
    })();

    return model;
})();