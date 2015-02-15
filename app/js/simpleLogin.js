
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

  .factory('simpleLogin', ['$firebaseAuth', 'fbutil', 'createProfile', 'changeEmail', '$q', '$rootScope',
    function($firebaseAuth, fbutil, createProfile, changeEmail, $q, $rootScope) {
      var auth = $firebaseAuth(fbutil.ref());
      var listeners = [];
      var log = [];

      // calling method inside factory = use object literal name
      // call method outside factory = use factory name

      var jsobj = {
        user: null,

        getUser: function() {
          return auth.$waitForAuth();
        },

        /**
         * @param {string} email
         * @param {string} pass
         * @returns {*}
         */
        login: function(email, pass) {
          return auth.$authWithPassword({
            email: email,
            password: pass
            
          }, {rememberMe: true});
        },

        logout: function() {
          auth.$unauth();
        },

        createAccount: function(email, pass, name) {
          return auth.$createUser({email: email, password: pass})
          .then(function() {
              // authenticate so we have permission to write to Firebase
              return jsobj.login(email, pass);
            })
          .then(function(user) {
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
          return auth.$changePassword({email: email, oldPassword: oldpass, newPassword: newpass});
        },

        changeEmail: function(password, oldEmail, newEmail) {
          return changeEmail(password, oldEmail, newEmail, this);
        },

        removeUser: function(email, pass) {
          return auth.$removeUser({email: email, password: pass});
        },

        watch: function(toggle) {
          jsobj.getUser().then(function() {
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
          user = auth.$getAuth();
          // jsobj.user = user;
          angular.forEach(listeners, function(toggle) {
            // user state passed into toggle method
            toggle(user);
            console.log('statuschange');
          });        
        }

      }; //end object
      
      return jsobj;

      auth.$onAuth(jsobj.statusChange);
      jsobj.statusChange();

      
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
