<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<div class="container">
    <div class="row justify-content-center">
        <div class="col-xl-3 col-lg-4 col-md-6 col-sm-9" id="register-form">
            <form action="${root}/register" method="post">
                <h2 class="header">Register a new account</h2>
                <div class="form-group">
                    <label for="email">Email address</label>
                    <input autocomplete="off" id="email" name="email" placeholder="Email" value=""
                           type="email" class="form-control">
                </div>
                <div class="form-group">
                    <label for="password">Enter your password</label>
                    <input autocomplete="off" id="password" name="password" placeholder="Password" value=""
                           type="password" class="form-control">
                </div>
                <div class="form-group">
                    <label for="password-confirmation">Confirm your password</label>
                    <input autocomplete="off" id="password-confirmation" name="password-confirmation"
                           placeholder="Password confirmation" value="" type="password" class="form-control">
                </div>
                <input class="btn bg-lightgreen float-right mb-2" type="submit" value="Register">
            </form>
        </div>
    </div>
</div>
<#include "end-content.ftl">
<#include "footer.ftl">
