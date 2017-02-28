
var ctlDashboard = function($scope) {
  $scope.formID = "dashboard";
  $scope.emailID = "email"
  $scope.passwordID = "password";
  $scope.passwordConfirmID = "password-confirmation";
  $scope.passwordCurrentID = "current-password";

  $scope.phEmail = "Email Address";
  $scope.phNewPwd = "New Password";
  $scope.phConfPwd = "New Password Confirmation";
  $scope.phCurrPwd = "Current Password";
  $scope.tpEmail = "email";
  $scope.tpPassword = "password";

  $scope.projects = ceo.project_list;

  $scope.map_config = new mapConfig;
  $scope.map_config.div_name = "image-analysis-pane";
  $scope.map_config.center_coords = [102.0, 7.0];
  $scope.map_config.zoom_level = 5;

  // Initialize base map
  map_utils.digital_globe_base_map($scope.map_config);
  $scope.imageryInfoText = map_utils.current_imagery;

  $scope.update = function() {
	$scope.test = $scope.selProj;

	$scope.project = getProject($scope.selProj);
//	var format = new ol.format.GeoJSON();
//	var geometry = format.readGeometry(project.boundary);
//	var coord = geometry.getCoordinates();
	
	if ($scope.project) {
		$scope.imageryInfoText = $scope.project.attribution;
		map_utils.remove_plot_layer();
		map_utils.remove_sample_layer();
		map_utils.draw_polygon($scope.project.boundary);
	}
 }


}



function getProject(projectId) {
	var i = 0;
	for (i=0; i < ceo.project_list.length; i++) {
		if (ceo.project_list[i].id == projectId) {
			return ceo.project_list[i];
		}
	}
}


function mapConfig(divName, centerCoords, zoomLevel){
	this.div_name = divName;
	this.center_coords = centerCoords;
	this.zoom_level = zoomLevel;
}

function populateProjects(_projects) {
	_projects.push({id:1,name:'Mekong River Region'});
        _projects.push({id:2,name:'California, USA'})
	_projects.push({id:12,name:'Mekong_River_Sample'});
	_projects.push({id:14,name:'Lower Mekong Region'});
	_projects.push({id:15,name:'Myanmar Landcover Classification'});
	_projects.push({id:16,name:'MK Laos'});
	_projects.push({id:18,name:'Classification of Land Cover'});
	_projects.push({id:19,name:'Cambodia'});
	_projects.push({id:20,name:'Cambodia Land Cover'});
	_projects.push({id:23,name:'MK_VN'});
	_projects.push({id:24,name:'DN_VN'});
	_projects.push({id:25,name:'CM_VN'});
	_projects.push({id:26,name:'Myanmar Landcover'});
	_projects.push({id:37,name:'DN2'});
	_projects.push({id:38,name:'DN2_2'});
	_projects.push({id:39,name:'FAO Regional Subset Collection'});
	_projects.push({id:40,name:'FAO_Test'});
	_projects.push({id:41,name:'FAO Regional Subset Collection v2'});
	_projects.push({id:42,name:'FAO Test 2'});
	_projects.push({id:45,name:'Myanmar_test'});
	_projects.push({id:47,name:'Gridded Sample Test'});
	_projects.push({id:49,name:'SCO_test'});
	_projects.push({id:50,name:'Bing Maps Test'});
	_projects.push({id:53,name:'HB Blowdown 2'});
	_projects.push({id:54,name:'HB Blowdown 3'});
	_projects.push({id:55,name:'TEST FAO'});

}


angular
   .module('collectEarth')
   .controller('ctlDashboard', ctlDashboard)
//   .directive('passwordReset', passwordReset);
