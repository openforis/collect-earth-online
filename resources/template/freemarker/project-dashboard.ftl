<#include "header.ftl">
<#include "start-content.ftl">
<#if project_id == "">
    <#assign project_id = "0">
</#if>
<#if project_id == "0">
    <#assign project_stats_visibility = "d-none">
    <#assign project_template_visibility = "visible">
<#else>
    <#assign project_stats_visibility = "visible">
    <#assign project_template_visibility = "d-none">
</#if>
<div id="project-dashboard"></div>

<!-- Auto Inserted Bundles -->

<!-- End Auto Inserted Bundles -->

<script type="text/javascript">
    window.onload = function () {
        project_dashboard.renderProjectDashboardPage({
            userName:                    "${username}",
            userId:                      "${userid}",
            projectId:                   "${project_id}",
            project_stats_visibility:    "${project_stats_visibility}",
            project_template_visibility: "${project_template_visibility}"
        });
    };
</script>
<#include "end-content.ftl">
<#include "footer.ftl">
