
const axios = require("axios");
const { AttachmentBuilder } = require("discord.js");

module.exports = {
  name: "waifu",
  description: "Waifu sir",
  async run({ interaction }) {
    try {
      const response = await axios.get(
        "https://kaiz-apis.gleeze.com/api/waifu?apikey=6345c38b-47b1-4a9a-8a70-6e6f17d6641b",
        { responseType: "json" }
      );

      const imageUrl = response.data.imageUrl;
      if (!imageUrl) {
        return interaction.reply("❌");
      }

      const imgBuffer = await axios.get(imageUrl, { responseType: "arraybuffer" });
      const attachment = new AttachmentBuilder(Buffer.from(imgBuffer.data), {
        name: "waifu.jpg",
      });

      await interaction.reply({ files: [attachment] });
    } catch (error) {
      console.error("Error in waifu command:", error);
      await interaction.reply({
        content: `❌ Error: ${error.message}`,
        ephemeral: true,
      });
    }
  },
};
