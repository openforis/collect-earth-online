<#include "header.ftl">
<#include "geo-dash-navbar.ftl">
<#include "start-content.ftl">
<br style="clear:both">
<div class="container-fluid">
    <div id="dashHolder"></div>
</div>
<!-- Auto Inserted Bundles -->

<!-- End Auto Inserted Bundles -->

<script type="text/javascript">
 window.onload = function () {
     geo_dash.renderGeodashPage("${root}");
 };
</script>
<#include "end-content.ftl">
<#include "footer.ftl">
