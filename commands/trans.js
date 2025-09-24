const axios = require("axios");

module.exports = {

  name: "trans",

  description: "Translate text to any language using Google Translate. Usage: #translate <target_language> [text] or reply to a message",

  author: "Aljur pogoy",

  role: 0,

  cooldown: 5,
    
  aliases: ["translate","tran"],

  async run({ api, event, args }) {

    const { threadID, messageID } = event;

    if (args.length === 0 && !event.messageReply) {

      return api.sendMessage(

        "Please provide a target language code and text (e.g., #translate en Hello) or reply to a message to translate.",

        threadID,

        messageID

      );

    }

    let targetLanguage = "en";

    let textToTranslate = "";

    if (args.length > 0) {

      targetLanguage = args[0].toLowerCase();

      textToTranslate = args.slice(1).join(" ").trim();

    }

    if (event.messageReply && event.messageReply.body) {

      textToTranslate = event.messageReply.body;

    }

    if (!textToTranslate) {

      return api.sendMessage(

        "No text to translate. Please provide text after the language code or reply to a message.",

        threadID,

        messageID

      );

    }

    try {

      const response = await axios.get(

        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(textToTranslate)}`

      );

      const retrieve = response.data;

      let text = "";

      retrieve[0].forEach(item => {

        if (item[0]) text += item[0];

      });

      const fromLang = retrieve[2] === retrieve[8][0][0] ? retrieve[2] : retrieve[8][0][0];

      await api.sendMessage(

        `Translation: ${text}\n - translated from ${fromLang} to ${targetLanguage}`,

        threadID,

        messageID

      );

    } catch (error) {

      await api.sendMessage(

        `❌ Translation Error: ${error.message}`,

        threadID,

        messageID

      );

    }

  },

};