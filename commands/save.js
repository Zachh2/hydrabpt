module.exports = {

  name: "save",

  author: "Aljur Pogoy",

  version: "1.0.0",

  description: "Save a name or list saved names. Usage: #save <name> or #save list",

  async run({ api, event, args }) {

    const { threadID, messageID, senderID } = event;

    // Check if the database is available

    if (!global.db) {

      return api.sendMessage(

        `════『 𝗦𝗔𝗩𝗘 』════\n\n❌ Database connection not available. Please configure mongoUri in config.json.\n\n> Thank you for using our Chatbot`,

        threadID,

        messageID

      );

    }

    const savedNamesCollection = global.db.db("savedNames");

    // Check if arguments are provided

    if (!args[0]) {

      return api.sendMessage(

        `════『 𝗦𝗔𝗩𝗘 』════\n\n❌ Usage: #save <name> or #save list\nExample: #save Aljur Pogoy\n\n> Thank you for using our Chatbot`,

        threadID,

        messageID

      );

    }

    // Handle #save list command

    if (args[0].toLowerCase() === "list") {

      try {

        const savedNames = await savedNamesCollection.findOne({ key: "names" });

        if (!savedNames || savedNames.names.length === 0) {

          return api.sendMessage(

            `════『 𝗦𝗔𝗩𝗘 』════\n\n📋 No names saved yet.\n\n> Thank you for using our Chatbot`,

            threadID,

            messageID

          );

        }

        const namesList = savedNames.names.join("\n- ");

        return api.sendMessage(

          `════『 𝗦𝗔𝗩𝗘 』════\n\n📋 Saved Names:\n- ${namesList}\n\n> Thank you for using our Chatbot`,

          threadID,

          messageID

        );

      } catch (err) {

        return api.sendMessage(

          `════『 𝗦𝗔𝗩𝗘 』════\n\n❌ Error fetching list: ${err.message}\n\n> Thank you for using our Chatbot`,

          threadID,

          messageID

        );

      }

    }

    // Handle #save <name> command

    const name = args.join(" ").trim();

    if (!name) {

      return api.sendMessage(

        `════『 𝗦𝗔𝗩𝗘 』════\n\n❌ Please provide a valid name to save.\nExample: #save Aljur Pogoy\n\n> Thank you for using our Chatbot`,

        threadID,

        messageID

      );

    }

    try {

      const existingNames = await savedNamesCollection.findOne({ key: "names" });

      if (existingNames) {

        if (existingNames.names.includes(name)) {

          return api.sendMessage(

            `════『 𝗦𝗔𝗩𝗘 』════\n\n❌ Name "${name}" is already saved.\n\n> Thank you for using our Chatbot`,

            threadID,

            messageID

          );

        }

        await savedNamesCollection.updateOne(

          { key: "names" },

          { $push: { names: name }, $set: { lastUpdated: new Date() } }

        );

      } else {

        await savedNamesCollection.insertOne({

          key: "names",

          names: [name],

          lastUpdated: new Date(),

        });

      }

      return api.sendMessage(

        `════『 𝗦𝗔𝗩𝗘 』════\n\n✅ Saved "${name}" successfully!\n\n> Thank you for using our Chatbot`,

        threadID,

        messageID

      );

    } catch (err) {

      return api.sendMessage(

        `════『 𝗦𝗔𝗩𝗘 』════\n\n❌ Error saving name: ${err.message}\n\n> Thank you for using our Chatbot`,

        threadID,

        messageID

      );

    }

  },

};