/**
 * All reading related code here.
 */

exports.docs = [];
exports.process = process;

const uidoc = require('./uidoc.js');
const NEW_LINE = /\n\r?/;

function process(content, file, section, options) {
  if (file.match(/\.uidoc$|\.ngdoc$/)) {
    const header = '@section ' + section + '\n';
    const fileContent = content.toString().replace(/@ngdoc/g, '@uidoc');
    exports.docs.push(new uidoc.Doc(header + fileContent, file, 1, 1, options).parse());
  } else {
    processJsFile(content, file, section, options).forEach((doc) => {
      exports.docs.push(doc);
    });
  }
}

function processJsFile(content, file, section, options) {
  const docs = [];
  const lines = content.toString().split(NEW_LINE);

  let text, startingLine, match,
      inDoc = false;

  lines.forEach((line, lineNumber) => {
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
        text = text.replace(/^\n/, '').replace(/@ngdoc/g, '@uidoc');
        if (text.match(/@uidoc/)) {
          docs.push(new uidoc.Doc('@section ' + section + '\n' + text, file, startingLine, lineNumber, options).parse());
        }
        doc = null;
        inDoc = false;
      }
      // is the comment add text
      if (inDoc) {
        text.push(line.replace(/^\s*\*\s?/, ''));
      }
    } catch(e){
      throw new Error('error parsing [' + file + '] line ' + lineNumber + '\n' + e);
    }
  });
  return docs;
}
