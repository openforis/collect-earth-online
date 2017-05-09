<nav>
    <ul>
        <#if role?? && role == "admin">
            <#list ["Home", "About", "Tutorials", "Demo", "Account", "Dashboard", "Admin"] as url>
                <#if navlink == url>
                    <li><a class="active-link" href="${url?lower_case}">${url}</a></li>
                <#else>
                    <li><a href="${url?lower_case}">${url}</a></li>
                </#if>
            </#list>
        <#elseif role?? && role == "user">
            <#list ["Home", "About", "Tutorials", "Demo", "Account", "Dashboard"] as url>
                <#if navlink == url>
                    <li><a class="active-link" href="${url?lower_case}">${url}</a></li>
                <#else>
                    <li><a href="${url?lower_case}">${url}</a></li>
                </#if>
            </#list>
        <#else>
            <#list ["Home", "About", "Tutorials", "Demo"] as url>
                <#if navlink == url>
                    <li><a class="active-link" href="${url?lower_case}">${url}</a></li>
                <#else>
                    <li><a href="${url?lower_case}">${url}</a></li>
                </#if>
            </#list>
        </#if>
    </ul>
    <div id="login-info">
        <#if username??>
            <#if navlink == "Logout">
                Logged in as ${username} <a class="active-link" href="logout">Logout</a>
            <#else>
                Logged in as ${username} <a href="logout">Logout</a>
            </#if>
        <#else>
            <#if navlink == "Login" || navlink == "Register">
                <a class="active-link" href="login">Login/Register</a>
            <#else>
                <a href="login">Login/Register</a>
            </#if>
        </#if>
    </div>
</nav>
