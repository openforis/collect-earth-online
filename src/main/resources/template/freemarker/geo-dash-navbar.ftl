<nav class="navbar navbar-expand-lg navbar-light fixed-top pt-0 pb-0" style="background-color: white;" id="geodash-nav">
	<div class="container-fluid">
		<a class="navbar-brand" href="home">
			<img class= "img-fluid" id="ceo-site-logo" src="${root}/img/ceo-logo.png">
		</a>
		  <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
		    <span class="navbar-toggler-icon"></span>
		  </button>
		<div class="collapse navbar-collapse" id="navbarSupportedContent">
		     <ul id="login-info" class="navbar-nav mr-auto">
			     <li  class="nav-item my-auto">
			     	<h1>GEO-DASH</h1>
			     </li>
			</ul>
		     <ul class="navbar-nav mr-0">
				<#if username != "">
			    	<#if navlink == "Logout">
			            <li id="username" class="nav-item my-auto">
			            	<span class="nav-link disabled">${username}</span>
			            </li>
			            <li class="nav-item my-auto">
		   	            	<button type="button" class="btn btn-outline-danger btn-sm" onclick="location.href = '${root}/logout'">
		           	     	Logout
		                 	</button>
		                 </li>
			            <#else>
			            <li id="username" class="nav-item my-auto">
			            <span class="nav-link disabled">${username}</span>
			            </li>
			            <li  class="nav-item my-auto">
		   	            <button type="button" class="btn btn-outline-danger btn-sm" onclick="location.href = '${root}/logout'">
		           	      Logout
		                 </button>
		                 </li>
	               </#if>
	        	<#else>
	            	<#if navlink == "Login" || navlink == "Register">
	            		<li class="nav-item my-auto">
		            		<button type="button" class="btn bg-lightgreen btn-sm" onclick="location.href = '${root}/login'">
		                	Login/Register
	                		</button>
	                	</li>
		            <#else>
		            	<li class="nav-item my-auto">
		            		<button type="button" class="btn bg-lightgreen btn-sm" onclick="location.href = '${root}/login'">
		               		Login/Register
	                		</button>
	                	</li>
	            	</#if>
	        	</#if>
				 <#if navlink != "Geo-Dash">
					<li class="nav-item my-auto ml-1"><button class="btn btn-outline-lightgreen btn-sm" onclick="$('#addWidget' ).click();">Add Widget</button></li>
				 <li class="nav-item my-auto ml-1"><button class="btn btn-outline-lightgreen btn-sm" onclick="openHelp()">Geo-Dash Help</button></li>
				 </#if>
        	     <#--<li class="nav-item my-auto ml-1">                   -->
		     	 	<#--<input type="submit" id="btnNewWidget" value="New Widget" class="btn btn-outline-lightgreen btn-sm" ng-click="geodash.createNewWidget()" style="float:right;" data-toggle="modal" data-target="#dialog-form">-->
		     	<#--</li>-->
		     </ul>
	    </div>
    </div>
</nav>
<script type="text/javascript">
	function openHelp(){
        var win = window.open("geo-dash/geo-dash-help", "_blank");
        win.focus();
	}
</script>
