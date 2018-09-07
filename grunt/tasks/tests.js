
module.exports = function (grunt) {
    grunt.config.set('karma.continuous.reporters', ['spec']);
    grunt.config.set('karma.continuous.browsers', (process.env.BROWSERS || 'ChromeHeadless').split(' '));
};
