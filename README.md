# http-web

[![npm version](https://img.shields.io/npm/v/http-web.svg)](https://www.npmjs.com/package/http-web)
[![CI](https://github.com/monteslu/http-web/actions/workflows/ci.yml/badge.svg)](https://github.com/monteslu/http-web/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/http-web.svg)](https://github.com/monteslu/http-web/blob/main/LICENSE)

A browser-compatible HTTP server built on top of [net-web](https://github.com/monteslu/net-web). Designed to work with [hsync](https://github.com/monteslu/hsync) for exposing browser-based servers to the internet via WebRTC.

## Installation

```bash
npm install http-web
```

## Usage

### Basic Server

```javascript
const http = require('http-web');

const server = http.createServer((req, res) => {
  console.log(req.method, req.url);
  console.log(req.body); // Parsed body (JSON object, string, or Uint8Array)

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello World');
});

server.listen(3000);
```

### Route Matching

```javascript
const http = require('http-web');

// Match path with parameters
const match = http.matchPath('/users/{id}/posts/{postId}', '/users/123/posts/456');
// Returns: { params: { id: '123', postId: '456' }, rest: null }

// Wildcard matching
const match2 = http.matchPath('/api/*', '/api/v1/users/list');
// Returns: { params: {}, rest: '/v1/users/list' }

// No match returns null
const match3 = http.matchPath('/users/{id}', '/posts/123');
// Returns: null
```

### Manual Body Parsing

```javascript
const http = require('http-web');

const { body, parseError } = http.parseBody(rawBody, 'application/json');

if (parseError) {
  // JSON parsing failed
  console.error(parseError.message);
} else {
  console.log(body); // Parsed JSON object
}
```

## API

### `createServer(callback)`

Creates an HTTP server. The callback receives `(req, res)` for each request.

**Request object (`req`):**
- `method` - HTTP method (GET, POST, etc.)
- `url` - Full URL path with query string
- `path` - URL path without query string
- `headers` - Object of request headers
- `body` - Parsed body based on Content-Type:
  - `application/json` - Parsed JSON object (or string if parse failed)
  - `text/*` - String
  - Other - Uint8Array
- `parseError` - Error object if JSON parsing failed, null otherwise
- `httpVersion` - HTTP version string

**Response object (`res`):**
- `writeHead(statusCode, headers)` - Set status code and headers
- `end(body)` - Send response body and close connection

### `matchPath(pattern, path)`

Match a URL path against a pattern with parameters.

**Pattern syntax:**
- `{name}` - Captures a path segment as a named parameter
- `*` - Wildcard, captures rest of path

**Returns:** `{ params: {}, rest: null }` on match, `null` on no match.

### `parseBody(rawBody, contentType)`

Parse a request body based on Content-Type.

**Returns:** `{ body, parseError }`

### `isTextContent(contentType)`

Check if a Content-Type should be treated as text.

**Returns:** `boolean`

## Features

- HTTP/1.1 request parsing
- Content-Length body handling
- Transfer-Encoding: chunked support
- Automatic body parsing by Content-Type
- JSON validation (sets parseError on invalid JSON)
- Route pattern matching with path parameters
- Wildcard route matching

## How It Works

http-web uses net-web to create virtual sockets in the browser. When paired with hsync, incoming HTTP requests over WebRTC are piped into the virtual socket, parsed as HTTP, and delivered to your request handler. Responses flow back out through the same path.

```
Internet -> hsync (WebRTC) -> net-web (virtual socket) -> http-web (HTTP parsing) -> Your handler
```

## License

ISC
