<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">

<div id="mailing-list" class="row justify-content-center"></div>

<!-- Auto Inserted Bundles -->

<!-- End Auto Inserted Bundles -->

<script type="text/javascript">
    window.onload = function () {
        mailing_list.renderMailingListPage({
            documentRoot:  "${root}",
        });
    };
</script>

<#include "end-content.ftl">
<#include "footer.ftl">
