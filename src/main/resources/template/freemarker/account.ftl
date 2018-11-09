<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<div class="row justify-content-center">
	<div id="account" class="col-xl-6 col-lg-8 border bg-lightgray mb-5"></div>
</div>
<script type="text/javascript" src="${root}/js/vendors~account~collection~create_institution~create_project~geodashreact~home~review_institution~re~43c652f7.bundle.js"></script>
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
