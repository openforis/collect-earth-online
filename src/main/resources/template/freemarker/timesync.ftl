<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<div id="timesync"></div>
<script type="text/javascript" src="${root}/js/vendors~account~collection~geodashreact~home~institution~project~timesync~widgetlayouteditor.bundle.js"></script>
<script type="text/javascript" src="${root}/js/timesync.bundle.js"></script>
<script type="text/javascript">
 window.onload = function () {
     timesync.renderTimeSyncPage({
         documentRoot: "${root}",
         userId:       "${userid}",
         userName:     "${username}"
     });
 };
</script>
<#include "end-content.ftl">
<#include "footer.ftl">