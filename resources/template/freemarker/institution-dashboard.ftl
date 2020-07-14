<#include "header.ftl">
<#include "start-content.ftl">
<#if institution_id == "">
    <#assign institution_id = "0">
</#if>
<div id="institution-dashboard"></div>

<!-- Auto Inserted Bundles -->

<!-- End Auto Inserted Bundles -->

<script type="text/javascript">
    window.onload = function () {
        institution_dashboard.renderInstitutionDashboardPage({
            userName:         "${username}",
            userId:           "${userid}",
            institutionId:    "${institution_id}",
        });
    };
</script>
<#include "end-content.ftl">
<#include "footer.ftl">
