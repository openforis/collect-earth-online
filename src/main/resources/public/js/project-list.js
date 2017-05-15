angular.module("projectList", []).controller("ProjectListController", ["$http", function ProjectListController($http) {
    this.projectList = [];

    this.getProjectList = function () {
        $http.get("get-all-projects")
            .then(angular.bind(this, function successCallback(response) {
                this.projectList = response.data;
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the project list. See console for details.");
            });
    };

    this.initialize = function () {
        // Load the projectList
        this.getProjectList();
    };

}]);
