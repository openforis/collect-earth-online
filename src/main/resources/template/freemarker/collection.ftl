<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<#if username == "">
    <#assign username = "guest">
</#if>
<div id="collection" class="row"></div>
<script type="text/javascript" src="${root}/js/vendors~account~collection~create_institution~create_project~geodashreact~home~project_dashboard~rev~5eddf525.bundle.js"></script>
<script type="text/javascript" src="${root}/js/vendors~account~collection~geodashreact~home~institution~project~timesync~widgetlayouteditor.bundle.js"></script>
<script type="text/javascript" src="${root}/js/collection.bundle.js"></script>
<script type="text/javascript">
 window.onload = function () {
     collection.renderCollectionPage({
         documentRoot: "${root}",
         userName:     "${username}",
         projectId:    "${project_id}"
     });
 };
</script>
<#include "end-content.ftl">
<#include "footer.ftl">
