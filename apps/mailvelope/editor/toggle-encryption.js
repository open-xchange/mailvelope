define('mailvelope/editor/toggle-encryption', [
    'mailvelope/main',
    'io.ox/core/capabilities',
    'gettext!mailvelope',
    'less!mailvelope/editor/style'
], function (api, capabilities, gt) {

    'use strict';

    var ToggleEncryptionView = Backbone.View.extend({
        initialize: function () {
            this.listenTo(this.model, 'change:encrypt', function (model, val) {
                this.$('i.fa').toggleClass('encrypted', val);
                //gt('Click to enable encryption')
                //gt('Click to disable encryption')
            });
        },
        className: 'toggle-encryption',
        events: {
            'click i.fa': 'toggle',
            'change:encrypt': 'changed'
        },
        toggle: function () {
            this.model.set('encrypt', !this.model.get('encrypt'));
        },
        setEncryption: function () {
            this.encryption_forced = true;
            this.model.set('encrypt', true);
            this.render();
        },
        render: function () {
            if (api.isMailvelopeSupported()) {
                if (!_.device('small')) {
                    this.$el.empty().append(
                            $('<i class="fa fa-2x" aria-hidden="true"></i>')
                            .toggleClass('encrypted', !!this.model.get('encrypt'))
                        );
                    this.$el.attr('title', gt('Toggle Encryption'));
                }
            }
            if (_.device('small')) {
                this.$el.addClass('mobile-toggle');
            }
            this.listenTo(this.model, 'change:encrypt', function () {
                this.changed();
            });
            return this;
        },
        noLinkMail: function (view) {
            this.view = view;
            checkAttLink(this.model, view);
            stopAttLink();
        },
        changed: function () {
            if (this.model && this.model.get('encrypt')) {
                showAttLink(this.view, false);
                checkAttLinkChange(this.model);
            } else {
                showAttLink(this.view, true);
            }
        }
    });

    // We need to disable the mail attachment link if encryption set
    function stopAttLink() {
        require(['io.ox/core/extPatterns/links'], function (links) {
            new links.Action('io.ox/mail/compose/attachment/shareAttachmentsEnable', {
                id: 'stop',
                index: 1,
                requires: function (e) {
                    try {
                        if (e.baton.view.model.get('encrypt')) {  // Do not offer shareAttachments if encrypted
                            console.log('stopping');
                            e.stopPropagation();
                            return false;
                        }
                    } catch (f) {
                        console.log(f);
                    }
                    return false;
                }
            });
        });
    }

    // Hide or show mail attachment link
    function showAttLink(view, show) {
        if (view) {
            if (show) {
                view.$el.find('.links.shareAttachments').show();
            } else {
                view.$el.find('.links.shareAttachments').hide();
            }

        }
    }

    // Check if Mail Attachment link is shown and encryption enabled
    function checkAttLink(model, view) {
        if (model.get('share_attachments')) {
            if (model.get('share_attachments').enable) {
                if (model.get('encrypt')) {
                    showAttLink(view, false);
                }
            }
        }
    }

    // Show a warning if Mail Attachment Link is shown and encryption clicked
    function checkAttLinkChange(model) {
        if (model.get('share_attachments')) {
            if (model.get('share_attachments').enable) {
                require(['io.ox/core/tk/dialogs', 'settings!io.ox/mail'], function (dialogs, mail) {
                    var dialog = new dialogs.CreateDialog({ width: 450, height: 300, center: true, enter: 'ok' });
                    dialog.header($('<h4>').text(gt('Not Supported')));
                    var text = $('<p>').text(gt('%s is not supported with secured email and will be disabled.', mail.get('compose/shareAttachments/name')));
                    dialog.getBody().append(text);
                    dialog
                    .addPrimaryButton('ok', gt('OK'), 'ok')
                    .show();
                });
            }
        }
    }

    return {
        View: ToggleEncryptionView
    };
});
