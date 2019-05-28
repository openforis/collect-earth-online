<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<#if username == "">
    <#assign username = "guest">
</#if>
<div id="collection" class="row" style="height:-webkit-fill-available;"></div>

<!-- Auto Inserted Bundles -->
<script type="text/javascript" src="${root}/js/collection~create_project~geo_dash~home~project_dashboard~review_project.bundle.js"></script>
<script type="text/javascript" src="${root}/js/collection~create_project~project_dashboard~review_project.bundle.js"></script>
<script type="text/javascript" src="${root}/js/common-vendor-files-chunk.bundle.js"></script>
<script type="text/javascript" src="${root}/js/collection.bundle.js"></script>
<!-- End Auto Inserted Bundles -->

<script type="text/javascript">
 window.onload = function () {
     collection.renderCollectionPage({
         documentRoot: "${root}",
         userId:       "${userid}",
         userName:     "${username}",
         projectId:    "${project_id}"
     });
 };
</script>
<#include "end-content.ftl">
<#include "footer.ftl">
