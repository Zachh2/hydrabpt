import AuroraBetaStyler from "../core/plugins/aurora-beta-styler"



interface PlayerData {
  userID: string
  username: string
  clan?: string
  masterClan?: string
  game?: string
  wins: number
  members?: string[]
  createdAt: Date
}

const esportCommand: ShadowBot.Command = {
  config: {
    name: "esport",
    description: "Manage esports clans and their progress",
    usage: "/esport register <masterClan> <clan> <what-game> | /esport view <clan> | /esport add <members> <clan> | /esport edit <newClan> | /esport record <total of winning>",
    aliases: ["es"],
    category: "Games 🎮",
  },
  run: async ({ api, event, args, db }) => {
    if (!db) {
      await api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: "❌ Database Error",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: "Database not available. Contact an admin.",
          bodyStyle: "bold",
          footerText: "",
        }),
        event.threadID,
        event.messageID
      )
      return
    }

    const { threadID, messageID, senderID } = event
    const styledMessage = (header: string, body: string, symbol: string) =>
      AuroraBetaStyler.styleOutput({
        headerText: header,
        headerSymbol: symbol,
        headerStyle: "bold",
        bodyText: body,
        bodyStyle: "bold",
        footerText: "",
      })

    const action = args[0]?.toLowerCase()
    const playersCollection = db.db("players")
    const playerData = (await playersCollection.findOne({ userID: senderID })) || {
      userID: senderID,
      username: "",
      clan: "",
      masterClan: "",
      game: "",
      wins: 0,
      members: [],
      createdAt: new Date(),
    }

    // Helper to get player data by clan
    async function getPlayerByClan(clanName: string) {
      return await playersCollection.findOne({ clan: clanName })
    }

    if (action === "register") {
      if (args.length < 4) {
        await api.sendMessage(
          styledMessage("❌ Register Error", "Usage: /esport register <masterClan> <clan> <what-game>", "⚠️"),
          threadID,
          messageID
        )
        return
      }
      if (playerData.username) {
        await api.sendMessage(
          styledMessage("❌ Register Error", `Already registered as ${playerData.username}.`, "🛑"),
          threadID,
          messageID
        )
        return
      }

      const masterClan = args[1]
      const clan = args[2]
      const game = args[3]
      const existingClan = await getPlayerByClan(clan)

      if (existingClan) {
        await api.sendMessage(
          styledMessage("❌ Register Error", `Clan ${clan} already exists!`, "⚠️"),
          threadID,
          messageID
        )
        return
      }

      playerData.username = `${clan} Leader`
      playerData.clan = clan
      playerData.masterClan = masterClan
      playerData.game = game
      playerData.wins = 0
      playerData.members = [senderID]
      await playersCollection.updateOne({ userID: senderID }, { $set: playerData }, { upsert: true })

      await api.sendMessage(
        styledMessage("✅ Clan Registered", `Clan ${clan} registered for ${game} under Master Clan ${masterClan}!`, "🏆"),
        threadID,
        messageID
      )
    } else if (action === "view") {
      if (args.length < 2) {
        await api.sendMessage(
          styledMessage("❌ View Error", "Usage: /esport view <clan>", "⚠️"),
          threadID,
          messageID
        )
        return
      }

      const clan = args[1]
      const clanData = await getPlayerByClan(clan)

      if (!clanData) {
        await api.sendMessage(
          styledMessage("❌ View Error", `Clan ${clan} not found!`, "⚠️"),
          threadID,
          messageID
        )
        return
      }

      await api.sendMessage(
        styledMessage("📊 Clan Stats", `Clan: ${clanData.clan}\nGame: ${clanData.game}\nWins: ${clanData.wins}\nMembers: ${clanData.members?.join(", ") || "None"}`, "🏅"),
        threadID,
        messageID
      )
    } else if (action === "add") {
      if (args.length < 3) {
        await api.sendMessage(
          styledMessage("❌ Add Error", "Usage: /esport add <members> <clan>", "⚠️"),
          threadID,
          messageID
        )
        return
      }

      const members = args[1].split(",").map(m => m.trim())
      const clan = args[2]
      const clanData = await getPlayerByClan(clan)

      if (!clanData) {
        await api.sendMessage(
          styledMessage("❌ Add Error", `Clan ${clan} not found!`, "⚠️"),
          threadID,
          messageID
        )
        return
      }

      if (clanData.userID !== senderID) {
        await api.sendMessage(
          styledMessage("❌ Permission Error", "Only the clan leader can add members!", "🚫"),
          threadID,
          messageID
        )
        return
      }

      const updatedMembers = [...new Set([...(clanData.members || []), ...members])]
      await playersCollection.updateOne({ clan }, { $set: { members: updatedMembers } })

      await api.sendMessage(
        styledMessage("✅ Members Added", `Added ${members.join(", ")} to ${clan}!`, "👥"),
        threadID,
        messageID
      )
    } else if (action === "edit") {
      if (args.length < 2) {
        await api.sendMessage(
          styledMessage("❌ Edit Error", "Usage: /esport edit <newClan>", "⚠️"),
          threadID,
          messageID
        )
        return
      }

      const newClan = args[1]
      const clanData = await getPlayerByClan(newClan)

      if (clanData) {
        await api.sendMessage(
          styledMessage("❌ Edit Error", `Clan ${newClan} already exists!`, "⚠️"),
          threadID,
          messageID
        )
        return
      }

      const oldClan = await getPlayerByClan(playerData.clan || "")
      if (!oldClan || oldClan.userID !== senderID) {
        await api.sendMessage(
          styledMessage("❌ Permission Error", "Only the clan leader can edit the clan name!", "🚫"),
          threadID,
          messageID
        )
        return
      }

      await playersCollection.updateOne({ clan: oldClan.clan }, { $set: { clan: newClan } })
      await api.sendMessage(
        styledMessage("✅ Clan Edited", `Clan renamed from ${oldClan.clan} to ${newClan}!`, "✏️"),
        threadID,
        messageID
      )
    } else if (action === "record") {
      if (args.length < 2) {
        await api.sendMessage(
          styledMessage("❌ Record Error", "Usage: /esport record <total of winning>", "⚠️"),
          threadID,
          messageID
        )
        return
      }

      const wins = parseInt(args[1])
      if (isNaN(wins) || wins < 0) {
        await api.sendMessage(
          styledMessage("❌ Record Error", "Please provide a valid positive number for wins!", "⚠️"),
          threadID,
          messageID
        )
        return
      }

      const clan = playerData.clan
      if (!clan) {
        await api.sendMessage(
          styledMessage("❌ Record Error", "You are not part of a clan!", "⚠️"),
          threadID,
          messageID
        )
        return
      }

      await playersCollection.updateOne({ clan }, { $set: { wins } })
      await api.sendMessage(
        styledMessage("✅ Wins Recorded", `Recorded ${wins} wins for ${clan}!`, "🏆"),
        threadID,
        messageID
      )
    } else {
      await api.sendMessage(
        styledMessage("❌ Usage Error", "Usage:\n• /esport register <masterClan> <clan> <what-game>\n• /esport view <clan>\n• /esport add <members> <clan>\n• /esport edit <newClan>\n• /esport record <total of winning>", "📌"),
        threadID,
        messageID
      )
    }
  },
}

export default esportCommand