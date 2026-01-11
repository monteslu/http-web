const assert = require('assert');
const httpWeb = require('../http-web.js');

describe('parseQuery', function() {
  it('should parse simple query string', function() {
    const result = httpWeb.parseQuery('/path?foo=bar');
    assert.deepStrictEqual(result, { foo: 'bar' });
  });

  it('should parse multiple parameters', function() {
    const result = httpWeb.parseQuery('/path?foo=bar&baz=qux');
    assert.deepStrictEqual(result, { foo: 'bar', baz: 'qux' });
  });

  it('should return empty object for no query string', function() {
    const result = httpWeb.parseQuery('/path');
    assert.deepStrictEqual(result, {});
  });

  it('should handle URL encoded values', function() {
    const result = httpWeb.parseQuery('/path?name=hello%20world&emoji=%F0%9F%98%80');
    assert.deepStrictEqual(result, { name: 'hello world', emoji: '😀' });
  });

  it('should handle empty values', function() {
    const result = httpWeb.parseQuery('/path?empty=&foo=bar');
    assert.deepStrictEqual(result, { empty: '', foo: 'bar' });
  });

  it('should handle just question mark', function() {
    const result = httpWeb.parseQuery('/path?');
    assert.deepStrictEqual(result, {});
  });
});

describe('getPath', function() {
  it('should return path without query string', function() {
    const result = httpWeb.getPath('/users/123?foo=bar');
    assert.strictEqual(result, '/users/123');
  });

  it('should return path unchanged if no query string', function() {
    const result = httpWeb.getPath('/users/123');
    assert.strictEqual(result, '/users/123');
  });

  it('should handle root path', function() {
    const result = httpWeb.getPath('/?foo=bar');
    assert.strictEqual(result, '/');
  });

  it('should handle empty path with query', function() {
    const result = httpWeb.getPath('?foo=bar');
    assert.strictEqual(result, '');
  });

  it('should handle complex paths', function() {
    const result = httpWeb.getPath('/api/v1/users/123/posts?page=1&limit=10');
    assert.strictEqual(result, '/api/v1/users/123/posts');
  });
});
