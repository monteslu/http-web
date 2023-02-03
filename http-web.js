const net = require('net-web');
const pack = require('./package.json');

const r = '\r\n';

function getHeaderText(content, resp) {
  let headerText = `HTTP/${resp.httpVersion || '1.0'} ${resp.code} ${resp.codeName || 'OK'}`;
  let headers = {
    "Date": (new Date()).toUTCString(),
    "Content-Type": "text/html",
    "Content-Length": content.length,
  };
  headers = {...headers, ...resp.replyHeaders};

  Object.keys(headers).forEach((name) => {
    headerText = headerText + r + `${name}: ${headers[name]}`;
  });
  headerText = headerText + r + r;
  return headerText;
}

export function createServer(cb) {
  const server = net.createServer((socket) => {
    let fullData;
    let timerStarted = false;
    socket.on('data', async (data) => {
      if (!fullData) {
        fullData = data;
      } else {
        const mergedArray = new Uint8Array(fullData.length + data.length);
        mergedArray.set(fullData);
        mergedArray.set(data, fullData.length);
      }

      if (!timerStarted) {
        // HACK!
        setTimeout(finishedHeadersReceive, 100);
      }
      
    });

    function finishedHeadersReceive() {
      const reqText = fullData.toString().split(r + r);
      const rawHeaders = reqText[0].split(r);
      const top = rawHeaders.shift();
      const headers = {};
      rawHeaders.forEach((rl) => {
        const [rn, rv] = rl.split(':');
        headers[rn] = rv;
      });
      const req = {
        headers,
        top,
      };
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
      }
      cb(req, resp);
    }
  });

  return server;
}

// hacky I know, I'll get better at webpack or whatever, i promise
const http = globalThis.nodeHttpWeb || {
  createServer,
  version: pack.version,
};
globalThis.nodeHttpWeb = http;

module.exports = http;
