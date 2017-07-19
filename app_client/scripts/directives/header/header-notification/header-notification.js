'use strict';

/**
 * @ngdoc directive
 * @name hpcMonitoringApp.directive:headerNotification
 * @description
 * #  Directive for right-notification panel in header
 */
angular.module('hpcMonitoringApp')
    .directive('headerNotification', function () {
        return {
            templateUrl: 'scripts/directives/header/header-notification/header-notification.html',
            restrict: 'E',
            scope: {
            },
            controller: function ($scope,$location,authentication,$state){
                $scope.user = authentication.currentUser();
                $scope.backToAdmin = function(){
                    localStorage.removeItem('adminAsUser');
                    if(localStorage.getItem('currentAdminState')!==null &&localStorage.getItem('currentAdminState')!=="")
                        $state.go(localStorage.getItem('currentAdminState'));
                    else
                        $state.go('admin.users');
                };
                $scope.logout = function(){
                    localStorage.removeItem('hpcMonitoring-token');
                    localStorage.removeItem('adminAsUser');
                    $location.url('/login');

                }


            }
        }
    });


