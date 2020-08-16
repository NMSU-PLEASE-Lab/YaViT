'use strict';

/**
 * @ngdoc directive
 * @name hpcMonitoringApp.directive:sidebarSearch
 * @description
 * # sidebarSearch
 */

angular.module('hpcMonitoringApp')
  .directive('sidebarSearch',() => {
    return {
      templateUrl:'scripts/directives/sidebar/sidebar-search/sidebar-search.html',
      restrict: 'E',
      replace: true,
      scope: {
      },
      controller: $scope => {
        $scope.selectedMenu = 'home';
      }
    }
  });
