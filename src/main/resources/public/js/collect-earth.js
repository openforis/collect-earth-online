//angular.module('collectEarth', ['ngRoute']);
angular.module('collectEarth', []);

var ctlBody = function($scope) {
  //Enter controller code here
};

function config ($routeProvider) {
   $routeProvider
	.when('/', {
	})
	.otherwise({redirectTo: '/#/admin'});
}

angular
   .module('collectEarth')
   .controller('ctlBody', ctlBody)
//   .config(['$routeProvider', config]);

