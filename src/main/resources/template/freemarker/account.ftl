<#include "header.ftl">
<#include "start-content.ftl">
<div id="account"></div>

<!-- Auto Inserted Bundles -->

<!-- End Auto Inserted Bundles -->

<script type="text/javascript">
 window.onload = function () {
     account.renderAccountPage({
         userId:       "${userid}",
         accountId:    "${account_id}",
         userName:     "${username}"
     });
 };
</script>
<#include "end-content.ftl">
<#include "footer.ftl">
