<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">

<div id="unsubscribe-mailing-list" class="row justify-content-center"></div>

<!-- Auto Inserted Bundles -->

<!-- End Auto Inserted Bundles -->

<script type="text/javascript">
    window.onload = function () {
        unsubscribe_mailing_list.renderUnsubscribeMailingListPage({
            documentRoot:  "${root}",
        });
    };
</script>

<#include "end-content.ftl">
<#include "footer.ftl">
