<#include "header.ftl">
<#include "start-content.ftl">
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
<script type="text/javascript" src="${root}/js/geo-dash.js"></script>
<div id="geodash" ng-app="geodash" ng-controller="GeodashController as geodash" ng-init="geodash.initialize('${root}')">
<br style="clear:both;">
    <div id="fulldiv" class="full">
        <div id="fullholder"></div>
    </div>
     <div id="geohead" class="d-none"> <img id="ceo-site-logo" src="/img/ceo-logo1.png" style="
            position: relative;
            top: 1px;
            left: 10px;
            height: 40px;
            padding: 4px;
        ">
        <div id="login-info">
                <#if username != "">
                    <#if navlink == "Logout">
                         <span>${username}</span> <a class="active-link" href="${root}/logout">Logout</a>
                    <#else>
                        <span>${username}</span> <a href="${root}/logout">Logout</a>
                    </#if>
                <#else>
                    <#if navlink == "Login" || navlink == "Register">
                        <a class="active-link" href="${root}/login">Login/Register</a>
                    <#else>
                        <a ng-href="${root}/login{{geodash.querystring}}&returnurl=geo-dash">Login/Register</a>
                    </#if>
                </#if>
            </div>
        </div>
    <div class="container-fluid">
        <div class="row">
            <div id="dashHolder" class="dashHolder">
                <div>
                </div>
            </div>
        </div>
    </div>
</div>

<#include "end-content.ftl">
<#include "footer.ftl">
