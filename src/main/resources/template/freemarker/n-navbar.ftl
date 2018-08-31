<style>
 @media screen and (max-width: 600px) {
 }
</style>
<nav class="navbar navbar-expand-lg navbar-light" style="background-color: white;">
    <a class="navbar-brand" href="${root}/home">
        <img class="img-fluid" id="ceo-site-logo" src="${root}/img/ceo-logo.png">
    </a>
    <button class="navbar-toggler" type="button" data-toggle="collapse"
            data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent"
            aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="navbarSupportedContent">
        <ul class="navbar-nav mr-auto">
            <#list ["Home", "About", "Support"] as url>
                <#if navlink == url>
                    <li class="nav-item active">
                        <a class="nav-link" href="${root}/${url?lower_case}">${url}</a>
                    </li>
                <#else>
                    <li class="nav-item">
                        <a class="nav-link" href="${root}/${url?lower_case}">${url}</a>
                    </li>
                </#if>
            </#list>
            <#if userid != "">
                <#if navlink == "Account">
                    <li class="nav-item active">
                        <a class="nav-link" href="${root}/account/${userid}">Account</a>
                    </li>
                <#else>
                    <li class="nav-item">
                        <a class="nav-link" href="${root}/account/${userid}">Account</a>
                    </li>
                </#if>
            </#if>
        </ul>
        <ul id="login-info" class="navbar-nav mr-0">
            <#if username != "">
                <li id="username" class="nav-item my-auto">
                    <span class="nav-link disabled">${username}</span>
                </li>
                <li id="login-button" class="nav-item my-auto">
                    <button type="button" class="btn btn-outline-danger btn-sm" onclick="location.href='${root}/logout'">
                        Logout
                    </button>
                </li>
            <#else>
                <li id="login-button" class="nav-item my-auto">
                    <button type="button" class="btn btn-outline-success btn-sm" onclick="location.href='${root}/login'">
                        Login/Register
                    </button>
                </li>
            </#if>
        </ul>
    </div>
</nav>
