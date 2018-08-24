<style>
 @media screen and (max-width: 600px) {
 }
</style>
<nav>
    <img id="ceo-site-logo" src="${root}/img/ceo-logo1.png">
    <ul class="topnav" id="myTopnav">
        <#list ["Home", "About", "Support"] as url>
            <#if navlink == url>
                <li><a class="active-link" href="${root}/${url?lower_case}">${url}</a></li>
            <#else>
                <li><a href="${root}/${url?lower_case}">${url}</a></li>
            </#if>
        </#list>
        <#if userid != "">
            <#if navlink == "Account">
                <li><a class="active-link" href="${root}/account/${userid}">Account</a></li>
            <#else>
                <li><a href="${root}/account/${userid}">Account</a></li>
            </#if>
        </#if>
        <li class="mobileLogin" id="mobileLogin">
            <#if username != "">
                <#if navlink == "Logout">
                    <p> ${username} </p><br><a class="active-link" href="${root}/logout">Logout</a>
                <#else>
                    <p> ${username} </p><br><a href="${root}/logout">Logout</a>
                </#if>
            <#else>
                <#if navlink == "Login" || navlink == "Register">
                    <a class="active-link" href="${root}/login">Login/Register</a>
                <#else>
                    <a href="${root}/login">Login/Register</a>
                </#if>
            </#if>
        </li>
        <li class="icon"> <a href="javascript:void(0);" style="font-size:15px;" class="icon" onclick="menuControls()">&#9776;</a></li>
    </ul>
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
                <a href="${root}/login">Login/Register</a>
            </#if>
        </#if>
    </div>
</nav>
<script>
 function menuControls() {
     var x = document.getElementById("myTopnav");
     if (x.className === "topnav") {
         x.className += " responsive";
     } else {
         x.className = "topnav";
     }
     var ml = document.getElementById("mobileLogin");
     if (ml.className === "mobileLogin") {
         ml.className += " responsive";
     } else {
         ml.className = "mobileLogin";
     }
 }
</script>
