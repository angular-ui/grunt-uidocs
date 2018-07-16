describe('url rewriting', () => {
  var rUrl = /(\/?#!\/.*|\/(api|anothersection)\/?(\?.*)*|\/index[^\.]*\.html.*)$/;

  it('should rewrite a destination \'index.html\'', () => {
    expect(
      'protocol://some/path/index.html'
        .replace(rUrl, '__replacement__')
    ).toEqual(
      'protocol://some/path__replacement__'
    );
  });

  it('should rewrite a destination containing the word \'index[*].html\' in the file name', () => {
    expect(
      'protocol://some/path/index-toberemoved.html'
        .replace(rUrl, '__replacement__')
    ).toEqual(
      'protocol://some/path__replacement__'
    );
  });

  it('should rewrite a destination containing the word \'index[*].html\' in the file name event if a query string is provided', () => {
    expect(
      'protocol://some/path/index-toberemoved.html?p1=v1&p2=v2'
        .replace(rUrl, '__replacement__')
    ).toEqual(
      'protocol://some/path__replacement__'
    );
  });


  it('should rewrite a destination ending on a path named \'api\'', () => {
    expect(
      'protocol://some/path/api'
        .replace(rUrl, '__replacement__')
    ).toEqual(
      'protocol://some/path__replacement__'
    );
  });

  it('should rewrite a destination ending on a path named \'api\' with a trailing slash', () => {
    expect(
      'protocol://some/path/api/'
        .replace(rUrl, '__replacement__')
    ).toEqual(
      'protocol://some/path__replacement__'
    );
  });

  it('should rewrite a destination ending on a path named with alternative section', () => {
    expect(
      'protocol://some/path/anothersection/'
        .replace(rUrl, '__replacement__')
    ).toEqual(
      'protocol://some/path__replacement__'
    );
  });

  it('should rewrite a destination ending on a path named \'api\' even if the url has a query string provided', () => {
    expect(
      'protocol://some/path/api?p1=v1&p2=v2'
        .replace(rUrl, '__replacement__')
    ).toEqual(
      'protocol://some/path__replacement__'
    );
  });

  it('should NOT rewrite a destination only because contain the word \'api\'', () => {
    expect(
      'protocol://some/path/path-containing-word-api?p1=v1&p2=v2'
        .replace(rUrl, '__replacement__')
    ).toEqual(
      'protocol://some/path/path-containing-word-api?p1=v1&p2=v2'
    );
  });

  it('should NOT rewrite a destination only because starts with the word \'api\'', () => {
    expect(
      'protocol://some/path/api-path-containing?p1=v1&p2=v2'
        .replace(rUrl, '__replacement__')
    ).toEqual(
      'protocol://some/path/api-path-containing?p1=v1&p2=v2'
    );
  });

  it('should rewrite a destination pointing to the root fragment if the path does not end with a trailing slash', () => {
    expect(
      'protocol://some/path#!/'
        .replace(rUrl, '__replacement__')
    ).toEqual(
      'protocol://some/path__replacement__'
    );
  });

  it('should rewrite a destination pointing to the root fragment if the path ends with a trailing slash', () => {
    expect(
      'protocol://some/path/#!/'
        .replace(rUrl, '__replacement__')
    ).toEqual(
      'protocol://some/path__replacement__'
    );
  });
});
