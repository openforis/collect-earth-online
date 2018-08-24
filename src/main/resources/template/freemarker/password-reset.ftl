<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<div class="container absolute-center">
    <section class="row justify-content-center">
        <div class="col-lg-4 col-md-6 col-sm-10 pb-3" id="password-form">
            <p class="header">Enter your reset info</p>
            <form action="${root}/password-reset" method="post">
                <input class="form-control mb-1" autocomplete="off" id="email" name="email"
                       placeholder="Email" type="email" value=${email}>
                <input class="form-control mb-1" autocomplete="off" id="password-reset-key" name="password-reset-key"
                       placeholder="Password reset key" type="text" value=${password_reset_key}>
                <input class="form-control mb-1" autocomplete="off" id="password" name="password"
                       placeholder="New password" value="" type="password">
                <input class="form-control mb-1" autocomplete="off" id="password-confirmation" name="password-confirmation"
                       placeholder="New password confirmation" value="" type="password">
                <input class="btn btn-sm btn-block btn-outline-lightgreen" class="button" value="Reset Password" type="submit">
            </form>
        </div>
    </section>
</div>
<#include "end-content.ftl">
<#include "footer.ftl">
