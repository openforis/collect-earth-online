<#include "header.ftl">
<#include "start-content.ftl">
<div id="about"></div>

<!-- Auto Inserted Bundles -->

<!-- End Auto Inserted Bundles -->

<script type="text/javascript">
    window.onload = function () {
        about.renderAboutPage({
            userId:      "${userid}",
            userName:    "${username}"
        });
    };
</script>
<#include "end-content.ftl">
<#include "footer.ftl">
