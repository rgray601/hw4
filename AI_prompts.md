# AI prompts

Log of what I typed to the vibe coder for the Campus Customs site. One section per problem.

## Problem 1 — Database fields and the harness file

**Prompt**

Scenario: Campus Customs needs a real customer website with a helpful chatbot. Build a React + Vite TypeScript front end and a Python FastAPI backend whose brain is a PydanticAI agent. Shoppers should browse products, create an account, chat about merch, see matching items appear on the page, and get honest answers about price and stock from a local database. The database is `campus_customs.db` (catalogue, inventory by size, and users with hashed passwords). Product image paths are in the catalogue table. Research yalebulldogblue.com for the page style and for the agent prompt. Use the Portkey API key for the agent's model calls. Work one problem at a time. Do not commit the database or product images. Unzip `data.zip` so `data/campus_customs.db` and `data/products/` are in place.

**Follow-up**

Problem 1: Create `AI_prompts.md` and keep it updated. Each problem gets a section with the problem number and title, at least one prompt in my own words, and a follow-up prompt if I needed one (plus one sentence on what was lacking). Look at `data/campus_customs.db` and understand the fields of each table, at least catalogue, inventory, and users. Start `output/harness.md`: write down each table and its fields, and one short line on why each field matters for the shop or the chatbot. This harness file will grow in later problems.

No second follow-up. The first prompt had already unzipped the database, so this one only needed the field notes written into the harness.

## Problem 2 — Database fields and the harness file

**Prompt**

Look at `data/campus_customs.db` again and understand every table, at least catalogue, inventory, and users. Start `output/harness.md`. For each table, write the fields and one short line on why that field matters for the shop or the chatbot. Keep growing this file later with models, tools, safety, and specs.

No follow-up. The harness file from Problem 1 already had every field and a reason for it. I checked the database again and the tables had not changed, so nothing new had to be written.

## Problem 3 — Build the Campus Customs website

**Prompt**

Scaffold a React + Vite + TypeScript front end for Campus Customs. Put a nav bar at the top that links to Home, Products, About Us, Log in, and Create account. Pull Campus Customs-style wording from yalebulldogblue.com for Home and About Us, but write those pages in my own voice and do not copy the original site text. On Products, show catalogue images (use the image paths in the database) with name, price, and a short description. Each product opens its own page: large image on one side, full text on the other (description, price, sizes and stock). Clicking a card goes there. Add a chat panel in the bottom right. It does not need to talk to an agent yet — a stub that will call the backend later is enough. Start a small FastAPI app in `backend/main.py` to serve products and images, and grow it into the agent backend later.

No follow-up. The prompt trailed off at “grow it into the agent backend in,” but the pages, the product API, and the chat stub were already specified.

## Problem 4 — Create account and login

**Prompt**

Build a normal create-account and login flow. Create account asks for first name, last name, email, and password, with confirm password. Log in asks for email and password. New accounts go into the users table. Store passwords so they cannot be read back: PBKDF2-HMAC-SHA256, 120,000 iterations, stored as `pbkdf2_sha256$salt$hash`. Login never un-hashes. It reads the salt from the middle piece, re-hashes the typed password with that same salt, and compares with a constant-time compare. Signup and login must use the same settings. Confirm the seeded user `test@campuscustoms.yale.edu` / `password`, and a brand-new account created in the app. Update `output/harness.md` with what we store for a user and how passwords are protected.

No follow-up. The seed hash matched those settings when the salt was used as plain text, so the forms could be wired straight to that check.

## Problem 5 — PydanticAI agent backend

**Prompt**

Build the shop chatbot as a PydanticAI agent behind FastAPI, and plug it into the chat widget. Keep the API in `backend/main.py` and run it with Uvicorn from the `backend/` folder: `uvicorn main:app --reload --port 8000`. Put the agent in four files next to it, like Homework 3: `backend/prompts/prompt.md` for the system prompt, `backend/agent.py` for wiring, `backend/tools.py` for tools, and `backend/models.py` for the structured types. The chat route should take a message from the site and return the agent's reply. Use the Portkey key and a 5.6 or 6 series model. Put Campus Customs voice and basic safety in the prompt. Add types for chat replies and product cards. In `output/harness.md`, note how the front end talks to FastAPI and how the agent is loaded (prompt file plus model).

No follow-up. The Homework 3 Portkey wiring and the `gpt-6-astra` model name were already on this machine, so the chat route could use that setup.

## Problem 6 — Tools: product info and stock

**Prompt**

