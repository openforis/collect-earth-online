<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">

<script type="text/babel" src="${root}/js/Main.js"></script>
<script type="text/javascript">
	let nonPendingUsers="";
	let pageMode = "view";
	
    $(function() {initialize();});
    function initialize() {
        if(typeof(renderInstitution)=="undefined")
            setTimeout(initialize,250);
        else
            renderInstitution("${root}", "${userid}","${institution_id}","${of_users_api_url}","${role}","${storage}",nonPendingUsers,pageMode);
    }
</script>
<div id="institution"></div>
<#include "end-content.ftl">
<#include "footer.ftl">
