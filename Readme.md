# http-web

A simple virtual implementation of node's http package built on top of the net-web module.  It's stays global on a page so that other services built for the web can use the same event emitters (there sockets and servers can tie to the same ports)

## install

`npm install net-web`


## using

you can require it like `import http = from 'http-web'` or just use the global `nodeHttpWeb`

