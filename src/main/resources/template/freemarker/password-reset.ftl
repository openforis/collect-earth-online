<#include "header.ftl">
<#include "branding-banner.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<#include "flash-messages.ftl">

<div id="password-form">
    <h1>Enter your reset info</h1>
    <form action="password-reset" method="post">
        <input autocomplete="off" id="email" name="email" placeholder="Email" type="email" value=${email!""}>
        <input autocomplete="off" id="password-reset-key" name="password-reset-key" placeholder="Password reset key" type="text" value=${password_reset_key!""}>
        <input autocomplete="off" id="password" name="password" placeholder="New password" value="" type="password">
        <input autocomplete="off" id="password-confirmation" name="password-confirmation" placeholder="New password confirmation" value="" type="password">
        <input class="button" value="Reset Password" type="submit">
    </form>
</div>

<#include "end-content.ftl">
<#include "footer.ftl">
