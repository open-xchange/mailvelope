define('mailvelope/tour', [
    'mailvelope/main',
    'io.ox/core/api/account',
    'io.ox/core/tk/wizard',
    'mailvelope/tour/views',
    'gettext!mailvelope'
], function (api, accountAPI, Tour, views, gt) {
    'use strict';

    function createKeys(step, elementId) {
        return $.when(api.getKeyring(), accountAPI.getAllSenderAddresses(), accountAPI.getPrimaryAddress())
            .then(function (keyring, allAddresses, primaryAddress) {
                var ids = [].concat([primaryAddress], allAddresses.filter(function (user) {
                    //remove primary address
                    return !(user[1] === primaryAddress[1] && user[0] === primaryAddress[0]);
                })).map(function (user) {
                    return {
                        email: user[1],
                        fullName: user[0]
                    };
                });
                var options = {
                    userIds: ids,
                    keySize: 4096
                };
                var def = $.Deferred();
                keyring.createKeyGenContainer('#' + elementId, options).then(def.resolve, def.reject);

                return def;
            }).then(function (generator) {
                step.generator = generator;
                step.toggleNext(true);
                return generator;
            });
    }

    var running;

    Tour.registry.add({
        id: 'mailvelope/initial_setup'
    }, function () {
        if (running) return running;

        var def = $.Deferred();
        running = def;
        var tour = new Tour();
        var finished = false;
        var model = new Backbone.Model();

        if (!api.isMailvelopeSupported()) {
            tour.step()
            .title(gt('Mailvelope Not Supported'))
            .content(gt('Mailvelope is only supported in Google Chrome or Mozilla Firefox.  Please use one of these broswers to set up encryption.'))
            .beforeShow(function () {
                var step = this;
                step.toggleNext(false);
                step.$('[data-action=next]').hide();
                //no going back from here
                this.toggleBack(false);
                this.toggleNext(false);
                finished = true;
            })
            .end();
        }

        //install browser plugin
        tour.step()
            .title(gt('Encrypted communication'))
            .content(new views.InstallPluginView({
                model: model
            }).render().$el)
            .beforeShow(function () {
                model.set('install_plugin', 'active');
                var step = this;
                step.toggleNext(false);
                step.$('[data-action=next]').hide();

                this.footer(
                    $('<a class="btn btn-primary">')
                        .attr('href', api.getDownloadURL())
                        .attr('target', '_blank')
                        .text(gt('Download browser plugin'))
                        .click(function () {
                            if (_.device('chrome')) {
                                // WARNING: in order to have this completely working, this needs to be run on a "verified site",
                                // see [google webstore documentation](https://developer.chrome.com/webstore/inline_installation#verified-site)
                                var head = $('head');
                                if (head.find('[href="https://chrome.google.com/webstore/detail/kajibbejlbohfaggdiogboambcijhkke"]').length === 0) {
                                    head.append(
                                        $('<link rel="chrome-webstore-item" href="https://chrome.google.com/webstore/detail/kajibbejlbohfaggdiogboambcijhkke">')
                                    );
                                }
                                try {
                                    window.chrome.webstore.install('https://chrome.google.com/webstore/detail/kajibbejlbohfaggdiogboambcijhkke', _.noop, function (message, code) {
                                        //just ignore
                                        if (ox.debug) console.log(message, code);
                                        window.open('https://chrome.google.com/webstore/detail/kajibbejlbohfaggdiogboambcijhkke');
                                    });
                                } catch (e) {
                                    //just ignore
                                    if (ox.debug) console.log(e);
                                    window.open('https://chrome.google.com/webstore/detail/kajibbejlbohfaggdiogboambcijhkke');
                                }
                                return false;
                            }
                            if (_.device('firefox')) {
                                window.open('https://download.mailvelope.com/releases/latest/mailvelope.firefox.xpi');
                                return false;
                            }
                            return true;
                        })
                );

                api.loaded.then(function () {
                    step.toggleNext(true);
                    model.set('install_plugin', 'done');
                    _.defer(function () {
                        step.trigger('next');
                    });
                });
            })
            .end();

        var elementId = 'mailvelope-wizard-' + _.uniqueId();

        //create keys
        tour.step()
            .title(gt('Encrypted communication'))
            .content(
                new views.ProgressView({
                    model: model
                }).render().$el,
                $('<div>').attr({ id: elementId }).css('height', '250px')
            )
            .beforeShow(function () {
                this.toggleNext(false);
                this.toggleBack(false);
                model.set('create_keys', 'active');
                var step = this;
                //hide next button, we will define our own
                step.$el.find('[data-action=next]').hide();
                step.$el.find('[data-action=back]').hide();

                $.when(api.getKeyring(), accountAPI.getAllSenderAddresses(), accountAPI.getPrimaryAddress())
                .then(function (keyring, allAddresses, primaryAddress) {
                    var def = $.Deferred();
                    keyring.exportOwnPublicKey(primaryAddress[1]).then(def.resolve, def.reject);
                    return def;
                }, function (e) {
                    if (ox.debug) console.log(e);
                }).then(function () {
                    //already have a private key for primary address, skip this step
                    _.defer(function () {
                        step.trigger('next');
                    });

                    //reject, so default path of the deferred chain is not executed
                    return $.Deferred().reject({ code: 'KEY_EXISTS' });
                }, function (err) {
                    if (!err || err.code !== 'NO_KEY_FOR_ADDRESS') return;

                    //need to setup the keys or restore backup
                    return createKeys(step, elementId);
                });
                step.on('next', function () {
                    model.set('create_keys', 'done');
                });
                step.footer(
                    $('<button class="btn btn-primary">')
                        .text(gt('Generate'))
                        .click(function (ev) {
                            //do not click twice
                            $(ev.target).prop('disabled', true);
                            //disable close actions
                            step.mandatory();

                            step.generator.generate().then(function () {
                                step.trigger('next');
                            }, function (err) {
                                if (err.code !== 'INPUT_NOT_VALID') throw (err);

                                $(ev.target).prop('disabled', false);
                            });
                        })
                );

            })
            .end();

        //warm welcome
        tour.step()
            .title(gt('Encrypted communication'))
            .content(gt('Congratulations! You have successfully set up encryption.'))
            .beforeShow(function () {
                //no going back from here
                this.toggleBack(false);
                finished = true;
            })
            .end();

        tour.on('stop', function () {
            if (def.state() === 'pending' && finished) return def.resolve();

            //last step not shown, guess user aborted
            def.reject({
                code: 'INCOMPLETE_SETUP'
            });
        });
        tour.start();

        def.then(function () {
            api.trigger('setup:done');
        }).always(function () {
            running = null;
        });
        return def;
    });

    return Tour.registry.get('mailvelope/initial_setup').get('run');
});
