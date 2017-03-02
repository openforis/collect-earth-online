<#include "header.ftl">

<script type="text/javascript" src="js/account.js"></script>

<div ng-controller="ctlAccount" ng-attr-id="{{ formID }}">
    <h1>Account Settings</h1>
    <form ng-submit="submit()">
        <h2>Enter email address</h2>
        <input autocomplete="off" ng-model="email" id="{{ emailID }}" placeholder="{{ phEmail }}" type="{{ tpEmail }}">

        <h2>Reset password</h2>
	<input autocomplete="off" ng-model="newPwd" id="{{ passwordID }}" placeholder="{{ phNewPwd }}" type="{{ tpPassword }}">
	<input autocomplete="off" ng-model="confPwd" id="{{ passwordConfirmID }}" placeholder="{{ phConfPwd }}" type="{{ tpPassword }}">
	        
        <h2>Verify your identity</h2>
	<input autocomplete="off" ng-model="currPwd" id="{{ passwordCurrentID }}" placeholder="{{ phCurrPwd }}" type="{{ tpPassword }}">
        
       <!--  <input class="button" name="update-account" value="Update account settings" type="submit"> -->
       <input class="button" value="Update account settings" type = "submit">
       
	<div class="notification">{{ updateMessage }}</div>

    </form>
</div>
<#include "footer.ftl">
