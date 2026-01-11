const net = require('net-web');
const EventEmitter = require('events').EventEmitter;
const pack = require('./package.json');

const r = '\r\n';

/**
 * Check if content-type is text-based
 */
function isTextContent(contentType) {
  if (!contentType) return true; // default to text
  const ct = contentType.toLowerCase();
  return ct.startsWith('text/') ||
    ct.includes('application/json') ||
    ct.includes('application/xml') ||
    ct.includes('application/javascript') ||
    ct.includes('application/x-www-form-urlencoded');
}

/**
 * Parse request body based on Content-Type
 * Returns { body, parseError }
 */
function parseBody(rawBody, contentType) {
  const ct = (contentType || '').toLowerCase();

  // JSON - parse and validate
  if (ct.includes('application/json')) {
    if (!rawBody || rawBody.length === 0) {
      return { body: null, parseError: null };
    }
    const str = typeof rawBody === 'string' ? rawBody : new TextDecoder().decode(rawBody);
    try {
      return { body: JSON.parse(str), parseError: null };
    } catch (e) {
      return { body: str, parseError: e };
    }
  }

  // Text types - return as string
  if (isTextContent(ct)) {
    const str = typeof rawBody === 'string' ? rawBody : new TextDecoder().decode(rawBody);
    return { body: str, parseError: null };
  }

  // Binary - return as Uint8Array
  if (typeof rawBody === 'string') {
    return { body: new TextEncoder().encode(rawBody), parseError: null };
  }
  return { body: rawBody, parseError: null };
}

/**
 * Match a URL path against a pattern with parameters
 * Pattern: /hello/{name}/stuff or /users/{id}/*
 * Returns: { params: { name: 'value' }, rest: '...' } or null if no match
 */
/**
 * Parse query string into object
 */
function parseQuery(url) {
  const queryIndex = url.indexOf('?');
  if (queryIndex === -1) return {};
  const queryString = url.slice(queryIndex + 1);
  const params = new URLSearchParams(queryString);
  const result = {};
  for (const [key, value] of params) {
    result[key] = value;
  }
  return result;
}

/**
 * Get path without query string
 */
function getPath(url) {
  const queryIndex = url.indexOf('?');
  return queryIndex === -1 ? url : url.slice(0, queryIndex);
}

function matchPath(pattern, path) {
  // Handle query string - strip it from path for matching
  const queryIndex = path.indexOf('?');
  const pathOnly = queryIndex > -1 ? path.slice(0, queryIndex) : path;

  const patternParts = pattern.split('/').filter(p => p);
  const pathParts = pathOnly.split('/').filter(p => p);

  const params = {};
  let rest = null;

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];

    // Wildcard - captures rest of path
    if (patternPart === '*') {
      rest = '/' + pathParts.slice(i).join('/');
      return { params, rest };
    }

    // No more path parts but pattern expects more
    if (i >= pathParts.length) {
      return null;
    }

    const pathPart = pathParts[i];

    // Parameter - {name}
    if (patternPart.startsWith('{') && patternPart.endsWith('}')) {
      const paramName = patternPart.slice(1, -1);
      params[paramName] = decodeURIComponent(pathPart);
    }
    // Literal match
    else if (patternPart !== pathPart) {
      return null;
    }
  }

  // Path has more parts than pattern (and no wildcard)
  if (pathParts.length > patternParts.length) {
    return null;
  }

  return { params, rest };
}

function getHeaderText(content, resp) {
  let headerText = `HTTP/${resp.httpVersion || '1.0'} ${resp.code} ${resp.codeName || 'OK'}`;
  let headers = {
    'Date': (new Date()).toUTCString(),
    'Content-Type': 'text/html',
    'Content-Length': content.length,
  };
  headers = {...headers, ...resp.replyHeaders};

  Object.keys(headers).forEach((name) => {
    headerText = headerText + r + `${name}: ${headers[name]}`;
  });
  headerText = headerText + r + r;
  return headerText;
}

