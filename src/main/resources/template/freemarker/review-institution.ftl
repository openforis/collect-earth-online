<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<div id="institution"></div>

<!-- Auto Inserted Bundles -->
<script type="text/javascript" src="${root}/js/create_institution~create_project~review_institution.bundle.js"></script>
<script type="text/javascript" src="${root}/js/create_institution~review_institution.bundle.js"></script>
<script type="text/javascript" src="${root}/js/common-vendor-files-chunk.bundle.js"></script>
<script type="text/javascript" src="${root}/js/home~review_institution.bundle.js"></script>
<script type="text/javascript" src="${root}/js/review_institution.bundle.js"></script>
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
