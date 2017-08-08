/**
 * Service for handling all authentication functions
 */
(function () {

    angular
        .module('hpcMonitoringApp')
        .factory('authentication', ['$http', '$window', function ($http, $window) {

            /*save token to local storage*/
            var saveToken = function (token) {
                $window.localStorage['hpcMonitoring-token'] = token;
            };

            /*get current token*/
            var getToken = function () {
                return $window.localStorage['hpcMonitoring-token'];
            };

            /*Check if user is logged in currently*/
            var isLoggedIn = function () {
                var token = getToken();
                var payload;

                if (token) {
                    payload = token.split('.')[1];
                    payload = $window.atob(payload);
                    payload = JSON.parse(payload);

                    return true;
                } else {
                    return false;
                }
            };

            /*Get Current User*/
            var currentUser = function () {
                if (isLoggedIn()) {
                    var token = getToken();
                    var payload = token.split('.')[1];
                    payload = $window.atob(payload);
                    payload = JSON.parse(payload);

                    /*Special case when admin enters the specific user interface */
                    var isAdminAsUser = typeof $window.localStorage['adminAsUser'] !== 'undefined' && $window.localStorage['adminAsUser'] !== '';
                    if(payload.usertype==1 && isAdminAsUser)
                    {
                        payload.username = $window.localStorage['adminAsUser'];
                        payload.usertype =  2;

                    }
                    return {
                        username: payload.username,
                        usertype: payload.usertype,
                        adminAsUser:isAdminAsUser
                    };
                }
            };

            /*on login*/
            login = function (user) {
                return $http.post('/api/login', user)
                    .then(function (response) {
                        var data = response.data;
                        saveToken(data.token);

                    })

            };

            /*on logout*/
            logout = function () {
                $window.localStorage.removeItem('hpcMonitoring-token');
            };

            return {
                currentUser: currentUser,
                saveToken: saveToken,
                getToken: getToken,
                isLoggedIn: isLoggedIn,
                login: login,
                logout: logout
            };
        }]);


})();