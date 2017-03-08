
var ctlAdmin = function($scope) {
  $scope.formID = "create-project-form"; 

  $scope.projects = ceo.project_list;
  
  $scope.map_config = new mapConfig;
  $scope.map_config.div_name = "new-project-map";
  $scope.map_config.center_coords = [102.0, 17.0];
  $scope.map_config.zoom_level = 5;

  // Initialize base map
  map_utils.digital_globe_base_map($scope.map_config);
  $scope.imageryInfoText = map_utils.current_imagery;
  
  map_utils.enable_dragbox_draw();

  $scope.update = function() {
	$scope.test = $scope.selProj;

	$scope.currentProject = getProject($scope.selProj);
	
	if ($scope.currentProject) {
		$scope.imageryInfoText = $scope.currentProject.attribution;
		map_utils.remove_plot_layer();
		map_utils.remove_sample_layer();
		map_utils.draw_polygon($scope.currentProject.boundary);
		map_utils.disable_dragbox_draw();


		var extents0 = map_utils.current_boundary.getSource().getExtent();
		var extents = ol.extent.applyTransform(extents0, ol.proj.getTransform("EPSG:3857", "EPSG:4326"));
		map_utils.current_bbox = {minlon: extents[0],
                                  minlat: extents[1],
                                  maxlon: extents[2],
                                  maxlat: extents[3]};
		map_utils.set_bbox_coords();
	}
  }
  
  map_utils.set_bbox_coords = function() {
	var latmax = document.getElementById('lat-max');
        var lonmax = document.getElementById('lon-max');
        var latmin = document.getElementById('lat-min');
        var lonmin = document.getElementById('lon-min');
  
        latmax.value = map_utils.current_bbox.maxlat;
        lonmax.value = map_utils.current_bbox.maxlon;
        latmin.value = map_utils.current_bbox.minlat;
        lonmin.value = map_utils.current_bbox.minlon;
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
   .controller('ctlAdmin', ctlAdmin)
   .directive('ratingStars', ratingStars);

