<#include "header.ftl">
<#include "start-content.ftl">
<#if project_id == "">
    <#assign project_id = "0">
</#if>
<div id="project"></div>

<!-- Auto Inserted Bundles -->

<!-- End Auto Inserted Bundles -->

<script type="text/javascript">
 window.onload = function () {
     review_project.renderReviewProjectPage({
         userName:     "${username}",
         userId:       "${userid}",
         projectId:    "${project_id}"
     });
 };
</script>
<#include "end-content.ftl">
<#include "footer.ftl">