Give the agent tools that look up real rows in `campus_customs.db`: the product description, the price, and how many are in stock, by size when the shopper asks. The agent has to use the database and must not invent prices or quantities. If a size is out of stock, say so clearly. Expand `prompts/prompt.md` so it calls these tools for price and stock questions. Add or update the return types in `models.py`. In `output/harness.md`, list each tool and why each lookup field is there.

No follow-up. Search and product lookup were already wired, so this pass turned their results into typed description, price, and size-count models and spelled out the out-of-stock rule in the prompt.

## Problem 7 — Chat search that updates the page

**Prompt**

When a shopper asks about a type of item, such as "what hoodies do you have?", the agent should search the catalogue and the website should show those matches as product cards (image, name, price, short info). This is an API contract: the agent returns structured product matches and the front end renders them. After those cards load, clicking one — including a card the chat just put on the page — must still open the single-item page from Problem 3. Update `prompts/prompt.md` and `output/harness.md` so it is clear how search results reach the page.

No follow-up. The chat response already carried product cards inside the panel; this pass draws that same list on the page with the catalogue card, and the prompt now tells the agent to fill `product_ids` from a category search.

## Problem 8 — Customer memory

**Prompt**

When a shopper is logged in, save their chat history in the database and reload it when they return. The agent should know who is chatting (name and email), in agent deps or a tool it can call. Also pass enough page context that if someone is on a product page and asks "do you have this in pink?", the agent knows which item they mean. Guests can still chat, but history only needs to persist for logged-in users. Document in `output/harness.md` how the history is stored, which customer fields the agent sees, and how page context is passed.

No follow-up. Signed-in turns were already inserted into `chat_messages`; this pass reloads that thread, puts the account and the open product on the agent turn, and leaves guests unsaved.

## Problem 9 — Usability improvements

**Prompt**

Now that the core shop works, improve it. Choose and implement 2 front-end usability improvements and 2 agent or backend usability improvements. Front-end ones should make the site easier to use. Agent ones should make the output better, more accurate, or safer, or make the agent faster or cheaper. Write `output/usability.md` before or as you build, and for each improvement say what you added and why it helps a Campus Customs shopper or the business.

No follow-up. The four improvements are garment filters, an "ask about this piece" chat entry, a database read of the open product before the model answers, and a local refusal for password and prompt questions.

## Problem 10 — Style the website

**Prompt**

Reskin Campus Customs as a whimsical Yale candy factory, Willy Wonka in spirit but original. Visual and copy only: do not change API calls, routes, data, auth, cart logic, stock counts, or the agent's tools. Use Yale blue, night, gold, cream, chocolate, candy pink, and mint, with Abril Fatface for headings. Restyle the header, home hero and wrappers, shared product cards, Inventing Room filters, chocolatier chat, ticket-shaped account forms, a local candy basket, a 404 line, and the footer. One product per session gets a golden-ticket badge. Update the agent's system prompt voice and write `output/design.md`.

No follow-up. The working shop stayed on the same routes and catalogue calls; this pass changed the look, the storefront copy, and the chocolatier's voice.

## Problem 11 — Site testing (app check)

**Prompt**

Test the live site and write `output/app_check.html`, a page I can double-click open. Include a screenshot and a short caption for a chat inventory check with honest stock and price, for the product cards that appear after a category question such as hoodies, and for one Problem 9 usability feature. Put the images in `output/app_check_images/` and link them with relative paths.

No follow-up. The running shop already answered from the database, so this pass only captured the three screens and wrote the check page.

## Problem 12 — Audit trail, safety, finish harness

**Prompt**

Keep an append-only `output/audit_trail.json` of agent-loop activity: time, tool name, short args and result, and the stop reason. Do not wipe it between runs. Add safety rules to `prompts/prompt.md`. Finish `output/harness.md` so it explains the model fields and why they are there, the tools and what they can do, the safety rules, and the specs: loop limits, result caps, which model, and how to run the front end and the backend.

No follow-up. The shop tools and routes stayed as they were. This pass records each run, tightens the prompt's safety section, and writes those pieces into the harness.

## Problem 13 — Push to GitHub and submit the URL

**Prompt**

Put the project in a public GitHub repo whose folder is named hw4, matching the expected layout: AI_prompts, requirements, .env.example, gitignore, README, frontend, backend (main, agent, models, tools, prompts/prompt.md), and output (harness, design, usability, app check, audit trail). Do not commit the real env file, campus_customs.db, or the product images. README should say how to run the front end and the back end after the data pack is in place. Submit the repo URL on Canvas, not a zip.

No follow-up. The site files were already in this folder, so this pass added the root requirements file, the placeholder env example, the README, and the public repo.
