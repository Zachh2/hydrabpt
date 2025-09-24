module.exports = {
    name: "imageChange",
    handleEvent: true,

    async handleEvent({ api, event }) {
        if (event.logMessageType === "log:thread-icon") {
            const threadID = event.threadID;

            api.sendMessage(` The group profile picture has been updated!`, threadID);
        }
    }
};
