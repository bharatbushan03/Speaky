import unittest

from starlette.requests import Request

from main import _client_key


def _request(headers: dict[str, str]) -> Request:
    scope = {
        "type": "http",
        "http_version": "1.1",
        "method": "GET",
        "scheme": "http",
        "path": "/health",
        "raw_path": b"/health",
        "query_string": b"",
        "headers": [(name.lower().encode(), value.encode()) for name, value in headers.items()],
        "client": ("10.0.0.8", 12345),
        "server": ("test", 80),
    }
    return Request(scope)


class ClientKeyTests(unittest.TestCase):
    def test_prefers_the_address_recorded_by_the_platform(self):
        request = _request(
            {
                "x-envoy-external-address": "203.0.113.8",
                "x-forwarded-for": "198.51.100.9, 10.0.0.4",
            }
        )
        self.assertEqual(_client_key(request), "203.0.113.8")

    def test_uses_the_platform_appended_forwarded_hop(self):
        request = _request({"x-forwarded-for": "198.51.100.9, 203.0.113.10"})
        self.assertEqual(_client_key(request), "203.0.113.10")

    def test_uses_the_direct_client_when_no_proxy_header_exists(self):
        self.assertEqual(_client_key(_request({})), "10.0.0.8")


if __name__ == "__main__":
    unittest.main()
