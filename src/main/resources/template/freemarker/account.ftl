<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<div id="account-page">
    <style>
    section#content {
        overflow-y: auto;
        overflow-x: hidden;
    }
    </style>
    <div id="user-stats">
    <p>Here's your progress</p>
    <h1>Level 1</h1>
    <hr>
    <div class="w3-light-grey">
      <div id="myBar" class="w3-container w3-blue w3-center" style="width:33%">33%</div>
    </div>
    <p>You need to complete 15 more plots to reach level 2</p>
    <table id="user-stats-table">
                    <tbody>
                        <tr>
                            <td>Projects worked so far</td>
                            <td>2</td>
                            <td class="tspace"></td>
                            <td>Speed Score Total</td>
                            <td>205</td>
                        </tr>
                        <tr>
                            <td>Plots Completed per project</td>
                            <td>8</td>
                            <td class="tspace"></td>
                            <td>Accuracy Score per project</td>
                            <td>10</td>
                        </tr>
                        <tr>
                            <td>Plots completed totald</td>
                            <td>16</td>
                            <td class="tspace"></td>
                            <td>Accuracy score total</td>
                            <td>10</td>
                        </tr>
                        <tr>
                            <td>Speed Score per project</td>
                            <td>205</td>
                            <td class="tspace"></td>
                            <td>&nbsp;</td>
                            <td>&nbsp;</td>
                        </tr>
                    </tbody>
                </table>
    <form style="visibility:visible;">
                    <fieldset>
                        <span class="text">congratulations, you are ranked #3 overall and #1 in your organization</span>
                    </fieldset>
                    <span>&nbsp;</span>
    </form>
    </div>
    <div id="account-form">
        <p>Account Settings</p>
        <h1>${username}</h1>
        <hr>
        <#if userid?? && userid == account_id>
            <form action="${root}/account/${account_id}" method="post">
                <fieldset>
                    <h2>Reset email</h2>
                    <input autocomplete="off" id="email" name="email" placeholder="New email" value="" type="email" class="text">
                </fieldset>
                <fieldset>
                    <h2>Reset password</h2>
                    <input autocomplete="off" id="password" name="password" placeholder="New password" value="" type="password"  class="text">
                    <br>
                    <input autocomplete="off" id="password-confirmation" name="password-confirmation" placeholder="New password confirmation" value="" type="password"  class="text">
                </fieldset>
                <fieldset>
                    <h2>Verify your identity</h2>
                    <input autocomplete="off" id="current-password" name="current-password" placeholder="Current password" value="" type="password"  class="text">
                </fieldset>
                    <input class="button" name="update-account" value="Update account settings" type="submit">
            </form>
        </#if>
    </div>
</div>
<#include "end-content.ftl">
<#include "footer.ftl">
