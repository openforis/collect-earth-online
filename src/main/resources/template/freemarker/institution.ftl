<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">

<script type="text/javascript">
	let nonPendingUsers="";
	let pageMode = "view";
    window.onload = function() {
        renderPage("institution", {
            documentRoot: "${root}",
            userId: "${userid}",
            institutionId: "${institution_id}",
            of_users_api_url: "${of_users_api_url}",
            role: "${role}",
            storage: "${storage}",
            nonPendingUsers: nonPendingUsers,
            pageMode: pageMode
        });
    }

</script>

<div id="institution"></div>

<#include "end-content.ftl">
<#include "footer.ftl">
