
/**
 * @ngdoc function
 * @name hpcMonitoringApp.controller:loginCtrl
 * @description
 * # loginCtrl
 * Controller of the hpcMonitoringApp
 */
angular.module('hpcMonitoringApp')
    .controller('loginCtrl',
        ['$scope', '$location', 'authentication','$window',
            function ($scope, $location, authentication) {
                $scope.loginFailureMessage = '';
                $scope.credentials = {
                    username: "",
                    password: ""
                };
                $scope.onSubmit = function () {
                    authentication
                        .login($scope.credentials)

                        .then(function () {
                            $scope.loginFailureMessage = '';
                            localStorage.removeItem('adminAsUser');
                            var user = authentication.currentUser();
                            if (user.usertype == 1)
                                $location.path('admin/home');
                            else
                                $location.path('user/home');
                        })
                        .catch(function (response) {
                            $scope.loginFailureMessage = response.data.message;
                        });
                };
                $scope.CloseLoginFailureMessage = function () {
                    $scope.loginFailureMessage = '';
                }
            }]);

