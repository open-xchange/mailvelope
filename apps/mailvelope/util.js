define('mailvelope/util', ['mailvelope/main'], function (mapi) {

    'use strict';

    var util = {};

    util.isSetupDone = function () {
        var def = $.Deferred();
        require(['io.ox/core/api/account']).then(function (accountAPI) {
            return accountAPI.getPrimaryAddress();
        }).then(function (email) {
            return $.when(email, mapi.getKeyring());
        }).then(function (email, ring) {
            var fromPromise = $.Deferred();
            ring.exportOwnPublicKey(email[1]).then(function () {
                fromPromise.resolve();
            }, function (err) {
                console.log(err);
                fromPromise.reject('no key');
            });
            return fromPromise;
        }).then(def.resolve, def.reject);
        return def;
    };

    util.isMailvelopeEnabled = function () {
        if (!mapi.isMailvelopeSupported()) return $.when();
        return this.isSetupDone();
    };

    util.isMailvelopeSupported = function () {
        return mapi.isMailvelopeSupported();
    };

    util.isMailvelopeInstalled = function () {
        return mapi.isEnabled();
    };

    return util;

});
