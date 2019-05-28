<#include "header.ftl">
<#include "navbar.ftl">
<#include "announcements.ftl">
<#include "start-content.ftl">
<div id="home"></div>

<!-- Auto Inserted Bundles -->
<script type="text/javascript" src="${root}/js/collection~create_project~geo_dash~home~project_dashboard~review_project.bundle.js"></script>
<script type="text/javascript" src="${root}/js/common-vendor-files-chunk.bundle.js"></script>
<script type="text/javascript" src="${root}/js/home~review_institution.bundle.js"></script>
<script type="text/javascript" src="${root}/js/home.bundle.js"></script>
<!-- End Auto Inserted Bundles -->

<script type="text/javascript">
 window.onload = function () {
     home.renderHomePage({
         documentRoot: "${root}",
         userId:       "${userid}",
         userName:     "${username}"
     });
 };
</script>
<#include "end-content.ftl">
<#include "footer.ftl">
