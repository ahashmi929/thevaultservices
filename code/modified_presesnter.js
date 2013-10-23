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
