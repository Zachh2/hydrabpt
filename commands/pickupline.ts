import axios from "axios"
import AuroraBetaStyler from "@aurora/styler"

const pickuplineCommand: ShadowBot.Command = {
  config: {
    name: "pickupline",
    aliases: ["pickup", "flirt"],
    description: "Get a random pickup line to impress someone!",
    cooldown: 5,
    role: 0,
  },
  run: async (context: ShadowBot.CommandContext) => {
    const { api, event } = context
    const { threadID, messageID } = event

    try {
      const response = await axios.get("https://kaiz-apis.gleeze.com/api/pickuplines?apikey=117cafc8-ef3b-4632-bc1c-13b38b912081")
      const pickupline = response.data.pickupline

      const styledMessage = AuroraBetaStyler.styleOutput({
        headerText: " Pickup Line",
        headerSymbol: "💕",
        headerStyle: "bold",
        bodyText: pickupline,
        bodyStyle: "sansSerif",
        footerText: "",
      })

      api.sendMessage(styledMessage, threadID, messageID)
    } catch (error) {
      console.error("Pickup Line Command Error:", error)

      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: "❌ Pickup Line Error",
        headerSymbol: "⚠️",
        headerStyle: "bold",
        bodyText: `Error fetching pickup line: ${error.message}`,
        bodyStyle: "sansSerif",
        footerText: "Try again later.",
      })

      api.sendMessage(errorMessage, threadID, messageID)
    }
  },
}

export default pickuplineCommand