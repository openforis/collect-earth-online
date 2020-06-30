<#include "header.ftl">
<#include "start-content.ftl">
<#if username == "">
    <#assign username = "guest">
</#if>
<div id="collection"></div>

<!-- Auto Inserted Bundles -->

<!-- End Auto Inserted Bundles -->

<script type="text/javascript">
 window.onload = function () {
     collection.renderCollectionPage({
         userId:       "${userid}",
         userName:     "${username}",
         projectId:    "${project_id}"
     });
 };
</script>
<#include "end-content.ftl">
<#include "footer.ftl">
