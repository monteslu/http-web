# TODO

## Features to Add

- [ ] Keep-alive / connection reuse
- [ ] Compression support (gzip, deflate, br)
- [ ] Multipart form data parsing
- [ ] CORS helper methods
- [ ] Response streaming
- [ ] Request timeout handling
- [ ] URL-encoded form body parsing (application/x-www-form-urlencoded)

## Improvements

- [ ] Better error handling for malformed requests
- [ ] HTTP/1.1 100-continue support
- [ ] Trailer headers for chunked encoding
- [ ] Case-insensitive header lookup helper
- [ ] Response helper methods (res.json, res.status, etc.)

## Testing

- [ ] Unit tests for parseBody
- [ ] Unit tests for matchPath
- [ ] Unit tests for chunked encoding parser
- [ ] Integration tests with net-web
