define('mailvelope/read/util', [
    'io.ox/mail/util'
], function (util) {
    'use strict';

    util.isPGPMail = function (mail) {
        return this.isEncrypted(mail) || this.isSigned(mail);
    };

    util.isEncrypted = function (mail) {
        if (mail.security_info && mail.security_info.encrypted) return true;
        if (mail.content_type && mail.content_type.indexOf('multipart/encrypted') > -1) return (true);
        try {
            if (mail.attachments && mail.attachments[0]) {
                if (mail.attachments[0].content.indexOf('---BEGIN PGP MESSAGE') > -1) {
                    mail.PGPInline = true;
                    return (true);
                }
            }
        } catch (e) {
            console.log('error checking body' + e);
        }
        return (false);
    };

    util.isSigned = function (mail) {
        return mail.content_type === 'multipart/signed';
    };

    util.isDecrypted = function (data) {
        if (_.isArray(data)) {
            var found = false;
            data.forEach(function (obj) {
                if (obj.security && obj.security.decrypted) found = true;
            });
            return found;
        }
        if (data.security && data.security.decrypted) {
            return true;
        }
        return false;
    };

    util.getPGPInfo = function () {
        return $.when();
    };

    return util;
});

