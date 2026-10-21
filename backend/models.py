"""Types for the shop chatbot.

The agent names catalogue ids. The API turns those ids into product cards
using rows from the database, so a card price is the catalogue price.
"""

from typing import Literal

from pydantic import BaseModel, Field


class ProductCard(BaseModel):
    """One catalogue item the chat can show on the page."""

    product_id: str
    name: str
    garment_type: str
    description: str
    price: float
    image_url: str


class SizeStock(BaseModel):
    """Units on the shelf for one size. quantity 0 means that size is out of stock."""

    size: str = Field(description="One of XS, S, M, L, XL, XXL.")
    quantity: int = Field(description="Count from the inventory table. Never guess this.")
    in_stock: bool = Field(description="False when quantity is 0. Say that size is out of stock.")


class ProductFacts(BaseModel):
    """Description, price, and size counts for one catalogue row. Every value is from the database."""

    product_id: str = Field(description="Catalogue id. Copy this into product_ids when you recommend the item.")
    name: str = Field(description="Shopper-facing name.")
    garment_type: str = Field(description="Hoodie, crewneck, t-shirt, and so on.")
    description: str = Field(description="The only prose you may use about how the item looks.")
    colors: list[str] = Field(description="Colors on the item. If a color is not in this list, we do not offer it.")
    price: float = Field(description="Catalogue price in dollars.")
    price_label: str = Field(description="Price to quote, such as $68.00. Do not reformat it.")
    sizes: list[SizeStock] = Field(description="Stock for every size. Use quantity and in_stock from here.")


class ProductLookupResult(BaseModel):
    """Result of looking up one product, including a size the shopper asked about."""

    found: bool = Field(description="False when that product_id is not in the catalogue.")
    asked_size: str | None = Field(description="The size the shopper asked about, if one was passed to the tool.")
    product: ProductFacts | None = None
    note: str = Field(description="Say this when it reports a size is out of stock or the item was not found.")


class CatalogueSearchResult(BaseModel):
    """Result of a word search across the catalogue."""

    query: str
    matches: list[ProductFacts] = Field(description="Catalogue rows that matched. Empty means we do not carry it.")
    note: str


class AgentAnswer(BaseModel):
    """Structured reply the model must return after it has used the catalogue tools."""

    reply: str = Field(description="Plain-text answer for the shopper. Quote price and stock only from tool results.")
    product_ids: list[str] = Field(
        default_factory=list,
        description="Catalogue product_ids to show as cards on the page, copied exactly from tool results. Empty if you are not showing products.",
    )


class CustomerView(BaseModel):
    """Name and email for the shopper on this chat. Empty when they are a guest."""

    signed_in: bool
    name: str | None = None
    first_name: str | None = None
    email: str | None = None


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class PageContext(BaseModel):
    """Which screen the shopper is looking at. product_id is set on a product page."""

    path: str = ""
    product_id: str | None = None


class ChatRequest(BaseModel):
    message: str
    history: list[ChatTurn] = Field(default_factory=list)
    page: PageContext | None = None


class StoredMessage(BaseModel):
    """One saved chat row, reloaded for a signed-in shopper."""

    id: int
    role: Literal["user", "assistant"]
    content: str
    products: list[ProductCard] = Field(default_factory=list)


class ChatReply(BaseModel):
    """What the website renders: the assistant text plus real product cards."""

    reply: str
    products: list[ProductCard] = Field(default_factory=list)
