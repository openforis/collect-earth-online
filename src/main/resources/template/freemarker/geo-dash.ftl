<#include "header.ftl">
<#include "start-content.ftl">
<script>
    let theURL="${root}" + "/geo-dash";
    var pid = this.getParameterByName("pid");
    function getParameterByName (name, url) {
        "use strict";
        if (!url) {
            url = window.location.href;
        }
        url = decodeURIComponent(url);
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");
        var results = regex.exec(url);
        if (!results) {
            return null;
        }
        if (!results[2]) {
            return "";
        }
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }
</script>
<nav class="navbar navbar-expand-lg navbar-light fixed-top pt-0 pb-0" style="background-color: white;" id="geodash-nav">
	<div class="container">
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
	     </ul>
    </div>
    </div>
</nav>
<script type="text/babel" src="${root}/js/geodashreact.js"></script>
<br style="clear:both;">

    <div class="container-fluid">
        <div class="row">
            <div id="dashHolder" class="dashHolder" style="width:100%">
                <div>
                </div>
            </div>
        </div>
    </div>
</div>

<#include "end-content.ftl">
<#include "footer.ftl">
