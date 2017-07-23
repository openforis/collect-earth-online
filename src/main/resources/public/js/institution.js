angular.module("institution", []).controller("InstitutionController", ["$http", function InstitutionController($http) {
    this.root = "";
    this.userId = "";
    this.pageMode = "view";
    this.details = {
        id: "-1",
        name: "",
        logo: "",
        url: "",
        description: "",
        admins: []
    };
    this.isAdmin = false;
    this.projectList = [];
    this.userList = [];

    this.getInstitutionDetails = function (institutionId) {
        $http.get(this.root + "/get-institution-details/" + institutionId)
            .then(angular.bind(this, function successCallback(response) {
                this.details = response.data;
                this.isAdmin = this.details.admins.includes(parseInt(this.userId));
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the institution details. See console for details.");
            });
    };

    this.getProjectList = function (userId, institutionId) {
        $http.get(this.root + "/get-all-projects?userId=" + userId + "&institutionId=" + institutionId)
            .then(angular.bind(this, function successCallback(response) {
                this.projectList = response.data;
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the project list. See console for details.");
            });
    };

    this.getUserList = function () {
        $http.get(this.root + "/get-all-users")
            .then(angular.bind(this, function successCallback(response) {
                this.userList = response.data;
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the user list. See console for details.");
            });
    };

    this.initialize = function (documentRoot, userId) {
        // Make the current documentRoot and userId globally available
        this.root = documentRoot;
        this.userId = userId;

        // If in Create Institution mode, show the institution editing view. Otherwise, load and show the institution details
        this.details.id = document.getElementById("initial-institution-id").value;
        if (this.details.id == "0") {
            this.pageMode = "edit";
        } else {
            this.getInstitutionDetails(this.details.id);

            // Load the projectList
            this.getProjectList(this.userId, this.details.id);

            // Load the userList
            this.getUserList();
        }
    };

    this.updateInstitution = function () {
        var formData = new FormData();
        formData.append("userid", this.userId);
        formData.append("institution-name", this.details.name);
        formData.append("institution-logo", document.getElementById("institution-logo").files[0]);
        formData.append("institution-url", this.details.url);
        formData.append("institution-description", this.details.description);
        $http.post(this.root + "/update-institution/" + this.details.id,
                   formData,
                   {transformRequest: angular.identity,
                    headers: {"Content-Type": undefined}})
            .then(angular.bind(this, function successCallback(response) {
                this.details.id = response.data.id;
                this.isAdmin = true;
                if (response.data.logo != "") {
                    this.details.logo = response.data.logo;
                }
            }), function errorCallback(response) {
                console.log(response);
                alert("Error updating institution details. See console for details.");
            });
    };

    this.togglePageMode = function () {
        if (this.pageMode == "view") {
            this.pageMode = "edit";
        } else {
            this.updateInstitution();
            this.pageMode = "view";
        }
    };

    this.deleteInstitution = function () {
        if (confirm("Do you REALLY want to delete this institution?!")) {
            $http.post(this.root + "/archive-institution/" + this.details.id)
                .then(angular.bind(this, function successCallback(response) {
                    alert("Institution " + this.details.name + " has been deleted.");
                    window.location = this.root + "/home";
                }), function errorCallback(response) {
                    console.log(response);
                    alert("Error deleting institution. See console for details.");
                });
        }
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
