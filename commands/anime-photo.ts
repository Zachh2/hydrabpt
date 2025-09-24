import axios from "axios"
import fs from "fs"
import path from "path"
import AuroraBetaStyler from "@aurora/styler"

module.exports = {
  config: {
    name: "anime-photo",
    version: "9.0.0",
    aliases: ["animepic", "aniphoto"],
    cooldown: 5,
  },
  run: async ({ api, event }) => {
    const { threadID, messageID } = event

    try {
      const imagePath = path.join(__dirname, "cache", "anime-photo.png")

      const response = await axios({
        url: "https://rapido.zetsu.xyz/api/anime-photo",
        method: "GET",
        responseType: "stream",
      })

      const writer = fs.createWriteStream(imagePath)
      response.data.pipe(writer)

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve)
        writer.on("error", reject)
      })

      const styledMessage = AuroraBetaStyler.styleOutput({
        headerText: "Anime Photo",
        headerSymbol: "🌸",
        headerStyle: "bold",
        bodyText: "🌸 Here’s your random anime photo!",
        bodyStyle: "sansSerif",
        footerText: "",
      })

      api.sendMessage(
        {
          body: styledMessage,
          attachment: fs.createReadStream(imagePath),
        },
        threadID,
        () => {
          fs.unlinkSync(imagePath)
        },
        messageID
      )
    } catch (error) {
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: "Anime Photo",
        headerSymbol: "🌸",
        headerStyle: "bold",
        bodyText: error.message || "An unexpected error occurred. Please try again later.",
        bodyStyle: "sansSerif",
        footerText: "",
      })
      api.sendMessage(errorMessage, threadID, null, messageID)
      console.error("Anime Photo Error:", error.message || error)
    }
  },
}