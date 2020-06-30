<#include "header.ftl">
<#include "announcements.ftl">
<#include "start-content.ftl">
<div id="home"></div>

<!-- Auto Inserted Bundles -->

<!-- End Auto Inserted Bundles -->

<script type="text/javascript">
 window.onload = function () {
     home.renderHomePage({
         userName:     "${username}",
         userId:       "${userid}",
         userRole:     "${role}"
     });
 };
</script>
<#include "end-content.ftl">
<#include "footer.ftl">
