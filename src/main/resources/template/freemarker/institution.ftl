<#include "header.ftl">
<#include "branding-banner.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<#include "flash-messages.ftl">

<div id="institution">
    <div id="institution-details">
        <img src="${institution_logo}">
        <h1>${institution_name}</h1>
        <p>${institution_description}</p>
    </div>
    <#include "project-list.ftl">
    <#include "user-list.ftl">
</div>

<#include "end-content.ftl">
<#include "footer.ftl">
