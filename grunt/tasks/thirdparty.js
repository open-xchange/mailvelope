module.exports = function (grunt) {

    grunt.config.merge({ concat: {
        thirdparty: {
            options: {
                banner: 'var root = {};\ndefine("static/3rd.party/mailvelopemailbuild.js", function () {\n\n' +
                        '"use strict";\n\n' +
                        'var define = undefined;\n' +
                        'var exports = undefined;\n' +
                        'var global = undefined;\n' +
                        '//this is bound to the "root" variable from above\n' +
                        'this.TextEncoder = window.TextEncoder;\n' +
                        'this.TextDecoder = window.TextDecoder;\n' +
                        'this.btoa = window.btoa;\n',
                footer: 'return this;\n}.bind(root));',
                process: function (src, file) {
                    //FIXME: remove this function, once mailbuild@>0.3.6 is released (see https://github.com/whiteout-io/mailbuild/pull/15)
                    //HACK: HACK HACK HACK
                    if (file !== 'node_modules/mailbuild/src/mailbuild.js') return src;

                    return src.replace(/root.mailbuild = factory\(mimefuncs, mimetypes, punycode, addressparser\);/,
                        'root.mailbuild = factory(root.mimefuncs, root.mimetypes, root.punycode, root.addressparser);')
                              .replace(/return mimefuncs.mimeWordEncode\(name, 'Q', 52\);/,
                                  'return mimefuncs.mimeWordEncode(name, "B", 52);');
                }
            },
            files: [{
                src: [
                    'node_modules/mimefuncs/src/mimefuncs.js',
                    'node_modules/mimetypes/src/mimetypes.js',
                    'node_modules/punycode/punycode.js',
                    'node_modules/wo-addressparser/src/addressparser.js',
                    'node_modules/mailbuild/src/mailbuild.js'
                ],
                dest: 'build/static/3rd.party/mailvelopemailbuild.js'
            }]
        }
    } });
};
