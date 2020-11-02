'use strict';
/**
 * @ngdoc Controller
 * @name hpcMonitoringApp.controller:userMyJobCtrl
 * @description
 * # Controller for handling and binding for myjobs page for user
 */
angular.module('hpcMonitoringApp')

    .controller('userMyJobCtrl',
        ['$scope', '$location', 'authentication', '$http', '$q', 'DTOptionsBuilder', 'DTColumnBuilder', '$state', '$compile', '$rootScope','$stateParams',
            function ($scope, $location, authentication, $http, $q, DTOptionsBuilder, DTColumnBuilder, $state, $compile, $rootScope,$stateParams) {

                var user = authentication.currentUser();
                if (user.usertype == 1)
                    $location.path("/admin/home");

                /*variables initialization*/
                $scope.myJobList = [];
                $scope.selectedIndexGlobalTimeFilter = 6;
                $scope.applicationName = '';
                $scope.pageTitle = 'All Jobs';
                if (typeof $stateParams.app_name !=='undefined' && $stateParams.app_name !== '') {
                    $scope.applicationName = $stateParams.app_name;
                    $scope.pageTitle = "Jobs <small>( "+ $stateParams.app_name+" )</small>";
                }

                /*Date Time picker*/
                $scope.fromDate = {};
                $scope.toDate = {};
                $scope.resetDateFromAndDateTo = function () {
                    $scope.toDate.date = null;
                    $scope.toDate.hour = null;
                    $scope.toDate.min = null;
                    $scope.toDate.sec = null;
                    $scope.fromDate.date = null;
                    $scope.fromDate.hour = null;
                    $scope.fromDate.min = null;
                    $scope.fromDate.sec = null;

                };
                $scope.resetDateFromAndDateTo(); /*Reset on controller initialization */

                /* Vars and methods for dateFrom/dateTo picker */
                $scope.dateFromPopUp = {};
                $scope.dateToPopUp = {};
                $scope.dateFromPopUp.opened = false;
                $scope.dateToPopUp.opened = false;
                $scope.openDateFrom = function () {
                    $scope.dateFromPopUp.opened = true;
                };
                $scope.dateFromChanged = function () {
                    if ($scope.fromDate.hour == null)
                        $scope.fromDate.hour = 0;
                    if ($scope.fromDate.min == null)
                        $scope.fromDate.min = 0;
                    if ($scope.fromDate.sec == null)
                        $scope.fromDate.sec = 0;
                };
                $scope.openDateTo = function () {
                    $scope.dateToPopUp.opened = true;
                };
                $scope.dateToChanged = function () {
                    if ($scope.toDate.hour == null)
                        $scope.toDate.hour = 0;
                    if ($scope.toDate.min == null)
                        $scope.toDate.min = 0;
                    if ($scope.toDate.sec == null)
                        $scope.toDate.sec = 0;
                };
                $scope.getDateTo = function () {
                    switch ($scope.selectedIndexGlobalTimeFilter) {
                        case 1:
                        case 2:
                        case 3:
                        case 4:
                        case 5:
                        case 6:
                            return moment($scope.serverTime).unix();
                        case 7:
                            return 0;
                        case 8:
                            return moment(moment($scope.toDate.date).format("YYYY-MM-DD") + " " + $scope.toDate.hour + ":" + $scope.toDate.min + ":" + $scope.toDate.sec, "YYYY-MM-DD h:m:s").unix();
                    }
                };

                $scope.getDateFrom = function () {
                    switch ($scope.selectedIndexGlobalTimeFilter) {
                        case 1:
                            return moment($scope.serverTime).subtract(1, 'hours').unix();
                        case 2:
                            return moment($scope.serverTime).subtract(1, 'days').unix();
                        case 3:
                            return moment($scope.serverTime).subtract(7, 'days').unix();
                        case 4:
                            return moment($scope.serverTime).subtract(1, 'months').unix();
                        case 5:
                            return moment($scope.serverTime).subtract(3, 'months').unix();
                        case 6:
                            return moment($scope.serverTime).subtract(6, 'months').unix();
                        case 7:
                            return 0;
                        case 8:
                            return moment(moment($scope.fromDate.date).format("YYYY-MM-DD") + " " + $scope.fromDate.hour + ":" + $scope.fromDate.min + ":" + $scope.fromDate.sec, "YYYY-MM-DD h:m:s").unix();
                    }
                };

                /* Angular Data table vars and methods for Jobs */
                $scope.dtJobsInstance = {};

                $scope.dtJobsOptions = {};
                initialiseDtOptions();

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
                $scope.metricesNumberClicked = function (data) {
                    $scope.okModalHeader = "Metrices";
                    $scope.okModalBody = data;
                    $('#ok-modal').modal('show');

                };
                $scope.dtJobsColumns = [

                    DTColumnBuilder.newColumn('_id').renderWith(function (data, type, full) {
                        return '<a href="" class="btn btn-link" ng-click="onJobRunClicked(' + data + ',\'' + full.name + '\')">' + data + '</a>';
                    }).withTitle('Job Number'),
                    DTColumnBuilder.newColumn('name').withTitle('Name'),
                    DTColumnBuilder.newColumn('owner').withTitle('Owner').notVisible(),
                    DTColumnBuilder.newColumn('queue_time')
                        .renderWith(function (data, type, full) {
                            return moment(data).format("YYYY-MM-DD hh:mm:ss");
                            // return moment.unix(data).format("YYYY-MM-DD hh:mm:ss");
                        }).withTitle('Submitted Date'),
                    DTColumnBuilder.newColumn('start_time').renderWith(function (data, type, full) {
                        if (typeof data !== 'undefined' && data !== '')
                            return moment(data).format("YYYY-MM-DD hh:mm:ss");
                            // return moment.unix(data).format("YYYY-MM-DD hh:mm:ss");
                        else
                            return '';
                    }).withTitle('Start Date'),
                    DTColumnBuilder.newColumn('duration').withTitle('Duration'),
                    DTColumnBuilder.newColumn('RunQuality').withTitle('Run Quality').renderWith(function (data, type, full) {

                        if (data === 1)
                            return '<span class="label label-success">Healthy</span>';
                        else if (data === 2)
                            return '<span class="label label-warning">Abnormal</span>';
                        else if (data === 3)
                            return '<span class="label label-danger">Critical</span>';
                        else if (data === 4)
                            return '<span class="label label-primary" style="background-color: #4e2040 !important">Failed</span>';
                        else
                            return '<span class="label label-primary">NoQuality</span>';

                    }),
                    DTColumnBuilder.newColumn('node_req').withTitle('Node Request'),
                    DTColumnBuilder.newColumn('job_size').withTitle('Job Size').renderWith(function (data, type, full) {
                        if(!data)
                            return "No Data";
                    }),

                    DTColumnBuilder.newColumn('numberOfNodes').withTitle('Nodes Used'),
                    DTColumnBuilder.newColumn('mem_used').withTitle('Memory Used').renderWith(function (data, type, full) {
                        if (typeof data == 'undefined' || data == '')
                            return '';
                        else
                            return data;
                    }),
                    DTColumnBuilder.newColumn('metrices').withTitle('Metrices').renderWith(function (data, type, full) {
                        if(data=="") {
                            return "";
                        }
                        var stringified = "'"+data.join(", ")+"'";
                        if (data.length<6)
                            return data.join(", ");
                        else
                            return '<a href="" ng-click="metricesNumberClicked('+stringified+')">'+data.length+'</a>'
                    }),
                    DTColumnBuilder.newColumn('exit_status').withTitle('Exit Status').renderWith(function (data, type, full) {
                        if (typeof data == 'undefined' || data == '')
                            return '';
                        if (!(data == "" || data == "0" || data == 0))
                            return '<a href="" ng-click="onJobFailClicked(' + data + ')"><span class="label label-danger">Failure</span></a>';
                        else
                            return '<span class="label label-success">Success</span>';
                    })

                ];


                /* Handle time type selected on horizantal time filter */
                $scope.timeSelected = function (val) {
                    $scope.selectedIndexGlobalTimeFilter = val;
                    if (val !== 8)
                        $scope.resetDateFromAndDateTo();
                    $scope.dtJobsOptions = {};
                    initialiseDtOptions();
                    $scope.dtJobsInstance.rerender();

                };

                $scope.unixToJsTime = function ($unixTime) {
                    // return moment.unix($unixTime).format("YYYY-MM-DD hh:mm:ss");
                    return moment($unixTime).format("YYYY-MM-DD hh:mm:ss");
                };

                /**
                 * Initialize angular data table
                 */
                function initialiseDtOptions() {
                    $scope.dtJobsOptions = DTOptionsBuilder.newOptions()
                        .withOption('order', [[0, "desc"]])
                        .withOption('language', {searchPlaceholder: "Job Name"})
                        .withOption('columnDefs', [{
                            "targets": 5,
                            "orderable": false
                        },
                            {
                                "targets": 8,
                                "orderable": false
                            }])
                        .withOption('ajax', {
                            url: '/api/getJobs',
                            data: {
                                owner: user.username,
                                dateFrom: $scope.getDateFrom(),
                                dateTo: $scope.getDateTo(),
                                searchColumn: ["name"],
                                app_name:$scope.applicationName
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
                            })
                }
            }]);

