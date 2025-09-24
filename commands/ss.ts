import axios from "axios"
import fs from "fs"
import path from "path"
import AuroraBetaStyler from "@aurora/styler"

const ssCommand: ShadowBot.Command = {
  config: {
    name: "ss",
    aliases: ["screenshot", "capture"],
    description: "Take a screenshot of a webpage from a provided URL",
    usage: "/ss <url>",
    cooldown: 5,
    role: 3,
  },
  run: async (context: ShadowBot.CommandContext) => {
    const { api, event, args } = context
    const { threadID, messageID } = event
    if (!args[0]) {
      const usageMessage = AuroraBetaStyler.styleOutput({
        headerText: "❌ Screenshot Error",
        headerSymbol: "⚠️",
        headerStyle: "bold",
        bodyText: "Please provide a URL. Usage: /ss <url>",
        bodyStyle: "sansSerif",
        footerText: "",
      })
      return api.sendMessage(usageMessage, threadID, messageID)
    }

    const url = encodeURIComponent(args[0])
    try {
      const response = await axios.get(`https://rapido.zetsu.xyz/api/screenshot?url=${url}`, {
        responseType: "json",
      })
      const { status, url: imageUrl } = response.data

      if (!status || !imageUrl) {
        const errorMessage = AuroraBetaStyler.styleOutput({
          headerText: "❌ Screenshot Error",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "Failed to generate screenshot. Check the URL or try again.",
          bodyStyle: "sansSerif",
          footerText: "",
        })
        return api.sendMessage(errorMessage, threadID, messageID)
      }
      const imageResponse = await axios({
        method: "get",
        url: imageUrl,
        responseType: "stream",
      })

      const filePath = path.join(process.cwd(), `ss_${Date.now()}.jpg`)
      const writer = fs.createWriteStream(filePath)
      imageResponse.data.pipe(writer)

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve)
        writer.on("error", reject)
      })

      const styledMessage = AuroraBetaStyler.styleOutput({
        headerText: "Screenshot",
        headerSymbol: "🖼️",
        headerStyle: "bold",
        bodyText: "success",
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
      console.error("Screenshot Command Error:", error)
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: "❌ Screenshot Error",
        headerSymbol: "⚠️",
        headerStyle: "bold",
        bodyText: `Error generating screenshot: ${error.message}`,
        bodyStyle: "sansSerif",
        footerText: "",
      })
      api.sendMessage(errorMessage, threadID, messageID)
    }
  },
}

export default ssCommand