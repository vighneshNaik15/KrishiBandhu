import asyncio
import unittest

from app.main import app, _authenticated_farmer


class InferenceRequestTests(unittest.TestCase):
    def call(self, headers, chunks=()):
        messages = []
        queue = iter(chunks or (b"",))

        async def receive():
            data = next(queue)
            return {"type": "http.request", "body": data, "more_body": bool(chunks)}

        async def send(message):
            messages.append(message)

        scope = {
            "type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1",
            "method": "POST", "scheme": "http", "path": "/predict", "raw_path": b"/predict",
            "root_path": "", "query_string": b"", "headers": headers,
            "client": ("127.0.0.1", 10000), "server": ("127.0.0.1", 8000),
        }

        async def call_app():
            async with app.router.lifespan_context(app):
                await app(scope, receive, send)

        asyncio.run(call_app())
        return messages[0]["status"]

    def test_requires_sign_in_before_processing_upload(self):
        self.assertEqual(self.call([(b"content-length", b"99999999")]), 401)

    def test_authenticated_upload_rejects_wrong_type_and_oversized_body(self):
        app.dependency_overrides[_authenticated_farmer] = lambda: "test-farmer"
        self.addCleanup(app.dependency_overrides.pop, _authenticated_farmer)
        self.assertEqual(self.call([(b"content-type", b"application/json")]), 415)
        multipart = (b"content-type", b"multipart/form-data; boundary=test")
        self.assertEqual(self.call([multipart, (b"content-length", b"99999999")]), 413)
        self.assertEqual(self.call([multipart], (b"x" * (6 * 1024 * 1024),)), 413)


if __name__ == "__main__":
    unittest.main()
