
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
//  $scope.currentProject = ceo.project_list[0];
  
  $scope.map_config = new mapConfig;
  $scope.map_config.div_name = "image-analysis-pane";
  $scope.map_config.center_coords = [102.0, 17.0];
  $scope.map_config.zoom_level = 5;

  // Initialize base map
  map_utils.digital_globe_base_map($scope.map_config);
  $scope.imageryInfoText = map_utils.current_imagery;
 
   $scope.update = function() {
	$scope.test = $scope.selProj;

	$scope.currentProject = getProject($scope.selProj);
	
	if ($scope.currentProject) {
		$scope.imageryInfoText = $scope.currentProject.attribution;
		map_utils.remove_plot_layer();
		map_utils.remove_sample_layer();
		map_utils.draw_polygon($scope.currentProject.boundary);
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

}


angular
   .module('collectEarth')
   .controller('ctlDashboard', ctlDashboard)
//   .directive('passwordReset', passwordReset);
