<#include "header.ftl">
<#include "start-content.ftl">
<div id="login"></div>

<!-- Auto Inserted Bundles -->

<!-- End Auto Inserted Bundles -->

<script type="text/javascript">
    window.onload = function () {
        login.renderLoginPage({
            userId:       "${userid}",
            userName:     "${username}",
            returnurl:    "${returnurl}"
        });
    };
</script>
<#include "end-content.ftl">
<#include "footer.ftl">
