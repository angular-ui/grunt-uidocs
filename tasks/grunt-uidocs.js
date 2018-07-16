/*
 * grunt-uidocs
 * https://github.com/angular-ui/grunt-uidocs
 *
 * Copyright (c) 2013-2018 m7r and Marcelo Sauerbrunn Portugal
 * Licensed under the MIT license.
 */

const reader = require('../src/reader.js');
const uidoc = require('../src/uidoc.js');
const template = require('lodash/template');
const flatten = require('lodash/flatten');
const map = require('lodash/map');
const union = require('lodash/union');
const path = require('path');
const upath = require('upath');
const vm = require('vm');

const repohosts = [
  { re: /https?:\/\/github.com\/([^\/]+\/[^\/]+)|git@github.com:(.*)/,
    reSuffix: /\.git.*$/,
    sourceLink: 'https://github.com/{{repo}}/blob/{{sha}}/{{file}}#L{{codeline}}',
    editLink: 'https://github.com/{{repo}}/edit/master/{{file}}'
  }
];

module.exports = (grunt) => {
  const unittest = {};
  const templates = path.resolve(__dirname, '../src/templates');

  grunt.registerMultiTask('uidocs', 'build documentation', function() {
    var start = now(),
        pkg = getPackage(),
        done = this.async(),
        options = this.options({
          dest: 'docs/',
          testingUrlPrefix: '/index.html#!',
          scenarioDest: '.tmp/doc-scenarios/',
          startPage: '/api',
          thirdpartyPath: 'node_modules',
          scripts: [
            'angular',
            'angular-animate',
            'marked'
          ],
          httpScripts: [],
          hiddenScripts: [],
          versionedFiles: {},
          baseCSSPath: 'bootstrap',
          styles: [],
          title: pkg.title || pkg.name || '',
          html5Mode: false,
          editExample: true,
          sourceLink: true,
          editLink: true,
          inlinePartials: false
        }),
        section = this.target === 'all' ? 'api' : this.target,
        setup;

    // Copy the scripts into their own folder in docs, unless they are remote or default angular.js
    const linked = /^((https?:)?\/\/|\.\.\/)/;
    const gruntScriptsFolder = 'grunt-scripts';
    const gruntStylesFolder = 'grunt-styles';

    function loadThirdpartyModule(file, filename) {
      const minFileName = `${filename}.min.js`;

      grunt.file.copy(
        `${options.thirdpartyPath}/${file}/${file}.min.js`,
        path.join(options.dest, 'js', minFileName)
      );

      return `js/${minFileName}`;
    }

    function copyAndReturnFile(file) {
      let filename = file.split('/').pop();

      // assume strings without a .js extension are thirdparty modules
      if (!file.includes('.js')) {
        return loadThirdpartyModule(file, filename);
      }

      if (linked.test(file)) {
        return file;
      }

      // Use path.join here because we aren't sure if options.dest has / or not
      grunt.file.copy(file, path.join(options.dest, gruntScriptsFolder, filename));

      // Return the script path: doesn't have options.dest in it, it's relative
      // to the docs folder itself
      return gruntScriptsFolder + '/' + filename;
    }

  	// If the options.script is an array of arrays ( useful when working with variables, for example: ['<%= vendor_files %>','<%= app_files %>'] )
  	// convert to a single array ( https://lodash.com/docs/4.17.4#flatten )
  	options.scripts = flatten(options.scripts).map(copyAndReturnFile);

    options.hiddenScripts = map(options.hiddenScripts, copyAndReturnFile);

    map(options.httpScripts, (src) => {
      options.scripts.push(src);
    });

    if (options.image && !linked.test(options.image)) {
      grunt.file.copy(options.image, path.join(options.dest, gruntStylesFolder, options.image));
      options.image = gruntStylesFolder + '/' + options.image;
    }

    if (options.baseCSSPath === 'bootstrap') {
      grunt.file.copy(
        `${options.thirdpartyPath}/bootstrap/dist/css/bootstrap.min.css`,
        path.join(options.dest, 'css', 'bootstrap.min.css')
      );

      options.baseCSSPath = 'css/bootstrap.min.css';
    }

    options.styles = options.styles.map(function(file) {
      if (linked.test(file)) {
        return file;
      }
      var filename = file.split('/').pop();
      grunt.file.copy(file, path.join(options.dest, 'css', filename));
      return 'css/' + filename;
    });

    setup = prepareSetup(section, options);

    grunt.log.writeln('Generating Documentation...');

    prepareLinks(pkg, options);

    reader.docs = [];
    this.files.forEach(function(f) {
      options.isAPI = f.api || section == 'api';
      setup.sections[section] = f.title || 'API Documentation';
      setup.apis[section] = options.isAPI;
      f.src.filter(exists).forEach(function(filepath) {
        var content = grunt.file.read(filepath);
        reader.process(content, filepath, section, options);
      });
    });

    uidoc.merge(reader.docs);

    grunt.file.write(path.join(options.scenarioDest, 'doc-' + section + '.spec.js'), uidoc.scenarios(reader.docs, options.testingUrlPrefix));

    reader.docs.forEach(function(doc){
      // this hack is here because on OSX angular.module and angular.Module map to the same file.
      var id = doc.id.replace('angular.Module', 'angular.IModule').replace(':', '.'),
          file = path.resolve(options.dest, 'partials', doc.section, id + '.html');
      grunt.file.write(file, doc.html());
    });

    uidoc.checkBrokenLinks(reader.docs, setup.apis, options);

    setup.pages = union(setup.pages, uidoc.metadata(reader.docs));

    if (options.navTemplate) {
      options.navContent = grunt.file.read(options.navTemplate);
    } else {
      options.navContent = '';
    }

    writeSetup(setup);

    if (options.inlinePartials) {
      inlinePartials(path.resolve(options.dest, 'index.html'), path.resolve(options.dest, 'partials'));
    }

    grunt.log.writeln('DONE. Generated ' + reader.docs.length + ' pages in ' + (now()-start) + 'ms.');
    done();
  });

  function getPackage() {
    var pkg = grunt.config('pkg');
    try {
      pkg = grunt.file.readJSON('package.json');
    } catch (e) {}
    return pkg || {};
  }

  function makeLinkFn(tmpl, values) {
      if (!tmpl || tmpl === true) { return false; }
      if (/\{\{\s*(sha|rev)\s*\}\}/.test(tmpl)) {
        var shell = require('shelljs');
        var sha = shell.exec('git rev-parse HEAD', { silent: true });
        values.rev = sha.output ? '' + sha.output : 'master';
        values.sha = values.rev.slice(0, 7);
      }
      tmpl = template(tmpl, {'interpolate': /\{\{(.+?)\}\}/g});
      return function(file, line, codeline) {
        values.file = file;
        values.line = line;
        values.codeline = codeline;
        values.filepath = path.dirname(file);
        values.filename = path.basename(file);
        return tmpl(values);
      };
    }

  function prepareLinks(pkg, options) {
    var values = {version: pkg.version || 'master'};
    var url = (pkg.repository || {}).url;

    if (url && options.sourceLink === true || options.sourceEdit === true) {
      repohosts.some(function(host) {
        var match = url.match(host.re);
        if (match) {
          values.repo = match[1] || match[2];
          if (host.reSuffix) {
            values.repo = values.repo.replace(host.reSuffix, '');
          }
          if (host.sourceLink && options.sourceLink === true) {
            options.sourceLink = host.sourceLink;
          }
          if (host.editLink && options.editLink === true) {
            options.editLink = host.editLink;
          }
        }
        return match;
      });
    }
    options.sourceLink = makeLinkFn(options.sourceLink, values);
    options.editLink = makeLinkFn(options.editLink, values);
  }

  unittest.prepareLinks = prepareLinks;

  function prepareSetup(section, options) {
    var setup, data, context = {},
        file = path.resolve(options.dest, 'js/docs-setup.js');
    if (exists(file)) {
      // read setup from file
      data = grunt.file.read(file);
      vm.runInNewContext(data, context, file);
      setup = context.UI_DOCS;
      // keep only pages from other build tasks
      setup.pages = setup.pages.filter(function(p) {return p.section !== section;});
    } else {
      // build clean dest
      setup = {sections: {}, pages: [], apis: {}};
      copyTemplates(options.dest);
    }
    setup.__file = file;
    setup.__options = options;
    return setup;
  }

  function writeSetup(setup) {
    var options = setup.__options,
        content, data = {
          scripts: options.scripts,
          hiddenScripts: options.hiddenScripts,
          adsConfig: options.adsConfig,
          versionedFiles: options.versionedFiles,
          baseCSSPath: options.baseCSSPath,
          styles: options.styles,
          sections: Object.keys(setup.sections).join('|'),
          discussions: options.discussions,
          analytics: options.analytics,
          navContent: options.navContent,
          title: options.title,
          image: options.image,
          titleLink: options.titleLink,
          imageLink: options.imageLink,
          bestMatch: options.bestMatch,
          deferLoad: !!options.deferLoad
        },
        template = options.template ? options.template : path.resolve(templates, 'index.tmpl');

    // create index.html
    content = grunt.file.read(template);
    content = grunt.template.process(content, {data});
    grunt.file.write(path.resolve(options.dest, 'index.html'), content);

    // create setup file
    setup.html5Mode = options.html5Mode;
    setup.editExample = options.editExample;
    setup.startPage = options.startPage;
    setup.discussions = options.discussions;
    setup.scripts = options.scripts.map(function(url) { return path.basename(url); });
    grunt.file.write(setup.__file, 'UI_DOCS=' + JSON.stringify(setup, replacer, 2) + '; '
      + 'ADS_CONFIG=' + JSON.stringify(options.adsConfig, replacer, 2) + '; '
      + 'VERSIONED_FILES=' + JSON.stringify(options.versionedFiles, replacer, 2) + '; ');
  }


  function copyTemplates(dest) {
    grunt.file.expandMapping(['**/*', '!**/*.tmpl'], dest, {cwd: templates}).forEach(function(f) {
      var src = f.src[0],
          dest = f.dest;
      if (grunt.file.isDir(src)) {
          grunt.file.mkdir(dest);
        } else {
          grunt.file.copy(src, dest);
        }
    });
  }

  function inlinePartials(indexFile, partialsFolder) {
    var indexFolder = path.dirname(indexFile);
    var partials = grunt.file.expand(partialsFolder + '/**/*.html').map(function(partial){
      return path.relative(indexFolder, partial);
    });
    var html = partials.map(function(partial){
      // Get the partial content and replace the closing script tags with a placeholder
      var partialContent = grunt.file.read(path.join(indexFolder, partial))
        .replace(/<\/script>/g, '<___/script___>');
      return '<script type="text/ng-template" id="' + upath.normalize(partial) + '">' + partialContent + '<' + '/script>';
    }).join('');
    // During page initialization replace the placeholder back to the closing script tag
    // @see https://github.com/angular/angular.js/issues/2820
    html += '<script>(' + (function() {
      var scripts = document.getElementsByTagName("script");
      for (var i=0;i<scripts.length;i++) {
        if (scripts[i].type==='text/ng-template') {
          scripts[i].innerHTML = scripts[i].innerHTML.replace(/<___\/script___>/g, '</' + 'script>');
        }
      }
    }) + '())</script>';
    // Inject the html into the uidoc file
    var patchedIndex = grunt.file.read(indexFile).replace(/<body[^>]*>/i, function(match) {
      return match + html;
    });
    grunt.file.write(indexFile, patchedIndex);
    // Remove the partials
    partials.forEach(function(partial) {
      grunt.file.delete(path.join(indexFolder, partial));
    });
  }

  function exists(filepath) {
    return !!grunt.file.exists(filepath);
  }

  function replacer(key, value) {
    if (key.substr(0,2) === '__') {
      return undefined;
    }
    return value;
  }

  function now() { return new Date().getTime(); }

  return unittest;
};
