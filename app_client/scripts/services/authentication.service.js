/**
 * Service for handling all authentication functions
 */
(() =>  {

    angular
        .module('hpcMonitoringApp')
        .factory('authentication', ['$http', '$window',  ($http, $window) => {

            /*save token to local storage*/
            let saveToken =  (token) => {
                $window.localStorage['hpcMonitoring-token'] = token;
            };

            /*get current token*/
            let getToken =  () => {
                return $window.localStorage['hpcMonitoring-token'];
            };

            /*Check if user is logged in currently*/
            let isLoggedIn =  () => {
                let token = getToken();
                let payload;

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
            let currentUser =  () => {
                if (isLoggedIn()) {
                    let token = getToken();
                    let payload = token.split('.')[1];
                    payload = $window.atob(payload);
                    payload = JSON.parse(payload);

                    /*Special case when admin enters the specific user interface */
                    let isAdminAsUser = typeof $window.localStorage['adminAsUser'] !== 'undefined' && $window.localStorage['adminAsUser'] !== '';
                    if(payload.usertype==1 && isAdminAsUser){
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
            login =  (user) => {
                return $http.post('/api/login', user)
                    .then( (response) => {
                        let data = response.data;
                        saveToken(data.token);
                    })
            };

            /*on logout*/
            logout =  () => $window.localStorage.removeItem('hpcMonitoring-token');

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