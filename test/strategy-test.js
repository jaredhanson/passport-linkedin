var vows = require('vows');
var assert = require('assert');
var util = require('util');
var LinkedInStrategy = require('passport-linkedin/strategy');


vows.describe('LinkedInStrategy').addBatch({
  
  'strategy': {
    topic: function() {
      return new LinkedInStrategy({
        consumerKey: 'ABC123',
        consumerSecret: 'secret'
      },
      function() {});
    },
    
    'should be named linkedin': function (strategy) {
      assert.equal(strategy.name, 'linkedin');
    },
  },
  
  'strategy when loading user profile': {
    topic: function() {
      var strategy = new LinkedInStrategy({
        consumerKey: 'ABC123',
        consumerSecret: 'secret'
      },
      function() {});
      
      // mock
      strategy._oauth.get = function(url, token, tokenSecret, callback) {
        var body = '{ "firstName": "Jared", "id": "_XX0XXX00X", "lastName": "Hanson" }';
        
        callback(null, body, undefined);
      }
      
      return strategy;
    },
    
    'when told to load user profile': {
      topic: function(strategy) {
        var self = this;
        function done(err, profile) {
          self.callback(err, profile);
        }
        
        process.nextTick(function () {
          strategy.userProfile('token', 'token-secret', {}, done);
        });
      },
      
      'should not error' : function(err, req) {
        assert.isNull(err);
      },
      'should load profile' : function(err, profile) {
        assert.equal(profile.provider, 'linkedin');
        assert.equal(profile.id, '_XX0XXX00X');
        assert.equal(profile.displayName, 'Jared Hanson');
        assert.equal(profile.name.familyName, 'Hanson');
        assert.equal(profile.name.givenName, 'Jared');
      },
      'should set raw property' : function(err, profile) {
        assert.isString(profile._raw);
      },
      'should set json property' : function(err, profile) {
        assert.isObject(profile._json);
      },
    },
  },
  
  'strategy when loading user profile and encountering an error': {
    topic: function() {
      var strategy = new LinkedInStrategy({
        consumerKey: 'ABC123',
        consumerSecret: 'secret'
      },
      function() {});
      
      // mock
      strategy._oauth.get = function(url, token, tokenSecret, callback) {
        callback(new Error('something went wrong'));
      }
      
      return strategy;
    },
    
    'when told to load user profile': {
      topic: function(strategy) {
        var self = this;
        function done(err, profile) {
          self.callback(err, profile);
        }
        
        process.nextTick(function () {
          strategy.userProfile('token', 'token-secret', {}, done);
        });
      },
      
      'should error' : function(err, req) {
        assert.isNotNull(err);
      },
      'should not load profile' : function(err, profile) {
        assert.isUndefined(profile);
      },
    },
  },
  
  'strategy handling a request that has been denied': {
    topic: function() {
      var strategy = new LinkedInStrategy({
          consumerKey: 'ABC123',
          consumerSecret: 'secret'
        },
        function() {}
      );
      return strategy;
    },
    
    'after augmenting with actions': {
      topic: function(strategy) {
        var self = this;
        var req = {};
        strategy.success = function(user) {
          self.callback(new Error('should not be called'));
        }
        strategy.fail = function() {
          self.callback(null, req);
        }
        
        req.query = {};
        req.query.oauth_problem = 'user_refused';
        process.nextTick(function () {
          strategy.authenticate(req);
        });
      },
      
      'should not call success' : function(err, req) {
        assert.isNull(err);
      },
      'should call fail' : function(err, req) {
        assert.isNotNull(req);
      },
    },
  },

}).export(module);
