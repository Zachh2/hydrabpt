module.exports = {

  name: "approve",

  author: "Aljur pogoy",

  version: "4.0.0",

  description: "Approve a thread by its threadID or list pending threads (Admin only). Usage: #approve <threadID> or #approve pending",

  async run({ api, event, args, admins, prefix }) {

    const { threadID, messageID, senderID } = event;

    // Check if the user is an admin

    if (!admins.includes(senderID)) {

      return api.sendMessage(

        "════『 𝗔𝗣𝗣𝗥𝗢𝗩𝗘 』════\n\n❌ Only admins can use this command. Contact an admin for assistance.",

        threadID,

        messageID

      );

    }

    // Handle #approve pending

    if (args[0] && args[0].toLowerCase() === "pending") {

      const pendingThreads = Array.from(global.threadState.pending.entries()).map(([threadID, data]) => ({

        threadID,

        addedAt: data.addedAt

      }));

      if (pendingThreads.length === 0) {

        return api.sendMessage(

          "════『 𝗔𝗣𝗣𝗥𝗢𝗩𝗘 』════\n\n✅ No pending threads found.",

          threadID,

          messageID

        );

      }

      let message = "════『 𝗔𝗣𝗣𝗥𝗢𝗩𝗘 』════\n\n📋 Pending Threads:\n\n";

      pendingThreads.forEach((thread, index) => {

        message += `${index + 1}. ThreadID: ${thread.threadID} (Added at: ${thread.addedAt.toISOString()})\n`;

      });

      message += "\n> Use #approve <threadID> to approve a thread.";

      return api.sendMessage(message, threadID, messageID);

    }

    // Handle #approve <threadID>

    if (args.length === 0) {

      return api.sendMessage(

        "════『 𝗔𝗣𝗣𝗥𝗢𝗩𝗘 』════\n\n❌ Please provide a threadID or use #approve pending.\nExample: #approve 123456789",

        threadID,

        messageID

      );

    }

    const targetThreadID = args[0].trim();

    // Validate threadID

    if (!/^\d+$/.test(targetThreadID) && !/^-?\d+$/.test(targetThreadID)) {

      return api.sendMessage(

        "════『 𝗔𝗣𝗣𝗥𝗢𝗩𝗘 』════\n\n❌ Invalid threadID. Please provide a valid numeric threadID.",

        threadID,

        messageID

      );

    }

    try {

      // Check if the thread is already approved

      if (global.threadState.approved.has(targetThreadID)) {

        return api.sendMessage(

          `════『 𝗔𝗣𝗣𝗥𝗢𝗩𝗘 』════\n\n✅ Thread ${targetThreadID} is already approved.`,

          threadID,

          messageID

        );

      }

      // Check if the thread is pending

      if (global.threadState.pending.has(targetThreadID)) {

        global.threadState.pending.delete(targetThreadID);

        global.threadState.approved.set(targetThreadID, { approvedAt: new Date() });

        // Notify the target thread

        api.sendMessage(

          `Bot was approved by Admins to start type ${prefix}`,

          targetThreadID

        );

        return api.sendMessage(

          `════『 𝗔𝗣𝗣𝗥𝗢𝗩𝗘 』════\n\n✅ Thread ${targetThreadID} has been approved and removed from pending.`,

          threadID,

          messageID

        );

      }

      // If not pending, add directly to approved

      global.threadState.approved.set(targetThreadID, { approvedAt: new Date() });

      // Notify the target thread

      api.sendMessage(

        `Bot was approved by Admins to start type ${prefix}`,

        targetThreadID

      );

      return api.sendMessage(

        `════『 �_A𝗣𝗣𝗥𝗢𝗩𝗘 』════\n\n✅ Thread ${targetThreadID} has been approved successfully!`,

        threadID,

        messageID

      );

    } catch (error) {

      console.error("❌ Error approving thread:", error.message);

      return api.sendMessage(

        "════『 𝗔𝗣𝗣𝗥𝗢𝗩𝗘 』════\n\n❌ An error occurred while approving the thread.",

        threadID,

        messageID

      );

    }

  },

};