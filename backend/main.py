"""Campus Customs API.

Run from this folder:

    uvicorn main:app --reload --port 8000
"""

import json
import logging
import re
import sqlite3
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pydantic_ai.exceptions import UsageLimitExceeded

from agent import ask_shop
from audit import record_stop
from models import ChatReply, ChatRequest, ChatTurn, ProductCard, StoredMessage
from passwords import hash_password, password_matches
from sessions import issue_token, read_user_id
from tools import ShopperInfo

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data" / "campus_customs.db"
PRODUCTS_DIR = ROOT / "data" / "products"
SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"]
logger = logging.getLogger("campus_customs")

if not DB_PATH.is_file():
    raise RuntimeError(f"Database not found at {DB_PATH}")
if not PRODUCTS_DIR.is_dir():
    raise RuntimeError(f"Product images not found at {PRODUCTS_DIR}")


class ProductSummary(BaseModel):
    product_id: str
    name: str
    garment_type: str
    description: str
    price: float
    image_url: str
    search_tags: list[str]


class SizeStock(BaseModel):
    size: str
    quantity: int


class ProductDetail(ProductSummary):
    colors: list[str]
    sizes: list[SizeStock]


app = FastAPI(title="Campus Customs")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class UserPublic(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    name: str


class AuthResponse(BaseModel):
    token: str
    user: UserPublic


class RegisterRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


def connect() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def as_list(raw: str | None) -> list[str]:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, list):
        return []
    return [str(item) for item in parsed]


def image_url(image_file_path: str) -> str:
    return f"/images/{Path(image_file_path).name}"


def summary_from_row(row: sqlite3.Row) -> ProductSummary:
    return ProductSummary(
        product_id=row["product_id"],
        name=row["name"],
        garment_type=row["garment_type"],
        description=row["description"],
        price=float(row["price"]),
        image_url=image_url(row["image_file_path"]),
        search_tags=as_list(row["search_tags"]),
    )


