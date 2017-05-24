angular.module("institution", []).controller("InstitutionController", ["$http", function InstitutionController($http) {
    this.details = {
        id: "-1",
        name: "No institution selected",
        logo: "",
        url: "",
        description: ""
    };

    this.getInstitutionDetails = function (institutionId) {
        $http.post("get-institution-details", institutionId)
            .then(angular.bind(this, function successCallback(response) {
                this.details = response.data;
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the institution details. See console for details.");
            });
    };

    this.initialize = function () {
        // Load the institution details
        var initialInstitutionId = document.getElementById("initial-institution-id").value;
        if (initialInstitutionId != "-1") {
            this.getInstitutionDetails(initialInstitutionId);
        }
    };

    this.editInstitution = function () {
        alert("This function is not yet implemented!");
    };

    this.deleteInstitution = function () {
        alert("This function is not yet implemented!");
    };

}]);
