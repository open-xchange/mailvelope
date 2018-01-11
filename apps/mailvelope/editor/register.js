define('mailvelope/editor/register',
['io.ox/core/extensions', 'mailvelope/util', 'mailvelope/editor/toggle-encryption'],
function (ext, util, ToggleEncryption) {

    'use strict';

    ext.point('io.ox/mail/compose/fields').extend({
        id: 'lock',
        index: 'last',
        draw: function (baton) {
            // Draw lock icon if mailvelope setup
            var node = this;
            var view = new ToggleEncryption.View({
                model: baton.model
            });
            view.noLinkMail(baton.view);
            baton.view.toggleEncryption = view;
            util.isMailvelopeEnabled()
            .done(function () {
                //HACK: always insert first, since we do not control
                //other content
                node.prepend(view.render().$el);
            })
            .fail(function () {
                if (util.isMailvelopeSupported()) {
                    node.prepend(view.render().$el);
                }
            });
        }
    });

});
