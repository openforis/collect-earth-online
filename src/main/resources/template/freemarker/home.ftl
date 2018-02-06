<#include "header.ftl">
    <#include "navbar.ftl">

<#include "start-content.ftl">
<style>
    /*Needed to override server calculated height */
    #content{
        height: calc(100vh - 2px)!important;
    }
    /*Needed to get root to css */
    #home label.tree_label:before {
        background-image: url(${root}/css/images/closedTree.png);
    }
    #home :checked ~ label.tree_label:before {
        background-image: url(${root}/css/images/openTree.png);
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
        <div id="bcontainer">
        <span id="mobilespan" ></span>
            <div class="Wrapper">
                <div class="row">
                    <div id="btnHolder" class="col-xl-3 col-lg-4 col-md-12 col-sm-12" style="width: {{ home.btnHolderWidth }}">
                        <div id="lPanel" class="Column" ng-show="home.showPanel">
						<div class="bg-darkgreen">
                           <h1 class="tree_label" id="panelTitle">Institutions <!--[{{ home.institutionList.length }}]--></h1>
                           </div>
                            <ul class="tree">
                                <#if role??>
                                <a class="create-institution" href="${root}/institution/0">
                                    <li class="bg-yellow text-center p-2"><i class="fa fa-file"></i> Create New Institution</li>
                                    </a>
                                </#if>
                                <li ng-repeat="institution in home.institutionList">
                                    <span class="tree_label" >
                                    <div class="bg-lightgreen text-center p-2">
                                                                        
                                    
                                    <p class="tree_label text-white m-0" for="c{{ institution.id }}"><input type="checkbox"  id="c{{ institution.id }}" /> {{ institution.name }}
                                    <a class="institution_info" href="${root}/institution/{{ institution.id }}"><img src="${root}/img/institution_info.png" alt="Institution info" title="Institution info"></a>
                                    </p>
									</div>
                                    </span>
                                    <ul>
                                        <li class="bg-lightgrey text-center p-1" ng-repeat="project in home.projectList | filter : {institution: institution.id }">
                                            <span class="tree_label">
                                            <a ng-if="project.editable == true" class="view-project" href="${root}/collection/{{ project.id }}">{{ project.name }}</a>
                                            <a ng-if="project.editable == true" class="edit-project btn btn-outline-yellow btn-sm" href="${root}/project/{{ project.id }}"><i class="fa fa-edit"></i> Edit</a>
                                            <a ng-if="project.editable == false" href="${root}/collection/{{ project.id }}">{{ project.name }}</a>
                                            </span>
                                        </li>
                                    </ul>
                                </li>
                            </ul>
                        </div>
                        <input id="togglePanel-button" class="button" type="button" name="togglePanel" style="float:left; z-index:100; right: {{ home.togglebtn }};" value="{{ home.toggleValue }}" ng-click="home.togglePanel(); home.updateMapSize();">
                    </div>
                    <div id="mapPanel" class="col-xl-9 col-lg-8 col-md-12" style="width: {{ home.mapWidth }}" onresize="alert(0); home.updateMapSize();">
                    <div class="buttonHolder">

                        <span id="action-button" name="collection-quit" title="Navigate on map or use the Institutions tree" alt="Navigate on map or use the Institutions tree">Choose a project to get started</span>
                    </div>
                        <div id="home-map-pane" ></div>
                    </div>
                </div>
            </div>
        </div>

</div>

<#include "end-content.ftl">
<#include "footer.ftl">
