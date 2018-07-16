const domJS = require('../tasks/lib/dom.js');
const DOM = domJS.DOM;
const normalizeHeaderToId = domJS.normalizeHeaderToId;

describe('dom', () => {
  let dom;

  beforeEach(() => {
    dom = new DOM();
  });

  describe('html', () => {
    it('should add ids to all h tags', () => {
      dom.html('<h1>Some Header</h1>');
      expect(dom.toString()).toContain('<h1 id="some-header">Some Header</h1>');
    });

    it('should collect <a name> anchors too', () => {
      dom.html('<h2>Xxx <a name="foo"></a> and bar <a name="bar"></a>');
      expect(dom.anchors).toContain('foo');
      expect(dom.anchors).toContain('bar');
    })
  });

  it('should collect h tag ids', () => {
    dom.h('Page Title', () => {
      dom.html('<h1>Second</h1>xxx <h2>Third</h2>');
      dom.h('Another Header', () => {});
    });

    expect(dom.anchors).toContain('page-title');
    expect(dom.anchors).toContain('second');
    expect(dom.anchors).toContain('second_third');
    expect(dom.anchors).toContain('another-header');
  });

  describe('h', () => {
    it('should render using function', () => {
      var cbThis;
      var cdValue;
      dom.h('heading', 'content', function(value) {
        cbThis = this;
        cbValue = value;
      });
      expect(cbThis).toEqual(dom);
      expect(cbValue).toEqual('content');
    });

    it('should update heading numbers', () => {
      dom.h('heading', function() {
        this.html('<h1>sub-heading</h1>');
      });
      expect(dom.toString()).toContain('<h1 id="heading">heading</h1>');
      expect(dom.toString()).toContain('<h2 id="sub-heading">sub-heading</h2>');
    });

    it('should properly number nested headings', () => {
      dom.h('heading', () => {
        dom.h('heading2', function() {
          dom.html('<h1>heading3</h1>');
        });
      });
      dom.h('other1', function() {
        this.html('<h1>other2</h1>');
      });

      expect(dom.toString()).toContain('<h1 id="heading">heading</h1>');
      expect(dom.toString()).toContain('<h2 id="heading2">heading2</h2>');
      expect(dom.toString()).toContain('<h3 id="heading2_heading3">heading3</h3>');

      expect(dom.toString()).toContain('<h1 id="other1">other1</h1>');
      expect(dom.toString()).toContain('<h2 id="other2">other2</h2>');
    });


    it('should add nested ids to all h tags', () => {
      dom.h('Page Title', () => {
        dom.h('Second', () => {
          dom.html('some <h1>Third</h1>');
        });
      });

      var resultingHtml = dom.toString();
      expect(resultingHtml).toContain('<h1 id="page-title">Page Title</h1>');
      expect(resultingHtml).toContain('<h2 id="second">Second</h2>');
      expect(resultingHtml).toContain('<h3 id="second_third">Third</h3>');
    });
  });


  describe('normalizeHeaderToId', () => {
    it('should ignore content in the parenthesis', () => {
      expect(normalizeHeaderToId('One (more)')).toBe('one');
    });

    it('should ignore html content', () => {
      expect(normalizeHeaderToId('Section <a name="section"></a>')).toBe('section');
    });

    it('should ignore special characters', () => {
      expect(normalizeHeaderToId('Section \'!?')).toBe('section');
    });

    it('should ignore html entities', () => {
      expect(normalizeHeaderToId('angular&#39;s-jqlite')).toBe('angulars-jqlite');
    });
  });
});
