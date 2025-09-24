import axios from "axios";

namespace ShadowBot {
  export interface Command {
    config: {
      name: string;
      description: string;
      usage: string;
      nonPrefix: boolean;
    };
    run: (context: { api: any; event: any; args: string[] }) => Promise<void>;
  }
}

const aiCommand: ShadowBot.Command = {
  config: {
    name: "ai",
    description: "Interact with the Gemini Vision API for conversational responses.",
    usage: "ai <query>",
    nonPrefix: true,
  },
  run: async ({ api, event, args }: { api: any; event: any; args: string[] }) => {
    const { threadID, messageID, senderID } = event;
    const query = args.join(" ").trim();

    if (!query) {
      return api.sendMessage("Please provide a query.", threadID, messageID);
    }
// ?ask=Hello&uid=4&apikey=
    try {
      const response = await axios.get("https://kaiz-apis.gleeze.com/api/aria", {
        params: {
          ask: query, // Changed from 'ask' to 'q' based on the new API
          uid: senderID,
          apikey: "117cafc8-ef3b-4632-bc1c-13b38b912081",
          // imageUrl is omitted unless you want to add image support
        },
      });
      const geminiResponse = response.data.response || "No response from Gemini Vision API.";
      const message = `${geminiResponse}\n\nReply to this message to continue the conversation.`;

      let sentMessageID: string;
      await new Promise((resolve, reject) => {
        api.sendMessage(message, threadID, (err, messageInfo) => {
          if (err) {
            reject(err);
          } else {
            sentMessageID = messageInfo.messageID;
            resolve(messageInfo);
          }
        }, messageID);
      });

      if (!global.Kagenou.replyListeners) {
        global.Kagenou.replyListeners = new Map();
      }

      const handleReply = async (ctx: { api: any; event: any; data?: any }) => {
        const { api, event } = ctx;
        const { threadID, messageID } = event;
        const userReply = event.body?.trim() || "";

        try {
          const followUpResponse = await axios.get("https://kaiz-apis.gleeze.com/api/gemini-vision", {
            params: {
              q: userReply, // Changed from 'ask' to 'q'
              uid: senderID,
              apikey: "117cafc8-ef3b-4632-bc1c-13b38b912081",
              // imageUrl is omitted unless you want to add image support
            },
          });
          const newGeminiResponse = followUpResponse.data.response || "No response from Gemini Vision API.";
          const newMessage = `${newGeminiResponse}\n\nReply to this message to continue the conversation.`;

          let newSentMessageID: string;
          await new Promise((resolve, reject) => {
            api.sendMessage(newMessage, threadID, (err, newMessageInfo) => {
              if (err) {
                reject(err);
              } else {
                newSentMessageID = newMessageInfo.messageID;
                resolve(newMessageInfo);
              }
            }, messageID);
          });

          global.Kagenou.replyListeners.set(newSentMessageID, { callback: handleReply });
        } catch (error) {
          api.sendMessage("An error occurred while processing your reply with Gemini Vision API.", threadID, messageID);
        }
      };

      global.Kagenou.replyListeners.set(sentMessageID, { callback: handleReply });
    } catch (error) {
      api.sendMessage("An error occurred while contacting the Gemini Vision API.", threadID, messageID);
    }
  },
};

export default aiCommand;