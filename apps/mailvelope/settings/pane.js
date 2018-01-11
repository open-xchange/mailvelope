define('mailvelope/settings/pane', [
    'io.ox/core/extensions',
    'mailvelope/main',
    'io.ox/core/api/account',
    'mailvelope/util',
    'less!pgp_mail/style'
], function (ext, api, accountAPI, util) {
    'use strict';

    function drawMailvelopeSettings(location) {
        location.removeClass('scrollable-pane').parent('.settings-detail-pane.scrollable').removeClass('scrollable').addClass('non-scrollable');
        location.append(
                $('<div>').addClass('mailvelope-settings-pane abs')
        );
        $.when(
            api.loaded,
            api.getKeyring(),
            accountAPI.getPrimaryAddress(),
            accountAPI.getDefaultDisplayName()
        ).then(function (mailvelope, keyring, mail, name) {
            var opt = {};
            if (mail && mail[1]) opt.email = mail[1];
            if (name) opt.fullName = name;
            mailvelope.createSettingsContainer('.mailvelope-settings-pane', keyring, opt);
        });
    }

    ext.point('mailvelope/settings/detail').extend({
        index: 203,
        id: 'mailvelope_settings',
        draw: function () {
            var node = this;
            if (util.isMailvelopeInstalled()) {
                drawMailvelopeSettings(node);
            } else {
                require(['mailvelope/tour'], function (runTour) {
                    runTour().then(function () {
                        drawMailvelopeSettings(node);
                    });
                });
            }
        },
        save: _.noop
    });
});
