const AuroraBetaStyler = require('@aurora/styler');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const _dirnameFixed = path.resolve();

const phubCommand = {
 config: {
 name: 'phub',
 description: 'Create a phub-style image with text and a user',
 usage: '@user or reply + text',
 aliases: [],
 category: 'fun',
 role: 0,
 author: 'zzach',
 nonPrefix: false,
 },

 run: async function({ api, event, args }) {
 const { threadID, messageID, senderID } = event;
 if (!threadID || !messageID) return;

 // === Resolve target user ID ===
 let targetID;
 if (args.join().includes('@')) {
 targetID = Object.keys(event.mentions)[0];
 } else if (event.type === 'messagereply' && event.messageReply.senderID) {
 targetID = event.messageReply.senderID;
 } else if (args[0]) {
 targetID = args[0];
 } else {
 targetID = senderID;
 }

 // === Get the text argument ===
 const text = args.filter(a => !a.startsWith('@')).join(' ') || 'Example Text';

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

 progressSteps.forEach((step, index) => {
 setTimeout(async () => {
 await api.editMessage(`Creating... ${step.text}`, sentMessageID, threadID);

 if (index === progressSteps.length - 1) {
 try {
 const phubURL = `https://betadash-api-swordslush-production.up.railway.app/phub?text=${encodeURIComponent(text)}&name=${encodeURIComponent(name)}&id=${targetID}`;
 const outputPath = path.join(_dirnameFixed, 'cache', `phub${targetID}.jpg`);
 if (!fs.existsSync(path.dirname(outputPath))) fs.mkdirSync(path.dirname(outputPath), { recursive: true });

 const response = await axios.get(phubURL, { responseType: 'stream' });
 const writer = fs.createWriteStream(outputPath);
 response.data.pipe(writer);
 await new Promise((resolve, reject) => {
 writer.on('finish', resolve);
 writer.on('error', reject);
 });

 await api.sendMessage(
 {
 body: AuroraBetaStyler.styleOutput({
 headerText: 'Phub Image',
 headerSymbol: '🎬',
 headerStyle: 'bold',
 bodyText: `Here is the phub image for ${name}!`,
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
 console.error('[phub] Error sending image:', err.message);
 }
 }
 }, step.time);
 });

 } catch (error) {
 console.error('[phub] Error:', error.stack || error.message);
 await api.sendMessage(
 AuroraBetaStyler.styleOutput({
 headerText: 'Phub Error',
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

module.exports = phubCommand;