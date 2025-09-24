const AuroraBetaStyler = require('@aurora/styler');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const _dirnameFixed = path.resolve();

const tokyoCrossingCommand = {
 config: {
 name: 'tokyo',
 description: 'Put someone on a Tokyo crossing using their profile picture',
 usage: '@user or reply',
 aliases: ['tokyo'],
 category: 'fun',
 role: 0,
 author: 'zzach',
 nonPrefix: false,
 },

 run: async function({ api, event, args }) {
 const { threadID, messageID } = event;
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
 headerText: 'Tokyo Crossing Error',
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
 { time: 8000, text: "■■■■■ 100%" }, // last step triggers the image
 ];

 progressSteps.forEach((step, index) => {
 setTimeout(async () => {
 await api.editMessage(`Creating... ${step.text}`, sentMessageID, threadID);

 // === Send the image when it reaches 100% ===
 if (index === progressSteps.length - 1) {
 try {
 const tokyoURL = `https://betadash-api-swordslush-production.up.railway.app/tokyo-crossing?userid=${targetID}`;
 const outputPath = path.join(_dirnameFixed, 'cache', `tokyocrossing${targetID}.jpg`);
 if (!fs.existsSync(path.dirname(outputPath))) fs.mkdirSync(path.dirname(outputPath), { recursive: true });

 const response = await axios.get(tokyoURL, { responseType: 'stream' });
 const writer = fs.createWriteStream(outputPath);
 response.data.pipe(writer);
 await new Promise((resolve, reject) => {
 writer.on('finish', resolve);
 writer.on('error', reject);
 });

 await api.sendMessage(
 {
 body: AuroraBetaStyler.styleOutput({
 headerText: 'Tokyo Crossing',
 headerSymbol: '🗼',
 headerStyle: 'bold',
 bodyText: `${name} is now on Tokyo Crossing!`,
 bodyStyle: 'sansSerif',
 footerText: '',
 }),
 attachment: fs.createReadStream(outputPath),
 },
 threadID,
 () => fs.promises.unlink(outputPath).catch(() => {}),
 messageID
 );

 // === Auto unsend progress message after 5 seconds ===
 setTimeout(() => {
 api.unsendMessage(sentMessageID).catch(() => {});
 }, 5000);

 } catch (err) {
 console.error('[tokyo-crossing] Error sending image:', err.message);
 }
 }
 }, step.time);
 });

 } catch (error) {
 console.error('[tokyo-crossing] Error:', error.stack || error.message);
 await api.sendMessage(
 AuroraBetaStyler.styleOutput({
 headerText: 'Tokyo Crossing Error',
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

module.exports = tokyoCrossingCommand;