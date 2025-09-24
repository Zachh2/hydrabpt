import { format, UNIRedux } from "cassidy-styler"

import fs from "fs"

module.exports = {

  name: "suggest",

  description: "Allows users to suggest features and admins to manage them",

  category: "Admin",

  usage: "suggest <suggestion> | suggest list | suggest accept <number> | suggest remove",

  config: {

    role: 0,

  },

  async run({ api, event, args, db }) {

    const { threadID, senderID, messageID } = event

    if (!db) {

      const msg = format({

        title: "💡 Suggestion System",

        titlePattern: `${UNIRedux.arrow} {word}`,

        titleFont: "double_struck",

        contentFont: "fancy_italic",

        content: `❌ Database not available. Please ensure MongoDB is connected.\n> Thanks for using Chatbot`,

      })

      return api.sendMessage(msg, threadID, messageID)

    }

    const collection = db.db("suggestions")

    // Load config.json directly

    let config

    try {

      config = JSON.parse(fs.readFileSync("config.json", "utf8"))

      config.admins = Array.isArray(config.admins) ? [...config.admins] : []

      config.moderators = Array.isArray(config.moderators) ? [...config.moderators] : []

      config.developers = Array.isArray(config.developers) ? [...config.developers] : []

    } catch (error) {

      console.error("Error loading config.json:", error)

      config = { admins: [], moderators: [], developers: [], Prefix: ["#"] }

    }

    if (args.length === 0) {

      const prefix = config.Prefix?.[0] || "#"

      const msg = format({

        title: "💡 Suggestion System",

        titlePattern: `${UNIRedux.arrow} {word}`,

        titleFont: "double_struck",

        contentFont: "fancy_italic",

        content: `ℹ️ Usage: ${prefix}suggest <suggestion> | ${prefix}suggest list | ${prefix}suggest accept <number> | ${prefix}suggest remove\n> Suggest anything to improve the bot!\n> Thanks for using Chatbot`,

      })

      return api.sendMessage(msg, threadID, messageID)

    }

    const command = args[0].toLowerCase()

    const userRole = getUserRole(senderID, config)

    console.log(`Debug - SenderID: ${senderID}, Role: ${userRole}, Config:`, config)

    if (command === "list" && userRole < 1) {

      const msg = format({

        title: "💡 Suggestion System",

        titlePattern: `${UNIRedux.arrow} {word}`,

        titleFont: "double_struck",

        contentFont: "fancy_italic",

        content: `❌ Only admins, moderators, and developers can view the suggestion list.\n> Thanks for using Chatbot`,

      })

      return api.sendMessage(msg, threadID, messageID)

    }

    if (command === "list" && userRole >= 1) {

      const suggestions = await collection.find({}).toArray()

      if (!suggestions || suggestions.length === 0) {

        const msg = format({

          title: "💡 Suggestion System",

          titlePattern: `${UNIRedux.arrow} {word}`,

          titleFont: "double_struck",

          contentFont: "fancy_italic",

          content: `ℹ️ No suggestions found.\n> Encourage users to suggest ideas!\n> Thanks for using Chatbot`,

        })

        return api.sendMessage(msg, threadID, messageID)

      }

      const list = suggestions.map((s, index) => 

        `${index + 1}. ${s.name} - [${s.uid}]\n— suggested —\n${s.suggestion}`

      ).join("\n\n")

      const msg = format({

        title: "💡 Suggestion List",

        titlePattern: `${UNIRedux.arrow} {word}`,

        titleFont: "double_struck",

        contentFont: "fancy_italic",

        content: `📋 Suggestion List:\n${list}\n> Total: ${suggestions.length}\n> Thanks for using Chatbot`,

      })

      return api.sendMessage(msg, threadID, messageID)

    }

    if (command === "accept" && userRole >= 1) {

      const number = parseInt(args[1])

      if (isNaN(number) || number < 1) {

        const msg = format({

          title: "💡 Suggestion System",

          titlePattern: `${UNIRedux.arrow} {word}`,

          titleFont: "double_struck",

          contentFont: "fancy_italic",

          content: `❌ Please provide a valid suggestion number (e.g., ${config.Prefix?.[0] || "#"}suggest accept 1).\n> Thanks for using Chatbot`,

        })

        return api.sendMessage(msg, threadID, messageID)

      }

      const suggestions = await collection.find({}).toArray()

      if (number > suggestions.length) {

        const msg = format({

          title: "💡 Suggestion System",

          titlePattern: `${UNIRedux.arrow} {word}`,

          titleFont: "double_struck",

          contentFont: "fancy_italic",

          content: `❌ Suggestion #${number} does not exist.\n> Check the list with ${config.Prefix?.[0] || "#"}suggest list.\n> Thanks for using Chatbot`,

        })

        return api.sendMessage(msg, threadID, messageID)

      }

      const suggestion = suggestions[number - 1]

      await collection.updateOne({ _id: suggestion._id }, { $set: { accepted: true, acceptedBy: senderID, acceptedAt: new Date() } })

      const threads = await db.db("threads").find({}).toArray()

      for (const thread of threads) {

        api.sendMessage(

          format({

            title: "🎉 Suggestion Accepted",

            titlePattern: `${UNIRedux.arrow} {word}`,

            titleFont: "double_struck",

            contentFont: "fancy_italic",

            content: `📢 Suggestion from ${suggestion.name} [${suggestion.uid}] has been accepted by an admin!\n— Suggestion: ${suggestion.suggestion}\n> Thanks for using Chatbot`,

          }),

          thread.threadID

        )

      }

      const msg = format({

        title: "💡 Suggestion System",

        titlePattern: `${UNIRedux.arrow} {word}`,

        titleFont: "double_struck",

        contentFont: "fancy_italic",

        content: `✅ Suggestion #${number} accepted and notified all threads.\n> Thanks for using Chatbot`,

      })

      return api.sendMessage(msg, threadID, messageID)

    }

    if (command === "remove") {

      const userSuggestions = await collection.find({ uid: senderID }).toArray()

      if (!userSuggestions || userSuggestions.length === 0) {

        const msg = format({

          title: "💡 Suggestion System",

          titlePattern: `${UNIRedux.arrow} {word}`,

          titleFont: "double_struck",

          contentFont: "fancy_italic",

          content: `❌ You didn't submit any suggestions, please use suggest <suggestion> to submit.\n> Thanks for using Chatbot`,

        })

        return api.sendMessage(msg, threadID, messageID)

      }

      if (userSuggestions.length > 1) {

        await collection.deleteMany({ uid: senderID })

      } else {

        await collection.deleteOne({ _id: userSuggestions[0]._id })

      }

      const msg = format({

        title: "💡 Suggestion System",

        titlePattern: `${UNIRedux.arrow} {word}`,

        titleFont: "double_struck",

        contentFont: "fancy_italic",

        content: `✅ Your suggestion(s) have been removed.\n> Thanks for using Chatbot`,

      })

      return api.sendMessage(msg, threadID, messageID)

    }

    if (!command.match(/list|accept|remove/)) {

      const suggestion = args.join(" ").trim()

      if (!suggestion) {

        const msg = format({

          title: "💡 Suggestion System",

          titlePattern: `${UNIRedux.arrow} {word}`,

          titleFont: "double_struck",

          contentFont: "fancy_italic",

          content: `❌ Please provide a suggestion (e.g., ${config.Prefix?.[0] || "#"}suggest create more commands).\n> Thanks for using Chatbot`,

        })

        return api.sendMessage(msg, threadID, messageID)

      }

      const userSuggestions = await collection.find({ uid: senderID }).toArray()

      if (userSuggestions.length > 0) {

        const msg = format({

          title: "💡 Suggestion System",

          titlePattern: `${UNIRedux.arrow} {word}`,

          titleFont: "double_struck",

          contentFont: "fancy_italic",

          content: `❌ You can only submit one suggestion. Use ${config.Prefix?.[0] || "#"}suggest remove to delete your current suggestion.\n> Thanks for using Chatbot`,

        })

        return api.sendMessage(msg, threadID, messageID)

      }

      const userInfo = await api.getUserInfo(senderID)

      const name = userInfo[senderID].name || `User ${senderID}`

      await collection.insertOne({

        uid: senderID,

        name,

        suggestion,

        createdAt: new Date(),

        accepted: false,

      })

      const msg = format({

        title: "💡 Suggestion System",

        titlePattern: `${UNIRedux.arrow} {word}`,

        titleFont: "double_struck",

        contentFont: "fancy_italic",

        content: `✅ Your suggestion "${suggestion}" has been sent to developers for review. Please wait for acceptance.\n> Thanks for using Chatbot`,

      })

      return api.sendMessage(msg, threadID, messageID)

    }

  },

}

function getUserRole(uid: string, config: any): number {

  uid = String(uid)

  const safeConfig = config || { admins: [], moderators: [], developers: [] }

  if (Array.isArray(safeConfig.developers) ? safeConfig.developers.includes(uid) : false) return 3

  if (Array.isArray(safeConfig.moderators) ? safeConfig.moderators.includes(uid) : false) return 2

  if (Array.isArray(safeConfig.admins) ? safeConfig.admins.includes(uid) : false) return 1

  return 0

}