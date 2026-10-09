"""Loads the named queries in metrics.sql and runs them."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any
from uuid import UUID

from sqlalchemy import Connection, text

METRICS_SQL = Path(__file__).with_name("metrics.sql")

_NAME = re.compile(r"^--\s*name:\s*(\w+)\s*$")


def load_queries(path: Path = METRICS_SQL) -> dict[str, str]:
    queries: dict[str, list[str]] = {}
    current: list[str] | None = None
    for line in path.read_text(encoding="utf-8").splitlines():
        match = _NAME.match(line)
        if match:
            name = match.group(1)
            if name in queries:
                raise ValueError(f"duplicate query name in {path.name}: {name}")
            current = queries[name] = []
        elif current is not None:
            current.append(line)
    return {name: "\n".join(lines).strip().rstrip(";") for name, lines in queries.items()}


def run_query(conn: Connection, name: str, *, run_id: UUID, variant: str) -> list[dict[str, Any]]:
    """Runs one named metric query and returns one dict per seed."""
    sql = load_queries()[name]
    result = conn.execute(text(sql), {"run_id": run_id, "variant": variant})
    return [dict(row) for row in result.mappings()]
