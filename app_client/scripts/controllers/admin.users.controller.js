'use strict';
angular.module('hpcMonitoringApp')
    .controller('adminUsersCtrl',
        ['$scope', '$location', 'authentication', '$http', '$state', 'DTOptionsBuilder', 'DTColumnBuilder', '$q', '$compile',
            function ($scope, $location, authentication, $http, $state, DTOptionsBuilder, DTColumnBuilder, $q, $compile) {

                $scope.user = authentication.currentUser();
                $scope.allUsers = [];
                $scope.saveOrUpdate = "Save";

                if ($scope.user.usertype !== 1)
                    $location.path("/login");
                $scope.usertype_options = [
                    {name: "User", value: 2},
                    {name: "Admin", value: 1}
                ];
                $scope.addEditUser = {};
                $scope.addEditUserTitle = "";
                $scope.addEditUser.UserTypeOption = $scope.usertype_options[0];
                $scope.disabledUsername = false;
                $scope.userToBeDeleted = {};

                $scope.dtUsersInstance = {};
                $scope.dtUsersOptions = DTOptionsBuilder.newOptions()
                    .withOption('order', [[1, "asc"]])
                    .withOption('language', {searchPlaceholder: "UserName"})
                    .withOption('ajax', function(data,callback,settings){
                        data['searchColumn'] = ["Name"];
                        $http({
                            method: 'POST',
                            url: '/api/getAllUsers',
                            data:data
                        }).then(function (response) {
                            $scope.allUsers = response.data.data;
                            callback(response.data);
                        }).catch(function (err) {
                            // console.log(err);
                        });
                    })
                    .withDataProp('data')
                    .withOption('processing', true)
                    .withOption('serverSide', true)
                    .withPaginationType('full_numbers')
                    .withOption('fnRowCallback',
                        function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                            $compile(nRow)($scope);
                        });

                $scope.gotoUserView = function (username) {
                    localStorage.setItem('adminAsUser', username);
                    localStorage.setItem('currentAdminState', "admin.users");
                    $state.go('user.home');
                };

                $scope.dtUsersColumns = [
                    DTColumnBuilder.newColumn('_id').withTitle('_id').notVisible(),
                    DTColumnBuilder.newColumn('Name').renderWith(function (data, type, full) {
                        return '<a href="" ng-click="gotoUserView(\'' + data + '\')">' + data + '</a>';
                    }).withTitle('Name'),
                    DTColumnBuilder.newColumn('UserTypeName').withTitle('UserType'),
                    DTColumnBuilder.newColumn('UserType').withTitle('UserType').notVisible(),
                    DTColumnBuilder.newColumn(null).withTitle('Actions').notSortable()
                        .renderWith(actionsHtml)
                ];

                $scope.addEditAction = function (type, id) {
                    $scope.addEditUser = {};
                    $scope.addEditUser.UserTypeOption = $scope.usertype_options[0];

                    if (type == 'add') {
                        $scope.addEditUserTitle = "Add New User";
                        $scope.saveOrUpdate = "Save";
                        $scope.disabledUsername = false;
                    }
                    else {
                        $scope.addEditUser = _.find($scope.allUsers, function (obj) {
                            return obj._id === id;
                        });
                        $scope.addEditUser.UserTypeOption = _.find($scope.usertype_options, function (obj) {
                            return $scope.addEditUser['UserType'] === obj.value;
                        });
                        $scope.addEditUserTitle = "Update User";
                        $scope.saveOrUpdate = "Update";
                        $scope.disabledUsername = true;

                    }

                    $('#addEditUserModal').modal('show');

                };
                $scope.deleteUser = function (id) {
                    $scope.userToBeDeleted = _.find($scope.allUsers, function (obj) {
                        return obj._id === id;
                    });
                    $('#deleteUserModal').modal('show');
                };
                $scope.deleteUserOk = function (id) {
                    var obj = {'id': id};
                    $http.post('/api/deleteUser', obj)
                        .then(function (response) {
                            $('#deleteUserModal').on('hidden.bs.modal', function () {
                                $scope.dtUsersInstance.reloadData();
                            });
                            $('#deleteUserModal').modal('hide');
                        })
                        .catch(function (err) {
                            $('#deleteUserModal').modal('hide');
                        });
                };
                $scope.dtUsersOptions.withOption('fnRowCallback',
                    function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                        $compile(nRow)($scope);
                    });


                $scope.addEditUserOk = function () {
                    if (typeof $scope.addEditUser['_id'] === 'undefined') {

                        $http.post('/api/addNewUser', $scope.addEditUser)
                            .then(function (response) {
                                $('#addEditUserModal').on('hidden.bs.modal', function () {
                                    $scope.dtUsersInstance.reloadData();
                                });
                                $('#addEditUserModal').modal('hide');


                            })
                            .catch(function (err) {
                                $('#addEditUserModal').modal('hide');

                            });

                    }
                    else {
                        $http.post('/api/editUser', $scope.addEditUser)
                            .then(function (response) {
                                $('#addEditUserModal').on('hidden.bs.modal', function () {
                                    $scope.dtUsersInstance.reloadData();
                                });
                                $('#addEditUserModal').modal('hide');

                            })
                            .catch(function (err) {
                                $('#addEditUserModal').modal('hide');
                            });
                    }

                };
                $scope.modalCancel = function (modalId) {
                    $('#' + modalId).modal('hide');
                };


                function actionsHtml(data, type, full, meta) {
                    return '<button class="btn btn-warning" ng-click="addEditAction(\'update\',\'' + data._id + '\')">' +
                        '   <i class="fa fa-edit"></i>' +
                        '</button>&nbsp;' +
                        '<button class="btn btn-danger" ng-click="deleteUser(\'' + data._id + '\')">' +
                        '   <i class="fa fa-trash-o"></i>' +
                        '</button>';
                }

            }]);


