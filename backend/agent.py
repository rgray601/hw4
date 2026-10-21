"""Campus Customs shop agent. Loaded from prompts/prompt.md and a Portkey model."""

from __future__ import annotations

import os
from pathlib import Path

os.environ.setdefault("PYDANTIC_AI_NO_BANNER", "1")

from dotenv import load_dotenv
from openai import AsyncOpenAI
from pydantic_ai import Agent
from pydantic_ai.exceptions import UsageLimitExceeded
from pydantic_ai.messages import ModelMessage, ModelRequest, ModelResponse, TextPart, UserPromptPart
from pydantic_ai.models.openai import OpenAIResponsesModel
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic_ai.usage import UsageLimits

from audit import append_events, events_from_messages, record_stop
from models import AgentAnswer, ChatReply, ChatTurn, ProductCard
from tools import ShopDeps, ShopperInfo, attach_open_product, current_customer, product_details, search_catalogue

HERE = Path(__file__).resolve().parent
PROMPT_PATH = HERE / "prompts" / "prompt.md"
PORTKEY_BASE_URL = "https://api.portkey.ai/v1"
DEFAULT_MODEL = "gpt-6-astra"

load_dotenv(HERE / ".env")

_agent: Agent[ShopDeps, AgentAnswer] | None = None


def load_system_prompt() -> str:
    if not PROMPT_PATH.is_file():
        raise RuntimeError(f"Missing system prompt at {PROMPT_PATH}")
    return PROMPT_PATH.read_text(encoding="utf-8").strip()


def build_model() -> OpenAIResponsesModel:
    api_key = os.getenv("PORTKEY_API_KEY")
    if not api_key:
        raise RuntimeError("PORTKEY_API_KEY is not set. Add it to backend/.env")
    client = AsyncOpenAI(
        api_key=api_key,
        base_url=PORTKEY_BASE_URL,
        default_headers={"x-portkey-provider": os.getenv("PORTKEY_PROVIDER", "openai")},
        timeout=120,
    )
    model_name = os.getenv("PORTKEY_MODEL", DEFAULT_MODEL)
    # gpt-6 tool calls go through the Responses API. Chat completions rejects them.
    return OpenAIResponsesModel(model_name, provider=OpenAIProvider(openai_client=client))


def get_agent() -> Agent[ShopDeps, AgentAnswer]:
    global _agent
    if _agent is None:
        _agent = Agent(
            build_model(),
            deps_type=ShopDeps,
            output_type=AgentAnswer,
            name="campus_customs_shop",
            retries=2,
            tools=[search_catalogue, product_details, current_customer],
        )
    return _agent


def history_messages(history: list[ChatTurn]) -> list[ModelMessage]:
    messages: list[ModelMessage] = []
    for turn in history[-12:]:
        text = turn.content.strip()
        if not text or text.startswith("Hi. Ask what hoodies we have") or text.startswith("Ah, a visitor!"):
            continue
        if turn.role == "user":
            messages.append(ModelRequest(parts=[UserPromptPart(content=text[:2000])]))
        else:
            messages.append(ModelResponse(parts=[TextPart(content=text[:2000])]))
    return messages


def turn_instructions(deps: ShopDeps) -> str:
    """System prompt plus the shopper and the page, filled in from this request."""
    lines = [load_system_prompt(), "", "## This turn"]
    if deps.shopper is None:
        lines.append("Guest shopper. No name and no email. Do not invent either.")
    else:
        lines.append(
            f"Signed-in shopper: {deps.shopper.name}. First name: {deps.shopper.first_name}. "
            f"Email on the account: {deps.shopper.email}. "
            "Use the first name when a greeting helps. Repeat the email only if they ask which one we have. "
            "Do not mention any other account."
        )
    if deps.page_path:
        lines.append(f"Page path: {deps.page_path}")
    product = deps.open_product
    if product is None:
        lines.append("No catalogue product is open. 'This' does not name an item yet.")
    else:
        colors = ", ".join(product.colors) if product.colors else "none listed"
        stock = ", ".join(
            f"{item.size} {item.quantity}" + ("" if item.in_stock else " out of stock")
            for item in product.sizes
        )
        in_stock = [item.size for item in product.sizes if item.in_stock]
        alternative = in_stock[0] if in_stock else "none"
        lines.append(
            f"Open product: {product.name} (product_id {product.product_id}), a {product.garment_type}. "
            f"Colors: {colors}. Price: {product.price_label}. Sizes: {stock}. "
            f"A size still in stock: {alternative}. "
            "These values were read from the database for this turn. "
            "'This', 'it', and 'the one on the page' mean this product. "
            "Quote this block for its color, price, and stock. "
            "If they ask for a color that is not in the list, say we do not offer it. "
            "If the size they want is out of stock and another size is in stock, name that size. "
            "Call search_catalogue or product_details only for a different item."
        )
    return "\n".join(lines)


def cards_for(answer: AgentAnswer, deps: ShopDeps) -> list[ProductCard]:
    chosen = [product_id for product_id in answer.product_ids if product_id in deps.found]
    if not chosen:
        chosen = [product_id for product_id in deps.found if product_id != deps.opened_id][:8]
    else:
        chosen = chosen[:8]
    seen: set[str] = set()
    cards: list[ProductCard] = []
    for product_id in chosen:
        if product_id in seen:
            continue
        seen.add(product_id)
        cards.append(deps.found[product_id])
    return cards


async def ask_shop(
    message: str,
    history: list[ChatTurn],
    shopper: ShopperInfo | None = None,
    page_path: str = "",
    product_id: str | None = None,
) -> ChatReply:
    deps = ShopDeps(shopper=shopper, page_path=page_path)
    if product_id:
        attach_open_product(deps, product_id)
    try:
        result = await get_agent().run(
            message[:2000],
            message_history=history_messages(history),
            deps=deps,
            instructions=turn_instructions(deps),
            usage_limits=UsageLimits(request_limit=6, tool_calls_limit=4),
            timeout=100,
        )
    except UsageLimitExceeded:
        record_stop("usage_limit", "hit the request or tool-call limit")
        raise
    except TimeoutError:
        record_stop("timeout", "the run timed out")
        raise
    except Exception:
        record_stop("error", "the run failed")
        raise
    answer = result.output
    products = cards_for(answer, deps)
    try:
        append_events(events_from_messages(result.new_messages(), "stop", f"{len(products)} cards"))
    except Exception:
        record_stop("error", "could not record the run")
    reply = answer.reply.strip() or "I could not put an answer together. Try asking about a hoodie, a college, or a size."
    return ChatReply(reply=reply, products=products)
