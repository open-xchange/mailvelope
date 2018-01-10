module.exports = function (grunt) {

    var template_vars = {
        pkg: grunt.config('pkg')
    };

    grunt.config.merge({
        copy: {
            build_templates: {
                options: {
                    process: function (content) {
                        return grunt.template.process(content, { data: template_vars });
                    }
                },
                files: [{
                    src: ['**/*.ejs'],
                    expand: true,
                    ext: '.js',
                    cwd: 'src/',
                    dest: 'build/apps/mailvelope/'
                }]
            }
        }
    });
};
