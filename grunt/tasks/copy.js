module.exports = function (grunt) {
    'use strict';

    grunt.config.merge({ copy: {
        build_thirdparty: {
            files: [
                {
                    expand: true,
                    src: ['**/*'],
                    cwd: 'lib/',
                    dest: 'build/apps/',
                    filter: 'isFile'
                }
            ]
        }
    } });
};