function createServer(cb) {
  const server = net.createServer((socket) => {
    let buffer = new Uint8Array(0);
    let headersParsed = false;
    let headers = {};
    let method, path, httpVersion, top;
    let contentLength = -1; // -1 means not set
    let isChunked = false;
    let headerEndIndex = -1;
    let requestProcessed = false;

    socket.on('data', (data) => {
      if (requestProcessed) return; // Ignore data after request is processed

      // Append new data to buffer
      const chunk = typeof data === 'string' ? new TextEncoder().encode(data) : data;
      const newBuffer = new Uint8Array(buffer.length + chunk.length);
      newBuffer.set(buffer);
      newBuffer.set(chunk, buffer.length);
      buffer = newBuffer;

      // If headers not yet parsed, look for end of headers
      if (!headersParsed) {
        const bufferStr = new TextDecoder().decode(buffer);
        headerEndIndex = bufferStr.indexOf(r + r);

        if (headerEndIndex === -1) {
          // Headers not complete yet, wait for more data
          return;
        }

        // Parse headers
        const headerSection = bufferStr.slice(0, headerEndIndex);
        const rawHeaders = headerSection.split(r);
        top = rawHeaders.shift();
        const parts = top.split(' ');
        method = parts[0];
        path = parts[1];
        httpVersion = parts[2];

        rawHeaders.forEach((rl) => {
          const colonIndex = rl.indexOf(':');
          if (colonIndex > -1) {
            const name = rl.slice(0, colonIndex);
            const value = rl.slice(colonIndex + 1).trim();
            headers[name] = value;
          }
        });

        // Check for chunked transfer encoding
        const transferEncoding = (headers['Transfer-Encoding'] || headers['transfer-encoding'] || '').toLowerCase();
        isChunked = transferEncoding.includes('chunked');

        // Get content length if not chunked
        if (!isChunked) {
          const clHeader = headers['Content-Length'] || headers['content-length'];
          contentLength = clHeader ? parseInt(clHeader, 10) : 0;
        }

        headersParsed = true;
      }

      const bodyStartIndex = headerEndIndex + 4; // skip \r\n\r\n

      if (isChunked) {
        // Parse chunked encoding
        const bodyData = buffer.slice(bodyStartIndex);
        const result = parseChunkedBody(bodyData);

        if (result.complete) {
          requestProcessed = true;
          processRequest(method, path, httpVersion, top, headers, result.body);
        }
        // Otherwise wait for more chunks
      } else {
        // Content-Length based
        const bodyBytesReceived = buffer.length - bodyStartIndex;

        if (bodyBytesReceived >= contentLength) {
          requestProcessed = true;
          const bodyBytes = buffer.slice(bodyStartIndex, bodyStartIndex + contentLength);
          const body = new TextDecoder().decode(bodyBytes);
          processRequest(method, path, httpVersion, top, headers, body);
        }
        // Otherwise wait for more data
      }
    });

    // Parse chunked transfer encoding
    // Format: [size in hex]\r\n[data]\r\n[size]\r\n[data]\r\n0\r\n\r\n
    function parseChunkedBody(data) {
      const str = new TextDecoder().decode(data);
      let body = '';
      let pos = 0;

      while (pos < str.length) {
        // Find the chunk size line
        const lineEnd = str.indexOf(r, pos);
        if (lineEnd === -1) {
          // Incomplete chunk size line
          return { complete: false, body: '' };
        }

        const sizeLine = str.slice(pos, lineEnd);
        const chunkSize = parseInt(sizeLine, 16);

        if (isNaN(chunkSize)) {
          // Invalid chunk size
          return { complete: false, body: '' };
        }

        // Last chunk
        if (chunkSize === 0) {
          return { complete: true, body };
        }

        // Move past the size line and \r\n
        pos = lineEnd + 2;

        // Check if we have the full chunk data
        if (pos + chunkSize > str.length) {
          // Incomplete chunk data
          return { complete: false, body: '' };
        }

        // Extract chunk data
        body += str.slice(pos, pos + chunkSize);
        pos += chunkSize;

        // Skip trailing \r\n after chunk data
        if (str.slice(pos, pos + 2) !== r) {
          // Malformed - missing CRLF after chunk
          return { complete: false, body: '' };
        }
        pos += 2;
      }

      // Reached end of buffer without finding final chunk
      return { complete: false, body: '' };
    }

    function processRequest(method, urlPath, httpVersion, top, headers, body) {
      // Parse body based on content-type
      const contentType = headers['Content-Type'] || headers['content-type'] || '';
      const { body: parsedBody, parseError } = parseBody(body, contentType);

      // Create request as EventEmitter for Node.js http compatibility
      const req = new EventEmitter();
      req.headers = headers;
      req.top = top;
      req.url = urlPath;
      req.path = getPath(urlPath);
      req.query = parseQuery(urlPath);
      req.httpVersion = httpVersion;
      req.method = method;
      req.body = parsedBody;
      req.parseError = parseError;

      const resp = {
        replyHeaders: {},
        writeHead: function(newCode, additionalHeaders) {
          if (newCode) {
            resp.code = newCode;
          }
          if (additionalHeaders) {
            resp.replyHeaders = additionalHeaders;
          }
        },
        code: 200,
        end: function(text) {
          socket.write(Buffer.from(getHeaderText(text + r, resp) + text + r));
          socket.end();
        }
      };

      // Call the callback
      cb(req, resp);

      // Emit data and end events for compatibility
      setTimeout(() => {
        if (body) {
          req.emit('data', body);
        }
        req.emit('end');
      }, 0);
    }
  });

  return server;
}

// hacky I know, I'll get better at webpack or whatever, i promise
const webHttp = globalThis.nodeHttpWeb || {
  createServer,
  matchPath,
  parseBody,
  parseQuery,
  getPath,
  isTextContent,
  version: pack.version,
};
globalThis.nodeHttpWeb = webHttp;

module.exports = webHttp;
