
var ctlDashboard = function($scope) {
  $scope.formID = "dashboard";
  $scope.projects = ceo.project_list;
  
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
		map_utils.set_current_imagery($scope.currentProject.imagery);
		map_utils.remove_plot_layer();
		map_utils.remove_sample_layer();
		map_utils.draw_polygon($scope.currentProject.boundary);
	}
  }

  $scope.getNewPlot = function () {
     if ($scope.currentProject) {
       var currProj = ceo.plot_data[$scope.currentProject.id];
       var numPlots = currProj.length;
       var rndmPlotId = Math.floor((Math.random() * numPlots) + 1);
       var rndmPlot = currProj[rndmPlotId];

       map_utils.draw_buffer(rndmPlot.plot.center, rndmPlot.plot.radius);
       map_utils.draw_points(rndmPlot.samples);
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

/* Create a directive to add to the Angular module */
var ratingStars = function() {
	return {
		scope: {
			thisRating : '=rating'
		},
		templateUrl: 'angular/rating-stars.html'
	};
}


angular
   .module('collectEarth')
   .controller('ctlDashboard', ctlDashboard)
   .directive('ratingStars', ratingStars);

