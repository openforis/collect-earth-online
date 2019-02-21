<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<#if project_id == "">
    <#assign project_id = "0">
</#if>
<#if institution_id == "">
    <#assign institution_id = "0">
</#if>
<div id="project"></div>
<script type="text/javascript" src="${root}/js/vendors~account~collection~create_institution~create_project~geodashreact~home~project_dashboard~rev~1b583733.bundle.js"></script>
<script type="text/javascript" src="${root}/js/collection~create_project~geodashreact~home~project_dashboard~review_project.bundle.js"></script>
<script type="text/javascript" src="${root}/js/create_project~review_project.bundle.js"></script>
<script type="text/javascript" src="${root}/js/review_project.bundle.js"></script>
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
