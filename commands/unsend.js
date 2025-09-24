module.exports = {

  name: "unsend",

  author: "Your Name",

  nonPrefix: false, // Requires prefix (e.g., /unsend)

  description: "Reply to a bot message to unsend it.",

  async run({ api, event }) {

    // Check if the event is a reply and if the replied message is from the bot

    if (event.type === "message_reply" && event.messageReply.senderID === api.getCurrentUserID()) {

      try {

        // Try api.unsendMessage first

        await api.unsendMessage(event.messageReply.messageID);

      } catch (error) {

        // Fallback to api.deleteMessage

        try {

          await api.deleteMessage(event.messageReply.messageID);

        } catch (deleteError) {

          // Do nothing if both methods fail

        }

      }

    }

  },

};