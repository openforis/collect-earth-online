<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">

<div id="login-form">
<p>Welcome to Collect Earth Online</p>
    <h1>Sign into your account</h1>

    <form action="${root}/login?returnurl=${returnurl}&${querystring}" method="post">
        <fieldset>
            <input id="email" name="email" placeholder="Email" value="" type="email" class="text">
        </fieldset>
        <fieldset>
            <input id="password" name="password" placeholder="Password" value="" type="password" class="text">
        </fieldset>
        <p id="forgot-password"><a href="${root}/password">Forgot your password?</a></p>
        <input class="button" name="login" value="Login" type="submit">
    </form>
    <hr>
    <h1>New to CEO?</h1>
    <div class="registerdiv">
    <input class="button" name="register" onclick="window.location='${root}/register'" value="Register a new account" type="button">
    </div>
</div>

<#include "end-content.ftl">
<#include "footer.ftl">
