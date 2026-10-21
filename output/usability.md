# Usability improvements

## Front end

### Garment filters on Products

What you added: The Products page has a row of filters — All, Hoodies, Crewnecks, T-shirts, Quarter-zips, Jackets, and Other — on top of the text search. The grid shows only the pieces in the chosen group.

Why it helps: The catalogue has about a hundred items. A shopper who wants a hoodie should not have to scroll past every crewneck and tee, and the shop is easier to browse on a phone.

### Ask about the piece on screen

What you added: A product page has an “Ask about this piece” button that opens the chat. The chat header says which item that question is about, the message box is focused when the panel opens, and Escape closes it.

Why it helps: Someone looking at one shirt can ask “do you have this in pink?” without hunting for the chat or retyping the product name. They can see that the question is tied to the item on the page.

## Agent and backend

### The open product is read from the database before the model answers

What you added: When the shopper is on a product page, the server loads that row — name, colors, price, and the count in each size — and puts it in the turn context. The product page and the open chat both show that catalogue line, including a size that is out of stock and one that is still in stock. “This” means that item. A question about a different item still uses the catalogue tools.

Why it helps: A color or size question stays on the shirt they are looking at, and the shopper can see the price, colors, and stock the answer is using. The shop skips an extra model lookup for the item already on screen.

### Account and prompt questions are refused before the model runs

What you added: The chat greeting says it will not share passwords, other accounts, or the instructions it follows. A message that asks for any of those gets that fixed reply and is not sent to the model. A “forgot my password” note points them to orderdept@campuscustoms.com.

Why it helps: The boundary is on screen as soon as the chat opens, those answers stay off the catalogue and off other people’s accounts, and the shop does not pay for a model call that should never see the question.
