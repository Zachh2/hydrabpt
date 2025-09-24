const axios = require("axios");

module.exports = {

  name: "pinterest",

  author: "Aljur pogoy | Moderators",
    
  role: 0,

  nonPrefix: false,

  description: "Search for Pinterest images (max 5 results). Usage: #pinterest <query> <max_results>",

  async run({ api, event }) {

    const { threadID, messageID, body } = event;

    try {

      const args = body.split(" ").slice(1);

      if (args.length < 2 || isNaN(args[args.length - 1]) || parseInt(args[args.length - 1]) > 5) {

        return api.sendMessage("❌ Usage: #pinterest <query> <max_results> (max 5)", threadID, messageID);

      }

      const maxResults = Math.min(parseInt(args[args.length - 1]), 5);

      const query = args.slice(0, -1).join(" ");

      const apiUrl = `https://kaiz-apis.gleeze.com/api/pinterest?search=${encodeURIComponent(query)}&apikey=6345c38b-47b1-4a9a-8a70-6e6f17d6641b`;

      const response = await axios.get(apiUrl);

      const { data } = response.data;

      if (!data || !Array.isArray(data)) {

        return api.sendMessage(`❌ Invalid or empty response from API for "${query}"`, threadID, messageID);

      }

      if (data.length === 0) {

        return api.sendMessage(`❌ No images found for "${query}"`, threadID, messageID);

      }

      const images = data.slice(0, maxResults).map(url => ({ url }));

      await api.sendMessage(

        {

          body: `📌 Pinterest Search Results for "${query}" (${maxResults} images):`,

          attachment: await Promise.all(images.map(img => axios.get(img.url, { responseType: "stream" }).then(res => res.data).catch(err => {

            console.error(`Failed to fetch image ${img.url}: ${err.message}`);

            return null;

          }))).then(attachments => attachments.filter(a => a)),

        },

        threadID,

        messageID

      );

    } catch (error) {

      console.error("❌ Error in pinterest command:", error);

      api.sendMessage(`❌ An error occurred: ${error.message || 'Unknown error'}`, threadID, messageID);

    }

  },

};