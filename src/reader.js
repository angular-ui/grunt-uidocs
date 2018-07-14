/**
 * All reading related code here.
 */

exports.docs = [];
exports.process = process;

var uidoc = require('./uidoc.js'),
    NEW_LINE = /\n\r?/;

function process(content, file, section, options) {
  if (file.match(/\.uidoc$/)) {
    var header = '@section ' + section + '\n';
    exports.docs.push(new uidoc.Doc(header + content.toString(),file, 1, 1, options).parse());
  } else {
    processJsFile(content, file, section, options).forEach(function(doc) {
      exports.docs.push(doc);
    });
  }
}

function processJsFile(content, file, section, options) {
  var docs = [];
  var lines = content.toString().split(NEW_LINE);
  var text;
  var startingLine ;
  var match;
  var inDoc = false;

  lines.forEach(function(line, lineNumber){
    try {
      lineNumber++;
      // is the comment starting?
      if (!inDoc && (match = line.match(/^\s*\/\*\*\s*(.*)$/))) {
        line = match[1];
        inDoc = true;
        text = [];
        startingLine = lineNumber;
      }
      // are we done?
      if (inDoc && line.match(/\*\//)) {
        text = text.join('\n');
        text = text.replace(/^\n/, '');
        if (text.match(/@uidoc/)) {
          //console.log(file, startingLine)
          docs.push(new uidoc.Doc('@section ' + section + '\n' + text, file, startingLine, lineNumber, options).parse());
        }
        doc = null;
        inDoc = false;
      }
      // is the comment add text
      if (inDoc) {
        text.push(line.replace(/^\s*\*\s?/, ''));
      }
    }catch(e){
      throw new Error('error parsing [' + file + '] line ' + lineNumber + '\n' + e);
    }
  });
  return docs;
}
