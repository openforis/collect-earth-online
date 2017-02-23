//angular.module('collectEarth', []);

var ctlAccount = function($scope) {
  $scope.formID = "account-form";
  $scope.emailID = "email"
  $scope.passwordID = "password";
  $scope.passwordConfirmID = "password-confirmation";
  $scope.passwordCurrentID = "current-password";

  $scope.phEmail = "Email Address";
  $scope.phNewPwd = "New Password";
  $scope.phConfPwd = "New Password Confirmation";
  $scope.phCurrPwd = "Current Password";
  $scope.tpEmail = "email";
  $scope.tpPassword = "password";

  $scope.showUpdated = "false";

  $scope.submit = function() {
	updateUserInfo($scope);
  }

}

function updateUserInfo($scope) {
	$scope.updateMessage = "User Password Has Been Reset";
	return false;
}

var passwordReset = function () {
	return {
	  templateUrl: '/passwordReset'	
	};
};


angular
   .module('collectEarth')
   .controller('ctlAccount', ctlAccount)
   .directive('passwordReset', passwordReset);

