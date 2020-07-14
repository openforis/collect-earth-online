<#include "header.ftl">
<#include "start-content.ftl">
<div id="password-reset"></div>

<!-- Auto Inserted Bundles -->

<!-- End Auto Inserted Bundles -->

<script type="text/javascript">
    window.onload = function () {
        password_reset.renderPasswordResetPage({
            email:               "${email}",
            passwordResetKey:    "${password_reset_key}"
        });
    };
</script>
<#include "end-content.ftl">
<#include "footer.ftl">
