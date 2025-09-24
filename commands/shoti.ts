import axios from "axios"
import fs from "fs"
import path from "path"
import AuroraBetaStyler from "@aurora/styler"

const shotiCommand: ShadowBot.Command = {
  config: {
    name: "shoti",
    aliases: ["short", "clip"],
    description: "Get a random short video with details!",
    cooldown: 5,
    role: 0,
  },
  run: async (context: ShadowBot.CommandContext) => {
    const { api, event } = context
    const { threadID, messageID } = event

    try {
      const response = await axios.get("https://kaiz-apis.gleeze.com/api/shoti?apikey=117cafc8-ef3b-4632-bc1c-13b38b912081")
      const { duration, region } = response.data.shoti
      const videoUrl = response.data.shoti.videoUrl

      const videoResponse = await axios({
        method: "get",
        url: videoUrl,
        responseType: "stream",
      })

      const filePath = path.join(process.cwd(), `shoti_${Date.now()}.mp4`)
      const writer = fs.createWriteStream(filePath)
      videoResponse.data.pipe(writer)

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve)
        writer.on("error", reject)
      })

      const styledMessage = AuroraBetaStyler.styleOutput({
        headerText: " Shoti 🍑",
        headerSymbol: "🎥",
        headerStyle: "bold",
        bodyText: `Duration: ${duration}s\nRegion: ${region}`,
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
      console.error("Shoti Command Error:", error)

      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: "❌ Shoti Error",
        headerSymbol: "⚠️",
        headerStyle: "bold",
        bodyText: `Error fetching shoti: ${error.message}`,
        bodyStyle: "sansSerif",
        footerText: "Try again later.",
      })

      api.sendMessage(errorMessage, threadID, messageID)
    }
  },
}

export default shotiCommand