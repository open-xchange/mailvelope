define('mailvelope/read/register', ['mailvelope/read/util', 'mailvelope/read/view-detail'], function (util) {
    'use strict';

    // Handle replies/forward of mailvelope emails
    ox.on('mail:reply:ready', checkReply);
    ox.on('mail:replyall:ready', checkReply);
    ox.on('mail:forward:ready', checkReply);

    function checkReply(e, app) {
        if (util.isEncrypted(e)) {
            // Mailvelope doesn't return decyrpted text for replies.  So, need to just blank out
            app.view.editor.setContent('');
            app.view.toggleEncryption.setEncryption();  // Set as encrypted
        }
    }

});
