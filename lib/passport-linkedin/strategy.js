/**
 * Module dependencies.
 */
var util = require('util')
  , OAuthStrategy = require('passport-oauth').OAuthStrategy;


function Strategy(options, verify) {
  options = options || {};
  options.requestTokenURL = options.requestTokenURL || 'https://api.linkedin.com/uas/oauth/requestToken';
  options.accessTokenURL = options.accessTokenURL || 'https://api.linkedin.com/uas/oauth/accessToken';
  options.userAuthorizationURL = options.userAuthorizationURL || 'https://www.linkedin.com/uas/oauth/authenticate';
  options.sessionKey = options.sessionKey || 'oauth:linkedin';

  OAuthStrategy.call(this, options, verify);
  this.name = 'linkedin';
}

/**
 * Inherit from `OAuthStrategy`.
 */
util.inherits(Strategy, OAuthStrategy);


/**
 * Expose `Strategy`.
 */
module.exports = Strategy;
