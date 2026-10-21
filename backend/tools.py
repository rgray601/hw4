"""Catalogue tools. Description, price, and stock come from SQLite, not from the model."""

from __future__ import annotations

import json
import re
import sqlite3
from dataclasses import dataclass, field
from pathlib import Path

from pydantic_ai import ModelRetry, RunContext

from models import (
    CatalogueSearchResult,
    CustomerView,
    ProductCard,
    ProductFacts,
    ProductLookupResult,
    SizeStock,
)

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data" / "campus_customs.db"
SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"]
SIZE_ALIASES = {
    "XS": "XS",
    "XSMALL": "XS",
    "EXTRASMALL": "XS",
    "S": "S",
    "SMALL": "S",
    "M": "M",
    "MEDIUM": "M",
    "MED": "M",
    "L": "L",
    "LARGE": "L",
    "XL": "XL",
    "XLARGE": "XL",
    "EXTRALARGE": "XL",
    "XXL": "XXL",
    "2XL": "XXL",
}
STOP_WORDS = {
    "a",
    "an",
    "and",
    "any",
    "do",
    "for",
    "have",
    "in",
    "is",
    "it",
    "me",
    "of",
    "or",
    "show",
    "some",
    "that",
    "the",
    "this",
    "what",
    "with",
    "you",
}


@dataclass
class ShopperInfo:
    """The signed-in account on this turn. Guests leave this empty."""

    name: str
    email: str
    first_name: str


@dataclass
class ShopDeps:
    """Who is chatting, which page they are on, and the rows the tools loaded."""

    found: dict[str, ProductCard] = field(default_factory=dict)
    shopper: ShopperInfo | None = None
    page_path: str = ""
    open_product: ProductFacts | None = None
    opened_id: str | None = None


def _connect() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def _card(row: sqlite3.Row) -> ProductCard:
    return ProductCard(
        product_id=row["product_id"],
        name=row["name"],
        garment_type=row["garment_type"],
        description=row["description"],
        price=float(row["price"]),
        image_url=f"/images/{Path(row['image_file_path']).name}",
    )


def _normalize_size(size: str) -> str | None:
    token = re.sub(r"[^a-z0-9]", "", size.lower()).upper()
    return SIZE_ALIASES.get(token)


def _sizes(connection: sqlite3.Connection, product_id: str) -> list[SizeStock]:
    rows = connection.execute(
        "SELECT size, quantity FROM inventory WHERE product_id = ?",
        (product_id,),
    ).fetchall()
    rows = sorted(
        rows,
        key=lambda stock: SIZE_ORDER.index(stock["size"]) if stock["size"] in SIZE_ORDER else len(SIZE_ORDER),
    )
    return [
        SizeStock(size=row["size"], quantity=int(row["quantity"]), in_stock=int(row["quantity"]) > 0)
        for row in rows
    ]


def _colors(raw: str | None) -> list[str]:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, list):
        return []
    return [str(item) for item in parsed]


def _facts(connection: sqlite3.Connection, row: sqlite3.Row) -> ProductFacts:
    price = float(row["price"])
    return ProductFacts(
        product_id=row["product_id"],
        name=row["name"],
        garment_type=row["garment_type"],
        description=row["description"],
        colors=_colors(row["colors"]),
        price=price,
        price_label=f"${price:.2f}",
        sizes=_sizes(connection, row["product_id"]),
    )


def _remember(deps: ShopDeps, row: sqlite3.Row) -> None:
    card = _card(row)
    deps.found[card.product_id] = card


def _size_note(facts: ProductFacts, asked_size: str | None) -> str:
    if not asked_size:
        out = [item.size for item in facts.sizes if not item.in_stock]
        if not out:
            return "Every listed size has stock. Quote quantity from sizes."
        return "Out of stock in " + ", ".join(out) + ". Say those sizes are out of stock."
    match = next((item for item in facts.sizes if item.size == asked_size), None)
    if match is None:
        return f"This item has no size {asked_size}."
    if not match.in_stock:
        return f"{match.size} is out of stock (quantity 0)."
    label = "1 in stock" if match.quantity == 1 else f"{match.quantity} in stock"
    return f"{match.size} has {label}."


