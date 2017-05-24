<#include "header.ftl">
<#include "branding-banner.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<#include "flash-messages.ftl">

<div id="institution">
    <div id="institution-details" ng-controller="InstitutionController as institution" ng-init="institution.initialize()">
        <h1>{{ institution.details.name }}</h1>
        <img src="{{ institution.details.logo }}">
        <a href="{{ institution.details.url }}">{{ institution.details.url }}</a>
        <p>{{ institution.details.description }}</p>
        <#if role?? && role == "admin">
            <input id="edit-institution" class="button" type="button" value="Edit Institution"
                   ng-click="institution.editInstitution()" style="visibility: {{ institution.details.id == -1 ? 'hidden' : 'visible' }}">
            <input id="delete-institution" class="button" type="button" value="Delete Institution"
                   ng-click="institution.deleteInstitution()" style="visibility: {{ institution.details.id == -1 ? 'hidden' : 'visible' }}">
        </#if>
        <input id="initial-institution-id" type="hidden" name="initial-institution-id" value=${institution_id!"-1"}>
    </div>
    <#include "project-list.ftl">
    <#include "user-list.ftl">
</div>

<#include "end-content.ftl">
<#include "footer.ftl">
