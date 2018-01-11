define('mailvelope/settings', [
    'io.ox/core/extensions',
    'mailvelope/util',
    'io.ox/core/capabilities',
    'gettext!oxguard'
], function (ext, util, capabilities, gt) {
    'use strict';

    if (util.isMailvelopeSupported() && capabilities.has('mailvelope')) {
        // Add settings for encryption to the Settings Page
        ext.point('io.ox/settings/pane/security').extend({
            id: 'mailvelope',
            //#. %s product Name
            title: gt.pgettext('app', 'Mailvelope'),
            index: 600,
            loadSettingPane: true
        });

    }

});
