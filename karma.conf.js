// Karma configuration
// Generated on Sat May 30 2015 22:19:10 GMT-0400 (EDT)

module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['mocha'],
    files: [
      'bower_components/ramda/dist/ramda.js',
      'node_modules/chai/chai.js',
      '*.js'
    ],

    exclude: [],
    preprocessors: {},
    reporters: ['progress'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['PhantomJS'],
    singleRun: false
  });
};
