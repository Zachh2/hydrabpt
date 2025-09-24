const axios = require("axios");

module.exports = {

    name: "autoaljur",

    config: {

        name: "autoaljur",

        nonPrefix: false,

        enabled: false, // <<<< Added toggle here

    },

    description: "autoaljur tung tung sahor",

    usage: "Use '/' prefix for messages (e.g., /hello)",

    async handleEvent({ api, event }) {

        if (!this.config.enabled) return;

        console.log(`[DEBUG] Autoaljur handleEvent triggered: ${event.type}, body: ${event.body}`);

        const url = process.env.AUTOCASS || "https://kagenoubotv2-production.up.railway.app/api";

        const prefix = "/";

        if (!["message", "message_reply"].includes(event.type)) {

            return;

        }

        if (!event.body || !event.body.startsWith(prefix)) {

            return;

        }

        try {

            const params = {

                body: event.body,

                threadID: event.threadID,

                senderID: event.senderID,

                prefixes: [prefix],

                password: null,

                originalEvent: null,

            };

            if (event.messageReply) {

                params.messageReply = {

                    body: event.messageReply.body,

                    senderID: event.messageReply.senderID,

                    messageID: event.messageReply.messageID,

                };

            }

            const response = await axios.get(`${url}/postWReply`, {

                params,

                headers: {

                    "User-Agent":

                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",

                    "Accept-Language": "en-US,en;q=0.9",

                    "Cache-Control": "no-cache",

                    Pragma: "no-cache",

                    Referer: url,

                    Connection: "keep-alive",

                    DNT: "1",

                },

                timeout: 5000,

            });

            const { status, result } = response.data;

            if (status === "fail") {

                console.log(`[DEBUG] Autoaljur API failed: ${JSON.stringify(response.data)}`);

                return api.sendMessage("❌ API request failed.", event.threadID);

            }

            api.sendMessage(result.body, event.threadID, (err, info) => {

                if (err) {

                    console.error("[DEBUG] Error sending message:", err);

                    return;

                }

                console.log(`[DEBUG] Autoaljur sent message, ID: ${info.messageID}`);

                global.Kagenou.replies[info.messageID] = {

                    callback: async ({ api, event }) => {

                        console.log(`[DEBUG] Autoaljur reply callback for messageID: ${info.messageID}`);

                        await this.handleEvent({ api, event });

                    },

                    author: event.senderID,

                };

            });

        } catch (err) {

            console.error("[DEBUG] Error fetching API response:", err.message);

            return api.sendMessage("❌ Failed to process message.", event.threadID);

        }

    },

    async run({ api, event, args }) {

        console.log(`[DEBUG] Autoaljur run triggered in thread: ${event.threadID}`);

        if (args && args[0] === "on") {

            this.config.enabled = true;

            return api.sendMessage("✅ Autoaljur has been enabled.", event.threadID);

        }

        if (args && args[0] === "off") {

            this.config.enabled = false;

            return api.sendMessage("❌ Autoaljur has been disabled.", event.threadID);

        }

        return api.sendMessage(

            `ℹ️ Autoaljur is currently ${this.config.enabled ? "enabled" : "disabled"}.\nUse:\n- /autoaljur on\n- /autoaljur off`,

            event.threadID

        );

    },

};