
angular.module('simpleLogin', ['firebase', 'firebase.utils', 'changeEmail'])

  // a simple wrapper on simpleLogin.getUser() that rejects the promise
  // if the user does not exists (i.e. makes user required)
  .factory('requireUser', ['simpleLogin', '$q', function(simpleLogin, $q) {
    return function() {
      return simpleLogin.getUser().then(function (user) {
        return user ? user : $q.reject({ authRequired: true });
      });
    }
  }])

  .factory('simpleLogin', ['$firebaseSimpleLogin', 'fbutil', 'createProfile', 'changeEmail', '$q', '$rootScope',
    function($firebaseSimpleLogin, fbutil, createProfile, changeEmail, $q, $rootScope) {
      var auth = $firebaseSimpleLogin(fbutil.ref());
      var listeners = [];
      var log = [];

      // calling method inside factory = use object literal name
      // call method outside factory = use factory name

      var fns = {
        user: null,

        getUser: function() {
          return auth.$getCurrentUser();
        },

        /**
         * @param {string} email
         * @param {string} pass
         * @returns {*}
         */
        login: function(email, pass) {
          return auth.$login('password', {
            email: email,
            password: pass,
            rememberMe: true
          });
        },

        logout: function() {
          auth.$logout();
        },

        createAccount: function(email, pass, name) {
          return auth.$createUser(email, pass).then(function() {
              // authenticate so we have permission to write to Firebase
              return fns.login(email, pass);
            }).then(function(user) {
              // store user data in Firebase after creating account
              return createProfile.setData(user.uid, email, name).then(function() {
                return user;
              })
            }, function(err) { 
              console.error(err); 
              // return $q.reject(err); 
            });
        },

        changePassword: function(email, oldpass, newpass) {
          return auth.$changePassword(email, oldpass, newpass);
        },

        changeEmail: function(password, newEmail) {
          return changeEmail(password, fns.user.email, newEmail, this);
        },

        removeUser: function(email, pass) {
          return auth.$removeUser(email, pass);
        },

        watch: function(toggle) {
          fns.getUser().then(function() {
            // update();
          }, function(err){

          });
          listeners.push(toggle);
          // var unbind = function() {
            // var i = listeners.indexOf(update);
            // if( i > -1 ) { listeners.splice(i, 1); }
            console.log('toggle');
          // };
          // if( $scope ) {
            // $scope.$on('$destroy', unbind);
          // }
          // return unbind;

        },

        statusChange: function () {
          fns.getUser().then(function (user) {
          // fns.user = user;
          angular.forEach(listeners, function(toggle) {
            // user state passed into toggle method
            toggle(user);
            console.log('statuschange');
          }, log);
        }, function(){

        });

        return listeners;
        
      }

    };

      $rootScope.$on('$firebaseSimpleLogin:login', fns.statusChange);
      $rootScope.$on('$firebaseSimpleLogin:logout', fns.statusChange);
      $rootScope.$on('$firebaseSimpleLogin:error', fns.statusChange);
      // fns.statusChange();

      return fns;
    }])

  .factory('createProfile', ['fbutil', '$q', '$timeout', function(fbutil, $q, $timeout) {
    return{
    setData: function(id, email, name) {
      var ref = fbutil.ref('users', id), 
          def = $q.defer();
      ref.set({email: email, name: name||firstPartOfEmail(email)}, function(err) {
        $timeout(function() {
          if(err) {
            def.reject(err);
          }
          else {
            def.resolve(ref);
          }
        })
      });

      function firstPartOfEmail(email) {
        return ucfirst(email.substr(0, email.indexOf('@'))||'');
      }

      function ucfirst (str) {
        // credits: http://kevin.vanzonneveld.net
        str += '';
        var f = str.charAt(0).toUpperCase();
        return f + str.substr(1);
      }

      return def.promise;
    }
  }
  }]);
