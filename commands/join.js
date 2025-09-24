module.exports = {

  name: "join",

  author: "Aljur pogoy",

  version: "3.0.0",

  description: "Add admins to a target thread by threadID (Admin only). Usage: #join <threadID>",

  async run({ api, event, args, admins }) {

    const { threadID, messageID, senderID } = event;

    if (!admins.includes(senderID)) {

      return api.sendMessage(

        "════『 𝗝𝗢𝗜𝗡 』════\n\n❌ Only admins can use this command. Contact an admin for assistance.",

        threadID,

        messageID

      );

    }

    if (args.length === 0) {

      return api.sendMessage(

        "════『 𝗝𝗢𝗜𝗡 』════\n\n❌ Please provide a threadID.\nExample: #join 123456789",

        threadID,

        messageID

      );

    }

    const targetThreadID = args[0].trim();

    if (!/^\d+$/.test(targetThreadID) && !/^-?\d+$/.test(targetThreadID)) {

      return api.sendMessage(

        "════『 𝗝𝗢𝗜𝗡 』════\n\n❌ Invalid threadID. Please provide a valid numeric threadID.",

        threadID,

        messageID

      );

    }

    try {

      for (const adminID of admins) {

        try {

          await api.addUserToGroup(adminID, targetThreadID);

          console.log(`Added admin ${adminID} to thread ${targetThreadID}`);

        } catch (addError) {

          console.error(`Failed to add admin ${adminID} to thread ${targetThreadID}:`, addError.message);

          api.sendMessage(

            `════『 𝗝𝗢𝗜𝗡 』════\n\n⚠️ Failed to add admin ${adminID} to thread ${targetThreadID}. They may already be a member or have privacy restrictions.`,

            threadID,

            messageID

          );

        }

      }

      if (!global.threadState.active.has(targetThreadID) && 

          !global.threadState.approved.has(targetThreadID) && 

          !global.threadState.pending.has(targetThreadID)) {

        global.threadState.active.set(targetThreadID, { joinedAt: new Date() });

        console.log(`Added thread ${targetThreadID} to active state`);

      }

      return api.sendMessage(

        `════『 𝗝𝗢𝗜𝗡 』════\n\n✅ Added admins to thread ${targetThreadID}. Thread is now active.`,

        threadID,

        messageID

      );

    } catch (error) {

      console.error("❌ Error in join command:", error.message);

      return api.sendMessage(

        "════『 𝗝𝗢𝗜𝗡 』════\n\n❌ An error occurred while joining the thread.",

        threadID,

        messageID

      );

    }

  },

};
