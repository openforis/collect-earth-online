<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<div class="row justify-content-center">
	<div id="account" class="col-xl-6 col-lg-8 border bg-lightgray mb-5"></div>
</div>
<script type="text/javascript" src="${root}/js/bundle.js"></script>
<script type="text/javascript">
 window.onload = function () {
     renderPage("account",
                {
                    documentRoot: "${root}",
                    userId:       "${userid}",
                    accountId:    "${account_id}",
                    username:     "${username}"
                }
     );
 };
</script>
<#include "end-content.ftl">
<#include "footer.ftl">
