<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<script type="text/javascript">
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
window.onload =function() {
    renderPage("project", {
        documentRoot: "${root}",
        userId: "${userid}",
        projectId: "${project_id}",
        institutionId: '${institution_id}',
        project_stats_visibility: '${project_stats_visibility}',
        project_template_visibility: '${project_template_visibility}'
    });
}

</script>
<div id="project" class="row justify-content-center">
</div>
<#include "end-content.ftl">
<#include "footer.ftl">
