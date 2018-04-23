<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
    <div class="row justify-content-center">
        <style>
         section#content {
             overflow-y: auto;
             overflow-x: hidden;
         }
        </style>
		<div id="account-page" class="col-xl-6 col-lg-8 border bg-lightgray mb-5">
	 		<div class="bg-darkgreen mb-3 no-container-margin">
	      	  <h1>Your account</h1>
	        </div>
	        <div id="user-stats" class="col">
	            <h2 class="header px-0">Here's your progress</h2>
	            <h1><span class="badge bg-lightgreen">Level 1</span></h1>
	            <div class="progress w3-light-grey mb-1">
		    		    <div class="progress-bar progress-bar-striped bg-lightgreen" role="progressbar" style="width: 33%" aria-valuenow="10" aria-valuemin="0" aria-valuemax="100"></div>
		            <div id="myBar" class="w3-container w3-blue w3-center" style="width:33%">33%</div>
	            </div>
	            <p>You need to complete <span class="badge bg-lightgreen">15</span> more plots to reach <span class="badge bg-lightgreen">Level 2</span></p>
		            <table id="user-stats-table" class="table table-sm">
		                <tbody>
		                    <tr>
		                        <td class="w-80">Projects Worked So Far</td>
		                        <td class="w-20 text-center"><span class="badge badge-pill bg-lightgreen">2</span></td>
		                    </tr>
		                    <tr>                            
		                        <td>Speed Score Total</td>
		                        <td class="text-center"><span class="badge badge-pill bg-lightgreen">205</span></td>
		                    </tr>
		                    <tr>
		                        <td>Plots Completed Per Project</td>
		                        <td class="text-center"><span class="badge badge-pill bg-lightgreen">8</span></td>
		                    </tr>
		                    <tr>
		                        <td>Accuracy Score Per Project</td>
		                        <td class="text-center"><span class="badge badge-pill bg-lightgreen">10</span></td>
		                    </tr>
		                    <tr>
		                        <td>Plots Completed Total</td>
		                        <td class="text-center"><span class="badge badge-pill bg-lightgreen">16</span></td>
		                    </tr>
		                    <tr>
		                        <td>Accuracy Score Total</td>
		                        <td class="text-center"><span class="badge badge-pill bg-lightgreen">10</span></td>
		                    </tr>
		                    <tr>
		                        <td>Speed Score Per Project</td>
		                        <td class="text-center"><span class="badge badge-pill bg-lightgreen">205</span></td>
		
		                    </tr>
		                </tbody>
		            </table>
		            <form style="visibility:visible;">
		                <fieldset>
		                    <strong>Congratulations!</strong> You are ranked <span class="badge bg-lightgreen">#3</span> overall and <span class="badge bg-lightgreen">#1</span> in your organization.		                    
		                </fieldset>
		                <span>&nbsp;</span>
		            </form>
	            <hr class="d-block d-sm-none">
	        </div>
	        <div id="account-form" class="col mb-3">
				<h2 class="header px-0">Account Settings</h2>
	            <h1>${username!""}</h1>
	            <#if userid?? && userid == account_id>
	                <form action="${root}/account/${account_id}" method="post">
	  				    <div class="form-group">
	                        <label for="email">Reset email</label>
	                        <input autocomplete="off" id="email" name="email" placeholder="New email" value="" type="email" class="form-control">
					    </div>
	  				    <div class="form-group">
	                        <label for="password">Reset password</label>
	                        <div class="form-row">
	                    		<div class="col">
	                    			<input autocomplete="off" id="password" name="password" placeholder="New password" value="" type="password" class="form-control mb-1">
	                			</div>
							    <div class="col">
	                    			<input autocomplete="off" id="password-confirmation" name="password-confirmation" placeholder="New password confirmation" value="" type="password" class="form-control"">
							    </div>
						    </div>
					    </div>
	  				    <div class="form-group">
	                        <label for="current-password">Verify your identity</label>
	                        <input autocomplete="off" id="current-password" name="current-password" placeholder="Current password" value="" type="password" class="form-control">
					    </div>
	                    <input class="btn btn-outline-lightgreen btn-block" name="update-account" value="Update account settings" type="submit">
	                </form>
	            </#if>
	        </div>
        </div>	        
        
    </div>
<#include "end-content.ftl">
<#include "footer.ftl">
