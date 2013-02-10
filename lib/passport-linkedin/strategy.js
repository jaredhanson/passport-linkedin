/**
 * Module dependencies.
 */
var util = require('util')
  , url = require('url')
  , querystring = require('querystring')
  , OAuthStrategy = require('passport-oauth').OAuthStrategy
  , InternalOAuthError = require('passport-oauth').InternalOAuthError;


/**
 * `Strategy` constructor.
 *
 * The LinkedIn authentication strategy authenticates requests by delegating to
 * LinkedIn using the OAuth protocol.
 *
 * Applications must supply a `verify` callback which accepts a `token`,
 * `tokenSecret` and service-specific `profile`, and then calls the `done`
 * callback supplying a `user`, which should be set to `false` if the
 * credentials are not valid.  If an exception occured, `err` should be set.
 *
 * Options:
 *   - `consumerKey`     identifies client to LinkedIn
 *   - `consumerSecret`  secret used to establish ownership of the consumer key
 *   - `callbackURL`     URL to which LinkedIn will redirect the user after obtaining authorization
 *
 * Examples:
 *
 *     passport.use(new LinkedInStrategy({
 *         consumerKey: '123-456-789',
 *         consumerSecret: 'shhh-its-a-secret'
 *         callbackURL: 'https://www.example.net/auth/linkedin/callback'
 *       },
 *       function(token, tokenSecret, profile, done) {
 *         User.findOrCreate(..., function (err, user) {
 *           done(err, user);
 *         });
 *       }
 *     ));
 *
 * @param {Object} options
 * @param {Function} verify
 * @api public
 */
function Strategy(options, verify) {
  options = options || {};
  options.requestTokenURL = options.requestTokenURL || 'https://api.linkedin.com/uas/oauth/requestToken';
  options.accessTokenURL = options.accessTokenURL || 'https://api.linkedin.com/uas/oauth/accessToken';
  options.userAuthorizationURL = options.userAuthorizationURL || 'https://www.linkedin.com/uas/oauth/authenticate';
  options.sessionKey = options.sessionKey || 'oauth:linkedin';

  OAuthStrategy.call(this, options, verify);
  this.name = 'linkedin';
  this._profileFields = options.profileFields || null;
  
  // LinkedIn accepts an extended "scope" parameter when obtaining a request.
  // Unfortunately, it wants this as a URL query parameter, rather than encoded
  // in the POST body (which is the more established and supported mechanism of
  // extending OAuth).
  //
  // Monkey-patch the underlying node-oauth implementation to add these extra
  // parameters as URL query parameters.
  this._oauth.getOAuthRequestToken= function( extraParams, callback ) {
     if( typeof extraParams == "function" ){
       callback = extraParams;
       extraParams = {};
     }
     
    var requestUrl = this._requestUrl;
    if (extraParams.scope) {
      requestUrl = requestUrl += ('?scope=' + extraParams.scope);
      delete extraParams.scope;
    }
     
    // Callbacks are 1.0A related 
    if( this._authorize_callback ) {
      extraParams["oauth_callback"]= this._authorize_callback;
    }
    this._performSecureRequest( null, null, this._clientOptions.requestTokenHttpMethod, requestUrl, extraParams, null, null, function(error, data, response) {
      if( error ) callback(error);
      else {
        var results= querystring.parse(data);
  
        var oauth_token= results["oauth_token"];
        var oauth_token_secret= results["oauth_token_secret"];
        delete results["oauth_token"];
        delete results["oauth_token_secret"];
        callback(null, oauth_token, oauth_token_secret,  results );
      }
    });
  }
}

/**
 * Inherit from `OAuthStrategy`.
 */
util.inherits(Strategy, OAuthStrategy);

/**
 * Authenticate request by delegating to LinkedIn using OAuth.
 *
 * @param {Object} req
 * @api protected
 */
Strategy.prototype.authenticate = function(req, options) {
  // When a user denies authorization on LinkedIn, they are presented with a
  // link to return to the application in the following format:
  //
  //     http://www.example.com/auth/linkedin/callback?oauth_problem=user_refused
  //
  // Following the link back to the application is interpreted as an
  // authentication failure.
  if (req.query && req.query.oauth_problem) {
    return this.fail();
  }
  
  // Call the base class for standard OAuth authentication.
  OAuthStrategy.prototype.authenticate.call(this, req, options);
}

/**
 * Retrieve user profile from LinkedIn.
 *
 * This function constructs a normalized profile, with the following properties:
 *
 *   - `id`
 *   - `displayName`
 *   - `name.familyName`
 *   - `name.givenName`
 *
 * @param {String} token
 * @param {String} tokenSecret
 * @param {Object} params
 * @param {Function} done
 * @api protected
 */
Strategy.prototype.userProfile = function(token, tokenSecret, params, done) {
  var url = 'https://api.linkedin.com/v1/people/~:(id,first-name,last-name)?format=json';
  if (this._profileFields) {
    var fields = this._convertProfileFields(this._profileFields);
    url = 'https://api.linkedin.com/v1/people/~:(' + fields + ')?format=json';
  }

  this._oauth.get(url, token, tokenSecret, function (err, body, res) {
    if (err) { return done(new InternalOAuthError('failed to fetch user profile', err)); }
    
    try {
      var json = JSON.parse(body);
      
      var profile = { provider: 'linkedin' };
      profile.id = json.id;
      profile.displayName = json.firstName + ' ' + json.lastName;
      profile.name = { familyName: json.lastName,
                       givenName: json.firstName };
      if (json.emailAddress) { profile.emails = [{ value: json.emailAddress }]; }
      
      profile._raw = body;
      profile._json = json;
      
      done(null, profile);
    } catch(e) {
      done(e);
    }
  });
}

/**
 * Return extra LinkedIn-specific parameters to be included in the request token
 * request.
 *
 * References:
 *   https://developer.linkedin.com/documents/authentication#granting
 *
 * @param {Object} options
 * @return {Object}
 * @api protected
 */
Strategy.prototype.requestTokenParams = function(options) {
  var params = {};
  
  var scope = options.scope;
  if (scope) {
    if (Array.isArray(scope)) { scope = scope.join('+'); }
    params['scope'] = scope;
  }
  return params;
}

Strategy.prototype._convertProfileFields = function(profileFields) {
  var map = {
    'id':          'id',
    'name':       ['first-name', 'last-name'],
    'emails':      'email-address'
  };
  
  var fields = [];
  
  profileFields.forEach(function(f) {
    // return raw LinkedIn profile field to support the many fields that don't
    // map cleanly to Portable Contacts
    if (typeof map[f] === 'undefined') { return fields.push(f); };

    if (Array.isArray(map[f])) {
      Array.prototype.push.apply(fields, map[f]);
    } else {
      fields.push(map[f]);
    }
  });

  return fields.join(',');
}


/**
 * Expose `Strategy`.
 */
module.exports = Strategy;
