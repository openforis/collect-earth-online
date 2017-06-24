angular.module("projectList", []).controller("ProjectListController", ["$http", function ProjectListController($http) {
    this.root = "";
    this.projectList = [];

    this.getProjectList = function (institutionId) {
        $http.get(this.root + "/get-all-projects/" + institutionId)
            .then(angular.bind(this, function successCallback(response) {
                this.projectList = response.data;
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the project list. See console for details.");
            });
    };

    this.initialize = function (documentRoot) {
        // Make the current documentRoot globally available
        this.root = documentRoot;

        this.getProjectList(document.getElementById("initial-institution-id") ? document.getElementById("initial-institution-id").value : "ALL");
    };

    this.createProject = function () {
        var institutionId = document.getElementById("current-institution-id").value;
        if (institutionId == 0) {
            alert("Please finish creating the institution before adding projects to it.");
        } else if (institutionId == -1) {
            alert("Projects cannot be created without first selecting an institution.");
        } else {
            window.location = this.root + "/project/0?institution=" + institutionId;
        }
    };

}]);
