define('mailvelope/main', [
    'io.ox/core/capabilities'
], function (capabilities) {
    'use strict';

    function Mailvelope() {
        var loaded = this.loaded = $.Deferred();

        _.extend(this, Backbone.Events);

        function loadMailvelope() {
            loaded.resolve(window.mailvelope);
        }

        function fromPromise(promise) {
            var def = $.Deferred();
            promise.then(def.resolve, function (e) {
                def.reject(e);
            });
            return def;
        }

        this.getKeyring = function getKeyring() {
            var def = $.Deferred();
            var self = this;
            var timedOut = false;
            var timeout = window.setTimeout(function () {
                self.trigger('setupNeeded', 'timeout');
                def.reject({
                    code: 'TIMEOUT'
                });
                timedOut = true;
            }, 2000);

            loaded.then(function (mailvelope) {
                if (timedOut) {
                    timedOut = false;
                    return;
                }
                window.clearTimeout(timeout);
                return fromPromise(mailvelope.getKeyring(ox.user));
            }, function () {
                window.clearTimeout(timeout);
                return $.Deferred().reject.apply(this, arguments);
            }).then(_.identity, function (err) {
                if (err.code !== 'NO_KEYRING_FOR_ID') return $.Deferred().reject(err);

                self.trigger('setupNeeded', 'no keyring');
                return fromPromise(window.mailvelope.createKeyring(ox.user));
            }).then(def.resolve, def.reject);
            return def;
        };

        this.createEditorContainer = function createEditorContainer(node, options) {
            return $.when(loaded, this.getKeyring()).then(function (mailvelope, keyring) {
                return fromPromise(mailvelope.createEditorContainer(node, keyring, options));
            });
        };

        this.getDownloadURL = function getDownloadURL() {
            if (_.device('chrome')) {
                return 'https://chrome.google.com/webstore/detail/kajibbejlbohfaggdiogboambcijhkke';
            } else if (_.device('firefox')) {
                return 'https://download.mailvelope.com/releases/latest/mailvelope.firefox.xpi';
            }

            return null;
        };

        this.isMailvelopeSupported = function isMailvelopeSupported() {
            return _.device('phantomjs || desktop && (chrome >= 38 || firefox > 32)') && capabilities.has('mailvelope');
        };
        this.isEnabled = function isEnabled() {
            return window.mailvelope && this.isMailvelopeSupported();
        };

        var hash = {};
        this.createDisplayContainer = function createDisplayContainer(selector, armoredText, options) {
            if (hash[selector] && (_.now() - hash[selector].timestamp < 5000)) return hash[selector].def;

            hash[selector] = {
                timestamp: _.now()
            };
            hash[selector].def = $.when(loaded, this.getKeyring()).then(function (mailvelope, keyring) {
                return fromPromise(mailvelope.createDisplayContainer(selector, armoredText, keyring, options));
            });
            return hash[selector].def.always(function () {
                delete hash[selector];
            });
        };

        if (!this.isMailvelopeSupported()) {
            loaded.reject({
                code: 'BROWSER_NOT_SUPPORTED'
            });
        } else if (typeof window.mailvelope !== 'undefined') {
            loadMailvelope();
        } else {
            $(window).on('mailvelope', loadMailvelope);
        }
    }

    var api = new Mailvelope();

    return api;
});
