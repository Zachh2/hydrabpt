const axios = require("axios");

module.exports = {
  meta: {
    name: "bible",
    version: "1.0",
    roles: [0],
    description: "Fetch a Bible verse from the specified book, chapter, and verse.",
    guide: "bible <book> <chapter>:<verse>",
    operator: "Aljur pogoy | Jimmuel",
    cooldown: 10
  }
};

module.exports.onStart = async function ({ actions, args }) {
  try {
    if (args.length < 2) {
      return actions.reply("Invalid input. Please provide a book, chapter, and verse.");
    }

    const reference = args.join(" ");
    const match = reference.match(/^(.+?)\s+(\d+):(\d+)$/);
    if (!match) {
      return actions.reply("Invalid format. Use: <book> <chapter>:<verse>");
    }

    const book = match[1].trim();
    const chapter = match[2];
    const verse = match[3];

    const apiUrl = `https://kaiz-apis.gleeze.com/api/bible?apikey=5445ac64-628b-446a-a2a7-9fe803592176&book=${encodeURIComponent(book)}&chapter=${chapter}&verse=${verse}`;
    const response = await axios.get(apiUrl);

    if (!response.data || !response.data.verse || response.data.verse.length === 0) {
      return actions.reply("No verse found for the given reference.");
    }

    const verseData = response.data.verse[0];
    const { book_name, chapter: chapterNum, verse: verseNum, text } = verseData;

    const replyMessage = `📖 ${book_name} ${chapterNum}:${verseNum}\n\n${text}\n\n— Provided by ${response.data.author}`;

    return actions.reply(replyMessage);
  } catch (error) {
    console.error("Error:", error.message);
    return actions.reply(`Failed to fetch verse: ${error.response?.data?.error || error.message}`);
  }
};