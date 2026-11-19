Task: Telegram Mini App Shop
Overview
We need to build a Telegram Mini App (a shop/catalog) that runs inside Telegram. It displays a catalog of items based on local JSON data, allows viewing details with an infinite image slider, and has a "Buy" button that redirects the user to a specific Telegram chat with a pre-filled message (item name, price, and preview image).

File System Example
project-root/
├── src/
│ ├── components/
│ ├── index.ts
│ └── assets/
│ └── gallery/
│ ├── forestView/
│ │ ├── 0.webp
│ │ └── 1.webp
│ └── oceanView/
│ ├── 0.webp
│ ├── 1.webp
│ └── 2.webp
├── package.json
├── .env
└── README.md

JSON Structure Example
[
{
"name": "Forest Thicket",
"price": "20000₽",
"description": "Some description up to 250 tokens",
"assetsArray": "forestView",
"paintedAt": 1795082220
}
]

Note: paintedAt is the creation date, not the date added to the catalog.

Requirements
Catalog: Renders from JSON, showing only 0.webp (preview) for each item.

Item Page: Clicking on an item opens a page with full details and an infinite slider showing all images from 1.webp to the last one found in the folder.

Buy Button: Redirects to a chat with a user specified in .env. It reads the item name, price, and 0.webp image, and inserts them into the chat message sent from the user who clicked.

Backend: A Node.js backend is required to securely interact with Telegram API. The Telegram API key must be in .env and must never be exposed to the frontend.

Docker: The entire product must be packaged into a single Docker container.

Post-Development Requirements
Run an AI Critic Agent (for code quality and optimization).

Run an AI Security Agent.

Both agents must produce a report with corrections.

Apply corrections via a separate Pull Request.