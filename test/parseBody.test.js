const assert = require('assert');
const { parseBody, isTextContent } = require('../http-web.js');

describe('parseBody', function() {

  describe('application/json', function() {
    it('should parse valid JSON', function() {
      const { body, parseError } = parseBody('{"name":"test","value":123}', 'application/json');
      assert.strictEqual(parseError, null);
      assert.deepStrictEqual(body, { name: 'test', value: 123 });
    });

    it('should return parseError for invalid JSON', function() {
      const { body, parseError } = parseBody('{invalid json}', 'application/json');
      assert.notStrictEqual(parseError, null);
      assert.strictEqual(body, '{invalid json}');
    });

    it('should handle empty body', function() {
      const { body, parseError } = parseBody('', 'application/json');
      assert.strictEqual(parseError, null);
      assert.strictEqual(body, null);
    });

    it('should handle JSON with charset', function() {
      const { body, parseError } = parseBody('{"test":true}', 'application/json; charset=utf-8');
      assert.strictEqual(parseError, null);
      assert.deepStrictEqual(body, { test: true });
    });
  });

  describe('text types', function() {
    it('should return string for text/plain', function() {
      const { body, parseError } = parseBody('hello world', 'text/plain');
      assert.strictEqual(parseError, null);
      assert.strictEqual(body, 'hello world');
    });

    it('should return string for text/html', function() {
      const { body, parseError } = parseBody('<h1>Hello</h1>', 'text/html');
      assert.strictEqual(parseError, null);
      assert.strictEqual(body, '<h1>Hello</h1>');
    });

    it('should return string for application/xml', function() {
      const { body, parseError } = parseBody('<root/>', 'application/xml');
      assert.strictEqual(parseError, null);
      assert.strictEqual(body, '<root/>');
    });

    it('should default to text for no content-type', function() {
      const { body, parseError } = parseBody('some data', '');
      assert.strictEqual(parseError, null);
      assert.strictEqual(body, 'some data');
    });
  });

  describe('binary types', function() {
    it('should return Uint8Array for application/octet-stream', function() {
      const { body, parseError } = parseBody('binary', 'application/octet-stream');
      assert.strictEqual(parseError, null);
      assert(body instanceof Uint8Array);
    });

    it('should return Uint8Array for image/png', function() {
      const { body, parseError } = parseBody('imagedata', 'image/png');
      assert.strictEqual(parseError, null);
      assert(body instanceof Uint8Array);
    });
  });
});

describe('isTextContent', function() {
  it('should return true for text/*', function() {
    assert.strictEqual(isTextContent('text/plain'), true);
    assert.strictEqual(isTextContent('text/html'), true);
    assert.strictEqual(isTextContent('text/css'), true);
  });

  it('should return true for application/json', function() {
    assert.strictEqual(isTextContent('application/json'), true);
  });

  it('should return true for application/xml', function() {
    assert.strictEqual(isTextContent('application/xml'), true);
  });

  it('should return false for binary types', function() {
    assert.strictEqual(isTextContent('application/octet-stream'), false);
    assert.strictEqual(isTextContent('image/png'), false);
    assert.strictEqual(isTextContent('audio/mp3'), false);
  });

  it('should return true for empty/undefined', function() {
    assert.strictEqual(isTextContent(''), true);
    assert.strictEqual(isTextContent(null), true);
    assert.strictEqual(isTextContent(undefined), true);
  });
});
