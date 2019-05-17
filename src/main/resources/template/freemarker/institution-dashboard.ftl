<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<#if institution_id == "">
    <#assign institution_id = "0">
</#if>
<div id="institution-dashboard" class="row justify-content-center"></div>
<script type="text/javascript" src="${root}/js/vendors~account~collection~create_institution~create_project~geodashreact~home~institution_dashboard~93ace93a.bundle.js"></script>
<script type="text/javascript" src="${root}/js/institution_dashboard.bundle.js"></script>
<script type="text/javascript">
    window.onload = function () {
        institution_dashboard.renderInstitutionDashboardPage({
            documentRoot:  "${root}",
            userId:        "${userid}",
            institutionId: "${institution_id}",
        });
    };
</script>
<#include "end-content.ftl">
<#include "footer.ftl">
