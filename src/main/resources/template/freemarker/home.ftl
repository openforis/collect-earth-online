<#include "header.ftl">
<#include "navbar.ftl">
<#include "announcements.ftl">
<#include "start-content.ftl">
<div id="home"></div>
<script type="text/javascript" src="${root}/js/vendors~account~collection~create_project~geodashreact~home~institution~review_project~widgetlayoute~33e7a6f8.bundle.js"></script>
<script type="text/javascript" src="${root}/js/collection~create_project~geodashreact~home~review_project.bundle.js"></script>
<script type="text/javascript" src="${root}/js/home.bundle.js"></script>
<script type="text/javascript">
 window.onload = function () {
     home.renderHomePage({
         documentRoot: "${root}",
         userId:       "${userid}",
         userName:     "${username}"
     });
 };
</script>
<#include "end-content.ftl">
<#include "footer.ftl">
