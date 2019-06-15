<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<#if project_id == "">
    <#assign project_id = "0">
</#if>
<div id="project"></div>

<!-- Auto Inserted Bundles -->
<script type="text/javascript" src="${root}/js/collection~create_project~geo_dash~home~project_dashboard~review_project.bundle.js"></script>
<script type="text/javascript" src="${root}/js/collection~create_project~project_dashboard~review_project.bundle.js"></script>
<script type="text/javascript" src="${root}/js/create_project~project_dashboard~review_project.bundle.js"></script>
<script type="text/javascript" src="${root}/js/account~create_project~review_project.bundle.js"></script>
<script type="text/javascript" src="${root}/js/create_project~review_project.bundle.js"></script>
<script type="text/javascript" src="${root}/js/common-vendor-files-chunk.bundle.js"></script>
<script type="text/javascript" src="${root}/js/review_project.bundle.js"></script>
<!-- End Auto Inserted Bundles -->

<script type="text/javascript">
 window.onload = function () {
     review_project.renderReviewProjectPage({
         documentRoot:                "${root}",
         userId:                      "${userid}",
         projectId:                   "${project_id}"
     });
 };
</script>
<#include "end-content.ftl">
<#include "footer.ftl">
