<#include "header.ftl">
<#include "geodash-navbar.ftl">
<#include "start-content.ftl">
<br style="clear:both">
<div class="container-fluid">
    <div id="dashHolder"></div>
</div>
<script type="text/javascript">
 let theURL="${root}" + "/geo-dash";
 var pid = this.getParameterByName("pid");
 function getParameterByName (name, url) {
     "use strict";
     if (!url) {
         url = window.location.href;
     }
     url = decodeURIComponent(url);
     name = name.replace(/[\[\]]/g, "\\$&");
     var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");
     var results = regex.exec(url);
     if (!results) {
         return null;
     }
     if (!results[2]) {
         return "";
     }
     return decodeURIComponent(results[2].replace(/\+/g, " "));
 }
</script>

<!-- Auto Inserted Bundles -->
<script type="text/javascript" src="${root}/js/collection~create_project~geo_dash~home~project_dashboard~review_project.bundle.js"></script>
<script type="text/javascript" src="${root}/js/common-vendor-files-chunk.bundle.js"></script>
<script type="text/javascript" src="${root}/js/geo_dash.bundle.js"></script>
<!-- End Auto Inserted Bundles -->

<script type="text/javascript">
 window.onload = function () {
     geo_dash.renderGeodashPage("${root}");
 };
</script>
<#include "end-content.ftl">
<#include "footer.ftl">
