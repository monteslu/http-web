const assert = require('assert');
const { matchPath } = require('../http-web.js');

describe('matchPath', function() {

  describe('exact matches', function() {
    it('should match exact paths', function() {
      const result = matchPath('/users', '/users');
      assert.deepStrictEqual(result, { params: {}, rest: null });
    });

    it('should match root path', function() {
      const result = matchPath('/', '/');
      assert.deepStrictEqual(result, { params: {}, rest: null });
    });

    it('should return null for non-matching paths', function() {
      const result = matchPath('/users', '/posts');
      assert.strictEqual(result, null);
    });

    it('should be case-sensitive', function() {
      const result = matchPath('/Users', '/users');
      assert.strictEqual(result, null);
    });
  });

  describe('path parameters', function() {
    it('should capture single parameter', function() {
      const result = matchPath('/users/{id}', '/users/123');
      assert.deepStrictEqual(result, { params: { id: '123' }, rest: null });
    });

    it('should capture multiple parameters', function() {
      const result = matchPath('/users/{userId}/posts/{postId}', '/users/123/posts/456');
      assert.deepStrictEqual(result, { params: { userId: '123', postId: '456' }, rest: null });
    });

    it('should decode URI components', function() {
      const result = matchPath('/search/{query}', '/search/hello%20world');
      assert.deepStrictEqual(result, { params: { query: 'hello world' }, rest: null });
    });

    it('should return null if parameter segment missing', function() {
      const result = matchPath('/users/{id}/posts', '/users/123');
      assert.strictEqual(result, null);
    });
  });

  describe('wildcard', function() {
    it('should capture rest of path', function() {
      const result = matchPath('/api/*', '/api/v1/users/list');
      assert.deepStrictEqual(result, { params: {}, rest: '/v1/users/list' });
    });

    it('should work with parameters before wildcard', function() {
      const result = matchPath('/api/{version}/*', '/api/v1/users/list');
      assert.deepStrictEqual(result, { params: { version: 'v1' }, rest: '/users/list' });
    });

    it('should capture empty rest', function() {
      const result = matchPath('/api/*', '/api/');
      assert.deepStrictEqual(result, { params: {}, rest: '/' });
    });
  });

  describe('query strings', function() {
    it('should ignore query string when matching', function() {
      const result = matchPath('/users/{id}', '/users/123?tab=profile');
      assert.deepStrictEqual(result, { params: { id: '123' }, rest: null });
    });

    it('should match path with query on exact routes', function() {
      const result = matchPath('/search', '/search?q=test');
      assert.deepStrictEqual(result, { params: {}, rest: null });
    });
  });

  describe('edge cases', function() {
    it('should handle trailing slashes in pattern', function() {
      const result = matchPath('/users/', '/users');
      assert.deepStrictEqual(result, { params: {}, rest: null });
    });

    it('should return null when path has extra segments', function() {
      const result = matchPath('/users', '/users/123');
      assert.strictEqual(result, null);
    });

    it('should handle empty path segments', function() {
      const result = matchPath('/users/{id}', '/users/');
      assert.strictEqual(result, null);
    });
  });
});
