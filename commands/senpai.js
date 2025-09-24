module.exports.config = {
 name: "senpai",
 version: "1.0.0",
 role: 0,
 credits: "Yunoh",
 description: "Hello Senpai, what can I assist you?",
 usages: "[hi | hello]",
 cooldowns: 1,
 hasPrefix: false
};

module.exports.run = async function({ api, event, args }) {
 const msg = "Hello Senpai what can I assist you today?";
 return api.sendMessage(msg, event.threadID, event.messageID);
};