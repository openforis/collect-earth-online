angular.module("institutionList", []).controller("InstitutionListController", ["$http", function InstitutionListController($http) {
    this.institutionList = [];

    this.getInstitutionList = function () {
        $http.get("get-all-institutions")
            .then(angular.bind(this, function successCallback(response) {
                this.institutionList = response.data;
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the institution list. See console for details.");
            });
    };

    this.initialize = function () {
        // Load the institutionList
        this.getInstitutionList();
    };

}]);
