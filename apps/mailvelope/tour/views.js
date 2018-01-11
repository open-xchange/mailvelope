define('mailvelope/tour/views', [
    'gettext!mailvelope'
], function (gt) {
    'use strict';

    // TODO: factor out into WTFramework of AppSuite Core?
    var ProgressView = Backbone.View.extend({
        initialize: function () {
            this.listenTo(this.model, 'change', function () {
                this.render();
            });
        },
        tagName: 'ol',
        className: 'list-progress list-inline',
        render: function () {
            this.$el.empty().append(
                $('<li>').text(gt('Prepare')).toggleClass('active', this.model.get('install_plugin') === 'active'),
                $('<li>').text(gt('Password')).toggleClass('active', this.model.get('create_keys') === 'active')
            );
            return this;
        }
    });

    var InstallPluginView = Backbone.View.extend({
        initialize: function () {
            this.progress = new ProgressView({
                model: this.model
            });
        },
        render: function () {
            this.$el.empty().append(
                this.progress.render().$el,
                gt('Three steps to setup encrypted communication:'),
                $('<ol>').append(
                    $('<li>').text(gt('Download browser plugin “Mailvelope”')),
                    $('<li>').text(gt('Create encryption keys for secure communication'))
                )
            );
            return this;
        }
    });

    return {
        ProgressView: ProgressView,
        InstallPluginView: InstallPluginView
    };
});
