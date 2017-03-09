<#include "header.ftl">
<div id="login-form">
    <h1>Sign into your account</h1>
    <form action="/login" method="post">
        <input id="email" name="email" placeholder="Email" value="" type="email">
        <input id="password" name="password" placeholder="Password" value="" type="password">
        <p id="forgot-password"><a href="password">Forgot your password?</a></p>
        <input class="button" name="login" value="Login" type="submit">
    </form>
    <hr>
    <h1>New to Mapcha?</h1>
    <input class="button" name="register" onclick="window.location='register'" value="Register a new account" type="button">
</div>
<#include "footer.ftl">
