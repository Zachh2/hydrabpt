const AuroraBetaStyler = require('@aurora/styler');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const _dirnameFixed = path.resolve();

const slapCommand = {
 config: {
 name: 'slap',
 description: 'Slap a user with a generated image',
 usage: '@user or reply',
 aliases: [],
 category: 'fun',
 role: 0,
 author: 'zzach',
 nonPrefix: false,
 },

 run: async function({ api, event }) {
 const { threadID, messageID, senderID, body } = event;
 if (!threadID || !messageID) return;

 let targetID;

 // 1️⃣ Reply
 if (event.messageReply && event.messageReply.senderID) {
 targetID = event.messageReply.senderID;
 }

 // 2️⃣ Mentions from event.mentions
 if (!targetID && event.mentions && Object.keys(event.mentions).length > 0) {
 const mentionKey = Object.keys(event.mentions)[0];
 targetID = event.mentions[mentionKey]?.id;
 }

 // 3️⃣ Fallback: parse @ mentions from message text (Messenger sometimes hides event.mentions)
 if (!targetID && body) {
 const mentionMatch = body.match(/@([^\s]+)/);
 if (mentionMatch) {
 try {
 const info = await api.getUserInfo([mentionMatch[1]]);
 if (info && info[mentionMatch[1]]) targetID = mentionMatch[1];
 } catch (e) {
 // ignore
 }
 }
 }

 if (!targetID) {
 return api.sendMessage(
 AuroraBetaStyler.styleOutput({
 headerText: 'Slap Error',
 headerSymbol: '⚠️',
 headerStyle: 'bold',
 bodyText: 'Please reply to a message or mention 1 user.',
 bodyStyle: 'sansSerif',
 footerText: '',
 }),
 threadID,
 messageID
 );
 }

 try {
 const [user1Info, user2Info] = await Promise.all([
 api.getUserInfo([senderID]),
 api.getUserInfo([targetID])
 ]);

 const name1 = user1Info[senderID]?.name || 'You';
 const name2 = user2Info[targetID]?.name || 'Unknown';

 const slapURL = `https://betadash-api-swordslush-production.up.railway.app/slapv2?one=${senderID}&two=${targetID}`;
 const outputPath = path.join(_dirnameFixed, 'cache', `slap${senderID}_${targetID}.jpg`);
 if (!fs.existsSync(path.dirname(outputPath))) fs.mkdirSync(path.dirname(outputPath), { recursive: true });

 const response = await axios.get(slapURL, { responseType: 'stream' });
 const writer = fs.createWriteStream(outputPath);
 response.data.pipe(writer);
 await new Promise((resolve, reject) => {
 writer.on('finish', resolve);
 writer.on('error', reject);
 });

 await api.sendMessage(
 {
 body: AuroraBetaStyler.styleOutput({
 headerText: 'Slap Result',
 headerSymbol: '💥',
 headerStyle: 'bold',
 bodyText: `${name1} slapped ${name2}!`,
 bodyStyle: 'sansSerif',
 footerText: '',
 }),
 attachment: fs.createReadStream(outputPath),
 },
 threadID,
 () => fs.promises.unlink(outputPath).catch(() => {}),
 messageID
 );
 } catch (error) {
 console.error('[slap] Error:', error.stack || error.message);
 await api.sendMessage(
 AuroraBetaStyler.styleOutput({
 headerText: 'Slap Error',
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

module.exports = slapCommand;