<#include "header.ftl">
<div id="register-form">
    <h1>Register a new account</h1>
    <form action="/register" method="post">
        <input autocomplete="off" id="email" name="email" placeholder="Email" value="" type="email">
        <input autocomplete="off" id="password" name="password" placeholder="Password" value="" type="password">
        <input autocomplete="off" id="password-confirmation" name="password-confirmation" placeholder="Password confirmation" value="" type="password">
        <input class="button" name="register" value="Register" type="submit">
    </form>
</div>
<#include "footer.ftl">
