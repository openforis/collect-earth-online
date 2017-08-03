<nav>

    <ul>
        <#list ["Home", "About", "Support"] as url>
            <#if navlink == url>
                <li><a class="active-link" href="${root}/${url?lower_case}">${url}</a></li>
            <#else>
                <li><a href="${root}/${url?lower_case}">${url}</a></li>
            </#if>
        </#list>
        <#if username??>
            <#if navlink == "Account">
                <li><a class="active-link" href="${root}/account/${userid}">Account</a></li>
            <#else>
                <li><a href="${root}/account/${userid}">Account</a></li>
            </#if>
        </#if>
    </ul>
    <div id="login-info">
        <#if username??>
            <#if navlink == "Logout">
                Logged in as ${username} <a class="active-link" href="${root}/logout">Logout</a>
            <#else>
                Logged in as ${username} <a href="${root}/logout">Logout</a>
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
