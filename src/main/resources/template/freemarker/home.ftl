<#include "header.ftl">
<#include "start-content.ftl">
<style>
#content{
    height: calc(100vh - 2px)!important;
}
</style>

<script type="text/javascript" src="${root}/js/home.js"></script>

<div id="home" ng-app="home" ng-controller="HomeController as home" ng-init="home.initialize('${root}', '${userid!""}')">
    <div id="ceo-description">
        <img id="ceo-logo" src="${root}/img/ceo-logo1.png">
        <h1>Earth Image Identification</h1>
        <h2>Collaborate. Play. Map the world.</h2>
        <p>
            Collect Earth Online is a collaborative effort between its
            developers and its community of users. We welcome
            suggestions for improvements on our
            <a href="https://github.com/openforis/collect-earth-online/issues">Github</a>
            issues page.
        </p>
    </div>
    <#include "navbar.ftl">
        <div id="bcontainer">

            <div class="Wrapper">
                <div class="Table">
                    <div id="btnHolder" style="width: {{ home.btnHolderWidth }}">
                        <div id="lPanel" class="Column" ng-show="home.showPanel">
                            <h1 id="panelTitle">Institutions [{{ home.institutionList.length }}]</h1>
                            <ul>
                                <#if role??>
                                    <li><a class="create-institution" href="${root}/institution/0">Create New Institution</a></li>
                                </#if>
                                <li ng-repeat="institution in home.institutionList">
                                    <a href="${root}/institution/{{ institution.id }}">{{ institution.name }}</a>
                                </li>
                            </ul>
                        </div>
                        <input id="togglePanel-button" class="button" type="button" name="togglePanel" style="float:left; z-index:100;" value="{{ home.toggleValue }}" ng-click="home.togglePanel(); home.updateMapSize();">
                    </div>
                    <div id="mapPanel" class="Column" style="width: {{ home.mapWidth }}" onresize="alert(0); home.updateMapSize();">

                        <input id="home-quit-button" class="button" type="button" name="collection-quit" style="float:right;" value="Quit" onclick="window.location='${root}/home'">
                        <div id="home-map-pane" ></div>

                    </div>


                </div>
            </div>
            <!--  <div class="Wrapper">
              <div class="Table">
              <div id="institution-list" class="Column">
              <h1>Institutions [{{ home.institutionList.length }}]</h1>
              <ul>
              <#if role??>
              <li><a class="create-institution" href="${root}/institution/0">Create New Institution</a></li>
              </#if>
              <li ng-repeat="institution in home.institutionList">
              <a href="${root}/institution/{{ institution.id }}">{{ institution.name }}</a>
              </li>
              </ul>
              </div>
              <div id="project-list" class="Column">
              <h1>Projects [{{ home.projectList.length }}]</h1>
              <ul>
              <li ng-repeat="project in home.projectList">
              <a ng-if="project.editable == true" class="view-project" href="${root}/collection/{{ project.id }}">{{ project.name }}</a>
              <a ng-if="project.editable == true" class="edit-project" href="${root}/project/{{ project.id }}">Edit</a>
              <a ng-if="project.editable == false" href="${root}/collection/{{ project.id }}">{{ project.name }}</a>
              </li>
              </ul>
              </div>
              <div id="user-list" class="Column">
              <h1>Users [{{ home.userList.length }}]</h1>-->
            <!-- FIXME: Replace the user list with a user map -->
            <!-- <div id="user-map"></div> -->
            <!--  <ul>
              <li ng-repeat="user in home.userList">
              <a href="${root}/account/{{ user.id }}">{{ user.email }}</a>
              </li>
              </ul>
              </div>
              </div>
              </div>-->
        </div>
</div>

<#include "end-content.ftl">
<#include "footer.ftl">
