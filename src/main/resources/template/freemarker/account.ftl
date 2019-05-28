<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<div id="account"></div>

<!-- Auto Inserted Bundles -->
<script type="text/javascript" src="${root}/js/account~create_project~review_project.bundle.js"></script>
<script type="text/javascript" src="${root}/js/common-vendor-files-chunk.bundle.js"></script>
<script type="text/javascript" src="${root}/js/account.bundle.js"></script>
<!-- End Auto Inserted Bundles -->

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
