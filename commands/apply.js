const fs = require("fs-extra");

const path = require("path");

module.exports = {

  name: "apply",

  author: "Aljur pogoy",

  version: "3.0.0",

  description: "Manage applications. Usage: #apply <name> <age> <gender> | #apply view <name> | #apply list",

  category: "admin",

  async run({ api, event, args, admins, usersData }) {

    const { threadID, messageID, senderID } = event;

    // Check if the user is an admin

    if (!admins.includes(senderID)) {

      return api.sendMessage(

        "════『 𝗔𝗣𝗣𝗟𝗬 』════\n\n❌ Only admins can use this command.",

        threadID,

        messageID

      );

    }

    // JSON fallback file

    const applyFile = path.join(__dirname, "..", "database", "apply.json");

    let applyData = {};

    try {

      applyData = JSON.parse(fs.readFileSync(applyFile, "utf8"));

      if (!applyData.key || !applyData.applications) {

        applyData = { key: "applications", applications: applyData.applications || {} };

      }

    } catch (err) {

      console.error(`[Apply Command] Error reading apply.json: ${err.message}`);

      applyData = { key: "applications", applications: {} };

    }

    // Write the corrected structure to file if needed

    if (!fs.existsSync(applyFile) || Object.keys(applyData).length === 0) {

      fs.writeFileSync(applyFile, JSON.stringify(applyData, null, 2));

    }

    // Check if MongoDB is available

    const config = require(path.join(__dirname, "..", "config.json"));

    const useMongoDB = !!global.db && config.mongoUri && config.mongoUri.trim() !== "";

    const applyCollection = useMongoDB ? global.db.db("apply") : null;

    console.log(`[Apply Command] Using MongoDB: ${useMongoDB}, mongoUri: "${config.mongoUri}"`);

    // If no args provided, show usage

    if (!args[0]) {

      return api.sendMessage(

        "════『 𝗔𝗣𝗣𝗟𝗬 』════\n\n❌ Usage: #apply <name> <age> <gender> | #apply view <name> | #apply list\n\n> Thank you for using our Chatbot",

        threadID,

        messageID

      );

    }

    const subCommand = args[0].toLowerCase();

    // Handle #apply <name> <age> <gender> (default action if subCommand isn't "view" or "list")

    if (subCommand !== "view" && subCommand !== "list") {

      const [name, age, gender] = subCommand === "apply" ? args.slice(1) : args;

      if (!name || !age || !gender) {

        return api.sendMessage(

          "════『 𝗔𝗣𝗣𝗟𝗬 』════\n\n❌ Please provide name, age, and gender.\nExample: #apply John 25 Male\n\n> Thank you for using our Chatbot",

          threadID,

          messageID

        );

      }

      const application = { name, age: parseInt(age), gender, timestamp: new Date() };

      try {

        if (useMongoDB) {

          const existingDoc = await applyCollection.findOne({ key: "applications" });

          if (existingDoc) {

            await applyCollection.updateOne(

              { key: "applications" },

              { $set: { [`applications.${name}`]: application, lastUpdated: new Date() } }

            );

          } else {

            await applyCollection.insertOne({

              key: "applications",

              applications: { [name]: application },

              lastUpdated: new Date(),

            });

          }

        } else {

          applyData.applications = applyData.applications || {};

          applyData.applications[name] = application;

          applyData.lastUpdated = new Date();

          fs.writeFileSync(applyFile, JSON.stringify(applyData, null, 2));

        }

        return api.sendMessage(

          `════『 𝗔𝗣𝗣𝗟𝗬 』════\n\n✔️ Application for ${name} added successfully!\nStorage: ${useMongoDB ? "MongoDB" : "JSON"}\n\n> Thank you for using our Chatbot`,

          threadID,

          messageID

        );

      } catch (err) {

        console.error(`[Apply Command] Error adding application: ${err.message}`);

        return api.sendMessage(

          `════『 𝗔𝗣𝗣𝗟𝗬 』════\n\n  ┏━━━━━━━┓\n  ┃ 『 𝗜𝗡𝗙𝗢 』 An error occurred while adding the application.\n  ┃ Error: ${err.message}\n  ┗━━━━━━━┛\n\n> Thank you for using our Chatbot`,

          threadID,

          messageID

        );

      }

    }

    if (subCommand === "view") {

      const name = args[1];

      if (!name) {

        return api.sendMessage(

          "════『 𝗔𝗣𝗣𝗟𝗬 』════\n\n❌ Please provide a name to view.\nExample: #apply view John\n\n> Thank you for using our Chatbot",

          threadID,

          messageID

        );

      }

      try {

        let application;

        if (useMongoDB) {

          const profileDoc = await applyCollection.findOne({ key: "applications" });

          application = profileDoc && profileDoc.applications[name] ? profileDoc.applications[name] : null;

        } else {

          application = applyData.applications[name];

        }

        if (!application) {

          return api.sendMessage(

            `════『 𝗔𝗣𝗣𝗟𝗬 』════\n\n📋 No application found for ${name}.\n\n> Thank you for using our Chatbot`,

            threadID,

            messageID

          );

        }

        return api.sendMessage(

          `════『 𝗔𝗣𝗣𝗟𝗬 』════\n\n📋 Application Details:\n` +

          `Name: ${application.name}\nAge: ${application.age}\nGender: ${application.gender}\nTimestamp: ${application.timestamp}\n\n> Thank you for using our Chatbot`,

          threadID,

          messageID

        );

      } catch (err) {

        console.error(`[Apply Command] Error viewing application: ${err.message}`);

        return api.sendMessage(

          `════『 �_A𝗣𝗣𝗟𝗬 』════\n\n  ┏━━━━━━━┓\n  ┃ 『 𝗜𝗡𝗙𝗢 』 An error occurred while viewing the application.\n  ┃ Error: ${err.message}\n  ┗━━━━━━━┛\n\n> Thank you for using our Chatbot`,

          threadID,

          messageID

        );

      }

    }

    if (subCommand === "list") {

      try {

        let applications;

        if (useMongoDB) {

          const profileDoc = await applyCollection.findOne({ key: "applications" });

          applications = profileDoc ? profileDoc.applications : {};

        } else {

          applications = applyData.applications || {};

        }

        if (Object.keys(applications).length === 0) {

          return api.sendMessage(

            "════『 𝗔𝗣𝗣𝗟𝗬 』════\n\n📋 No applications found.\n\n> Thank you for using our Chatbot",

            threadID,

            messageID

          );

        }

        const listMessage =

          "════『 𝗔𝗣𝗣𝗟𝗬 』════\n\n📋 Application List:\n" +

          Object.entries(applications)

            .map(([name, data]) => `Name: ${name}, Age: ${data.age}, Gender: ${data.gender}`)

            .join("\n") +

          "\n\n> Thank you for using our Chatbot";

        return api.sendMessage(listMessage, threadID, messageID);

      } catch (err) {

        console.error(`[Apply Command] Error listing applications: ${err.message}`);

        return api.sendMessage(

          `════『 𝗔𝗣𝗣𝗟𝗬 』════\n\n  ┏━━━━━━━┞\n  ┃ 『 𝗜𝗡𝗙𝗢 』 An error occurred while listing applications.\n  ┃ Error: ${err.message}\n  ┗━━━━━━━┛\n\n> Thank you for using our Chatbot`,

          threadID,

          messageID

        );

      }

    }

    return api.sendMessage(

      "════『 𝗔𝗣𝗣𝗟𝗬 』════\n\n❌ Invalid subcommand. Use: #apply <name> <age> <gender> | #apply view <name> | #apply list\n\n> Thank you for using our Chatbot",

      threadID,

      messageID

    );

  },

};