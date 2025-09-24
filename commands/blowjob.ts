import axios from "axios"
import fs from "fs"
import path from "path"
import AuroraBetaStyler from "@aurora/styler"

const blowjobCommand: ShadowBot.Command = {
  config: {
    name: "blowjob",
    aliases: ["bj"],
    description: "Get an NSFW image (only in NSFW-enabled threads)",
    cooldown: 5,
    author: "Aljur Pogoy",
    nsfw: true,
  },
  run: async (context: ShadowBot.CommandContext) => {
    const { api, event } = context
    const { threadID, messageID } = event
    try {
      const response = await axios({
        method: "get",
        url: "https://kaiz-apis.gleeze.com/api/blowjob?apikey=117cafc8-ef3b-4632-bc1c-13b38b912081",
        responseType: "stream",
      })

      const filePath = path.join(process.cwd(), `blowjob_${Date.now()}.jpg`)
      const writer = fs.createWriteStream(filePath)
      response.data.pipe(writer)

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve)
        writer.on("error", reject)
      })

      const styledMessage = AuroraBetaStyler.styleOutput({
        headerText: "🔞 NSFW Content",
        headerSymbol: "💦",
        headerStyle: "bold",
        bodyText: "Here’s your requested image (NSFW).",
        bodyStyle: "sansSerif",
        footerText: "",
      })

      await api.sendMessage(
        {
          body: styledMessage,
          attachment: fs.createReadStream(filePath),
        },
        threadID,
        messageID
      )

      fs.unlinkSync(filePath)
    } catch (error) {
      console.error("Blowjob Command Error:", error)

      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: "❌ NSFW Error",
        headerSymbol: "⚠️",
        headerStyle: "bold",
        bodyText: `Error fetching image: ${error.message}`,
        bodyStyle: "sansSerif",
        footerText: "Try again later.",
      })

      api.sendMessage(errorMessage, threadID, messageID)
    }
  },
}

export default blowjobCommand