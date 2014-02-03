/**
 * Module dependencies
 */
var crypto = require('crypto');
var events = require('events');
var path = require('path');
var request = require('request');
var util = require('util');
var _ = require('lodash');

/**
 * Constants
 */
var BASE_URL = 'https://analytics.distimo.com';
var API_NAMESPACE = '/api/v4';
var OAUTH_NAMESPACE = '/oauth';
var ERROR = require('./error_codes');

/**
 * Distimo API client constructor
 *
 * @param {Object} [options]
 * @constructor
 */
function DistimoAPI(options) {
  options || (options = {});

  this._settings = _.pick(options, [
    'clientID',
    'clientSecret',
    'privateKey',
    'accessToken',
    'refreshToken',
    'hashGenerator'
  ]);
}

util.inherits(DistimoAPI, events.EventEmitter);

/**
 * Expose constructor
 */
module.exports = DistimoAPI;

/**
 * Get or set options by its key
 * @param {String} key
 * @param {*} [value]
 * @returns {*|undefined}
 */
DistimoAPI.prototype.get = function (key, value) {
  if (arguments.length > 1) {
    this._settings[key] = value;
  }

  return this._settings[key] || undefined;
};

/**
 * Get or set options by its key
 * @param {String} key
 * @param {*} [value]
 * @returns {*|undefined}
 */
DistimoAPI.prototype.set = DistimoAPI.prototype.get;

/**
 * Converts object into query string of form "key1=value1&key2=value2"
 * @param {Object} params
 * @returns {String}
 * @private
 */
DistimoAPI.prototype._params = function (data) {
  var params = _.map(data || {}, function (value, key) {
    return key + '=' + encodeURIComponent(value);
  });

  return params.join('&');
};

/**
 * Request new access token using refresh token
 * @param {Function} callback
 * @private
 */
DistimoAPI.prototype._refreshAccessToken = function (callback) {
  var _this = this;

  request.post(BASE_URL + OAUTH_NAMESPACE + '/token', {
    form: {
      refresh_token: this.get('refreshToken'),
      client_id: this.get('clientID'),
      client_secret: this.get('clientSecret'),
      grant_type: 'refresh_token'
    }
  }, function (err, response, body) {
    if (err) {
      return callback(err);
    }

    if ('string' === typeof body) {
      body = JSON.parse(body);
    }

    _this.set('accessToken', body.access_token);
    _this.set('refreshToken', body.refresh_token);

    this.emit('token');

    callback(err);
  });
};

/**
 * Makes a request to the API
 * @param {String} endpoint
 * @param {Function} callback
 */
DistimoAPI.prototype.apiCall = function (endpoint, params, callback) {
  var _this = this;
  var args = [].slice.call(arguments);

  if ('function' === typeof params) {
    callback = params;
    params = {};
  }

  var defaults = {
    format: 'json'
  };

  _.defaults(params, defaults);

  var queryString = this._params(params);
  var timestamp = String(Math.floor(new Date().getTime() / 1000));

  params.hash = crypto.createHmac('sha1', this.get('privateKey')).update(queryString + timestamp).digest('hex');
  params.apikey = this.get('clientID');
  params.t = timestamp;
  params.access_token = this.get('accessToken');

  var callPath = BASE_URL + API_NAMESPACE + endpoint.replace(/^([^\/])/, '/$1');
  var options = { url: callPath, qs: params };

  request(options, function (err, response, body) {
    if (err) {
      return callback(err);
    }

    var json = JSON.parse(body || '{}');

    // Not a normal response. Handle it
    if (response.statusCode !== 200) {
      if (json.code === ERROR.ACCESS_TOKEN_EXPIRED ||
          json.code === ERROR.AUTHORIZATION_CODE_EXPIRED)
      {
        _this._refreshAccessToken(function (err) {
          if (err) return callback(err);
          _this.apiCall.apply(_this, args);
        });
      }
      else {
        callback(new Error(json));
      }
    }

    else {
      callback(null, json)
    }
  });
};

/**
 * Get applications
 * @param {Function} callback
 */
DistimoAPI.prototype.applications = function (callback) {
  this.apiCall('/downloads', { breakdown: 'application'}, function (err, res) {
    if (err) {
      return callback(err);
    }

    var apps = _.map(res, function (item, key) {
      return { id: key, name: item.application };
    });

    callback(null, apps);
  });
};

/**
 * Gets downloads
 * @param {Function} callback
 */
DistimoAPI.prototype.downloads = function (params, callback) {
  this.apiCall('/downloads', params, callback);
};

/**
 * Get
 * @param params
 * @param callback
 */
DistimoAPI.prototype.apps = function (params, callback) {
  this.apiCall('/assets/apps', params, callback)
}