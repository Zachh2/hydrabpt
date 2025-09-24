

---

# Tutorial: How to Set Up Your Discord Bot and Get a Token

~~1. Install Node.js
• Download and install Node.js version 18 or later from https://nodejs.org/
• Verify installation by running node -v and npm -v in a terminal.~~


### 2. Create a Discord Application
• Go to https://discord.com/developers/applications
• Click New Application, give it a name, and click Create.


### 3. Add a Bot User
• In your new application, open the Bot tab.
• Click Add Bot and confirm.
• Under Privileged Gateway Intents, enable MESSAGE CONTENT INTENT and any others you need.
• Click Reset Token and then Copy. This is your bot token—keep it private.


### 4. Invite the Bot to a Server
• In the Developer Portal, go to OAuth2 → URL Generator.
• Under Scopes, check bot.
• Under Bot Permissions, select the permissions your bot needs (for example: Send Messages, Read Messages).
• Copy the generated URL, paste it into your browser, and choose a server you manage to invite the bot.


### 5. Set Up the Project
• Place your bot’s code (including index.js and config.json) in a folder on your computer.
• In a terminal, navigate to that folder.
• Run npm install to install the required packages.


### 6. Add Your Token
• Open config.json.
• Replace "" with the token you copied from the Developer Portal.


### 7. Run the Bot
• In the terminal, run node index.js (or node run.js if you have a separate runner file).
• You should see a message like Logged in as YourBotName#1234 once it starts successfully.


### 8. Keep Your Token Safe
• **Never share the token publicly or commit it to public repositories.**
• If it’s ever exposed, reset it immediately from the Developer Portal.

---
