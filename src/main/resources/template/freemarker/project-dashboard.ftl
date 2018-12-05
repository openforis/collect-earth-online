<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<#if project_id == "">
    <#assign project_id = "0">
</#if>
<#if institution_id == "">
    <#assign institution_id = "0">
</#if>
<#if project_id == "0">
    <#assign project_stats_visibility = "d-none">
    <#assign project_template_visibility = "visible">
<#else>
    <#assign project_stats_visibility = "visible">
    <#assign project_template_visibility = "d-none">
</#if>
<div id="project_dashboard" class="row justify-content-center"></div>
<script type="text/javascript" src="${root}/js/vendors~account~collection~create_institution~create_project~geodashreact~home~project_dashboard~rev~1b583733.bundle.js"></script>
<script type="text/javascript" src="${root}/js/collection~create_project~geodashreact~home~project_dashboard~review_project.bundle.js"></script>
<script type="text/javascript" src="${root}/js/project_dashboard.bundle.js"></script>
<script type="text/javascript">
    window.onload = function () {
        project_dashboard.renderProjectDashboardPage({
            documentRoot:                "${root}",
            userId:                      "${userid}",
            projectId:                   "${project_id}",
            institutionId:               "${institution_id}",
            project_stats_visibility:    "${project_stats_visibility}",
            project_template_visibility: "${project_template_visibility}"
        });
    };
</script>
<#include "end-content.ftl">
<#include "footer.ftl">
