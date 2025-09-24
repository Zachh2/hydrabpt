module.exports = {

    name: "tid",

    nonPrefix: true,

    description: "Check the bot's response time (latency).",

    usage: "tid",

    async run({ api, event }) {

        const { threadID, messageID } = event;

        const startTime = Date.now();

        // Send initial message

        const sendMessage = await api.sendMessage("Jas wait sir!!!...", threadID, messageID);

        // Calculate latency

        const latency = Date.now() - startTime;

        // Edit or send follow-up message with latency

        return api.sendMessage(

            ` THREAD ID: ${threadID}\n\n Latency is ${latency}ms`,

            threadID,

            sendMessage.messageID

        );

    }

};