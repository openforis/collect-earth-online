<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<div id="account" class="row justify-content-center"></div>
<script type="text/javascript" src="${root}/js/vendors~account~collection~create_institution~create_project~geodashreact~home~project_dashboard~rev~1b583733.bundle.js"></script>
<script type="text/javascript" src="${root}/js/account.bundle.js"></script>
<script type="text/javascript">
 window.onload = function () {
     account.renderAccountPage({
         documentRoot: "${root}",
         userId:       "${userid}",
         accountId:    "${account_id}",
         userName:     "${username}"
     });
 };
</script>
<#include "end-content.ftl">
<#include "footer.ftl">
