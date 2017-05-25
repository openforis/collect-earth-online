<#include "header.ftl">
<#include "branding-banner.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<#include "flash-messages.ftl">

<div id="institution">
    <div id="institution-details" ng-controller="InstitutionController as institution" ng-init="institution.initialize()">
        <div id="institution-view" ng-show="institution.pageMode == 'view'">
            <h1>{{ institution.details.name }}</h1>
            <img src="{{ institution.details.logo }}">
            <a href="{{ institution.details.url }}">{{ institution.details.url }}</a>
            <p>{{ institution.details.description }}</p>
        </div>
        <div id="institution-edit" ng-show="institution.pageMode == 'edit'">
            <label>Name</label>
            <input id="institution-name" type="text" ng-model="institution.details.name">
            <label>Logo</label>
            <input id="institution-logo" type="text" ng-model="institution.details.logo">
            <label>URL</label>
            <input id="institution-url" type="text" ng-model="institution.details.url">
            <label>Description</label>
            <textarea id="institution-description" ng-model="institution.details.description"></textarea>
        </div>
        <#if role?? && role == "admin">
            <input id="edit-institution" type="button" value="{{ institution.pageMode == 'view' ? 'Edit Institution' : 'Save Changes' }}"
                   ng-click="institution.editInstitution()" ng-show="institution.details.id != -1">
            <input id="delete-institution" type="button" value="Delete Institution"
                   ng-click="institution.deleteInstitution()" ng-show="institution.details.id != -1">
        </#if>
        <input id="initial-institution-id" type="hidden" name="initial-institution-id" value=${institution_id!"-1"}>
    </div>
    <#include "project-list.ftl">
    <#include "user-list.ftl">
</div>

<#include "end-content.ftl">
<#include "footer.ftl">
