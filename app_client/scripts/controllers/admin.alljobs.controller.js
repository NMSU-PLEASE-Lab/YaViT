'use strict';
/**
 * @ngdoc function
 * @name hpcMonitoringApp.controller:adminAllJobCtrl
 * @description
 * # adminAllJobCtrl
 * Controller of the hpcMonitoringApp
 */
angular.module('hpcMonitoringApp')

    .controller('adminAllJobCtrl',
        ['$scope', '$location', 'authentication', '$http', '$q', 'DTOptionsBuilder', 'DTColumnBuilder', '$state', '$compile', '$rootScope',
            function ($scope, $location, authentication, $http, $q, DTOptionsBuilder, DTColumnBuilder, $state, $compile, $rootScope) {

                //variables initialization
                $scope.myJobList = [];
                var user = authentication.currentUser();
                if (user.usertype !== 1)
                    $location.path("/login");
                Highcharts.setOptions({global: {useUTC: false}});

                $scope.selectedIndexGlobalTimeFilter = 1;

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
                $scope.resetDateFromAndDateTo();
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
                            break;
                        case 7:
                            return moment(moment($scope.toDate.date).format("YYYY-MM-DD") + " " + $scope.toDate.hour + ":" + $scope.toDate.min + ":" + $scope.toDate.sec, "YYYY-MM-DD h:m:s").unix();
                            break;

                    }

                };

                $scope.getDateFrom = function () {
                    switch ($scope.selectedIndexGlobalTimeFilter) {
                        case 1:
                            return moment($scope.serverTime).subtract(1, 'hours').unix();
                            break;
                        case 2:
                            return moment($scope.serverTime).subtract(1, 'days').unix();
                            break;
                        case 3:
                            return moment($scope.serverTime).subtract(7, 'days').unix();
                            break;
                        case 4:
                            return moment($scope.serverTime).subtract(1, 'months').unix();
                            break;
                        case 5:
                            return moment($scope.serverTime).subtract(3, 'months').unix();
                            break;
                        case 6:
                            return moment($scope.serverTime).subtract(6, 'months').unix();
                            break;
                        case 7:
                            return moment(moment($scope.fromDate.date).format("YYYY-MM-DD") + " " + $scope.fromDate.hour + ":" + $scope.fromDate.min + ":" + $scope.fromDate.sec, "YYYY-MM-DD h:m:s").unix();
                            break;

                    }

                };

                $scope.dtJobsInstance = {};

                $scope.dtJobsOptions = {};
                initialiseDtOptions();

                $scope.rowClickObject = {};
                $scope.OkCancelModalCallback = function () {};
                $scope.okCancelModalConfirm= function (callback) {
                    callback();

                };
                $scope.onJobRunClicked = function (aData) {
                    $scope.rowClickObject = {};
                    $scope.rowClickObject = aData;
                    $scope.OkCancelModalCallback  = function(){
                        return $scope.switchToUserJobDetail();
                    };
                    $scope.okCancelModalHeader = "Confirm";
                    $scope.okCancelModalBody = "You will be entered to user level view of <b>"+$scope.rowClickObject.owner+"</b> for this job. You need to cancel user view to return to this page. <br/><br/> Please select 'ok' to confirm.";
                    $('#ok-cancel-modal').modal('show');

                };
                $scope.switchToUserJobDetail = function () {
                    $('#ok-cancel-modal').on('hidden.bs.modal', function () {
                        localStorage.setItem('adminAsUser', $scope.rowClickObject.owner);
                        localStorage.setItem('currentAdminState', "admin.alljobs");
                        $state.go('user.jobdetail', {'jobId': $scope.rowClickObject._id, 'jobName': $scope.rowClickObject.name});
                    });

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

                    DTColumnBuilder.newColumn('_id').withTitle('JobNumber').renderWith(function (data, type, full) {
                        return '<a href="" class="btn btn-link">' + data + '</a>';
                    }).withTitle('Job Number'),
                    DTColumnBuilder.newColumn('name').withTitle('Name'),
                    DTColumnBuilder.newColumn('owner').withTitle('Owner'),
                    DTColumnBuilder.newColumn('queue_time')
                        .renderWith(function (data, type, full) {
                            // return moment.unix(data).format("YYYY-MM-DD hh:mm:ss");
                            return moment(data).format("YYYY-MM-DD hh:mm:ss");
                        }).withTitle('Submitted Date'),
                    DTColumnBuilder.newColumn('start_time').renderWith(function (data, type, full) {
                        // return moment.unix(data).format("YYYY-MM-DD hh:mm:ss");
                        return moment(data).format("YYYY-MM-DD hh:mm:ss");
                    }).withTitle('Start Date'),
                    DTColumnBuilder.newColumn('duration').withTitle('Duration'),
                    DTColumnBuilder.newColumn('numberOfNodes').withTitle('Nodes Used'),
                    DTColumnBuilder.newColumn('mem_used').withTitle('Memory Used'),
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
                        if (!(data == "" || data == "0" || data == 0))
                            return '<a href="" ng-click="onJobFailClicked(' + data + ')"><span class="label label-danger">Failure</span></a>';
                        else
                            return '<span class="label label-success">Success</span>';
                    })

                ];


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

                function initialiseDtOptions() {
                    $scope.dtJobsOptions = DTOptionsBuilder.newOptions()
                        .withOption('order', [[0, "desc"]])
                        .withOption('language', {searchPlaceholder: "Job Name or Owner"})
                        .withOption('columnDefs', [{
                            "targets": 5,
                            "orderable": false
                        },
                            {
                                "targets": 6,
                                "orderable": false
                            }])
                        .withOption('ajax', {
                            url: '/api/getJobs',
                            data: {
                                dateFrom: $scope.getDateFrom(),
                                dateTo: $scope.getDateTo(),
                                searchColumn: ["name", "owner"]
                            },
                            type: 'POST'
                        })
                        .withDataProp('data')
                        .withOption('processing', true)
                        .withOption('serverSide', true)
                        .withPaginationType('full_numbers')
                        .withOption('fnRowCallback',
                            function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                                if (!(aData.exit_status == "" || aData.exit_status == "0" || aData.exit_status == 0))
                                    $(nRow).attr("uib-tooltip","Click on Failure to see the reason.");
                                $('td', nRow).eq(9).unbind('click');
                                $('td', nRow).eq(0).bind('click', function () {
                                    $scope.$apply(function () {
                                        $scope.onJobRunClicked(aData);
                                    });
                                });
                                $compile(nRow)($scope);
                            });

                }


            }]);

