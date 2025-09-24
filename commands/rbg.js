const axios = require("axios");

module.exports = {

    config: {

        name: "rbg",

        description: "rbg sir!.",
        
        author: "Aljur pogoy",

        usage: "#rbg (reply to a photo)",

        nonPrefix: true

    },

    run: async ({ api, event, args }) => {

        const { threadID, messageID, senderID, messageReply } = event;

        // Check for replied message with photo attachment

        if (!messageReply || !messageReply.attachments || messageReply.attachments.length === 0 || messageReply.attachments[0].type !== "photo") {

            return api.sendMessage(

                "Please reply to a message containing a photo to enhance it with Remini.\nUsage: Reply to a photo with #remini",

                threadID,

                messageID

            );

        }

        const photoUrl = messageReply.attachments[0].url;

        try {

            // Query the Remini API with stream response.     
               
            
           const apikey = "6345c38b-47b1-4a9a-8a70-6e6f17d6641b";

            const response = await axios.get("https://kaiz-apis.gleeze.com/api/removebg", {

                params: {

                    url: photoUrl,

                    stream: true,
                    
                    apikey: apikey

                },

                responseType: "stream" // Expect raw image data as a stream

            });

            // Debug: Log response headers to verify content type

       

            // Verify content type is an image

            const contentType = response.headers["content-type"];

            if (!contentType || !contentType.startsWith("image/")) {

                return api.sendMessage(

                    "err sir!",

                    threadID,

                    messageID

                );

            }

            // Prepare message content

            const messageContent = "✨ There you go!.";

            const sendOptions = {

                body: messageContent,

                attachment: response.data // Stream the image directly

            };

            // Send the message with streamed image

            api.sendMessage(sendOptions, threadID, (err, messageInfo) => {

                if (err) {

                    console.error("Error sending remini message:", err);

                    api.sendMessage("Failed to send the enhanced image.", threadID, messageID);

                }

            }, messageID);

        } catch (error) {

            console.error("Error in remini command:", error.message);

            api.sendMessage(

                `An error occurred while rbg the image: ${error.message}\n`,

                threadID,

                messageID

            );

        }

    }

};