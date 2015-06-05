// Karma configuration
// Generated on Sat May 30 2015 22:19:10 GMT-0400 (EDT)

module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['mocha', 'chai', 'sinon'],
    files: [
      'bower_components/ramda/dist/ramda.js',
      'node_modules/chai/chai.js',
      'node_modules/sinon/pkg/sinon.js',
      '*.js'
    ],

    exclude: [],
    preprocessors: {},
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    singleRun: true,

    browsers: ['PhantomJS'],
    reporters: ['progress', 'coverage','threshold'],
    preprocessors: {
      '!(*.test).js': 'coverage'
    },
    coverageReporter: {
      reporters: [{
        type: 'json'
      }, {
        type: 'html'
      }, {
        type: 'text-summary'
      }],
      dir: 'coverage'
    },
    thresholdReporter: {
      statements: 85,
      branches: 60,
      functions: 80,
      lines: 85
    }
  });
};
