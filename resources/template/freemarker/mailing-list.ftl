<#include "header.ftl">
<#include "start-content.ftl">
<div id="mailing-list"></div>

<!-- Auto Inserted Bundles -->

<!-- End Auto Inserted Bundles -->

<script type="text/javascript">
    window.onload = function () {
        mailing_list.renderMailingListPage({
            userId:       "${userid}",
            userName:     "${username}"
        });
    };
</script>
<#include "end-content.ftl">
<#include "footer.ftl">
