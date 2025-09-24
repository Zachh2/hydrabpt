const axios = require('axios');

module.exports.config = {
 name: 'aniquote',
 version: '1.0.0',
 role: 0,
 hasPrefix: false,
 aliases: ['animequote', 'animeq'],
 description: "Sends a random anime quote",
 usage: "aniquote",
 credits: 'developer',
 cooldown: 3,
};

module.exports.run = async function({ api, event }) {
 api.sendMessage('Fetching an anime quote, please wait...', event.threadID, event.messageID);

 try {
 const res = await axios.get('https://hershey-api.onrender.com/api/animequotes');
 const { character, quote } = res.data;

 if (!quote || !character) {
 return api.sendMessage(
 "Sorry, I couldn't find an anime quote right now.",
 event.threadID,
 event.messageID
 );
 }

 const message = `
Anime Quote
─────────────
"${quote}"

– ${character}
─────────────`;

 api.sendMessage(message, event.threadID, event.messageID);
 } catch (error) {
 console.error('Anime quote fetch error:', error.message);
 api.sendMessage(
 `Error: Unable to retrieve an anime quote. Please try again later.`,
 event.threadID,
 event.messageID
 );
 }
};