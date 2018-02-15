<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<div class="container">

	<div class="row justify-content-center">
		<div class="col-xl-3 col-lg-4 col-md-6 col-sm-9" id="login">
	    <form action="${root}/login?returnurl=${returnurl}&${querystring}" method="post" >
	    	  	    <p class="header">Sign into your account</p>
	    
	      <div class="form-group">
	 	 	  <label for="email">Email address</label>
         	   <input id="email" name="email" placeholder="Enter email" value="" type="email" class="form-control">
           </div>
           <div class="form-group">
	        	    <label for="password">Password</label>
	            <input id="password" name="password" placeholder="Password" value="" type="password" class="form-control">
	        </div>
	        <div class="mb-2" style="overflow: hidden;">
	      	  <p id="forgot-password" class=" mr-2 mt-1 float-left"><a href="${root}/password">Forgot your password?</a></p>
	      	  <input class="btn bg-lightgreen float-right" type="submit" value="Login">
	      	  </div>
	        </form>
    	  	    <p class="header">New to CEO?</p>
	        <input class="btn bg-lightgreen mb-2 float-right" name="register" onclick="window.location='${root}/register'" value="Register" type="button">
	    
	    <div class="registerdiv">
		</div>
		</div>
	    </div>
	</div>


<#include "end-content.ftl">
<#include "footer.ftl">
