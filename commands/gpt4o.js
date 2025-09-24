// tamad ako mag arrange ng code : ) 



const axios = require("axios");

const fs = require("fs");

const path = require("path");

const { get } = require("https");

module.exports = {

    config: {

        name: "gpt4o",

        description: "Interact with the GPT-4O API for conversational responses, including attachments.",

        usage: "/gpt4o <query>",

        nonPrefix: true

    },

    run: async ({ api, event, args, admins }) => {

        const { threadID, messageID, senderID, messageReply } = event;

        const query = args.join(" ").trim();
        
        
        if (!admins.includes(senderID)) {

      return api.sendMessage(

        "════『 GPT4O premium 』════\n\n❌ Only admins and VIP can use this Command.",

        threadID,

        messageID

      );

    }

        if (!query) {

            return api.sendMessage("Please provide a query. Usage: /gpt4o <query>", threadID, messageID);

        }

        try {

            let userImageUrl = null;

            let userAttachmentPath = null;

            
            if (messageReply && messageReply.attachments && messageReply.attachments.length > 0) {

                const attachment = messageReply.attachments[0];

                if (attachment.type === "photo") {

                    userImageUrl = attachment.url;

                   
                    const fileName = `gpt4o_user_${Date.now()}.jpg`;

                    userAttachmentPath = path.join(__dirname, fileName);

                    const file = fs.createWriteStream(userAttachmentPath);

                    await new Promise((resolve, reject) => {

                        get(userImageUrl, (response) => {

                            response.pipe(file);

                            file.on("finish", () => {

                                file.close();

                                resolve();

                            });

                        }).on("error", reject);

                    });

                }

            }

            
            const askParam = userImageUrl ? `${query} (Attached Image: ${userImageUrl})` : query;

            
            const response = await axios.get("https://haji-mix.up.railway.app/api/gpt4o", {

                params: {

                    ask: askParam,

                    uid: senderID,

                    roleplay: "you are ai assistant",

                    cookie: "21b2b7f078ab98cb5af9a0bd4eaa24c4e1c3ec20b1c864006a6f03cf0eee6006"

                }

            });

            const gpt4oResponse = response.data.answer || "No response from GPT-4O API.";

            const apiImages = response.data.images || [];

            const apiAttachmentPaths = [];

            
            for (let i = 0; i < apiImages.length; i++) {

                const image = apiImages[i];

                if (image.url) {

                    const fileName = `gpt4o_api_${Date.now()}_${i}.jpg`;

                    const apiAttachmentPath = path.join(__dirname, fileName);

                    const file = fs.createWriteStream(apiAttachmentPath);

                    await new Promise((resolve, reject) => {

                        get(image.url, (response) => {

                            response.pipe(file);

                            file.on("finish", () => {

                                file.close();

                                resolve();

                            });

                        }).on("error", reject);

                    });

                    apiAttachmentPaths.push(apiAttachmentPath);

                }

            }

            
            const messageContent = `${gpt4oResponse}\n\nReply to this message to continue the conversation.`;

            let sendOptions = messageContent;

            
            if (userAttachmentPath || apiAttachmentPaths.length > 0) {

                const attachments = [];

                if (userAttachmentPath) attachments.push(fs.createReadStream(userAttachmentPath));

                apiAttachmentPaths.forEach((path) => attachments.push(fs.createReadStream(path)));

                sendOptions = { body: messageContent, attachment: attachments };

            }

           
            api.sendMessage(sendOptions, threadID, (err, messageInfo) => {

                if (err) {

                    console.error("Error sending GPT-4O message:", err);

                    return;

                }

                

                global.Kagenou.replies[messageInfo.messageID] = {

                    author: senderID,

                    conversationHistory: [{ user: query, bot: gpt4oResponse }],

                    callback: async ({ api, event, data }) => {

                        const userReply = event.body.trim();

                        try {

                            

                            const followUpResponse = await axios.get("https://haji-mix.up.railway.app/api/gpt4o", {

                                params: {

                                    ask: userReply,

                                    uid: senderID,

                                    roleplay: "you are ai assistant",

                                    cookie: "21b2b7f078ab98cb5af9a0bd4eaa24c4e1c3ec20b1c864006a6f03cf0eee6006"

                                }

                            });

                            const newGpt4oResponse = followUpResponse.data.answer || "No response from GPT-4O API.";

                            const newApiImages = followUpResponse.data.images || [];

                            const newApiAttachmentPaths = [];

                           

                            for (let i = 0; i < newApiImages.length; i++) {

                                const image = newApiImages[i];

                                if (image.url) {

                                    const fileName = `gpt4o_api_${Date.now()}_${i}.jpg`;

                                    const newApiAttachmentPath = path.join(__dirname, fileName);

                                    const file = fs.createWriteStream(newApiAttachmentPath);

                                    await new Promise((resolve, reject) => {

                                        get(image.url, (response) => {

                                            response.pipe(file);

                                            file.on("finish", () => {

                                                file.close();

                                                resolve();

                                            });

                                        }).on("error", reject);

                                    });

                                    newApiAttachmentPaths.push(newApiAttachmentPath);

                                }

                            }

                            

                            const newMessage = `${newGpt4oResponse}\n\nReply to this message to continue the conversation.`;

                            const newSendOptions = newApiAttachmentPaths.length > 0

                                ? { body: newMessage, attachment: newApiAttachmentPaths.map(path => fs.createReadStream(path)) }

                                : newMessage;

                            data.conversationHistory.push({ user: userReply, bot: newGpt4oResponse });

                            
                            api.sendMessage(newSendOptions, event.threadID, (err, newMessageInfo) => {

                                if (err) {

                                    console.error("Error sending follow-up GPT-4O message:", err);

                                    return;

                                }

                                
                                global.Kagenou.replies[newMessageInfo.messageID] = {

                                    author: senderID,

                                    conversationHistory: data.conversationHistory,

                                    callback: global.Kagenou.replies[messageInfo.messageID].callback

                                };

                               

                                delete global.Kagenou.replies[messageInfo.messageID];

                                

                                newApiAttachmentPaths.forEach((path) => {

                                    setTimeout(() => {

                                        if (fs.existsSync(path)) fs.unlinkSync(path);

                                    }, 300000);

                                });

                            }, event.messageID);

                        } catch (error) {

                            console.error("Error in GPT-4O reply:", error);

                            api.sendMessage("An error occurred while processing your reply with GPT-4O API.", event.threadID, event.messageID);

                            delete global.Kagenou.replies[messageInfo.messageID];

                        }

                    }

                };

                

                setTimeout(() => {

                    delete global.Kagenou.replies[messageInfo.messageID];

                    if (userAttachmentPath && fs.existsSync(userAttachmentPath)) fs.unlinkSync(userAttachmentPath);

                    apiAttachmentPaths.forEach((path) => {

                        if (fs.existsSync(path)) fs.unlinkSync(path);

                    });

                }, 300000);

            }, messageID);

        } catch (error) {

            console.error("Error querying GPT-4O API:", error);

            api.sendMessage("An error occurred while contacting the GPT-4O API.", threadID, messageID);

            

            if (userAttachmentPath && fs.existsSync(userAttachmentPath)) fs.unlinkSync(userAttachmentPath);

        }

    }

};