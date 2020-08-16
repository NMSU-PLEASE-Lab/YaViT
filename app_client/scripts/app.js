'use strict';
/**
 * @name hpcMonitoringApp
 * @description Main module of the application.
 * hpcMonitoringApp
 */

'use strict';

angular
    .module('hpcMonitoringApp', [
        'ngRoute',
        'ngSanitize',
        'ui.router',
        'ui.bootstrap',
        'ui.select',
        'ui-select-infinity',
        'datatables',
        'oc.lazyLoad',
        'isteven-multi-select',
        'ui.bootstrap-slider',
        'googlechart',
        'rzModule'
    ])
    .config(['$stateProvider', '$urlRouterProvider', '$ocLazyLoadProvider', '$qProvider', ($stateProvider, $urlRouterProvider, $ocLazyLoadProvider, $qProvider) => {

        $ocLazyLoadProvider.config({
            debug: false,
            events: true
        });

        /*If no route found redirect to login*/
        $urlRouterProvider.otherwise('/login');
        $qProvider.errorOnUnhandledRejections(false);


        $stateProvider
            .state('login', {
                templateUrl: 'views/pages/login.html',
                url: '/login',
                controller: 'loginCtrl',
                resolve: {
                    loadMyFiles: ($ocLazyLoad) => {
                        return $ocLazyLoad.load({
                            name: 'hpcMonitoringApp',
                            files: [
                                'scripts/controllers/login.controller.js'
                            ]
                        })
                    }
                }

            })
            .state('user', {
                url: '/user',
                reload: true,
                templateUrl: 'views/main.html',
                resolve: {
                    loadMyDirectives: ($ocLazyLoad) => {
                        return $ocLazyLoad.load(
                            {
                                name: 'hpcMonitoringApp',
                                files: [
                                    'scripts/directives/header/header.js',
                                    'scripts/directives/header/header-notification/header-notification.js',
                                    'scripts/directives/sidebar/sidebar.js',
                                    'scripts/directives/dashboard/stats/stats.js'

                                ]
                            }),
                            $ocLazyLoad.load(
                                {
                                    name: 'toggle-switch',
                                    files: ["bower_components/angular-toggle-switch/angular-toggle-switch.min.js",
                                        "bower_components/angular-toggle-switch/angular-toggle-switch.css"
                                    ]
                                }),
                            $ocLazyLoad.load(
                                {
                                    name: 'ngAnimate',
                                    files: ['bower_components/angular-animate/angular-animate.js']
                                }),
                            $ocLazyLoad.load(
                                {
                                    name: 'ngCookies',
                                    files: ['bower_components/angular-cookies/angular-cookies.js']
                                }),
                            $ocLazyLoad.load(
                                {
                                    name: 'ngResource',
                                    files: ['bower_components/angular-resource/angular-resource.js']
                                }),
                            $ocLazyLoad.load(
                                {
                                    name: 'ngSanitize',
                                    files: ['bower_components/angular-sanitize/angular-sanitize.js']
                                }),
                            $ocLazyLoad.load(
                                {
                                    name: 'ngTouch',
                                    files: ['bower_components/angular-touch/angular-touch.js']
                                })
                    }
                }
            })

            .state('user.jobhome', {
                url: '/jobhome/{app_name}',
                reload: true,
                controller: 'userHomeCtrl',
                templateUrl: 'views/user/job-home.html',
                resolve: {
                    loadMyFiles: ($ocLazyLoad) => {
                        return $ocLazyLoad.load({
                            name: 'hpcMonitoringApp',
                            files: [
                                'scripts/controllers/user.jobhome.controller.js'
                            ]
                        })
                    }
                }
            })
            .state('user.home', {
                url: '/home',
                reload: true,
                controller: 'userAppHomeCtrl',
                templateUrl: 'views/user/app-home.html',
                resolve: {
                    loadMyFiles: ($ocLazyLoad) => {
                        return $ocLazyLoad.load({
                            name: 'hpcMonitoringApp',
                            files: [
                                'scripts/controllers/user.apphome.controller.js'
                            ]
                        })
                    }
                }
            })
            .state('user.myjobs', {
                url: '/myjobs/{app_name}',
                reload: true,
                controller: 'userMyJobCtrl',
                templateUrl: 'views/user/myjobs.html',
                resolve: {
                    loadMyFiles: ($ocLazyLoad) => {
                        return $ocLazyLoad.load({
                            name: 'hpcMonitoringApp',
                            files: [
                                'scripts/controllers/user.myjob.controller.js'
                            ]
                        })
                    }
                }
            })
            .state('user.jobdetail', {
                url: '/jobdetail/{jobId}/{jobName}',
                reload: true,
                controller: 'userJobDetailCtrl',
                templateUrl: 'views/user/jobdetail.html',
                resolve: {
                    loadMyFiles: ($ocLazyLoad) => {
                        return $ocLazyLoad.load({
                            name: 'hpcMonitoringApp',
                            files: [
                                'scripts/controllers/user.jobdetail.controller.js'
                            ]
                        })
                    }
                }
            })
            .state('admin', {
                url: '/admin',
                reload: true,
                templateUrl: 'views/main.html',
                resolve: {
                    loadMyDirectives: ($ocLazyLoad) => {
                        return $ocLazyLoad.load(
                            {
                                name: 'hpcMonitoringApp',
                                files: [
                                    'scripts/directives/header/header.js',
                                    'scripts/directives/header/header-notification/header-notification.js',
                                    'scripts/directives/sidebar/sidebar.js',
                                    'scripts/directives/dashboard/stats/stats.js'
                                ]
                            }),
                            $ocLazyLoad.load(
                                {
                                    name: 'toggle-switch',
                                    files: ["bower_components/angular-toggle-switch/angular-toggle-switch.min.js",
                                        "bower_components/angular-toggle-switch/angular-toggle-switch.css"
                                    ]
                                }),
                            $ocLazyLoad.load(
                                {
                                    name: 'ngAnimate',
                                    files: ['bower_components/angular-animate/angular-animate.js']
                                }),
                            $ocLazyLoad.load(
                                {
                                    name: 'ngCookies',
                                    files: ['bower_components/angular-cookies/angular-cookies.js']
                                }),
                            $ocLazyLoad.load(
                                {
                                    name: 'ngResource',
                                    files: ['bower_components/angular-resource/angular-resource.js']
                                }),
                            $ocLazyLoad.load(
                                {
                                    name: 'ngSanitize',
                                    files: ['bower_components/angular-sanitize/angular-sanitize.js']
                                }),
                            $ocLazyLoad.load(
                                {
                                    name: 'ngTouch',
                                    files: ['bower_components/angular-touch/angular-touch.js']
                                })
                    }
                }
            })
            .state('admin.home', {
                url: '/home',
                reload: true,
                controller: 'adminCtrl',
                templateUrl: 'views/admin/home.html',
                resolve: {
                    loadMyFiles: ($ocLazyLoad) => {
                        return $ocLazyLoad.load({
                            name: 'hpcMonitoringApp',
                            files: [
                                'scripts/controllers/admin.home.controller.js'
                            ]
                        })
                    }
                }
            })
            .state('admin.users', {
                url: '/users',
                reload: true,
                controller: 'adminUsersCtrl',
                templateUrl: 'views/admin/users.html',
                resolve: {
                    loadMyFiles: ($ocLazyLoad) => {
                        return $ocLazyLoad.load({
                            name: 'hpcMonitoringApp',
                            files: [
                                'scripts/controllers/admin.users.controller.js'

                            ]
                        })
                    }
                }
            })
            .state('admin.nodedetail', {
                url: '/nodedetail',
                reload: true,
                controller: 'adminNodeDetailCtrl',
                templateUrl: 'views/admin/nodedetail.html',
                resolve: {
                    loadMyFiles: ($ocLazyLoad) => {
                        return $ocLazyLoad.load({
                            name: 'hpcMonitoringApp',
                            files: [
                                'scripts/controllers/admin.nodedetail.controller.js'
                            ]
                        })
                    }
                }
            })
            .state('admin.alljobs', {
                url: '/alljobs',
                reload: true,
                controller: 'adminAllJobCtrl',
                templateUrl: 'views/admin/alljobs.html',
                resolve: {
                    loadMyFiles: ($ocLazyLoad) => {
                        return $ocLazyLoad.load({
                            name: 'hpcMonitoringApp',
                            files: [
                                'scripts/controllers/admin.alljobs.controller.js'
                            ]

                        })
                    }
                }
            })
    }])
    .run(['$rootScope', '$location', 'authentication', '$state', ($rootScope, $location, authentication, $state) => {
        $rootScope.$on('$stateChangeStart', (event, toState, toParams, fromState, fromParams) => {
            /*Global Vars and Settings */
            Highcharts.setOptions({global: {useUTC: false}});

            /* Global jobExitMessage for each job exit code */
            $rootScope.jobExitStatus = {
                "-1": "Job exec failed, before files, no retry.",
                "-2": "Job exec failed, after files, no retry.",
                "-3": "Job exec failed, do retry.",
                "-4": "Job aborted on MOM initialization.",
                "-5": "Job aborted on MOM initialization, checkpoint, no migrate.",
                "-6": "Job aborted on MOM initialization, checkpoint, ok migrate.",
                "-7": "Job restart failed.",
                "-8": "Initialization of Globus job failed. Do retry.",
                "-9": "Initialization of Globus job failed. Do not retry.",
                "-10": "Invalid UID/GID for job.",
                "-11": "Job was rerun.",
                "-12": "Job was checkpointed and killed.",
                "-13": "Job failed due to a bad password.",
                "-14": "Job was requeued (if rerunnable) or deleted (if not) due to a communication failure between Mother Superior and a Sister.",
                "0-127": "Job was exited by the top process in the job, typically the shell. This may be the exit value of the last command executed in the shell or the .logout script if the user has such a script (csh).",
                ">127": "The job was killed with a signal [signal]."
            };


            /*Path handling*/
            if ($location.path() !== '/login' && !authentication.isLoggedIn()) {
                event.preventDefault();
                $location.path('/login').replace();
            } else if ($location.path() == '/login' && authentication.isLoggedIn()) {
                if (authentication.currentUser().usertype == 1)
                    $location.path('/admin/home').replace();
                else
                    $location.path('/user/home').replace();
            }
        });
    }]);



