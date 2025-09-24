const axios = require("axios");

module.exports = {

  config: {

    name: "remini",

    description: "Enhance a photo using the Remini API in real-time. Reply to a photo with #remini.",

    usage: "#remini (reply to a photo)",

    nonPrefix: true

  },

  run: async ({ api, event, args, admins }) => {

    const { threadID, messageID, senderID, messageReply } = event;

    

    if (!admins.includes(senderID)) {

      return api.sendMessage(

        "════『 REMINI PREMUIM 』════\n\n❌ Only admins and VIP can use this command",

        threadID,

        messageID

      );

    }

    if (!messageReply || !messageReply.attachments || messageReply.attachments.length === 0 || messageReply.attachments[0].type !== "photo") {

      return api.sendMessage(

        "Please reply to a message containing a photo to enhance it with Remini.\nUsage: Reply to a photo with #remini",

        threadID,

        messageID

      );

    }

    const photoUrl = messageReply.attachments[0].url;

    try {

      const response = await axios.get("https://kaiz-apis.gleeze.com/api/remini?url=" + encodeURIComponent(photoUrl) + "&stream=true&apikey=6345c38b-47b1-4a9a-8a70-6e6f17d6641b", {

        responseType: "stream"

      });

      const contentType = response.headers["content-type"];

      if (!contentType || !contentType.startsWith("image/")) {

        return api.sendMessage(

          "The Remini API did not return an image. Please try a different photo.",

          threadID,

          messageID

        );

      }

      const messageContent = " ✨ There you go";

      const sendOptions = {

        body: messageContent,

        attachment: response.data 

      };

      api.sendMessage(sendOptions, threadID, (err, messageInfo) => {

        if (err) {

          console.error("Error sending remini message:", err);

          api.sendMessage("Failed to send the enhanced image.", threadID, messageID);

        }

      }, messageID);

    } catch (error) {

      console.error("Error in remini command:", error.message);

      api.sendMessage(

        `An error occurred while enhancing the image: ${error.message}\nPlease try a different photo.`,

        threadID,

        messageID

      );

    }

  }

};