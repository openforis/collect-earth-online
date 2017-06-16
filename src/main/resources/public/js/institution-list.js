angular.module("institutionList", []).controller("InstitutionListController", ["$http", function InstitutionListController($http) {
    this.root = "";
    this.institutionList = [];

    this.getInstitutionList = function () {
        $http.get(this.root + "/get-all-institutions")
            .then(angular.bind(this, function successCallback(response) {
                this.institutionList = response.data;
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the institution list. See console for details.");
            });
    };

    this.initialize = function (documentRoot) {
        // Make the current documentRoot globally available
        this.root = documentRoot;

        // Load the institutionList
        this.getInstitutionList();
    };

}]);
