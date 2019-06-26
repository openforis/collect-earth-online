<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<div id="institution"></div>

<!-- Auto Inserted Bundles -->

<!-- End Auto Inserted Bundles -->

<script type="text/javascript">
    window.onload = function () {
        review_institution.renderReviewInstitutionPage({
            documentRoot:     "${root}",
            userId:           "${userid}",
            institutionId:    "${institution_id}",
            of_users_api_url: "${of_users_api_url}",
            storage:          "${storage}",
        });
    };
</script>
<#include "end-content.ftl">
<#include "footer.ftl">
