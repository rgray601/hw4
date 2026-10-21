"""Append-only record of what the shop agent did on each turn.

The file is a JSON list. A new run adds entries at the end. An existing
trail is never replaced with an empty list, and a file that cannot be
read is left untouched.
"""

from __future__ import annotations

import json
import logging
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pydantic import BaseModel
from pydantic_ai.messages import ModelMessage, ModelRequest, ModelResponse, ToolCallPart, ToolReturnPart

ROOT = Path(__file__).resolve().parents[1]
TRAIL_PATH = ROOT / "output" / "audit_trail.json"
_LOCK = threading.Lock()
_LIMIT = 180
logger = logging.getLogger("campus_customs.audit")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _short(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, BaseModel):
        value = value.model_dump()
    if isinstance(value, (dict, list)):
        text = json.dumps(value, ensure_ascii=False, default=str)
    else:
        text = str(value)
    text = " ".join(text.split())
    if len(text) <= _LIMIT:
        return text
    return text[: _LIMIT - 1] + "…"


def _summarize(name: str, content: Any) -> str:
    data = content.model_dump() if isinstance(content, BaseModel) else content
    if name == "search_catalogue" and isinstance(data, dict):
        matches = data.get("matches") or []
        if len(matches) == 1 and isinstance(matches[0], dict):
            item = matches[0]
            sizes = item.get("sizes") or []
            stock = ", ".join(
                f"{size.get('size')} {size.get('quantity')}"
                for size in sizes
                if isinstance(size, dict)
            )
            return _short(f"1 match: {item.get('product_id')} {item.get('price_label') or item.get('price')} [{stock}]")
        bits = []
        for item in matches:
            if isinstance(item, dict):
                bits.append(f"{item.get('product_id')} {item.get('price_label') or item.get('price')}")
        return _short(f"{len(matches)} matches: " + "; ".join(bits))
    if name == "product_details" and isinstance(data, dict):
        if not data.get("found"):
            return _short(data.get("note") or "not found")
        product = data.get("product") or {}
        sizes = product.get("sizes") or []
        stock = ", ".join(
            f"{item.get('size')} {item.get('quantity')}"
            for item in sizes
            if isinstance(item, dict)
        )
        return _short(
            f"{product.get('name')} {product.get('price_label')} [{stock}] {data.get('note') or ''}"
        )
    if name == "current_customer" and isinstance(data, dict):
        if not data.get("signed_in"):
            return "guest"
        return _short(f"signed in as {data.get('first_name') or 'shopper'}")
    return _short(data)


def events_from_messages(messages: list[ModelMessage], stop_reason: str, result: str = "") -> list[dict[str, str]]:
    """One entry per shop tool call, then one entry for why the loop stopped."""
    pending: dict[str, tuple[str, str, str]] = {}
    events: list[dict[str, str]] = []
    step_reason = ""
    for message in messages:
        if isinstance(message, ModelResponse):
            step_reason = message.finish_reason or step_reason
            for part in message.parts:
                if isinstance(part, ToolCallPart) and part.tool_name != "final_result":
                    pending[part.tool_call_id] = (part.tool_name, _short(part.args), step_reason)
        elif isinstance(message, ModelRequest):
            for part in message.parts:
                if isinstance(part, ToolReturnPart) and part.tool_name != "final_result":
                    name, args, called_reason = pending.pop(part.tool_call_id, (part.tool_name, "", step_reason))
                    events.append(
                        {
                            "time": _now(),
                            "tool": name,
                            "args": args,
                            "result": _summarize(name, part.content),
                            "stop_reason": called_reason,
                        }
                    )
    events.append(
        {
            "time": _now(),
            "tool": "",
            "args": "",
            "result": _short(result),
            "stop_reason": stop_reason or step_reason or "stop",
        }
    )
    return events


def record_stop(stop_reason: str, result: str = "") -> None:
    append_events(
        [
            {
                "time": _now(),
                "tool": "",
                "args": "",
                "result": _short(result),
                "stop_reason": stop_reason,
            }
        ]
    )


def append_events(events: list[dict[str, str]]) -> None:
    if not events:
        return
    try:
        TRAIL_PATH.parent.mkdir(parents=True, exist_ok=True)
        with _LOCK:
            existing: list[Any] = []
            if TRAIL_PATH.is_file() and TRAIL_PATH.stat().st_size > 0:
                raw = TRAIL_PATH.read_text(encoding="utf-8")
                try:
                    parsed = json.loads(raw)
                except json.JSONDecodeError:
                    logger.error("Audit trail was left unchanged because it is not valid JSON.")
                    return
                if not isinstance(parsed, list):
                    logger.error("Audit trail was left unchanged because it is not a list.")
                    return
                existing = parsed
            existing.extend(events)
            temporary = TRAIL_PATH.with_suffix(".json.tmp")
            temporary.write_text(json.dumps(existing, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            temporary.replace(TRAIL_PATH)
    except OSError:
        logger.error("Audit trail could not be written.")
