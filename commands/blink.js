const AuroraBetaStyler = require('@aurora/styler');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const _dirnameFixed = path.resolve();

const blinkCommand = {
 config: {
 name: 'blink',
 description: 'Make a user blink using their profile picture',
 usage: '@user or reply',
 aliases: [],
 category: 'fun',
 role: 0,
 author: 'zzach',
 nonPrefix: false,
 },

 run: async function({ api, event, args }) {
 const { threadID, messageID, senderID } = event;
 if (!threadID || !messageID) return;

 // === Resolve target like spank command ===
 let targetID;
 if (args.join().includes('@')) {
 targetID = Object.keys(event.mentions)[0];
 } else if (event.type === 'messagereply' && event.messageReply.senderID) {
 targetID = event.messageReply.senderID;
 } else if (args[0]) {
 targetID = args[0];
 } else {
 return api.sendMessage(
 AuroraBetaStyler.styleOutput({
 headerText: 'Blink Error',
 headerSymbol: '⚠️',
 headerStyle: 'bold',
 bodyText: 'Please reply to a message, mention 1 user, or provide a UID.',
 bodyStyle: 'sansSerif',
 footerText: '',
 }),
 threadID,
 messageID
 );
 }

 try {
 const userInfo = await api.getUserInfo([targetID]);
 const name = userInfo[targetID]?.name || 'Someone';

 // === Send initial progress message ===
 const initialMessage = await api.sendMessage("Creating... □□□□□ 0%", threadID, messageID);
 const sentMessageID = initialMessage.messageID;

 const progressSteps = [
 { time: 2000, text: "■□□□□ 20%" },
 { time: 4000, text: "■■■□□ 60%" },
 { time: 6000, text: "■■■■□ 80%" },
 { time: 8000, text: "■■■■■ 100%" },
 ];

 for (let i = 0; i < progressSteps.length; i++) {
 await new Promise(resolve => setTimeout(resolve, progressSteps[i].time));
 await api.editMessage(`Creating... ${progressSteps[i].text}`, sentMessageID, threadID);

 // When 100%, generate and send image
 if (i === progressSteps.length - 1) {
 try {
 const blinkURL = `https://betadash-api-swordslush-production.up.railway.app/blink?userid=${targetID}`;
 const outputPath = path.join(_dirnameFixed, 'cache', `blink${targetID}.gif`);
 if (!fs.existsSync(path.dirname(outputPath))) fs.mkdirSync(path.dirname(outputPath), { recursive: true });

 const response = await axios.get(blinkURL, { responseType: 'stream' });
 const writer = fs.createWriteStream(outputPath);
 response.data.pipe(writer);
 await new Promise((resolve, reject) => {
 writer.on('finish', resolve);
 writer.on('error', reject);
 });

 await api.sendMessage(
 {
 body: AuroraBetaStyler.styleOutput({
 headerText: 'Blink Result',
 headerSymbol: '👁️',
 headerStyle: 'bold',
 bodyText: `${name} is blinking!`,
 bodyStyle: 'sansSerif',
 footerText: '',
 }),
 attachment: fs.createReadStream(outputPath),
 },
 threadID,
 () => fs.promises.unlink(outputPath).catch(() => {}),
 messageID
 );

 // Auto unsend progress message after 5 seconds
 setTimeout(() => {
 api.unsendMessage(sentMessageID).catch(() => {});
 }, 5000);

 } catch (err) {
 console.error('[blink] Error sending image:', err.message);
 }
 }
 }

 } catch (error) {
 console.error('[blink] Error:', error.stack || error.message);
 await api.sendMessage(
 AuroraBetaStyler.styleOutput({
 headerText: 'Blink Error',
 headerSymbol: '❌',
 headerStyle: 'bold',
 bodyText: `Error: ${error.message || 'Unknown error'}`,
 bodyStyle: 'sansSerif',
 footerText: '',
 }),
 threadID,
 messageID
 );
 }
 }
};

module.exports = blinkCommand;