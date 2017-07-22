angular.module("institution", []).controller("InstitutionController", ["$http", function InstitutionController($http) {
    this.root = "";
    this.pageMode = "view";
    this.isAdmin = false;
    this.details = {
        id: "-1",
        name: "",
        logo: "",
        url: "",
        description: "",
        admins: []
    };

    this.getInstitutionDetails = function (institutionId) {
        $http.get(this.root + "/get-institution-details/" + institutionId)
            .then(angular.bind(this, function successCallback(response) {
                this.details = response.data;
                this.isAdmin = this.details.admins.includes(document.getElementById("userid").value);
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the institution details. See console for details.");
            });
    };

    this.initialize = function (documentRoot) {
        // Make the current documentRoot globally available
        this.root = documentRoot;

        this.details.id = document.getElementById("initial-institution-id").value;
        if (this.details.id == "0") {
            this.pageMode = "edit";
        } else {
            this.getInstitutionDetails(this.details.id);
        }
    };

    this.updateInstitution = function () {
        var formData = new FormData();
        formData.append("userid", document.getElementById("userid").value);
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

}]);
