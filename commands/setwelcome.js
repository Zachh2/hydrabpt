const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "setwelcome",
    description: "Set a global welcome message for new users (with API image)",
    role: 2,
    cooldown: 5,
    aliases: ["welcome", "setgreet"],
  },

  handleEvent: true,

  async handleEvent({ api, event }) {
    if (event.logMessageType === "log:subscribe") {
      const threadID = event.threadID;
      const addedUsers = event.logMessageData.addedParticipants;

      if (!addedUsers || addedUsers.length === 0) return;

      // If the bot itself is added
      if (addedUsers.some(u => u.userFbId === api.getCurrentUserID())) {
        return api.sendMessage(
          "Hello! I'm your bot. Type -help to see my commands!",
          threadID
        );
      }

      // Loop through all added users
      for (const user of addedUsers) {
        const userName = user.fullName || "User";
        const userID = user.userFbId;
        const avatarUrl = `https://graph.facebook.com/${userID}/picture?width=512`;

        // Replace placeholder in global message
        const welcomeMessage =
          global.welcomeMessage ||
          "🎉 Welcome {userNames} to the group chat! Enjoy your stay!";
        const formattedMessage = welcomeMessage.replace(
          "{userNames}",
          `@${userName}`
        );

        // Build API URL
        const apiUrl = `https://kaiz-apis.gleeze.com/api/welcomeV2?nickname=${encodeURIComponent(
          userName
        )}&secondText=${encodeURIComponent(
          formattedMessage
        )}&avatar=${encodeURIComponent(
          avatarUrl
        )}&apikey=711a6346-5a94-4ce0-87fd-013ae3f0238d`;

        try {
          // Download API image
          const imgPath = path.join(
            __dirname,
            "cache",
            `welcome_${userID}.png`
          );
          if (!fs.existsSync(path.dirname(imgPath))) {
            fs.mkdirSync(path.dirname(imgPath), { recursive: true });
          }

          const response = await axios.get(apiUrl, { responseType: "arraybuffer" });
          fs.writeFileSync(imgPath, Buffer.from(response.data, "binary"));

          // Send message with API image
          await api.sendMessage(
            {
              body: formattedMessage,
              mentions: [{ tag: `@${userName}`, id: userID }],
              attachment: fs.createReadStream(imgPath),
            },
            threadID,
            () => fs.unlinkSync(imgPath) // Delete after sending
          );
        } catch (err) {
          console.error("[WELCOME API ERROR]", err.message);
          // Fallback: send plain text if API fails
          api.sendMessage(formattedMessage, threadID);
        }
      }
    }
  },

  async run({ api, event, args }) {
    const { threadID, messageID } = event;
    const newMessage = args.join(" ");

    if (!newMessage) {
      return api.sendMessage(
        "⚠️ Please provide a welcome message (e.g., #setwelcome Welcome {userNames}!)",
        threadID,
        messageID
      );
    }

    try {
      global.welcomeMessage = newMessage;
      await api.sendMessage(
        `✅ Global welcome message updated to: ${newMessage}`,
        threadID,
        messageID
      );
    } catch (error) {
      await api.sendMessage(
        `❌ Error updating welcome message: ${error.message}`,
        threadID,
        messageID
      );
    }
  },
};
