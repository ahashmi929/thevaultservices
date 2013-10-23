tsv.presenter = (function() {
    var presenter = {};

    var lastClickTime = new Date().getTime();
    presenter.open = function() {
        $('#actions li').live({
            click:function(e) {
                $('#actions li').attr('class', '');
                $(this).attr('class', 'active');
                $('#actionForms form').hide();
                var id = $(this).attr('id');
                $('#' + id + 'Form').show();
                return false;
            }
        });
        $('a').live({
            click: function(e) {
                if (!$(this).attr('href')) {
                    return true;
                }
                var href = $(this).attr('href').split('#/')[1];
                if (typeof(href) !== 'undefined') {
                    tsv.log("Got for "+href);
                    _gaq.push(['_trackPageview',"/#"+href]);
                }
                tsv.log('href=' + href + ' and hash=' + hasher.getHash());
                if (href === hasher.getHash()) {
                    //allow clicking twice, but only if 1 second has passed
                    var dif = new Date().getTime() - lastClickTime;
                    if (dif > 1000) {
                        crossroads.parse(href);
                    } else {
                        e.preventDefault();
                        return false;
                    }
                }
                lastClickTime = new Date().getTime();
            }
        });
        $('#loginNav a').click(function() {
            $('#loginNav dd').attr('class', '');
            $(this).parent('dd').attr('class', 'selected');
            $('#content').children().hide();
            $('.error').hide();
        });
        $('#jobsNav a').click(function() {
            $('#jobsNav dd').attr('class', '');
            $(this).parent('dd').attr('class', 'selected');
            $('#content').children().hide();
            $('.error').hide();
        });

        loadAdaptConfig();
        loadTemplates();
        loadRoutes();
        loadHasher();
        loc = window.location.href.split("/")[3]
        crossroads.parse(loc || "account/login")
    };

    var loadRoutes = function() {

        crossroads.addRoute("admin",                        ServiceVault.Controllers.Admin.index);
        crossroads.addRoute("admin/dashboard",              ServiceVault.Controllers.Admin.Dashboard.index);
        crossroads.addRoute("admin/users",                  ServiceVault.Controllers.Admin.index);
        crossroads.addRoute("admin/user/{id}",              ServiceVault.Controllers.Admin.User.show);
        crossroads.addRoute("admin/projects",               ServiceVault.Controllers.Admin.project.index);
        crossroads.addRoute("admin/projects/{id}",          ServiceVault.Controllers.Admin.project.show);
        crossroads.addRoute("admin/transactions",           ServiceVault.Controllers.Admin.transactions.index);
        crossroads.addRoute("admin/transactions/{id}",      ServiceVault.Controllers.Admin.transactions.show);
        crossroads.addRoute("admin/fee/{id}/save",          ServiceVault.Controllers.Admin.transactions.saveFee);
        crossroads.addRoute("admin/nachaFiles",             ServiceVault.Controllers.Admin.nachaFiles.index);
        crossroads.addRoute("admin/nachaFiles/{id}",        ServiceVault.Controllers.Admin.nachaFiles.show);
        crossroads.addRoute("admin/statements",             ServiceVault.Controllers.Admin.statements.index);
        crossroads.addRoute("admin/betaInvites",            ServiceVault.Controllers.Admin.betaInvites.index);

        crossroads.addRoute('confirmEmail/{token}', presenter.account.confirmEmail);
        crossroads.addRoute('account/login', presenter.account.login);
        crossroads.addRoute('account/forgotPassword', presenter.account.forgotPassword);
        crossroads.addRoute('account/resetPassword', presenter.account.resetPassword);
        crossroads.addRoute('account/validateEmail', presenter.account.validateEmail);
        crossroads.addRoute('account/login/{action}/{id}', presenter.account.loginAndGoto);
        crossroads.addRoute('account/login/transaction/{id}/attachment', presenter.account.loginAndDownload);
        crossroads.addRoute('account/authenticate', presenter.account.authenticate);
        crossroads.addRoute('account/resendVerification', presenter.account.resendVerification);
        crossroads.addRoute('account/logout', presenter.account.logout);
        // weird way to override the presenter.account.register, but it works for now
        crossroads.addRoute('account/register/:promo:', function(promo) { presenter.account.register({promo:promo}) } );
        crossroads.addRoute('account/invite/{projectId}/{email}', function(projectId,email) { presenter.account.register({projectId:projectId, email:email}) } );
        crossroads.addRoute('account/create', presenter.account.create);
        crossroads.addRoute('account/confirmation', presenter.account.confirmation);
        crossroads.addRoute('tabs', presenter.tabs.show);
        crossroads.addRoute('tabs/jobs', presenter.tabs.jobs);
        crossroads.addRoute('tabs/settings', presenter.tabs.settings);
        crossroads.addRoute('tabs/accounts', presenter.tabs.accounts);
        crossroads.addRoute('account/edit', presenter.account.edit);
        crossroads.addRoute('account/update', presenter.account.update);
        crossroads.addRoute('account/password', presenter.account.password);
        crossroads.addRoute('account/changePassword', presenter.account.changePassword);
        crossroads.addRoute('bankAccount/edit', presenter.bankAccount.edit);
        crossroads.addRoute('bankAccount/update', presenter.bankAccount.update);
        crossroads.addRoute('jobs/add', presenter.jobs.add);
        crossroads.addRoute('jobs/create', presenter.jobs.create);
        crossroads.addRoute('jobs/{status}', presenter.jobs.show);
        crossroads.addRoute('job/{id}', presenter.job.show);
        crossroads.addRoute('job/{id}/tabs/project', presenter.job.show);
        crossroads.addRoute('job/{id}/tabs/otherPartyInfo', presenter.job.otherPartyInfo);
        crossroads.addRoute('job/{id}/tabs/disputes', presenter.job.disputes);
        crossroads.addRoute('job/{id}/cancel', presenter.job.cancel);
        crossroads.addRoute('job/{id}/requestFunds', presenter.job.requestFunds);
        crossroads.addRoute('job/{id}/requestPayment', presenter.job.requestPayment);
        crossroads.addRoute('job/{id}/requestRefund', presenter.job.requestRefund);
        crossroads.addRoute('job/{id}/addFunds', presenter.job.addFunds);
        crossroads.addRoute('job/{id}/makePayment', presenter.job.makePayment);
        crossroads.addRoute('job/{id}/makeRefund', presenter.job.makeRefund);
        crossroads.addRoute('job/{id}/request/{id}/approve/{type}/{amount}', presenter.job.approveRequest);
        crossroads.addRoute('job/{id}/request/{id}/deny', presenter.job.denyRequest);
        crossroads.addRoute('job/{id}/request/{id}/resend', presenter.job.resendRequest);
        crossroads.addRoute('job/{id}/request/{id}/cancel', presenter.job.cancelRequest);
        crossroads.addRoute('refresh/jobs', presenter.jobs.refresh);
        crossroads.addRoute('refresh/settings', presenter.account.refresh);
        crossroads.addRoute('refresh/job/{id}', presenter.job.refresh);

    };

    var loadHasher = function() {
        var hashChanges = function(newHash, oldHash) {
            tsv.log('hashChanges newHash=' + newHash + ' oldHash=' + oldHash);
            crossroads.parse(newHash);
        };

        hasher.initialized.add(hashChanges);
        hasher.changed.add(hashChanges);
        hasher.init();
    };

    var loadTemplates = function() {
        EJS.config({cache: false});
        presenter.loginTemplate = new EJS({url: '/view/login.ejs'});
        presenter.forgotPasswordTemplate = new EJS({url: '/view/forgotPassword.ejs'});
        presenter.jobsSummaryListTemplate = new EJS({url: '/view/jobsSummaryList.ejs'});
        presenter.newJobTemplate = new EJS({url: '/view/newJob.ejs'});
        presenter.tabsTemplate = new EJS({url: '/view/tabs.ejs'});
        presenter.settingsTemplate = new EJS({url: '/view/settings.ejs'});
        presenter.accountsTemplate = new EJS({url: '/view/accounts.ejs'});
        presenter.accountTemplate = new EJS({url: '/view/account.ejs'});
        presenter.accountConfirmationTemplate = new EJS({url: '/view/accountConfirmation.ejs'});
        presenter.changePasswordTemplate = new EJS({url: '/view/changePassword.ejs'});
        presenter.jobMoneyTemplate = new EJS({url: '/view/jobMoney.ejs'});
        presenter.projectTabsTemplate = new EJS({url: '/view/projectTabs.ejs'});
        presenter.otherPartyInfoTemplate = new EJS({url: '/view/otherPartyInfo.ejs'});
        presenter.disputesTemplate = new EJS({url: '/view/disputes.ejs'});
        tsv.log('templates loaded');
    };

    var loadAdaptConfig = function() {
        var ADAPT_CONFIG = {
            path: 'style/',
            dynamic: false,
            callback: function(i, width) {
                tsv.log('window size set type=' + i);
            },
            range: [
                '0px to 600px = blank.css',
                '600px = blank.css'
            ]
        };
        adaptjs(ADAPT_CONFIG);
    };

    presenter.tabs = (function() {
        var tabs = {};

        var updateSelectedTab = function(selector) {
            $('#tabs li').attr('class', '');
            $(selector).attr('class', 'active');
        };

        tabs.show = function() {
            $('#headerNav').hide();
            $('#dropdownName').html(tsv.model.account.current.firstName + ' ' + tsv.model.account.current.lastName);
            $('#headerDropdown').show();
            if (tsv.model.account.current.admin == true) {
                $('#headerDropdown').find("#adminLink").html('<a href="/admin">Admin</a></li>')
                $('#headerDropdown').find("#adminLink").show();
            }
            $('#content').html(presenter.tabsTemplate.render({
                account:tsv.model.account.current
            }));
            tsv.model.scheduleForceLoad();
            tabs.jobs();
        };

        tabs.jobs = function() {
            updateSelectedTab('#jobsTab');
            presenter.jobs.show('all');
        };

        tabs.settings = function() {
            presenter.tabs.show();
           	updateSelectedTab('#settingsTab');
           	presenter.account.show();
        };

        tabs.accounts = function() {
            presenter.tabs.show();
            updateSelectedTab('#accountsTab');
            presenter.bankAccount.show();
        };

        return tabs;
    })();

    var updateSelectedSubnav = function(selector) {
        $('.subnav li').attr('class', '');
        $(selector).attr('class', 'active');
    };

    presenter.updateSelectedSubnav = updateSelectedSubnav;

    presenter.account = (function() {
        var account = {};
        var afterLoginUrl = null;
        var afterLoginDownloadUrl = null;
        var loginFailedCount = 0;

        var handleEnter = function (e) {
            if (e.keyCode == 13) {
                account.authenticate();
            }
        };

        account.login = function() {
            $('#content').html(presenter.loginTemplate.render());
            $('#email').focus();
            $('#password').keydown(handleEnter);
        };

        account.loginAndGoto = function(action, id) {
            afterLoginUrl = action + '/' + id;
            account.logout();
        };

        account.loginAndDownload = function(transactionId) {
            afterLoginDownloadUrl = '/transaction/' + transactionId + '/attachment';
            account.logout();
        };

        account.forgotPassword = function(email) {
            $('#content').html(presenter.forgotPasswordTemplate.render({email:email}));
        };

        account.resetPassword = function() {
            var email = $('#email').attr('value');
            tsv.model.account.resetPassword(email, function(err, json) {
                if (!err) {
                    bootbox.alert('Your password was reset successfully.  A new password was sent to ' + email);
                    account.login();
                }
            });
        };

        account.confirmEmail = function(token) {
            tsv.model.account.confirmEmail(token, function(err) {
                if (!err) {
                    bootbox.alert('Account confirmed.  Please log in below to continue to your account.');
                }
                presenter.account.login();
            });
        };

        account.authenticate = function() {
            var email = $('#email').attr('value');
            email = email === '' ? null : email;
            var password = $('#password').attr('value');
            password = password === '' ? null : password;
            //tsv.model.account.login(email || 'btknorr@gmail.com', password || 'test', function(err, json) {
            tsv.model.account.login(email, password, function(err, json) {
            	if (!err) {
                    if (afterLoginUrl) {
                        hasher.setHash(afterLoginUrl);
                        afterLoginUrl = null;
                        return;
                    }
                    if (afterLoginDownloadUrl) {
                        window.location = afterLoginDownloadUrl;
                        afterLoginDownloadUrl = null;
                        return setTimeout(function() {
                            hasher.setHash('tabs');
                        }, 1000);
                    }
                    return hasher.setHash('tabs');
                }
                loginFailedCount += 1;
                if (loginFailedCount === 3) {
                    loginFailedCount = 0;
                    $("#forgot-password-helper").show();
                }
            });
        };

        account.logout = function() {
            tsv.model.account.logout();
            $('#headerDropdown').hide();
            $('#headerNav').show();
            $('#dropdownName').html('');
            account.login();
        };

        account.register = function(query) {
            var presetPromo = '';
            var projectId = '';
            var email = '';
            if (query.promo){
                presetPromo = query.promo;
            } else {
                projectId = query.projectId;
                email = query.email
                tsv.log("project "+projectId + " for " + email);
            }
            tsv.model.account.timezones(function(err, timezones) {
                if (err) {
                    return;
                }
                tsv.model.usStates(function(err, states) {
                    if (err) {
                        return;
                    }
                    $('#content').html(presenter.accountTemplate.render({
                        account:{email:email},
                        isNew:true,
                        timezones:timezones,
                        states:states,
                        admin:false,
                        queryStringPromo:presetPromo,
                        projectId: projectId
                    }));
                    $('#tocCheck').click(function(e) {
                        $('#toc').attr('value', this.checked);
                    });
                    $('#accountForm').isHappy({
                        submitButton:'#accountForm .form-actions a',
                        fields: {
                            '#firstName': {
                                required: true,
                                message: 'Required'
                            },
                            '#lastName': {
                                required: true,
                                message: 'Required'
                            },
                            '#email': {
                                required: true,
                                message: 'Please enter a valid email',
                                test:happy.email
                            },
                            '#mobile': {
                                required: true,
                                message: 'Please enter a valid U.S. phone number',
                                test:happy.USPhone
                            },
                            '#address': {
                                required: true,
                                message: 'Required'
                            },
                            '#city': {
                                required: true,
                                message: 'Required'
                            },
                            '#state': {
                                required: true,
                                message: 'Required'
                            },
                            '#zipcode': {
                                required: true,
                                message: 'Required'
                            },
                            '#password': {
                                required: true,
                                message: 'Password must be at least 6 characters.',
                                test:happy.password
                            },
                            '#confirmPassword': {
                                required: true,
                                message: 'Password must be at least 6 characters.',
                                test:happy.password
                            },
                            '#timezone': {
                                required: true,
                                message: 'Required'
                            },
                            '#toc': {
                                test:happy.yes,
                                arg:'Please accept the Terms of Service',
                                message: '*'
                            }
                        }
                    });
                });
            });
        };

        account.create = function() {
            tsv.log('CREATE ACCOUNT');
            var password = '';
            var email = '';

            if ($('#password').attr('value') !== $('#confirmPassword').attr('value')) {
                return bootbox.alert('Password and Confirm Password must match.');
            }

            if ($('#email').attr('value') !== $('#confirmEmail').attr('value')) {
                return bootbox.alert('Email and Confirm Email must match.');
            }

            password = $('#password').attr('value');
            email = $('#email').attr('value');

            // @TODO huge mass-assignment vulnerability here, but we'll take advantage of it for now
            var data = $('#accountForm').serialize();
            var verified = false;
            if ($('#projectId').attr('value')) {
                active = ($("#state").attr('value') != "CA")
                if (active) {
                    data = data + "&verified=true&active=true";
                } else {
                    data = data + "&verified=true";
                }
                tsv.log("creation string is "+data)
                verified = true;
            }
            tsv.model.account.create(data, function(err) {
                if (!err) {
                    if (verified == true) {
                        tsv.model.account.login(email, password, function(err, json) {
                            if (!err) {
                                tsv.log("logged in "+email);
                                return hasher.setHash('tabs');
                            }
                            account.login()
                        });
                    } else {
                        account.confirmation();
                    }
                }
            });
        };

        account.confirmation = function() {
            $('#content').html(presenter.accountConfirmationTemplate.render());
        };

        account.refresh = function() {
            account.show();
        };

        account.show = function() {
            $('#tabContent').html(presenter.settingsTemplate.render());
            account.edit();
        };

        account.edit = function() {
            tsv.model.account.timezones(function(err, timezones) {
                if (!err) {
                    tsv.model.usStates(function(err, states) {
                        if (err) {
                            return;
                        }
                        $('#settingsSubnavContent').html(presenter.accountTemplate.render({
                            account:tsv.model.account.current,
                            timezones:timezones,
                            isNew:false,
                            states:states,
                            admin:false
                        }));
                        updateSelectedSubnav('#account');
                        var fields = {
                            '#firstName': {
                                required: true,
                                message: 'Required'
                            },
                            '#lastName': {
                                required: true,
                                message: 'Required'
                            },
                            '#email': {
                                required: true,
                                message: 'Please enter a valid email',
                                test:happy.email
                            },
                            '#mobile': {
                                required: true,
                                message: 'Please enter a valid U.S. phone number',
                                test:happy.USPhone
                            },
                            '#address': {
                                required: true,
                                message: 'Required'
                            },
                            '#city': {
                                required: true,
                                message: 'Required'
                            },
                            '#state': {
                                required: true,
                                message: 'Required'
                            },
                            '#zipcode': {
                                required: true,
                                message: 'Required'
                            },
                            '#timezone': {
                                required: true,
                                message: 'Required'
                            }
                        };
                        $('#accountForm').isHappy({
                            submitButton:'#accountForm a',
                            fields: fields
                        });
                    });
                }
            });
        };

        account.update = function() {
        	if($("#state").attr('value') != "CA"){
        	
	            tsv.log('UPDATE ACCOUNT');
	            if ($('#email').attr('value') !== $('#confirmEmail').attr('value')) {
	                return bootbox.alert('Email and Confirm Email must match.');
	            }
	            var data = $('#accountForm').serialize();
	            /*
				tsv.model.account.validateEmail($('#email').attr('value'), function(err) {
									if (!err){ 
										bootbox.alert('Validate Email no Error.');
										$("#email-exist-err").hide();*/
				
	                	    tsv.model.account.update(data, function(err, user) {
				                if (!err) {
				                	if(Object.keys(user).length > 0){
				                		bootbox.alert(user);		
				                	}
				                	else{
				                		$("#email-exist-err").hide();
				                    	$('#dropdownName').html(tsv.model.account.current.name);
				                    	bootbox.alert('Account updated successfully.');	
				                	}
				                }
				                else{
				                	$("#email-exist-err").show();
				                	//bootbox.alert('Validate Email Error.');
				                }
		            		});
	            /*
					}
									else {
											bootbox.alert('Validate Email Error.'+$('#email').attr('value'));
											$("#email-exist-err").show();
									}
								});*/
				
	            
           }
           else{
           		 bootbox.alert('Right now, we are not licensed to do business in the State of California.'+
           		  			   'We will update our website as soon as we have completed the licensing process.'+
           		  			   ' We look forward to serving California in the near future.');
           }
        };

        account.password = function() {
            updateSelectedSubnav('#changePassword');
            $('#settingsSubnavContent').html(presenter.changePasswordTemplate.render());
            $('#changePasswordForm').isHappy({
                submitButton:'#changePassword a',
                fields: {
                    '#password': {
                        required: true,
                        message: 'Required'
                    },
                    '#confirmPassword': {
                        required: true,
                        message: 'Required'
                    }
                }
            });
        };
        
        account.resendVerification = function() {
        	tsv.model.account.resendVerification($('#email').attr('value'), function(err) {
                if (!err) {
                    bootbox.alert('Email has been sent. Verify your email.');
                    //account.confirmation();
                }
                else{
                	bootbox.alert('Email send error.');
                }
            });
        }

        account.changePassword = function() {
            if ($('#password').attr('value') !== $('#confirmPassword').attr('value')) {
                return bootbox.alert('New Password and Confirm Password must match.');
            }
            tsv.model.account.changePassword($('#password').attr('value'), function(err) {
                if (!err) {
                    bootbox.alert('Password successfully changed');
                }
            });
        };

        return account;
    })();

    presenter.bankAccount = (function() {
        var bankAccount = {};

        bankAccount.show = function() {
            $('#tabContent').html(presenter.accountsTemplate.render());
            bankAccount.edit();
        };

        bankAccount.edit = function() {

            var id = 0

            if (tsv.model.account.current.bankAccount) {
                id = tsv.model.account.current.bankAccount._id;
            }

            var bankAccount = new ServiceVault.Models.BankAccount({_id:id});
            var bankAccountView = new ServiceVault.Views.BankAccount({model:bankAccount});
            bankAccount.fetch();

            $('#accountsSubnavContent').html(bankAccountView.el);

        };

//        bankAccount.update = function() {
//            tsv.log('UPDATE bankAccount');
//            var data = $('#accountForm').serialize();
//            tsv.model.account.updateBankAccount(data, function(err) {
//                if (!err) {
//                    bootbox.alert('Bank Account updated successfully.');
//                }
//            });
//        };

        return bankAccount;
    })();

    presenter.jobs = (function() {
        var jobs = {};


        jobs.refresh = function() {
            tsv.model.scheduleForceLoad();
            jobs.show('all');
        };

        jobs.show = function(status) {

            var collect = new ServiceVault.Collections.ProjectSummary();
            var list = new ServiceVault.Views.ProjectSummaryList({collection: collect, filterType: status});
            collect.fetch();

            // @TODO move this stuff into the view
            $("#tabContent").html(list.el);
            $('#filters li').attr('class', '');
            $('#' + status).attr('class', 'active');
            $('#addJob').removeClass('active');

        };

        jobs.add = function() {
            $('#jobsSubnavContent').html(presenter.newJobTemplate.render({
                account:tsv.model.account.current
            }));
            $('#addJobForm').isHappy({
                submitButton:'#addJobFormSubmit',
                fields: {
                    '#description': {
                        required: true,
                        message: 'Required'
                    },
                    '#email': {
                        required: true,
                        message: 'Please enter a valid email',
                        test:happy.email
                    },
                    '#amount': {
                        required: true,
                        message: 'Required'
                    }
                }
            });
            tsv.model.account.getBankAccount(function(err,bank) {
                  if (((bank === undefined) || (bank._id === undefined))) {
                      $(".project-data-body").hide();
                      $("#new-job-bank-account-warning").show();
                      $("#addJobFormSubmit").on("click",function(e) {
                          e.preventDefault();
                          presenter.displayToast("Before you can create a project, you need to set up your banking information in the \"Money Sources\" tab.")
                      });
                  }
              });
            $(".accountType").change(function(e) {
                $('#addJobForm span.swappable').toggle();

            });
            $('#addJob').addClass('active');
            $('#attachment').change(function(e) {
                if (e.target.value) {
                    $('#attachment').hide();
                    $('#addJobFormSubmit').hide();
                    $('#attachmentLoading').show();
                    $('#addJobForm').submit();
                } else {
                    $('#attachmentPath').attr('value', '');
                }
            })
            $('#attachmentFrame').load(function() {
                try {
                    var result = JSON.parse(decodeURIComponent($('#attachmentFrame').contents().find('body').html()));
                    if (result.error) {
                        return bootbox.alert(result.error);
                    }
                    if (result.attachmentPath) {
                        $('#attachmentPath').attr('value', result.attachmentPath);
                        $('#attachmentLoading').hide();
                        $('#attachment').show();
                        $('#addJobFormSubmit').show();
                        return;
                    }
                    presenter.displayBigProblem();
                } catch(e) {
                }
                ;
            });
            if (tsv.model.account.current.defaultRole == 'serviceProvider') {
                $("#accountType2").click();
            }
        };


        jobs.create = function() {
            tsv.log('CREATE JOB');
            tsv.model.jobs.create($('#addJobForm').serialize(), function(err) {
                if (!err) {
                    tsv.model.scheduleForceLoad();
                    presenter.tabs.show();
                }
            });
        };

        return jobs;
    })();

    presenter.job = (function() {
        var job = {};

        var updateSelectedSubnav = function(selector) {
            $('.subnav li').attr('class', '');
            $(selector).attr('class', 'active');
        };

        var updateSelectedTab = function(selector) {
            $('#projectTabs li').attr('class', '');
            $(selector).attr('class', 'active');
        };

        job.refresh = function(id) {
            tsv.model.scheduleForceLoad();
            job.show(id);
        };

        job.show = function(id) {
          //  job.open();

            var project = new ServiceVault.Models.Project({id: id});
            var jobView = new ServiceVault.Views.Project({model:project});
            project.fetch();

            $('#content').html(presenter.projectTabsTemplate.render({
                job:project,
                account:tsv.model.account.current
            }));
            updateSelectedTab('#projectTab');

            $("#projectTabContent").html(jobView.el);

            hookUpAttachments('addFunds');
            hookUpAttachments('makePayment');
            hookUpAttachments('requestRefund');
            hookUpAttachments('requestFunds');
            hookUpAttachments('requestPayment');
            hookUpAttachments('makeRefund');
//            tsv.model.job.get(id, function(err, data) {
//                job.load(data);
//                tsv.model.account.getBankAccount(function(err,bank) {
//    				      if (((bank === undefined) || (bank._id === undefined))) {
//    					      $("ul#actions").hide();
//    					      $("#job-needs-bank-info").show();
//    				      }
//    			      });
//            });
        };

        job.open = function() {
            $('#content').html('');
        };

        var hookUpAttachments = function(prefix) {
            $('#' + prefix + 'Attachment').change(function(e) {
                if (e.target.value) {
                    $('#' + prefix + 'Attachment').hide();
                    $('#' + prefix + 'Submit').hide();
                    $('#' + prefix + 'AttachmentLoading').show();
                    $('#' + prefix + 'Form').submit();
                } else {
                    $('#' + prefix + 'AttachmentPath').attr('value', '');
                }
            });
            $('#' + prefix + 'AttachmentFrame').load(function() {
                try {
                    var result = JSON.parse(decodeURIComponent($('#' + prefix + 'AttachmentFrame').contents().find('body').html()));
                    if (result.error) {
                        return bootbox.alert(result.error);
                    }
                    if (result.attachmentPath) {
                        $('#' + prefix + 'AttachmentPath').attr('value', result.attachmentPath);
                        $('#' + prefix + 'AttachmentLoading').hide();
                        $('#' + prefix + 'Attachment').show();
                        $('#' + prefix + 'Submit').show();
                        return;
                    }
                    presenter.displayBigProblem();
                } catch(e) {
                    tsv.log(e);
                };
            });
        };

        job.hookupAttachments = hookUpAttachments;

//        job.load = function(job) {
//
//            $('#content').html(presenter.projectTabsTemplate.render({
//                job:data,
//                account:tsv.model.account.current
//            }));
//            updateSelectedTab('#projectTab');
//            $('#projectTabContent').html(presenter.jobTemplate.render({
//                job:data,
//                account:tsv.model.account.current
//            }));
//            hookUpAttachments('addFunds');
//            hookUpAttachments('makePayment');
//            hookUpAttachments('requestRefund');
//            hookUpAttachments('requestFunds');
//            hookUpAttachments('requestPayment');
//            hookUpAttachments('makeRefund');
//        };

        job.otherPartyInfo = function(id) {
            tsv.model.job.get(id,function(err,project) {
                tsv.model.job.otherPartyInfo(id, function(err, data) {
                    updateSelectedTab('#otherPartyInfoTab');
                    $('#projectTabContent').html(presenter.otherPartyInfoTemplate.render({
                        otherUser:data,
                        project:tsv.model.job.current,
                        account:tsv.model.account.current
                    }));
                });
            });
        };

        job.disputes = function(id) {
            updateSelectedTab('#disputesTab');
            $('#projectTabContent').html(presenter.disputesTemplate.render({
                account:tsv.model.account.current
            }));
        };

        job.cancel = function(id) {
            tsv.model.job.cancel(id, function(err) {
                if (!err) {
                    bootbox.alert('Project cancelled successfully');
                    job.refresh(id);
                }
            });
        };

        job.requestFunds = function(id) {
            var amount = $('#requestFundsAmount').attr('value');
            tsv.model.job.requestFunds(id, amount, $('#requestFundsAttachmentPath').attr('value'), function(err) {
                if (!err) {
                    bootbox.alert('Fund request sent successfully');
                    job.refresh(id, true);
                }
            });
        };

        job.requestPayment = function(id) {
            var amount = $('#requestPaymentAmount').attr('value');
            tsv.model.job.requestPayment(id, amount, $('#requestPaymentAttachmentPath').attr('value'), function(err) {
                if (!err) {
                    bootbox.alert('Payment request sent successfully');
                    job.refresh(id, true);
                }
            });
        };

        job.requestRefund = function(id) {
            var amount = $('#requestRefundAmount').attr('value');
            tsv.model.job.requestRefund(id, amount, $('#requestRefundAttachmentPath').attr('value'), function(err) {
                if (!err) {
                    bootbox.alert('Refund request sent successfully');
                    job.refresh(id, true);
                }
            });
        };

        var addFundsText = function(amount) {
            return 'Are you sure you want to add funds?  $' + amount + ' will be deposited to this account.'
        };
        job.addFunds = function(id) {
            var amount = $('#addFundsAmount').attr('value');

            if (amount <= 0) {
                return bootbox.alert('You have entered an invalid funding amount.  Please enter a value greater than zero.');
            }

			bootbox.confirm(addFundsText(amount),function (confirmed) {
				if (confirmed) {
	                tsv.model.job.addFunds(id, amount, $('#addFundsAttachmentPath').attr('value'), function(err) {
	                    if (!err) {
	                        bootbox.alert('Funds added successfully');
	                        job.refresh(id);
	                    }
	                });	
				}
			});

        };

        var makePaymentText = function(amount) {
            return 'Are you sure you want to make a payment of $' + amount + '?  This amount will be withdrawn from your balance.'
        };
        job.makePayment = function(id) {
            var amount = $('#makePaymentAmount').attr('value');
			if (amount <= 0) {
				return bootbox.alert('You have entered an invalid payment amount.  Please enter a value greater than zero.');
			}
            bootbox.confirm(makePaymentText(amount),function(confirmed) {
                if (confirmed) {
                    tsv.model.job.makePayment(id, amount, $('#makePaymentAttachmentPath').attr('value'), function(err) {
                        if (!err) {
                            bootbox.alert('Payment made successfully');
                            job.refresh(id);
                        }
                    });
                }
            });
        };

        var makeRefundText = function(amount) {
            return 'Are you sure you want to refund $' + amount + ' to your customer?  This amount will be withdrawn from your balance.'
        };
        job.makeRefund = function(id) {
            var amount = $('#makeRefundAmount').attr('value');
            if (amount <= 0) {
                return bootbox.alert('You have entered an invalid refund amount.  Please enter a value greater than zero.');
            }
            bootbox.confirm(makeRefundText(amount), function(confirmed) {
                if (confirmed) {
                    tsv.model.job.makeRefund(id, amount, $('#makeRefundAttachmentPath').attr('value'), function(err) {
                        if (!err) {
                            bootbox.alert('Refund made successfully');
                            job.refresh(id);
                        }
                    });
                }
            });
        };

        job.approveRequest = function(id, requestId, type, amount) {
            var text;
            if (type === 'fund') {
                text = addFundsText(amount);
            } else if (type === 'payment') {
                text = makePaymentText(amount);
            } else if (type === 'refund') {
                text = makeRefundText(amount);
            }
            bootbox.confirm(text, function(yes) {
                if (yes) {
                    tsv.model.job.approveRequest(requestId, function(err) {
                        if (!err) {
                            bootbox.alert('Request approved successfully');
                            job.refresh(id, true);
                        }
                    });
                }
            });
        };

        job.denyRequest = function(id, requestId) {
            tsv.model.job.denyRequest(requestId, function(err) {
                if (!err) {
                    bootbox.alert('Request denied successfully');
                    job.refresh(id, true);
                }
            });
        };

        job.cancelRequest = function(id, requestId) {
            tsv.model.job.cancelRequest(requestId, function(err) {
                if (!err) {
                    bootbox.alert('Request cancelled successfully');
                    job.refresh(id, true);
                }
            });
        };

        job.resendRequest = function(id, requestId) {
            tsv.model.job.resendRequest(requestId, function(err) {
                if (!err) {
                    bootbox.alert('Request resent successfully');
                    job.refresh(id, true);
                }
            });
        };

        return job;
    })();

    presenter.displayErrorMessage = function(json) {
        bootbox.alert(json.error);
        //alert(json.error);
    };

    presenter.displayBigProblem = function() {
        bootbox.alert('We\'re sorry, but something went wrong.\n\nWe\'ve been notified about this issue and we\'ll take a look at it shortly.');
    };

    presenter.displayToast = function(toast) {
        bootbox.alert(toast);
    };

    presenter.handleUnauthorized = function() {
        presenter.account.logout();
    };

    presenter.handleForbidden = function() {
        alert('Forbidden.  Please contact customer support for more information.')
    };

    return presenter;
})();