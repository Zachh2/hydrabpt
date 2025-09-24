const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

module.exports.config = {
 name: "pastecode",
 version: "1.0",
 role: 0,
 hasPrefix: false,
 credits: "Romeo & Juliet kantotan",
 description: "Upload files or code snippets to paste.c-net.org and send the link",
 usages: "pastecode [filename] or reply with code",
 cooldowns: 5
};

module.exports.run = async ({ api, event, args }) => {
 const { threadID, messageID } = event;

 if (event.type === "message_reply") {
 // Handling code from replied message
 const code = event.messageReply.body;
 try {
 const response = await axios.post('https://paste.c-net.org/', code, {
 headers: { 'X-FileName': 'replied-code.txt' }
 });
 const pasteUrl = `${response.data}`;
 api.sendMessage(`Code uploaded to: ${pasteUrl}`, threadID, messageID);
 } catch (error) {
 console.error(error);
 api.sendMessage('An error occurred while uploading the code!', threadID, messageID);
 }
 } else {
 // Handling file upload
 if (!args.length) {
 return api.sendMessage('Please provide a filename!', threadID, messageID);
 }

 const fileName = args[0];
 const filePathWithoutExtension = path.join(__dirname, '..', 'cmds', fileName);
 const filePathWithExtension = path.join(__dirname, '..', 'cmds', fileName + '.js');

 if (!fs.existsSync(filePathWithoutExtension) && !fs.existsSync(filePathWithExtension)) {
 return api.sendMessage('File not found!', threadID, messageID);
 }

 const filePath = fs.existsSync(filePathWithoutExtension) ? filePathWithoutExtension : filePathWithExtension;

 try {
 const code = await fs.readFile(filePath, "utf-8");
 const response = await axios.post('https://paste.c-net.org/', code, {
 headers: { 'X-FileName': path.basename(filePath) }
 });
 const pasteUrl = `${response.data}`;
 api.sendMessage(`File uploaded to: ${pasteUrl}`, threadID, messageID);
 } catch (error) {
 console.error(error);
 api.sendMessage('An error occurred while uploading the file!', threadID, messageID);
 }
 }
};

module.exports.pasteget = async ({ api, event, args }) => {
 const url = 'https://paste.c-net.org/';

 if (args.length) {
 for (const arg of args) {
 try {
 const response = await axios.get(`${url}${arg}`);
 api.sendMessage(`Retrieved content from ${url}${arg}:\n\n${response.data}`, event.threadID, event.messageID);
 } catch (error) {
 console.error(error);
 api.sendMessage(`An error occurred while retrieving ${url}${arg}`, event.threadID, event.messageID);
 }
 }
 } else {
 api.sendMessage('Please provide the paste IDs to retrieve!', event.threadID, event.messageID);
 }
};