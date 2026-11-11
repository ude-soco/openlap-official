#!/usr/bin/env python3
"""Local synthetic fault proxy: forward writes, then discard every PUT acknowledgement."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from contextlib import closing
import http.client
import re
import socket
from urllib.parse import urlsplit
import json
import xml.etree.ElementTree as ET


class Proxy(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *_args):
        pass

    def forward(self):
        parsed = urlsplit(self.path)
        if not re.fullmatch(r"/openlap-qualification/plugins/(analytics|visualizations)/[a-f0-9]{64}\.jar", parsed.path) or parsed.query and not re.fullmatch(r"x-id=(GetObject|PutObject|DeleteObject|HeadObject)", parsed.query):
            self.send_error(400)
            return
        length = int(self.headers.get("Content-Length", "0"))
        if not 0 <= length <= 1024 * 1024:
            self.send_error(400)
            return
        body = self.rfile.read(length)
        headers = {k: v for k, v in self.headers.items() if k.lower() not in {"connection", "transfer-encoding"}}
        with closing(http.client.HTTPConnection("gateway", 9000, timeout=10)) as target:
            target.request(self.command, self.path, body=body, headers=headers)
            response = target.getresponse()
            data = response.read(1024 * 1024 + 1)
            if len(data) > 1024 * 1024:
                self.send_error(400)
                return
            code = "none"
            if response.status >= 400:
                try:
                    candidate = ET.fromstring(data).findtext("Code")
                    code = candidate if candidate in {"AccessDenied", "InvalidAccessKeyId", "SignatureDoesNotMatch", "NoSuchKey", "InvalidRequest", "MissingContentLength", "BadDigest", "InvalidArgument", "IncompleteBody"} else "other"
                except ET.ParseError:
                    code = "other"
            print(json.dumps({"method": self.command, "forwardStatus": response.status, "errorCode": code}), flush=True)
            if self.command == "PUT":
                if 200 <= response.status < 300:
                    print('{"status":"SYNTHETIC_PUT_ACCEPTED_ACK_DISCARDED"}', flush=True)
                self.close_connection = True
                try:
                    self.connection.shutdown(socket.SHUT_RDWR)
                except OSError:
                    pass
                self.connection.close()
                return
            if self.command == "DELETE" and 200 <= response.status < 300:
                print('{"status":"SYNTHETIC_DELETE_ACKNOWLEDGED"}', flush=True)
            self.send_response_only(response.status)
            for key, value in response.getheaders():
                if key.lower() not in {"connection", "transfer-encoding", "content-length"}:
                    self.send_header(key, value)
            self.send_header("Content-Length", response.getheader("Content-Length", "0") if self.command == "HEAD" else str(len(data)))
            self.send_header("Connection", "close")
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(data)
            self.close_connection = True

    do_GET = do_HEAD = do_PUT = do_DELETE = forward


ThreadingHTTPServer(("0.0.0.0", 9000), Proxy).serve_forever()
