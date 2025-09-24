const fs = require("fs");

const path = require("path");

module.exports = {

  config: {

    name: "genshin-info",

    description: "Get information about a Genshin Impact character",

    role: 0,

    cooldown: 5,

    aliases: ["gi-info", "genshinchar"],

  },

  async run({ api, event, args }) {

    const { threadID, messageID } = event;

    if (!args[0]) {

      return api.sendMessage(

        "Please provide a character name (e.g., #genshin-info Mavuika).",

        threadID,

        messageID

      );

    }

    const characterName = args.join(" ").trim();

    const apiKey = "6345c38b-47b1-4a9a-8a70-6e6f17d6641b";

    const apiUrl = `https://kaiz-apis.gleeze.com/api/genshin-info?name=${encodeURIComponent(characterName)}&apikey=${apiKey}`;

    try {

      const response = await global.fetch(apiUrl);

      if (!response.ok) throw new Error(`API request failed with status ${response.status}`);

      const data = await response.json();

      if (!data || !data.response) {

        return api.sendMessage(

          `No information found for ${characterName}. Please check the name and try again.`,

          threadID,

          messageID

        );

      }

      const character = data.response;

      const { name, thumbnail, quality, description, weapon, element, model_type, birthday, region, namecard, release_date } = character;

      const infoMessage = `

${name || "Unknown Character"} ℹ️

━━━━━━━━━━━━━━━

- Rarity: ${quality || "N/A"}

- Weapon: ${weapon || "N/A"}

- Element: ${element || "N/A"}

- Region: ${region || "N/A"}

- Model Type: ${model_type || "N/A"}

- Birthday: ${birthday || "N/A"}

- Namecard: ${namecard || "N/A"}

- Release Date: ${release_date || "N/A"}

- Description: ${description || "N/A"}

      `.trim();

      let attachment = null;

      if (thumbnail) {

        const imagePath = path.join(__dirname, "cache", `${name}-thumbnail.png`);

        try {

          const imageResponse = await global.fetch(thumbnail);

          if (imageResponse.ok) {

            const buffer = await imageResponse.arrayBuffer();

            fs.writeFileSync(imagePath, Buffer.from(buffer));

            attachment = fs.createReadStream(imagePath);

          }

        } catch (imageError) {

          console.error(`Error downloading thumbnail for ${name}:`, imageError);

        }

      }

      await api.sendMessage(

        {

          body: infoMessage,

          attachment: attachment || null,

        },

        threadID,

        messageID

      );

      if (attachment) {

        fs.unlinkSync(path.join(__dirname, "cache", `${name}-thumbnail.png`));

      }

    } catch (error) {

      console.error(`Error fetching Genshin info for ${characterName}:`, error);

      await api.sendMessage(

        `❌ Error fetching information for ${characterName}: ${error.message}`,

        threadID,

        messageID

      );

    }

  },

};