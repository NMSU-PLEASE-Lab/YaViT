'use strict';

/**
 * @ngdoc directive
 * @name hpcMonitoringApp.directive:sidebarSearch
 * @description
 * # sidebarSearch
 */

angular.module('hpcMonitoringApp')
  .directive('sidebarSearch',function() {
    return {
      templateUrl:'scripts/directives/sidebar/sidebar-search/sidebar-search.html',
      restrict: 'E',
      replace: true,
      scope: {
      },
      controller:function($scope){
        $scope.selectedMenu = 'home';
      }
    }
  });
