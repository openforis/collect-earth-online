
var ctlAdmin = function($scope) {
  $scope.formID = "create-project-form"; 
  $scope.projects = ceo.project_list;
  
  $scope.map_config = new mapConfig;
  $scope.map_config.div_name = "new-project-map";
  $scope.map_config.center_coords = [102.0, 17.0];
  $scope.map_config.zoom_level = 5;

  // Initialize New Sample Value Fields
  resetNewSampleValue($scope);


  // Initialize base map
  map_utils.digital_globe_base_map($scope.map_config);
  $scope.imageryInfoText = map_utils.current_imagery;
  
  map_utils.enable_dragbox_draw();

  $scope.addSample = function() {
	var id = 0;
	var imageVal = null;

	if ($scope.currentProject) {
		id = $scope.currentProject.sample_values[$scope.currentProject.sample_values.length - 1].id + 1;
	}

	if ($scope.newValueImage) {
		imageVal = $scope.newValueImage;
	}	

	var newSampleItem = {
		color: $scope.newValueColor,
		value: $scope.newValueName,
		id: id,
		image: imageVal
	}

	$scope.currentProject.sample_values.push(newSampleItem);
	$scope.newSample.push(newSampleItem);
	resetNewSampleValue($scope);
  }


  $scope.update = function() {
	$scope.test = $scope.selProj;
	$scope.newSample = [];
	resetNewSampleValue($scope);

	$scope.currentProject = getProject($scope.selProj);
	
	if ($scope.currentProject) {
		$scope.imageryInfoText = $scope.currentProject.attribution;
		map_utils.set_current_imagery($scope.currentProject.imagery);
		map_utils.remove_plot_layer();
		map_utils.remove_sample_layer();
		map_utils.draw_polygon($scope.currentProject.boundary);
		map_utils.disable_dragbox_draw();

		$scope.basemapSelect = $scope.currentProject.imagery;

		// Populate lat-max,lat-min, lon-mat, lon-min inut fields with data from project
		var extents0 = map_utils.current_boundary.getSource().getExtent();
		var extents = ol.extent.applyTransform(extents0, ol.proj.getTransform("EPSG:3857", "EPSG:4326"));
		map_utils.current_bbox = {minlon: extents[0],
                                  minlat: extents[1],
                                  maxlon: extents[2],
                                  maxlat: extents[3]};
		map_utils.set_bbox_coords();

		// Populate other input fields with data from project
		$scope.projName = $scope.currentProject.name;
		$scope.projDescr = $scope.currentProject.description;
		$scope.projPlots = 3;
		$scope.projRadius = ceo.plot_data[$scope.currentProject.id][0].plot.radius;
		$scope.samplesPerPlot = ceo.plot_data[$scope.currentProject.id][0].samples.length;
		$scope.sampleResolution = "";
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

function resetNewSampleValue($scope) {
        $scope.newValueName = "";
        $scope.newValueColor = "#000000";
        $scope.newValueImage = null;
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

