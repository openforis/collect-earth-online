<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<div id="institution"></div>
<script type="text/javascript" src="${root}/js/vendors~account~collection~create_institution~create_project~geodashreact~home~institution_dashboard~93ace93a.bundle.js"></script>
<script type="text/javascript" src="${root}/js/create_institution.bundle.js"></script>
<script type="text/javascript">
    window.onload = function () {
        create_institution.renderCreateInstitutionPage({
            documentRoot:     "${root}",
            userId:           "${userid}"
        });
    };
</script>
<#include "end-content.ftl">
<#include "footer.ftl">
