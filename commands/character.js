const axios = require("axios");

const API_KEY = "6345c38b-47b1-4a9a-8a70-6e6f17d6641b";

const characters = {

  makima: `https://kaiz-apis.gleeze.com/api/makima?ask=&apikey=${API_KEY}`,

  gojo: `https://kaiz-apis.gleeze.com/api/gojo?ask=&apikey=${API_KEY}`,

  yorforger: `https://kaiz-apis.gleeze.com/api/yor-forger?ask=&apikey=${API_KEY}`,

  anna: `https://markdevs-last-api-p2y6.onrender.com/ashley?prompt=&apikey=${API_KEY}`,

  esdeath: `https://kaiz-apis.gleeze.com/api/esdeath?ask=&apikey=${API_KEY}`,

  fubuki: `https://kaiz-apis.gleeze.com/api/fubuki?ask=&apikey=${API_KEY}`,

  goku: `https://kaiz-apis.gleeze.com/api/goku?ask=&apikey=${API_KEY}`,

  senku: `https://kaiz-apis.gleeze.com/api/senku?ask=&apikey=${API_KEY}`,

  naruto: `https://kaiz-apis.gleeze.com/api/naruto?ask=&apikey=${API_KEY}`,

  nami: `https://kaiz-apis.gleeze.com/api/nami?ask=&apikey=${API_KEY}`,

  mitsuri: `https://kaiz-apis.gleeze.com/api/mitsuri?ask=&apikey=${API_KEY}`,

  cid: `https://kaiz-apis.gleeze.com/api/cid-kagenou?ask=&apikey=${API_KEY}`,

};

module.exports = {

  name: "character",

  description: "Chat with AI characters like Makima, Gojo, Yor Forger, Esdeath, Goku, and more.",

  author: "Kaiz API | Aljur pogoy",

  usage: "character <name> <message>",

  role: 0,

  async run({ api, event, args }) {

    const { threadID, senderID } = event;

    if (args.length < 2) {

      return api.sendMessage(

        "⚠️ | Usage: character <name> <message>\nExample: character makima hello\n\nAvailable Characters:\nmakima, goku, yorforger, anna, esdeath, fubuki, senku, naruto, mitsuri, nami, cid",

        threadID

      );

    }

    const character = args[0].toLowerCase();

    const message = args.slice(1).join(" ");

    if (!characters[character]) {

      return api.sendMessage(

        `⚠️ | Character not found! Available characters: ${Object.keys(characters).join(", ")}`,

        threadID

      );

    }

    try {

      const apiUrl = `${characters[character].replace("ask=", `ask=${encodeURIComponent(message)}`)}&uid=${senderID}`;

      const response = await axios.get(apiUrl);

      if (response.data && response.data.response) {

        api.sendMessage(`💬 | ${character.toUpperCase()}:\n${response.data.response}`, threadID);

      } else {

        api.sendMessage("❌ | AI failed to respond. Try again later!", threadID);

      }

    } catch (error) {

      api.sendMessage("❌ | Error connecting to AI API.", threadID);

    }

  },

};