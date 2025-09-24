const AuroraBetaStyler = require('@aurora/styler');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const _dirnameFixed = path.resolve();

const tikstalkCommand = {
 config: {
 name: 'tikstalk',
 description: 'Get TikTok user statistics',
 usage: '[username]',
 aliases: [],
 category: 'fun',
 role: 0,
 author: 'zzach',
 nonPrefix: false,
 },

 run: async function({ api, event, args }) {
 const { threadID, messageID } = event;

 if (!args[0]) {
 return api.sendMessage(
 '⚠️ Please provide a TikTok username. Example: -tikstalk zyckee00',
 threadID,
 messageID
 );
 }

 const username = args[0];

 try {
 const response = await axios.get(`https://betadash-api-swordslush-production.up.railway.app/tikstalk?username=${encodeURIComponent(username)}`);
 const data = response.data;

 if (!data || !data.username) {
 return api.sendMessage('⚠️ Could not fetch TikTok user data. Please check the username.', threadID, messageID);
 }

 const message = `
📱 TikTok Stats for @${data.username}:

👤 Nickname: ${data.nickname || 'N/A'}
🆔 UserID: ${data.id || 'N/A'}
❤️ Likes: ${data.heartCount || 0}
👥 Followers: ${data.followerCount || 0}
➡️ Following: ${data.followingCount || 0}
🎥 Videos: ${data.videoCount || 0}
📝 Bio: ${data.signature || 'N/A'}
`;

 // If avatar exists, download and send as attachment
 if (data.avatarLarger) {
 const avatarPath = path.join(_dirnameFixed, 'cache', `tikstalk${username}.jpg`);
 if (!fs.existsSync(path.dirname(avatarPath))) fs.mkdirSync(path.dirname(avatarPath), { recursive: true });

 const avatarResp = await axios.get(data.avatarLarger, { responseType: 'arraybuffer' });
 fs.writeFileSync(avatarPath, Buffer.from(avatarResp.data));

 await api.sendMessage(
 {
 body: AuroraBetaStyler.styleOutput({
 headerText: 'TikTok Stalk',
 headerSymbol: '📱',
 headerStyle: 'bold',
 bodyText: message,
 bodyStyle: 'sansSerif',
 footerText: '',
 }),
 attachment: fs.createReadStream(avatarPath),
 },
 threadID,
 () => fs.promises.unlink(avatarPath).catch(() => {}),
 messageID
 );

 } else {
 // Send text only
 await api.sendMessage(
 AuroraBetaStyler.styleOutput({
 headerText: 'TikTok Stalk',
 headerSymbol: '📱',
 headerStyle: 'bold',
 bodyText: message,
 bodyStyle: 'sansSerif',
 footerText: '',
 }),
 threadID,
 messageID
 );
 }

 } catch (error) {
 console.error('[tikstalk] Error:', error.stack || error.message);
 await api.sendMessage(
 AuroraBetaStyler.styleOutput({
 headerText: 'TikStalk Error',
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

module.exports = tikstalkCommand;