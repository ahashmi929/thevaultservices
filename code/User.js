module.exports = function(model) {
    var notify = require('./notify')(model);
    var bcrypt = require('bcrypt');
    var crypto = require('crypto');
    var tsv = require('../lib/tsv.js');
    var usStates = require('./usStates.js');
    var Schema = mongoose.Schema, ObjectId = Schema.ObjectId;

    var encrypt = function(value) {
        return bcrypt.hashSync(value, bcrypt.genSaltSync(10));
    };
    var generateHash = function() {
        var shasum = crypto.createHash('sha1');
        shasum.update(new Date().getTime().toString());
        return shasum.digest('hex').toString();
    };
    var cleansePhoneNumber = function(number) {
        return number ? number.replace(/\D/g, '') : null;
    };

    var UserSchema = new Schema({
        firstName: {
            type:String,
            index:true,
            required:true
        },
        lastName: {
            type:String,
            index:true,
            required:true
        },
        companyName: {
            type:String,
            index:true,
            required:false
        },        
        address: {
            type:String,
            index:true,
            required:true
        },
        city: {
            type:String,
            index:true,
            required:true
        },
        state: {
            type:String,
            enum:usStates.enum,
            index:true,
            required:true
        },
        zipcode: {
            type:String,
            index:true,
            required:true
        },
        email: {
            type: String,
            required:true,
            unique: true,
			lowercase: true
        },
        mobile: {
            type: String,
            index: true,
            required:true,
            set:cleansePhoneNumber
        },
        password:{
            type:String,
            required:true,
            set: encrypt
        },
        timezoneOffset:{
            type:String,
            enum: ['-4', '-5', '-6', '-7', '-8', '-9', '-10'],
            'default':'-5'
        },
        promocode: {
            type:String,
            required:false,
            index:true
        },
        token: {
            type: String,
            index: true
        },
        verified:{
            type:Boolean,
            'default':false
        },
        active:{
            type:Boolean,
            'default':false
        },
        fees:{
            type:Boolean,
            'default':true
        },
        admin:{
            type:Boolean,
            'default':false
        },
        defaultRole:{
            type:String,
            enum: ['customer','serviceProvider'],
            'default':'serviceProvider'
        },
        createdAt: defaultDate
    });
    UserSchema.pre('save', function(next) {
        tsv.log('-> record isNew? ' + this.isNew);
        if (this.isNew) {
            this.token = generateHash();
            tsv.log('token = ' + this.token);
        }
        return next();
    });

    var doCreate = function(data, callback) {
        model.User.findOne({
            email:data.email
        }, function(err, user) {
            if (err) {
                return callback(err);
            }
            if (user) {
                return callback(app.newTSVError('Email is already taken.'));
            }
            delete data['confirmPassword'];
            var user = new User(data);
            user.save(function(err) {
                if (err) {
                    return callback(err);
                }
                if (user.verified == false) {
                    notify.sendAccountVerifyEmail(data.email, app.config.baseUrl + '/#/confirmEmail/' + user.token);
                } else {
                    // pre-verified by invite email
                    parseProjectsForInvites(user);
                }

                notify.sendSignupNoticeEmail(user,function(err,c) {
                  if (err) {
                    tsv.log("email err:" + err);
                  }
                });
                return callback(null, buildUser(user));
            });
        });
    };

    UserSchema.statics.create = function(data, callback) {
        return doCreate(data, callback);
    };

    var parseProjectsForInvites = function(user) {
        model.Project.find({
            invitedEmail:user.email
        }, function(err, projects) {
            if (projects.length > 0) {
                _.each(projects, function(project, index) {
                    var notifyUserId;

                    if (project.customer) {
                        project.service = user;
                        user.defaultRole = "serviceProvider";
                        notifyUserId = project.customer;
                    } else {
                        project.customer = user;
                        user.defaultRole = "customer";
                        notifyUserId = project.service;
                    }

                    user.save();

                    if (user.state == "CA") {
                        project.status = 'cancelled';
                        project.save();
                        notify.sendProjectCancelledCaliforniaEmail(user,project);
                        console.log("cancel and send condolences");
                    } else {
                        project.status = 'waiting';
                        project.save();
                        notify.sendInvitationAcceptedEmail(notifyUserId, user, project);
                        notify.sendInvitationAcceptedSms(notifyUserId, user, project);
                    }
                });
            }
        });
    };

    var buildUser = function(user,acct) {
        var data = JSON.parse(JSON.stringify(user));
        data.id = data._id;
        if (typeof(acct) !== 'undefined') {
            var ba = JSON.parse(JSON.stringify(acct))
            if (ba) {
                delete ba['logs']
                delete ba['currentVerificationChecks']
                data['bankAccount'] = ba
            } else {
                data['bankAccount'] = null
            }
        }
        delete data['_id'];
        delete data['token'];
        delete data['password'];
        return data;
    };

    UserSchema.statics.login = function(email, password, callback) {
        this.findOne({
            email: new RegExp('^'+RegExp.quote(email)+'$',"i")
        }, function(err, user) {
            if (err) {
                return callback(err);
            }
            if (!user) {
                return callback(app.newTSVError('Login Failed.'));
            }
            user.verifyPassword(password, function(err) {
                if (err) {
                    return callback(err);
                }
                if (!user.verified) {
                    return callback(app.newTSVError('This email address has not yet been verified.  If this is your email account, please go to your inbox and click on the "Verify" button in the email sent to you from TheServiceVault.'));
                }
                if ((user.state == 'CA')) {
                    return callback(app.newTSVError('We appreciate your interest in The Service Vault and are working diligently to get through the California Internet Escrow Licensing process. We will notify you by email as soon as we do.'));
                } else if (!user.active) {
	    			return callback(app.newTSVError('We appreciate your interest in The Service Vault Please contact us at 888-884-4780 to become a participant.'));
				}
                model.BankAccount.findOne({user:user},function(err,acct) {
                    return callback(null, buildUser(user,acct));
                })
            });
        });
    };
    UserSchema.statics.verifyToken = function(token, callback) {
        this.findOne({
            token:token
        }, function(err, user) {
            if (err) {
                return callback(err);
            }
            if (user) {
                user.verified = true;
                user.active = user.active || app.config.isDev;
                return user.save(function(err) {
                    if (err) {
                        return callback(err);
                    }
                    if (!app.config.isDev) {
                        model.BetaInvite.isInvited(user.email, function(err, isInvited) {
                            if (err) {
                                return callback(err);
                            }
                            if (!isInvited && user.state == 'CA') {
                                return callback(app.newTSVError('Account Confirmed.  Thank you for signing up!   We are not yet licensed to do business in the State of California.  We will notify you by email as soon as we have completed the licensing process and we will activate your account at that time.'));
                            }
                            if (!isInvited) {
                                return callback(app.newTSVError('Account Confirmed. A representative from The Service Vault will contact you within 48 hours to discuss your participation in The Service Vault.'));
                            }
                            user.active = true;
                            user.save(function(err, user) {
                                if (err) {
                                    return callback(err);
                                }
                                return callback(null, buildUser(user));
                            });
                        });
                    } else {
                        callback(null, buildUser(user));
                    }
                    parseProjectsForInvites(user);
                });
            }
            return callback(app.newTSVError('Invalid Token.'));
        });
    };
    UserSchema.methods.findUser = function(email, callback) {
        User.findOne({
            email:email
        }, callback);
    };
    UserSchema.methods.findVerifiedUser = function(email, callback) {
        User.findOne({
            email:email,
            verified:true
        }, callback);
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
    UserSchema.statics.resetPassword = function(email, callback) {
        this.findOne({
            email:email
        }, function(err, user) {
            if (err) {
                return callback(err);
            }
            if (!user) {
                return callback(app.newTSVError('Email not found.'))
            }
            var hash = generateHash().slice(0, 6);
            user.password = hash;
            user.save(function(err) {
                if (err) {
                    return callback(err);
                }
                notify.sendResetPasswordEmail(email, hash);
                return callback(null);
            });
        });
    };
    UserSchema.methods.verifyPassword = function(password, callback) {
        var user = this;
        bcrypt.compare(password, user.password, function (err, didSucceed) {
            if (err) {
                return callback(err);
            }
            if (didSucceed) {
                return callback(null, user);
            }
            return callback(app.newTSVError('Login Failed.'));
        });
    };
    UserSchema.methods.validateEmail = function(email, callback) {
        this.findOne({
            email:email
        }, function(err, user) {
        	if (err) {
            	//return callback(app.newTSVError('Common Error.'));
                return callback(err);
            }
            if (!user) {
                return callback(app.newTSVError('Email not found error.'));
                //return callback(null);
            }
            return callback(app.newTSVError('Email has been found error.'));
            //return callback(null, user);
        });
    };
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
    UserSchema.methods.saveBankAccount = function(properties, callback) {
        model.BankAccount.save(this, properties, callback);
    };
    UserSchema.methods.getBankAccount = function(callback) {
        model.BankAccount.findOne({
            user:this
        }, callback);
    };
    UserSchema.methods.changePassword = function(password, callback) {
        this.password = password;
        this.save(callback);
    };
    UserSchema.methods.createProject = function(accountType, email, description, amount, attachment, callback) {
        model.Project.create(this, accountType, email, description, amount, attachment, callback);
    };
    UserSchema.methods.getProject = function(projectId, callback) {
        var user = this;
        model.Project.findOne({
            _id:projectId
        }, function(err, project) {
            if (err) {
                return callback(err);
            }
            if (!project) {
                return callback(app.newTSVError('Project not found.'));
            }
            project.validateUser(user, callback);
        });
    };
    UserSchema.methods.cancelProject = function(projectId, callback) {
        model.Project.cancel(this, projectId, callback);
    };
    UserSchema.methods.addFunds = function(projectId, amount, attachment, callback) {
        var user = this;
        return model.BankAccount.findOne({
            user:user
        }, function(err, bankAccount) {
            if (!bankAccount) {
                return callback(app.newTSVError('You must configure a bank account before adding funds'));
            } else if (bankAccount.status == 'unverified' || bankAccount.status == 'locked') {
                return callback(app.newTSVError('You must verify your bank account before adding funds.'))
            } else {
                model.Project.makeTransaction(user, projectId, 'fund', amount, attachment, callback);
            }
        });
    };
    UserSchema.methods.makePayment = function(projectId, amount, attachment, callback) {
        model.Project.makeTransaction(this, projectId, 'payment', amount, attachment, callback);
    };
    UserSchema.methods.makeRefund = function(projectId, amount, attachment, callback) {
        model.Project.makeTransaction(this, projectId, 'refund', amount, attachment, callback);
    };
    UserSchema.methods.requestFunds = function(projectId, amount, attachment, callback) {
        model.Project.makeRequest(this, projectId, 'fund', amount, attachment, callback);
    };
    UserSchema.methods.requestPayment = function(projectId, amount, attachment, callback) {
        model.Project.makeRequest(this, projectId, 'payment', amount, attachment, callback);
    };
    UserSchema.methods.requestRefund = function(projectId, amount, attachment, callback) {
        model.Project.makeRequest(this, projectId, 'refund', amount, attachment, callback);
    };
    UserSchema.methods.approveRequest = function(transactionId, callback) {
        model.Project.processRequest(this, transactionId, 'sent', callback);
    };
    UserSchema.methods.denyRequest = function(transactionId, callback) {
        model.Project.processRequest(this, transactionId, 'denied', callback);
    };
    UserSchema.methods.cancelRequest = function(transactionId, callback) {
        model.Project.processRequest(this, transactionId, 'cancelled', callback);
    };
    UserSchema.methods.resendRequest = function(transactionId, callback) {
        model.Project.processRequest(this, transactionId, 'requested', callback);
    };
    UserSchema.methods.otherPartyInfo = function(projectId, callback) {
        model.Project.otherPartyInfo(this, projectId, callback);
    };
    UserSchema.methods.projects = function(callback) {
        var user = this;
        model.Project.buildProjects(user, 'service', function(err, data) {
            if (err) {
                return callback(err);
            }
            var result = data;
            model.Project.buildProjects(user, 'customer', function(err, data) {
                if (err) {
                    return callback(err);
                }
                result.projects = result.projects.concat(data.projects);
                result.statusCounts.inprogress += data.statusCounts.inprogress;
                result.statusCounts.waiting += data.statusCounts.waiting;
                result.statusCounts.complete += data.statusCounts.complete;
                result.statusCounts.cancelled += data.statusCounts.cancelled;
                return callback(null, result);
            });
        });
    };
    UserSchema.methods.canDownloadAttachment = function(transactionId, callback) {
        var user = this;
        model.Transaction.getTransaction(transactionId, function(err, transaction) {
            if (err) {
                return callback(err);
            }
            return callback(null, transaction.hasPermission(user) ? transaction : null);
        });
    }
    UserSchema.methods.verifyBankAccount = function(id, amounts, callback) {
        var user = this;

        model.BankAccount.findOne({_id: id}, function(err, acct) {

            // verify that we found the account
            if (err) {
                return callback(err);
            }

            if (!acct) {
                return callback(app.newTSVError("Bank account not found"))
            }

            // verify that current user owns the account
            if (acct.user.toString() != user._id.toString()) {
                return callback(app.newTSVError("You do not have permissions for this account."))
            }

            // this happens after 4 failed attempts
            if (acct.status == 'locked') {
                return callback(app.newTSVError("For your protection, your account has been locked due to an excessive number of failed verification attempts.  Please contact support at 888-884-4780 or send an email request to exceptions@theservicevault.net to remove this lock and re-verify your account."))
            }

            // find bank_verification transactions
            var transactions = _.pluck(acct.currentVerificationChecks,'amount')

            var matches = 0

            var transAmts = []
            _.each(transactions,function(t) {
                transAmts.push(parseFloat(t))
            })

            // get our data sanitized
            var floatAmts = []
            _.each(amounts,function(amt) {
                floatAmts.push(parseFloat(amt))
            })

            matches = _.intersection(floatAmts, transAmts).length

            // set account as verified
            if (matches >= 2) { // it can be greater if both values are the same...since they both match both times in the above each loop nest
                acct.status = 'verified';
                acct.currentVerificationChecks = []
            } else {
                acct.verificationAttempts++;
                if (acct.verificationAttempts >= 4) {
                    acct.status = 'locked';
                }
            }

            acct.save(function(err) {

                if (matches >= 2) {
                    return callback(null,acct);
                } else if (acct.verificationAttempts >= 4) {
                    return callback(app.newTSVError("For your protection, your account has been locked due to an excessive number of failed verification attempts.  Please contact support at 888-884-4780 or send an email request to exceptions@theservicevault.net to remove this lock and re-verify your account."))
                } else {
                    return callback(app.newTSVError("Verification checks do not match"));
                }


            });


        })

    }

    var User = model.User = mongoose.model('User', UserSchema);
}