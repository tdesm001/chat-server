var debug = require('debug')('app:moneypot');
var request = require('request');
var config = require('./config');

var MoneyPot = function(opts) {
    this.endpoint = opts.endpoint;
    this.app_id = opts.app_id;
    this.app_secret = opts.app_secret;
};

MoneyPot.prototype.sendAPIRequest = function(method, endpoint, cb) {
    var uri = this.endpoint + endpoint + '?app_secret=' + this.app_secret;
    debug('Sending request to uri: %s', uri);

    request({
        method: method,
        uri: uri
    }, function(err, response, body) {
        if (err) {
            debug('err', err);
            return cb(err);
        }

        // Cloudflare will give HTML page if origin is in error state
        var parsed;
        try {
          parsed = JSON.parse(body);
        } catch(ex) {
          return cb(ex);
        }

        return cb(null, parsed);
    });
};

MoneyPot.prototype.findAppById = function(app_id, cb) {
    this.sendAPIRequest('GET', '/apps/' + app_id, function(err, app) {
        return cb(err, app);
    });
};

MoneyPot.prototype.findUserByTokenHash = function(hash, cb) {
    this.sendAPIRequest('GET', '/hashed-token-users/' + hash, function(err, user) {
        debug('[findUserByTokenHash] user: %j', user);
        return cb(err, user);
    });
};

module.exports = new MoneyPot({
    endpoint:   config.api_endpoint,
    app_id:     config.app_id,
    app_secret: config.app_secret
});
