# Campus Customs

A Yale apparel shop with a chat assistant. The site is a Vite + React + TypeScript front end. The API is FastAPI, and the chat agent is PydanticAI. Prices and stock come from a local SQLite database that is not in this repository.

## Data pack

Place the local data pack next to `frontend/` and `backend/` before you start the API:

```
data/
├── campus_customs.db
└── products/
```

`campus_customs.db` holds the catalogue, inventory, and accounts. `products/` holds the photos named in the catalogue. Do not commit either one.

## API key

Copy `.env.example` to `backend/.env` and replace the placeholder with your Portkey key. The example file has no real key.

```
PORTKEY_API_KEY=your_portkey_api_key_here
PORTKEY_MODEL=gpt-6-astra
PORTKEY_PROVIDER=openai
```

## Run the backend

From `backend/`, with Python 3.11 or newer:

```
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r ..\requirements.txt
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

On macOS or Linux, use `.venv/bin/python` instead of `.\.venv\Scripts\python.exe`.

The agent is `prompts/prompt.md`, `agent.py`, `tools.py`, and `models.py`. `main.py` is the FastAPI app. Run Uvicorn from the `backend/` folder so those imports resolve.

## Run the front end

In a second terminal, from `frontend/`:

```
npm install
npm run dev
```

Open http://localhost:5173/ . Use `localhost`, not `127.0.0.1`. Vite proxies `/api` and `/images` to the API on port 8000.

A seeded shopper is `test@campuscustoms.yale.edu` with password `password`.

## What is in output/

`output/harness.md` describes the database, models, tools, safety rules, and limits. `output/design.md` and `output/usability.md` are the design and usability notes. `output/app_check.html` is the screenshot check (open it in a browser). `output/audit_trail.json` is the append-only log of agent runs.
