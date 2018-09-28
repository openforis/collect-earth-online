<#include "header.ftl">
<#include "navbar.ftl">
<#include "announcements.ftl">
<#include "start-content.ftl">
<div id="home"></div>
<script type="text/javascript" src="${root}/js/home.js"></script>
<script type="text/javascript">
$(function() {initialize();});
function initialize() {
    if(typeof(renderHome)=="undefined")
        setTimeout(initialize,250);
    else
        renderHome("${root}", "${userid}","${username}");
}
</script>
<#include "end-content.ftl">
<#include "footer.ftl">
