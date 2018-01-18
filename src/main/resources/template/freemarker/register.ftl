<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">

<div id="register-form">
    <h1>Register a new account</h1>
    <form action="${root}/register" method="post">
        <fieldset>
        <input autocomplete="off" id="email" name="email" placeholder="Email" value="" type="email" class="text">
        </fieldset>
        <fieldset>
        <input autocomplete="off" id="password" name="password" placeholder="Password" value="" type="password" class="text">
        </fieldset>
        <fieldset>
        <input autocomplete="off" id="password-confirmation" name="password-confirmation" placeholder="Password confirmation" value="" type="password">
        </fieldset>
        <input class="button" name="register" value="Register" type="submit">
    </form>
</div>

<#include "end-content.ftl">
<#include "footer.ftl">
