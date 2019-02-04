<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<#if institution_id == "">
    <#assign institution_id = "0">
</#if>
<div id="project"></div>
<script type="text/javascript" src="${root}/js/vendors~account~collection~create_institution~create_project~geodashreact~home~project_dashboard~rev~1b583733.bundle.js"></script>
<script type="text/javascript" src="${root}/js/collection~create_project~geodashreact~home~project_dashboard~review_project.bundle.js"></script>
<script type="text/javascript" src="${root}/js/create_project.bundle.js"></script>
<script type="text/javascript">
 window.onload = function () {
     create_project.renderCreateProjectPage({
         documentRoot:                "${root}",
         userId:                      "${userid}",
         institutionId:               "${institution_id}",
     });
 };
</script>
<#include "end-content.ftl">
<#include "footer.ftl">
