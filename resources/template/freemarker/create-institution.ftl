<#include "header.ftl">
<#include "start-content.ftl">
<div id="institution"></div>

<!-- Auto Inserted Bundles -->

<!-- End Auto Inserted Bundles -->

<script type="text/javascript">
    window.onload = function () {
        create_institution.renderCreateInstitutionPage({
            userName:    "${username}",
            userId:      "${userid}"
        });
    };
</script>
<#include "end-content.ftl">
<#include "footer.ftl">
