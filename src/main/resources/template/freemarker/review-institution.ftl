<#include "header.ftl">
<#include "start-content.ftl">
<div id="institution"></div>

<!-- Auto Inserted Bundles -->

<!-- End Auto Inserted Bundles -->

<script type="text/javascript">
    window.onload = function () {
        review_institution.renderReviewInstitutionPage({
            userName:         "${username}",
            userId:           "${userid}",
            institutionId:    "${institution_id}",
        });
    };
</script>
<#include "end-content.ftl">
<#include "footer.ftl">
