'use strict';

/**
 * @ngdoc function
 * @name hpcMonitoringApp.controller:userHomeCtrl
 * @description
 * # userHomeCtrl
 * Controller of the hpcMonitoringApp
 */
angular.module('hpcMonitoringApp')
    .controller('userHomeCtrl',
        ['$scope', '$location', 'authentication', '$http', 'DTOptionsBuilder', 'DTColumnBuilder','$compile','$state','$rootScope','$timeout',
            function ($scope, $location, authentication, $http, DTOptionsBuilder, DTColumnBuilder,$compile,$state,$rootScope,$timeout) {
                $scope.model = {};
                $scope.model.nodes = [];
                $scope.jobsCount = 0;
                $scope.model.currentNode = 0;
                $scope.activeJobs = [];
                $scope.recentJobs = [];
                $scope.runningJobsCount = 0;
                $scope.user = authentication.currentUser();
                if ($scope.user.usertype !== 2)
                    $location.path("/login");
                getJobsCount();

                $scope.onJobRunClicked = function (id, name) {
                    $state.go('user.jobdetail', {'jobId': id, 'jobName': name});
                };
                $scope.onJobFailClicked = function (status) {
                    status = parseInt(status);
                    var failMsg = "Reason not found.";
                    if (isNaN(status))
                        return;
                    if (status < 0 && status > -15)
                        failMsg = $rootScope.jobExitStatus[status];
                    else if (status > 0 && status <= 127) {
                        status = "0-127";
                        failMsg = $rootScope.jobExitStatus[status];

                    }
                    else if (status > 127) {
                        var signal = status % 128;
                        status = ">127";
                        failMsg = $rootScope.jobExitStatus[status];
                        failMsg = failMsg.replace('[signal]', signal);
                    }
                    $scope.okModalHeader = "Failed Reason";
                    $scope.okModalBody = failMsg;
                    $('#ok-modal').modal('show');

                };


                $scope.dtCurrentJobsInstance = {};
                $scope.dtRecentJobsInstance = {};
                $scope.dtCurrentJobsOptions = DTOptionsBuilder.newOptions().withOption('paging', false)
                    .withOption('searching', false).withOption('bInfo', false).withOption('scrollY', '200px')
                    .withOption('order', [[0, "desc"]])
                    .withOption('language', {searchPlaceholder: "UserName"})
                    .withOption('ajax', function (data, callback, settings) {
                        $http({
                            method: 'GET',
                            url: '/api/getActiveJobs' + '?owner=' + $scope.user.username
                        }).then(function (response) {
                            $scope.activeJobs = response.data;
                            var counts = _.countBy(response.data, function (item) {
                                return typeof item.start_time !== 'undefined' && item.start_time != '' ? 'Running' : 'Queued';
                            });
                            $scope.runningJobsCount = counts.Running || 0;
                            $scope.queuedJobsCount = counts.Queued || 0;
                            callback(response.data)
                        }).catch(function (err) {
                            console.log(err);
                        });
                    }).withOption('createdRow',
                        function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {


                            $compile(nRow)($scope);
                        });
                $scope.dtRecentJobsOptions = DTOptionsBuilder.newOptions().withOption('paging', false)
                    .withOption('searching', false).withOption('bInfo', false).withOption('scrollY', '200px').withOption('scrollCollapse',true)
                    .withOption('order', [[0, "desc"]])
                    .withOption('columnDefs', [{
                        "targets": 3,
                        "orderable": false
                    }])
                    .withOption('language', {searchPlaceholder: "UserName"})
                    .withOption('ajax', function (data, callback, settings) {
                        $http({
                            method: 'GET',
                            url: '/api/getRecentJobs' + '?owner=' + $scope.user.username
                        }).then(function (response) {
                            $scope.recentJobs = response.data;
                            callback(response.data)
                        }).catch(function (err) {
                            console.log(err);
                        });
                    }).withOption('createdRow',
                        function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                            $compile(nRow)($scope);
                        });

                $scope.dtCurrentJobsColumns = [
                    DTColumnBuilder.newColumn('_id').renderWith(function (data, type, full) {
                        return '<a href="" class="btn btn-link" ng-click="onJobRunClicked(' + data + ',\'' + full.name + '\')">' + data + '</a>';
                    }).withTitle('Job Number'),
                    DTColumnBuilder.newColumn('name').withTitle('Name'),
                    DTColumnBuilder.newColumn(null).withTitle('Status').renderWith(function (data, type, full) {
                        if(typeof full.start_time==='undefined' ||full.start_time=='')
                           return "<span class='label label-warning'>Queued</span>";
                        else
                           return "<span class='label label-primary'>Running</span>";
                    })
                ];

                $scope.dtRecentJobsColumns = [
                    DTColumnBuilder.newColumn('_id').renderWith(function (data, type, full) {
                        return '<a href="" class="btn btn-link" ng-click="onJobRunClicked(' + data + ',\'' + full.name + '\')">' + data + '</a>';
                    }).withTitle('Job Number'),
                    DTColumnBuilder.newColumn('name').withTitle('Job Name'),
                    DTColumnBuilder.newColumn('start_time').renderWith(function (data, type, full) {
                        if (typeof data !== 'undefined' && data !== '')
                            return moment(data).format("YYYY-MM-DD hh:mm:ss");
                            // return moment.unix(data).format("YYYY-MM-DD hh:mm:ss");
                        else
                            return '';
                    }).withTitle('Start Time'),
                    DTColumnBuilder.newColumn('duration').withTitle('Duration'),
                    DTColumnBuilder.newColumn('exit_status').withTitle('Exit Status').renderWith(function (data, type, full) {
                        if (typeof data == 'undefined' || data == '')
                            return '';
                        if (!(data == "" || data == "0" || data == 0))
                            return '<a href="" ng-click="onJobFailClicked(' + data + ')"><span class="label label-danger">Failure</span></a>';
                        else
                            return '<span class="label label-success">Success</span>';
                    })
                ];

                $scope.unixToJsTime = function ($unixTime) {
                    // return moment.unix($unixTime).format("YYYY-MM-DD hh:mm:ss");
                    return moment($unixTime).format("YYYY-MM-DD hh:mm:ss");
                };

                refreshAllData();

                function getJobsCount()
                {
                    $http.get('/api/getJobsCount' + '?owner=' + $scope.user.username).then(function (response) {
                        $scope.jobsCount = response.data;
                    }).catch(function (err) {
                        console.log(err);
                    });

                }
                
                function refreshAllData() {
                    $scope.timeout = $timeout(function(){
                        $scope.dtCurrentJobsInstance.reloadData();
                        $timeout(function(){
                            $scope.dtRecentJobsInstance.reloadData();
                            $timeout(function(){
                                getJobsCount();
                                refreshAllData();

                            }, 2000);

                        }, 2000);

                    }, 10000);

                }

                $scope.applicationCount = 0;

                getApplicationsCount();

                $scope.dtApplicationInstance = {};
                $scope.dtApplicationColumns = [
                    DTColumnBuilder.newColumn('_id').withTitle('_id').notVisible(),
                    DTColumnBuilder.newColumn('ApplicationName').withTitle('Application Name'),
                    DTColumnBuilder.newColumn('NumberOfJobs').withTitle('Number Of Jobs')
                ];
                $scope.dtApplicationOptions = DTOptionsBuilder.newOptions().withOption('bInfo', false).withOption("bLengthChange", false)
                    .withOption('columnDefs', [{
                        "targets": 1,
                        "orderable": false
                    }, {
                        "targets": 2,
                        "orderable": false
                    }])
                    .withOption('language', {searchPlaceholder: "Application Name"})
                    .withOption('ajax', {
                        url: '/api/getApplications',
                        data: {
                            username: $scope.user.username,
                            searchColumn: ["ApplicationName"]
                        },
                        type: 'POST'
                    })
                    .withDataProp('data')
                    .withOption('processing', true)
                    .withOption('serverSide', true)
                    .withPaginationType('full_numbers')
                    .withOption('createdRow',
                        function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                            $compile(nRow)($scope);
                        });


                function getApplicationsCount() {
                    $http.get('/api/getApplicationsCount' + '?username=' + $scope.user.username).then(function (response) {
                        $scope.applicationCount = response.data;
                    }).catch(function (err) {
                        console.log(err);
                    });
                }

                $scope.$on("$destroy",function(){
                    if (angular.isDefined($scope.timeout)) {
                        $timeout.cancel($scope.timeout);
                    }
                });
            }]);


