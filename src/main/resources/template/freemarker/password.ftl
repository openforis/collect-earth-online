<#include "header.ftl">
<div id="password-form">
    <h1>Enter your login email</h1>
    <form action="/password" method="post">
        <input autocomplete="off" id="email" name="email" placeholder="Email" value="" type="email">
        <input class="button" value="Request Password Reset Key" type="submit">
    </form>
</div>
<#include "footer.ftl">
