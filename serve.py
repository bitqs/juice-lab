# 开发服务器:禁缓存,改完代码刷新即生效
import http.server, functools

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        super().end_headers()

http.server.HTTPServer(('127.0.0.1', 8765), NoCacheHandler).serve_forever()