def lookup_product(product_id: str, size: str = "") -> ProductLookupResult:
    asked = _normalize_size(size) if size.strip() else None
    bad_size = bool(size.strip()) and asked is None
    connection = _connect()
    try:
        row = connection.execute(
            """
            SELECT product_id, name, garment_type, description, colors, price, image_file_path
            FROM catalogue
            WHERE product_id = ?
            """,
            (product_id.strip(),),
        ).fetchone()
        if row is None:
            return ProductLookupResult(
                found=False,
                asked_size=asked,
                product=None,
                note="No catalogue item with that id. Do not invent one.",
            )
        facts = _facts(connection, row)
    finally:
        connection.close()
    if bad_size:
        return ProductLookupResult(
            found=True,
            asked_size=None,
            product=facts,
            note="Pass a size as XS, S, M, L, XL, or XXL. " + _size_note(facts, None),
        )
    return ProductLookupResult(
        found=True,
        asked_size=asked,
        product=facts,
        note=_size_note(facts, asked),
    )


def search_products(query: str) -> CatalogueSearchResult:
    words = [
        word
        for word in re.findall(r"[a-z0-9]+", query.lower())
        if word not in STOP_WORDS and len(word) > 1
    ]
    if not words:
        raise ModelRetry("Pass a short catalogue search such as 'navy hoodie' or 'harvard'.")
    clauses = []
    params: list[str] = []
    for word in words[:6]:
        clauses.append(
            """lower(
                name || ' ' || garment_type || ' ' || description || ' ' || colors || ' ' || search_tags
            ) LIKE ?"""
        )
        params.append(f"%{word}%")
    sql = f"""
        SELECT product_id, name, garment_type, description, colors, price, image_file_path
        FROM catalogue
        WHERE {' AND '.join(clauses)}
        ORDER BY name
        LIMIT 8
    """
    connection = _connect()
    try:
        rows = connection.execute(sql, params).fetchall()
        matches = [_facts(connection, row) for row in rows]
    finally:
        connection.close()
    if not matches:
        return CatalogueSearchResult(
            query=query,
            matches=[],
            note="No catalogue rows matched. Do not invent a product, a price, or a quantity.",
        )
    return CatalogueSearchResult(
        query=query,
        matches=matches,
        note="Quote description, price_label, and size quantities from these rows only.",
    )


def search_catalogue(ctx: RunContext[ShopDeps], query: str) -> CatalogueSearchResult:
    """Search the catalogue by name, garment, description, color, or tag.

    Use this for price, description, or stock questions when you do not yet have a product_id.
    Pass a short query such as "navy hoodie" or "baseball crewneck".
    Description, price_label, and sizes on each match are the database values.
    """
    result = search_products(query)
    if not result.matches:
        return result
    connection = _connect()
    try:
        for facts in result.matches:
            row = connection.execute(
                """
                SELECT product_id, name, garment_type, description, price, image_file_path
                FROM catalogue
                WHERE product_id = ?
                """,
                (facts.product_id,),
            ).fetchone()
            if row is not None:
                _remember(ctx.deps, row)
    finally:
        connection.close()
    return result


def product_details(ctx: RunContext[ShopDeps], product_id: str, size: str = "") -> ProductLookupResult:
    """Look up one product's description, price, and stock in every size.

    Pass product_id from an earlier search. Pass size (XS, S, M, L, XL, or XXL)
    when the shopper asked about one size. If the note says that size is out of stock, say so.
    """
    result = lookup_product(product_id, size)
    if result.product is None:
        return result
    connection = _connect()
    try:
        row = connection.execute(
            """
            SELECT product_id, name, garment_type, description, price, image_file_path
            FROM catalogue
            WHERE product_id = ?
            """,
            (result.product.product_id,),
        ).fetchone()
        if row is not None:
            _remember(ctx.deps, row)
    finally:
        connection.close()
    return result


def attach_open_product(deps: ShopDeps, product_id: str) -> ProductFacts | None:
    """Load the product page's row into deps. Returns None when the id is not in the catalogue."""
    result = lookup_product(product_id)
    if result.product is None:
        return None
    connection = _connect()
    try:
        row = connection.execute(
            """
            SELECT product_id, name, garment_type, description, price, image_file_path
            FROM catalogue
            WHERE product_id = ?
            """,
            (result.product.product_id,),
        ).fetchone()
        if row is not None:
            _remember(deps, row)
    finally:
        connection.close()
    deps.open_product = result.product
    deps.opened_id = result.product.product_id
    return result.product


def current_customer(ctx: RunContext[ShopDeps]) -> CustomerView:
    """Name and email of the shopper on this chat.

    Call this when they ask which name or email is on the account.
    A guest is not signed in and has neither.
    """
    shopper = ctx.deps.shopper
    if shopper is None:
        return CustomerView(signed_in=False)
    return CustomerView(
        signed_in=True,
        name=shopper.name,
        first_name=shopper.first_name,
        email=shopper.email,
    )
