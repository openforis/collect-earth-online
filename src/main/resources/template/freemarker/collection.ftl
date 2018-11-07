<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<#if username == "">
    <#assign username = "guest">
</#if>
<div id="collection" class="row"></div>
<script type="text/javascript" src="${root}/js/vendors~account~collection~create_project~geodashreact~home~institution~review_project~widgetlayoute~33e7a6f8.bundle.js"></script>
<script type="text/javascript" src="${root}/js/collection~create_project~geodashreact~home~review_project.bundle.js"></script>
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
