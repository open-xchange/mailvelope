define('mailvelope/read/view-detail', [
    'io.ox/core/extensions',
    'mailvelope/main',
    'mailvelope/read/util',
    'io.ox/mail/api'
], function (ext, mailvelope, util, mailAPI) {
    'use strict';

    ext.point('io.ox/mail/detail/body').extend({
        index: 1100,
        id: 'encrypted_content',
        draw: function (baton) {
            if (!util.isEncrypted(baton.data)) {
                return;
            }
            var cid = _.cid(baton.data);
            if (!cid) return;
            // insert Mailvelope div before current shadow Dom
            var loc = baton.view.$el.find('.body');
            loc.before('<div class="mail-item mail-detail content" data-cid="' + cid + '">');
            $(loc[0]).replaceWith('');  // Remove current DOM

            $('.mail-item.mail-detail[data-cid="' + cid + '"] .content').toggleClass('current', false);
            $('.mail-item.mail-detail[data-cid="' + cid + '"] .content:visible').toggleClass('current', true);
            // Draw inline from first attachment
            if (baton.data.security_info && baton.data.security_info.encrypted) {
                if (baton.data.attachments[0] && (/BEGIN PGP MESSAGE/).test(baton.data.attachments[0].content)) {
                    baton.stopPropagation();
                    var text = baton.data.attachments[0].content.replace(/<br>/g, '\r\n');
                    return renderMail(cid, text);
                }
            }
            // Otherwise pull Mime data
            var data = _(baton.data.attachments).find(function (a) {
                return (/^application\/octet-stream/).test(a.content_type);
            });
            data.mail = baton.data;

            return $.ajax({ url: mailAPI.getUrl(data, 'view'), dataType: 'text' }).then(function (text) {
                return renderMail(cid, text);
            }).then(function () {
                baton.stopPropagation();
            });
        }
    });

    function renderMail(cid, text) {
        return mailvelope.createDisplayContainer('.mail-item.mail-detail[data-cid="' + cid + '"] .content.current', text)
            .done(function () {
                $('.mail-item.mail-detail[data-cid="' + cid + '"]').find('[data-action="inplace-reply"]').hide();
                resize(cid);
            }).fail(function (err) {
                if (!err || err.code !== 'TIMEOUT') {
                    if (ox.debug) console.log(err);
                    return;
                }

                return require(['mailvelope/tour']).then(function (runTour) {
                    return runTour();
                }).then(function () {
                    return renderMail(cid, text);
                });
            });
    }

    function resize(cid) {
        try {
            var listitem = $('.mail-item.mail-detail[data-cid="' + cid + '"]').parent();
            listitem.css('height', '100%');
            listitem.find('.content').css('height', '100%');
            var header = listitem.find('detail-view-header')[0];
            var iframe = $($('.mail-item.mail-detail[data-cid="' + cid + '"] .content.current').find('iframe')[0]);
            iframe.height($(listitem).height() - $(header).height());
        } catch (e) {
            console.log(e);
        }
    }
});
