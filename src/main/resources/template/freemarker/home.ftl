<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
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
            <div class="row tog-effect">
                <div id="lPanel" class="col-lg-3 pr-0 pl-0">
                    <div class="bg-darkgreen">
                        <h1 class="tree_label" id="panelTitle">
                            Institutions <!--[{{ home.institutionList.length }}]-->
                        </h1>
                    </div>
                    <ul class="tree">
                        <#if role??>
                            <a class="create-institution" href="${root}/institution/0">
                                <li class="bg-yellow text-center p-2"><i class="fa fa-file"></i> Create New Institution</li>
                            </a>
                        </#if>
                        <li ng-repeat="institution in home.institutionList">
                            <div class="btn bg-lightgreen btn-block m-0 p-2 rounded-0" data-toggle="collapse" href="#collapse{{ institution.id }}" role="button" aria-expanded="false">
                                <div class="row">
                                    <div class="col-lg-10 my-auto">
                                        <p class="tree_label text-white m-0" for="c{{ institution.id }}"><input type="checkbox" class="d-none" id="c{{ institution.id }}" /><span class="">{{ institution.name }}</span></p>
                                    </div>
                                    <div class="col-lg-1">
                                        <a class="institution_info btn btn-sm btn-outline-lightgreen" href="${root}/institution/{{ institution.id }}"><i class="fa fa-info" style="color:white;"></i></a>
                                    </div>
                                </div>
                            </div>
                            <div  class="collapse" id="collapse{{ institution.id }}">
                                <div class="bg-lightgrey text-center p-1 row px-auto" ng-if="project.editable == true"  ng-repeat="project in home.projectList | filter : {institution: institution.id }">
                                    <div class="col-lg-9 pr-lg-1">
                                        <a class="view-project btn btn-sm btn-outline-lightgreen btn-block" href="${root}/collection/{{ project.id }}">{{ project.name }}</a>
                                    </div>
                                    <div class="col-lg-3 pl-lg-0">
                                        <a ng-if="project.editable == true" class="edit-project btn btn-outline-yellow btn-sm btn-block" href="${root}/project/{{ project.id }}"><i class="fa fa-edit"></i> Edit</a>
                                    </div>
                                </div>
                                <div class="bg-lightgrey text-center p-1 row" ng-if="project.editable == false"  ng-repeat="project in home.projectList | filter : {institution: institution.id }">
                                    <div class="col mb-1 mx-0">
                                        <a class="btn btn-sm btn-outline-lightgreen btn-block" href="${root}/collection/{{ project.id }}">{{ project.name }}</a>
                                    </div>
                                </div>
                            </div>
                        </li>
                    </ul>
                </div>
                <div id="mapPanel" class="col-lg-9 col-md-12 pl-0 pr-0">
                    <div class="row no-gutters full-height">
                        <div id="togbutton" class="button col-xl-1 bg-lightgray d-none d-xl-block">
                            <div class="row h-100">
                                <div class="col-lg-12 my-auto no-gutters text-center">
                                    <span id="tog-symb"><i class='fa fa-caret-left'></i></i></span>
                                </div>
                            </div>
                        </div>
                        <div class="col-xl-11 mr-0 ml-0 bg-lightgray">
                            <div id="home-map-pane" style="width: 100%; height: 100%; position:fixed">
                            </div>
                        </div>
                    </div>
                </div>
                <!--
                  <div id="mapPanel" class="col-xl-9 col-lg-9 col-md-12 pl-0 bg-lightgray" style="width: {{ home.mapWidth }}" onresize="alert(0); home.updateMapSize();">
                  hide map panel to fix height issue  <div id="home-map-pane" ></div>
                  </div>
                  -->
            </div>
        </div>
    </div>
</div>
<#include "end-content.ftl">
<#include "footer.ftl">
