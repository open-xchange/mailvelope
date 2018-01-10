define('mailvelope/editor/keyring', [
    'io.ox/core/extensions',
    'less!mailvelope/editor/style'
], function (ext) {
    'use strict';

    var RecipientModel = Backbone.Model.extend({
        initialize: function () {
            this.listenTo(this, 'change:email', this.lookup);
            //do initial lookup
            this.lookup(this, this.get('email'));
        },
        defaults: {
            email: '',
            keys: []
        },
        addKey: function (obj) {
            this.set('keys', this.get('keys').concat(obj));
        },
        lookup: function (model, val) {
            if (!val) return;

            var baton = new ext.Baton({
                email: val
            });
            ext.point('pgp_mail/keyring/lookup').invoke('action', model, baton);
        }
    });

    var RecipientView = Backbone.View.extend({
        initialize: function (opt) {
            this.renderAddress = opt.renderAddress;
            this.listenTo(this.model, 'change:keys', function () {
                this.render();
            });
        },
        tagName: 'span',
        className: 'recipient-state',
        render: function () {
            var state = $('<i class="fa fa-key">');
            var address = '';
            if (this.renderAddress) {
                address = $('<span class="email">').text(this.model.get('email'));
            }
            state.toggleClass('key-found', this.model.get('keys').length > 0);
            var trusted = this.model.get('keys').reduce(function (acc, key) {
                return acc || key.trusted === true;
            }, false);
            state.toggleClass('trusted', trusted);
            this.$el.empty().append(address, state);
            return this;
        }
    });

    var recipients = {
        View: RecipientView,
        Model: RecipientModel
    };

    return {
        recipients: recipients
    };
});
