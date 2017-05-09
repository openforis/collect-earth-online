<#include "header.ftl">
<#include "branding-banner.ftl">
<#include "navbar.ftl">
<#include "flash-messages.ftl">

<script type="text/javascript" src="js/select-project.js"></script>

<div id="home">
    <img id="ceo-logo" src="img/ceo-logo1.png">
    <h2>Earth Image Identification</h2>
    <h3>Collaborate. Play. Map the world.</h3>
    <hr>
    <p>Collect Earth Online is a collaborative effort between its developers and its
        community of users. We welcome suggestions for improvements on our
        <a href="https://github.com/openforis/collect-earth-online/issues">Github</a>
        issues page.</p>
</div>

<div id="select-project-form" ng-app="selectProject" ng-controller="SelectProjectController as selectProject" ng-init="selectProject.initialize()">
    <h1>Featured Projects</h1>
    <ul>
        <li ng-repeat="project in selectProject.projectList">
            <a href="dashboard?project={{ project.id }}">{{ project.name }}</a>
        </li>
    </ul>
</div>

<#include "insitution-banner.ftl">
<#include "footer.ftl">
