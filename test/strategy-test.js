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

}).export(module);
