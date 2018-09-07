define('mailvelope/editor/main', [
    'mailvelope/main',
    'io.ox/core/extensions',
    'mailvelope/editor/keyring',
    'settings!io.ox/mail',
    'io.ox/mail/util',
    'static/3rd.party/mailvelopemailbuild.js'
], function (api, ext, Keyring, mailSettings, util, lib) {

    var extensionsNeeded = ext.point('io.ox/mail/compose/actions/send').filter(function (p) {
        if (p.id === 'errors' ||
            p.id === 'warnings' ||
            p.id === 'success' ||
            p.id === 'update-caches' ||
            p.id === 'busy:end') {
            return true;
        }
        return false;
    });

    function buildFromModel(model) {
        var mail = new lib.mailbuild('multipart/encrypted; protocol="application/pgp-encrypted";');
        mail.addHeader({
            from: (model.get('from') || []).map(util.formatSender),
            to: (model.get('to') || []).map(util.formatSender),
            cc: (model.get('cc') || []).map(util.formatSender),
            bcc: (model.get('bcc') || []).map(util.formatSender),
            subject: model.get('subject')
        });
        mail.createChild('application/pgp-encrypted')
            .addHeader('content-description', 'PGP/MIME version identification')
            .setContent('Version: 1');
        mail.createChild('application/octet-stream; name="encrypted.asc"')
            .addHeader('content-description', 'PGP/MIME encrypted message')
            .addHeader('content-disposition', 'inline; filename="encrypted.asc"')
            .setContent(model.getContent());
        return mail;
    }

    function send(mail) {
        var mimeBuilder = buildFromModel(mail);
        var requestBody = mimeBuilder.build();
        return require(['io.ox/core/http']).then(function (http) {
            return http.PUT({
                module: 'mail',
                params: { action: 'new', timestamp: _.then() },
                data: requestBody
            });
        });
    }

    ext.point('io.ox/mail/compose/actions/send').extend({
        id: 'send-mailvelope',
        index: 999,
        perform: function (baton) {
            if (baton.model.get('editorMode') !== 'mailvelope') return;

            return baton.view.getEditor().then(function (editor) {
                if (_.isFunction(editor.prepareContent)) {
                    return editor.prepareContent(baton.model);
                }
            }).then(function (armoredText) {
                if (armoredText) {
                    baton.model.setContent(armoredText);
                    baton.stopPropagation();
                    return send(baton.model).then(_.identity, function (result) {
                        if (result && result.error) baton.error = result.error;
                        if (result && result.warnings) baton.warning = result.warnings;
                        return $.when();
                    }).then(function () {
                        //manually run some of the extensions, since we stopped the original
                        //invokation of the point
                        return extensionsNeeded.forEach(function (p) {
                            //points are not async, we know that
                            p.perform(baton);
                        });
                    });
                }
            }, function (result) {
                var def = $.Deferred();
                if (result && result.message) baton.error = result.message;
                baton.stopPropagation();
                ext.point('io.ox/mail/compose/actions/send').get('errors', function (p) {
                    p.perform(baton);
                    def.resolve();
                });
                return def;
            }, function (e) {
                console.log(e);
            });
        }
    });

    ext.point('pgp_mail/keyring/lookup').extend({
        id: 'mailvelope',
        action: function (baton) {
            var model = this;
            api.getKeyring().then(function (keyring) {
                var def = $.Deferred();
                keyring.validKeyForAddress([baton.email]).then(def.resolve, def.reject);
                return def;
            }).then(function (result) {
                if (!(result && result[baton.email])) {
                    require(['pgp_mail/key_fetcher'], function (fetcher) {
                        fetcher.checkRemote(baton.email)
                        .done(function (result) {
                            model.addKey(_.extend({ trusted: true }, result));
                        });
                    });
                    return;
                }
                //we trust everything from mailvelope
                model.addKey(_.extend({ trusted: true }, result[baton.email]));
            });
        }
    });

    ext.point('io.ox/mail/compose/createtoken').extend({
        id: 'mailvelope-token',
        action: function (baton) {
            if (baton.model.get('editorMode') !== 'mailvelope') return;

            var email = baton.event.attrs.model.get('token').value;
            var target = $(baton.event.relatedTarget);
            var view = new Keyring.recipients.View({
                model: new Keyring.recipients.Model({
                    email: email
                })
            });
            target.find('.close').before(view.render().$el);
        }
    });

    ext.point('io.ox/mail/compose/fields').extend({
        id: 'monitor-mailvelope',
        draw: function (baton) {
            var node = this;
            monitorForEditorChange(baton, node);

        }
    });

    // Monitor for editor changes to mailvelope
    function monitorForEditorChange(baton, node) {

        //FIXME: find a better way to switch editorMode if encrypt flag changed
        var oldMode = baton.model.get('editorMode');
        //oldMode should never be mailvelope, since this is used if encryption is removed
        if (oldMode === 'mailvelope') oldMode = mailSettings.get('messageFormat');
        //default setting is mailvelope? Use text instead.
        if (oldMode === 'mailvelope') oldMode = 'text';

        //FIXME: hide complete toolbar, for now. We need at least the security options, later.
        var toolbar = node.find('[data-extension-id="composetoolbar"]');
        var attachmentList = node.find('[data-extension-id="attachments"]');
        baton.view.listenTo(baton.model, 'change:encrypt', function (model, val) {
            var draftButton = node.parents('.io-ox-mail-compose-window').find('[data-extension-id="header"] button[data-action="save"]');
            if (val === true) {
                toolbar.hide();
                draftButton.hide();
                baton.view.stopAutoSave();

                //remove all attachments (but the first one, this is content),
                //since we can't import them to mailvelope editor
                model.get('attachments').remove(model.get('attachments').tail());

                model.set('editorMode', 'mailvelope');
            } else {
                toolbar.show();
                draftButton.show();
                baton.view.initAutoSaveAsDraft();
                attachmentList.show();

                model.set('editorMode', oldMode);
            }
        });
        baton.view.listenTo(baton.model, 'change:editorMode', function (model, val) {
            //remember last mode, that is not mailvelope
            if (val !== 'mailvelope') oldMode = val;
            model.set('encrypt', val === 'mailvelope');
        });
    }

    function Editor(container, options) {

        var selector = '#' + container.data('editorId');
        var node = $('<div class="mailvelope-editor">').attr({ id: container.data('editorId') });
        container.append(node);
        this.events = _.extend({}, Backbone.Events);

        var ready = $.Deferred();
        var editor = this;
        var mailvelope;
        var setupComplete = $.Deferred();
        var clean = true;

        //ensure mailvelope has a public/private key-pair, or trigger the setup wizard
        api.getKeyring().then(function (keyring) {
            var from = options.model.get('from');
            var def = $.Deferred();
            var email = _.isArray(from) && _.isArray(from[0]) && from[0][1];
            if (!email) return def.reject({ code: 'UNKNOWN_SENDER' });
            keyring.exportOwnPublicKey(email).then(def.resolve, def.reject);
            return def;
        }).then(function (key) {
            if (key) setupComplete.resolve();
        }, function (err) {
            if (err && err.code === 'NO_KEY_FOR_ADDRESS') {
                //not handled by API, but we need a key, here
                api.trigger('setupNeeded', 'no keypair');
            } else {
                setupComplete.reject(err);
            }
        });
        this.events.listenTo(api, 'setupNeeded', function () {
            require(['mailvelope/tour'], function (runTour) {
                runTour().then(setupComplete.resolve, setupComplete.reject);
            });
        });

        setupComplete.then(function () {
            editor.events.stopListening(api, 'setupNeeded');
            return api.createEditorContainer(selector);
        }, function () {
            editor.events.stopListening(api, 'setupNeeded');
            options.model.set('encrypt', false);
        }).then(function (ed) {
            mailvelope = ed;
            resizeEditor();
            ready.resolve(editor);
        });

        function getMailAddress(item) {
            return item[1];
        }
        var armored = '';
        this.prepareContent = function (model) {
            var recipients = [];
            recipients = recipients.concat(
                (model.get('to') || []).map(getMailAddress),
                (model.get('cc') || []).map(getMailAddress)
            );

            var def = $.Deferred();
            mailvelope.encrypt(recipients).then(function (text) {
                armored = text;
                def.resolve(text);
            }, def.reject);
            return def;
        };
        this.setContent = function () {
        };
        this.appendContent = function () {
        };
        this.scrollTop = function () {
        };
        this.replaceParagraph = function () {
        };
        this.getContent = function () {
            return armored;
        };
        this.content_type = 'multipart/encrypted';

        this.setPlainText = function (e) {
            if (clean === true) {
                $(selector).empty();
                var options = {
                    predefinedText: e
                };
                api.createEditorContainer(selector, options)
                .then(function (ed) {
                    mailvelope = ed;
                    resizeEditor();
                });
                clean = false;
            }
        };

        this.getPlainText = function () {
            return '';
        };

        function resizeEditor() {
            node.css('min-height', Math.max(300, $('.io-ox-mail-compose-window').height() -
                $('.io-ox-mail-compose-window .window-footer').height() -
                $('.io-ox-mail-compose-window .mail-compose-fields').height() - 100));
            node.find('iframe').css('min-height', node.height() - 5);
        }

        this.show = function () {
            //update tokenfields
            var model = options.model;
            model.trigger('change:to', model, model.get('to'));
            model.trigger('change:cc', model, model.get('cc'));

            $(window).on('resize.mailvelope', resizeEditor);
            node.show();
            _.defer(resizeEditor);
        };
        this.hide = function () {
            //update tokenfields
            var model = options.model;
            options.model.trigger('change:to', model, model.get('to'));
            options.model.trigger('change:cc', model, model.get('cc'));
            node.hide();
            $(window).off('resize.mailvelope', resizeEditor);
        };

        this.destroy = function () {
            this.hide();
            this.events.stopListening();
        };

        this.done = ready.done;
    }

    return Editor;
});
