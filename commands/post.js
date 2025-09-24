const axios = require("axios");

module.exports = {

  name: "post",

  description: "Post multiple pictures using the bot (Admin only). Usage: [reply with attachment or provide URL in args]",

  author: "Kenneth panio | Aljur pogoy",

  role: 1,

  cooldown: 10,

  async run({ api, event, args }) {

    const { threadID, messageID } = event;

    if (event.type !== "message_reply" && args.length === 0) {

      return api.sendMessage(

        "Please reply to an image you want to post or provide a text directly.",

        threadID,

        messageID

      );

    }

    let imageUrls = [];

    let caption = args.join(" ").trim();

    let result = "Failed To Post";

    if (event.messageReply && event.messageReply.attachments && event.messageReply.attachments.length > 0) {

      imageUrls = event.messageReply.attachments.map(attachment => attachment.url);

    } else if (event.messageReply && event.messageReply.body) {

      caption = event.messageReply.body;

    }

    try {

      if (imageUrls.length > 0) {

        const imageStreams = await Promise.all(

          imageUrls.map(async (url) => {

            const response = await axios.get(url, { responseType: "stream" });

            return response.data;

          })

        );

        await api.sendMessage(

          { body: caption || "", attachment: imageStreams },

          threadID,

          (err) => {

            if (err) {

              result = `Failed To Post: ${err.message}`;

            } else {

              result = "Successfully Posted";

            }

          },

          messageID

        );

      } else if (caption) {

        await api.sendMessage(caption, threadID, (err) => {

          if (err) {

            result = `Failed To Post: ${err.message}`;

          } else {

            result = "Successfully Posted";

          }

        }, messageID);

      }

      await api.sendMessage(result, threadID, messageID);

    } catch (error) {

      await api.sendMessage(`Failed To Post: ${error.message}`, threadID, messageID);

    }

  },

};