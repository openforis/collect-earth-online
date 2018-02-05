<#include "header.ftl">
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
    <#include "navbar.ftl">
        <div id="bcontainer">
        <span id="mobilespan" ></span>
            <div class="Wrapper">
                <div class="row">
                    <div id="btnHolder" class="col-md-3" style="width: {{ home.btnHolderWidth }}">
                        <div id="lPanel" class="Column" ng-show="home.showPanel">
                        	                       	 <div class="bg-darkgreen p-4">
                        
                           <h2 class="text-center text-white tree_label" id="panelTitle">Institutions <!--[{{ home.institutionList.length }}]--></h2>
                           </div>
                            <ul class="tree">
                                <#if role??>
                                    <li class="bg-yellow"><a class="create-institution" href="${root}/institution/0"><i class="fa fa-file"></i> Create New Institution</a></li>
                                </#if>
                                <li ng-repeat="institution in home.institutionList">
                                    <input type="checkbox"  id="c{{ institution.id }}" />
                                    <span class="tree_label" >
                                    <div class="bg-lightgreen text-center">
                                    <p class="tree_label text-white" for="c{{ institution.id }}">{{ institution.name }}
                                    <a class="institution_info" href="${root}/institution/{{ institution.id }}"><img src="${root}/img/institution_info.png" alt="Institution info" title="Institution info"></a>
                                    </p>
									</div>
                                    </span>
                                    <ul>
                                        <li class="bg-lightgrey" ng-repeat="project in home.projectList | filter : {institution: institution.id }">
                                            <span class="tree_label">
                                            <a ng-if="project.editable == true" class="view-project" href="${root}/collection/{{ project.id }}">{{ project.name }}</a>
                                            <a ng-if="project.editable == true" class="edit-project" href="${root}/project/{{ project.id }}">Edit</a>
                                            <a ng-if="project.editable == false" href="${root}/collection/{{ project.id }}">{{ project.name }}</a>
                                            </span>
                                        </li>
                                    </ul>
                                </li>
                            </ul>
                        </div>
                        <input id="togglePanel-button" class="button" type="button" name="togglePanel" style="float:left; z-index:100; right: {{ home.togglebtn }};" value="{{ home.toggleValue }}" ng-click="home.togglePanel(); home.updateMapSize();">
                    </div>
                    <div id="mapPanel" class="Column" style="width: {{ home.mapWidth }}" onresize="alert(0); home.updateMapSize();">
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
