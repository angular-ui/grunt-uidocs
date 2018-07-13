/*global module:false*/
module.exports = function (grunt) {
  grunt.loadTasks('./tasks/');
  grunt.loadNpmTasks('grunt-conventional-changelog');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-jasmine-node');

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    changelog: { options: { dest: 'CHANGELOG.md' } },
    connect: {
      options: {
        base: 'docs',
        keepalive: true
      },
      server: {}
    },
    clean: ['.tmp', 'docs'],
    jasmine_node: {
      options: {
        forceExit: true,
        match: '.',
        matchall: false,
        extensions: 'js',
        specNameMatcher: 'spec'
      },
      all: ['spec/']
    },
    ngdocs: {
      options: {
        versionedFiles: {
          default: 'stable',
          versions: {
            stable: []
          }
        },
        scripts: ['angular.js'],
        html5Mode: false
      },
      all: ['mock-app/*.js']
    },
    watch: {
      parser: {
        files: ['src/*.js', 'spec/*Spec.js'],
        tasks: ['jasmine_node']
      }
    }
  });

  grunt.registerTask('test', 'Run tests for parser code', ['jasmine_node']);
};
