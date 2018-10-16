<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<div id="institution"></div>
<script type="text/javascript" src="${root}/js/vendors~account~collection~geodashreact~home~institution~project~timesync~widgetlayouteditor.bundle.js"></script>
<script type="text/javascript" src="${root}/js/institution.bundle.js"></script>
<script type="text/javascript">
 window.onload = function () {
     institution.renderInstitutionPage({
         documentRoot:     "${root}",
         userId:           "${userid}",
         institutionId:    "${institution_id}",
         of_users_api_url: "${of_users_api_url}",
         role:             "${role}",
         storage:          "${storage}",
         nonPendingUsers:  "",
         pageMode:         "view"
     });
 };
</script>
<#include "end-content.ftl">
<#include "footer.ftl">
