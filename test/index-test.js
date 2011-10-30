var vows = require('vows');
var assert = require('assert');
var util = require('util');
var linkedin = require('passport-linkedin');


vows.describe('passport-linkedin').addBatch({
  
  'module': {
    'should report a version': function (x) {
      assert.isString(linkedin.version);
    },
  },
  
}).export(module);
