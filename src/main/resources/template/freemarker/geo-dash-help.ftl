<#include "header.ftl">
<#include "start-content.ftl">
<div id="dashHolder"></div>

<!-- Auto Inserted Bundles -->

<!-- End Auto Inserted Bundles -->


<script type="text/javascript">
    window.onload = function () {
        geo_dash_help.renderGeodashHelpPage({
            userName:           "${username}",
            userId:             "${userid}",
            browserLanguage:    "${browserLanguage}"
        });
    };
</script>
<#include "end-content.ftl">
<#include "footer.ftl">