"""Application errors and the stable API error vocabulary."""

from typing import Any, Optional


class APIError(Exception):
    """An expected error that can be safely returned to an API client."""

    def __init__(
        self,
        status_code: int,
        code: str,
        detail: str,
        *,
        errors: Optional[list[Any]] = None,
    ) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.code = code
        self.detail = detail
        self.errors = errors