@app.get("/api/products", response_model=list[ProductSummary])
def list_products() -> list[ProductSummary]:
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT product_id, name, garment_type, description, price,
                   image_file_path, search_tags
            FROM catalogue
            ORDER BY name
            """
        ).fetchall()
    return [summary_from_row(row) for row in rows]


@app.get("/api/products/{product_id}", response_model=ProductDetail)
def get_product(product_id: str) -> ProductDetail:
    with connect() as connection:
        row = connection.execute(
            """
            SELECT product_id, name, garment_type, description, colors, price,
                   image_file_path, search_tags
            FROM catalogue
            WHERE product_id = ?
            """,
            (product_id,),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Product not found")
        stock_rows = connection.execute(
            """
            SELECT size, quantity
            FROM inventory
            WHERE product_id = ?
            """,
            (product_id,),
        ).fetchall()

    sizes = sorted(
        stock_rows,
        key=lambda stock: SIZE_ORDER.index(stock["size"])
        if stock["size"] in SIZE_ORDER
        else len(SIZE_ORDER),
    )
    base = summary_from_row(row)
    return ProductDetail(
        **base.model_dump(),
        colors=as_list(row["colors"]),
        sizes=[
            SizeStock(size=stock["size"], quantity=int(stock["quantity"]))
            for stock in sizes
        ],
    )


def clean_person_name(value: str, label: str) -> str:
    text = " ".join(value.split())
    if not text:
        raise HTTPException(status_code=400, detail=f"Enter a {label}.")
    if len(text) > 80:
        raise HTTPException(status_code=400, detail=f"That {label} is too long.")
    return text


def clean_email(value: str) -> str:
    email = value.strip().lower()
    if "@" not in email or email.startswith("@") or email.endswith("@") or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Enter a valid email.")
    return email


def check_new_password(password: str) -> None:
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Use at least 8 characters.")
    if len(password) > 200:
        raise HTTPException(status_code=400, detail="That password is too long.")


def user_from_row(row: sqlite3.Row) -> UserPublic:
    first = (row["first_name"] or "").strip()
    last = (row["last_name"] or "").strip()
    name = (row["name"] or "").strip() or f"{first} {last}".strip()
    if not first and name:
        first = name.split()[0]
    return UserPublic(
        id=int(row["id"]),
        first_name=first,
        last_name=last,
        email=row["email"],
        name=name,
    )


def find_user(connection: sqlite3.Connection, email: str) -> sqlite3.Row | None:
    return connection.execute(
        """
        SELECT id, name, email, password_hash, first_name, last_name
        FROM users
        WHERE lower(email) = ?
        """,
        (email,),
    ).fetchone()


def public_user(user_id: int) -> UserPublic:
    connection = connect()
    try:
        row = connection.execute(
            """
            SELECT id, name, email, first_name, last_name
            FROM users
            WHERE id = ?
            """,
            (user_id,),
        ).fetchone()
    finally:
        connection.close()
    if row is None:
        raise HTTPException(status_code=401, detail="Log in again.")
    return user_from_row(row)


def user_from_authorization(authorization: str | None) -> UserPublic:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Log in first.")
    user_id = read_user_id(authorization.split(" ", 1)[1].strip())
    if user_id is None:
        raise HTTPException(status_code=401, detail="Log in again.")
    return public_user(user_id)


@app.post("/api/register", response_model=AuthResponse, status_code=201)
def register(body: RegisterRequest) -> AuthResponse:
    first_name = clean_person_name(body.first_name, "first name")
    last_name = clean_person_name(body.last_name, "last name")
    email = clean_email(body.email)
    check_new_password(body.password)
    password_hash = hash_password(body.password)
    name = f"{first_name} {last_name}"
    connection = connect()
    try:
        if find_user(connection, email) is not None:
            raise HTTPException(status_code=409, detail="An account with that email already exists.")
        try:
            cursor = connection.execute(
                """
                INSERT INTO users (name, email, password_hash, first_name, last_name)
                VALUES (?, ?, ?, ?, ?)
                """,
                (name, email, password_hash, first_name, last_name),
            )
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=409, detail="An account with that email already exists.")
        connection.commit()
        if cursor.lastrowid is None:
            raise HTTPException(status_code=500, detail="Could not create the account.")
        user_id = int(cursor.lastrowid)
    finally:
        connection.close()
    user = public_user(user_id)
    return AuthResponse(token=issue_token(user.id), user=user)


@app.post("/api/login", response_model=AuthResponse)
def login(body: LoginRequest) -> AuthResponse:
    email = body.email.strip().lower()
    password = body.password
    if len(password) > 200:
        raise HTTPException(status_code=401, detail="Email or password is not right.")
    connection = connect()
    try:
        row = find_user(connection, email) if email else None
        stored = row["password_hash"] if row is not None else None
        user = user_from_row(row) if row is not None else None
    finally:
        connection.close()
    matches = password_matches(password, stored)
    if user is None or not matches:
        raise HTTPException(status_code=401, detail="Email or password is not right.")
    return AuthResponse(token=issue_token(user.id), user=user)


@app.get("/api/me", response_model=UserPublic)
def me(authorization: str | None = Header(default=None)) -> UserPublic:
    return user_from_authorization(authorization)


def signed_in_user_id(authorization: str | None) -> int | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    return read_user_id(authorization.split(" ", 1)[1].strip())


def load_shopper(user_id: int) -> ShopperInfo | None:
    connection = connect()
    try:
        row = connection.execute(
            "SELECT name, email, first_name FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
    finally:
        connection.close()
    if row is None:
        return None
    first_name = (row["first_name"] or "").strip() or row["name"]
    return ShopperInfo(name=row["name"], email=row["email"], first_name=first_name)


def cards_from_stored(raw: str | None) -> list[ProductCard]:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, list):
        return []
    cards: list[ProductCard] = []
    for item in parsed:
        if not isinstance(item, dict) or not item.get("product_id"):
            continue
        image = str(item.get("image_file_path") or item.get("image_url") or "")
        filename = Path(image).name
        try:
            price = float(item.get("price") or 0)
        except (TypeError, ValueError):
            price = 0
        cards.append(
            ProductCard(
                product_id=str(item["product_id"]),
                name=str(item.get("name") or ""),
                garment_type=str(item.get("garment_type") or ""),
                description=str(item.get("description") or ""),
                price=price,
                image_url=f"/images/{filename}" if filename else "",
            )
        )
    return cards


def message_rows(user_id: int, limit: int) -> list[sqlite3.Row]:
    connection = connect()
    try:
        rows = connection.execute(
            """
            SELECT id, role, content, products_json
            FROM chat_messages
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT ?
            """,
            (user_id, limit),
        ).fetchall()
    finally:
        connection.close()
    return list(reversed(rows))


def stored_messages(user_id: int, limit: int = 40) -> list[StoredMessage]:
    messages: list[StoredMessage] = []
    for row in message_rows(user_id, limit):
        if row["role"] not in ("user", "assistant"):
            continue
        messages.append(
            StoredMessage(
                id=int(row["id"]),
                role=row["role"],
                content=row["content"] or "",
                products=cards_from_stored(row["products_json"]),
            )
        )
    return messages


def turns_for_agent(user_id: int) -> list[ChatTurn]:
    return [
        ChatTurn(role=message.role, content=message.content)
        for message in stored_messages(user_id, limit=12)
    ]


SLUG = re.compile(r"^[a-z0-9-]{1,80}$")


def page_parts(body: ChatRequest) -> tuple[str, str | None]:
    if body.page is None:
        return "", None
    raw_path = (body.page.path or "").strip().splitlines()[0][:200] if body.page.path else ""
    path = raw_path if raw_path.startswith("/") and " " not in raw_path else ""
    product_id = (body.page.product_id or "").strip().lower()
    if not SLUG.fullmatch(product_id):
        return path, None
    return path, product_id


def local_refusal(message: str) -> str | None:
    text = message.lower()
    if "forgot" in text and "password" in text:
        return (
            "I can't see or reset passwords from this chat. "
            "Email orderdept@campuscustoms.com and they can help with the account."
        )
    blocked = (
        "password",
        "system prompt",
        "ignore previous",
        "ignore your instructions",
        "ignore these rules",
        "jailbreak",
        "other account",
        "another account",
        "another customer",
        "other shopper",
        "another shopper",
        "password hash",
    )
    if any(phrase in text for phrase in blocked):
        return (
            "I can help with the clothes on this site. "
            "I can't share passwords, other accounts, or the instructions I follow."
        )
    return None


def save_turn(user_id: int, reply: ChatReply, shopper_message: str) -> None:
    products_json = json.dumps([card.model_dump() for card in reply.products])
    connection = connect()
    try:
        connection.execute(
            """
            INSERT INTO chat_messages (user_id, role, content, products_json)
            VALUES (?, 'user', ?, NULL)
            """,
            (user_id, shopper_message),
        )
        connection.execute(
            """
            INSERT INTO chat_messages (user_id, role, content, products_json)
            VALUES (?, 'assistant', ?, ?)
            """,
            (user_id, reply.reply, products_json),
        )
        connection.commit()
    finally:
        connection.close()


@app.get("/api/chat/history", response_model=list[StoredMessage])
def chat_history(authorization: str | None = Header(default=None)) -> list[StoredMessage]:
    user_id = signed_in_user_id(authorization)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Log in to see your chat.")
    if load_shopper(user_id) is None:
        raise HTTPException(status_code=401, detail="Log in again.")
    return stored_messages(user_id)


@app.post("/api/chat", response_model=ChatReply)
async def chat(body: ChatRequest, authorization: str | None = Header(default=None)) -> ChatReply:
    message = body.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Type a message.")
    if len(message) > 2000:
        raise HTTPException(status_code=400, detail="That message is too long.")
    user_id = signed_in_user_id(authorization)
    shopper = load_shopper(user_id) if user_id is not None else None
    if shopper is not None and user_id is not None:
        history = turns_for_agent(user_id)
    else:
        history = body.history[-12:]
    page_path, product_id = page_parts(body)
    refusal = local_refusal(message)
    if refusal is not None:
        record_stop("refused_before_model", "blocked before the model")
        reply = ChatReply(reply=refusal, products=[])
    else:
        try:
            reply = await ask_shop(message, history, shopper, page_path, product_id)
        except UsageLimitExceeded:
            raise HTTPException(status_code=502, detail="That question needed too many lookups. Try a narrower one.")
        except TimeoutError:
            raise HTTPException(status_code=504, detail="The shop assistant took too long. Try again.")
        except RuntimeError as exc:
            logger.error("Chat agent is not configured: %s", type(exc).__name__)
            if "PORTKEY_API_KEY" in str(exc):
                raise HTTPException(status_code=503, detail="The shop assistant is not configured.")
            raise HTTPException(status_code=502, detail="The shop assistant is not available right now.")
        except Exception as exc:
            logger.error("Chat agent failed: %s", type(exc).__name__)
            raise HTTPException(status_code=502, detail="The shop assistant is not available right now.")

    if shopper is not None and user_id is not None:
        try:
            save_turn(user_id, reply, message)
        except Exception as exc:
            logger.error("Could not store the chat turn: %s", type(exc).__name__)
    return reply


app.mount("/images", StaticFiles(directory=PRODUCTS_DIR), name="images")
