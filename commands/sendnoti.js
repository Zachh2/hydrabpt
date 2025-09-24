module.exports.config = {

  name: "sendnoti",

  version: "4.0.0",
   author: "Aljur pogoy",

  description: "Sends a message to all groups and can only be done by the admin.",

};

module.exports.run = async ({ api, event, args, admins, prefix }) => {

  const { threadID, messageID, senderID } = event;


  if (!admins.includes(senderID)) {

    return api.sendMessage(

      `════『 𝗔𝗣𝗜𝗧𝗘𝗦𝗧 』════\n\n❌ Only admins can use this command`,

      threadID,

      messageID

    );

  }

  const custom = args.join(" ");

  if (!custom) {



    return api.sendMessage("Please provide a notification message.", threadID, messageID);

  }

  // Log the start of the sending process

  
  let threadList;

  try {

    // Adjust parameters to see if it resolves the issue

    threadList = await api.getThreadList(10, null, ["INBOX"]); // Reduced limit to 10

    

  } catch (error) {

    

    return api.sendMessage("Failed to fetch thread list. Please check bot permissions or session. Error: " + error.message, threadID, messageID);

  }

  let sentCount = 0;

  let notSentCount = 0;

  const haha = await api.sendMessage("Sending......", threadID, messageID);

  console.log("[SENDNOTI] Sending started, waiting message ID:", haha.messageID);

  let senderName = "Unknown";

  try {

    const senderProfile = await api.getUserInfo(senderID);

    senderName = senderProfile[senderID]?.name || "Unknown";

    

  } catch (error) {

    

  }

  async function sendMessage(thread) {

    try {

      await api.sendMessage(

        ` ❲ 👑 ❳ Notification from Developer  \n━━━━━━━━━━━━━━━━━━\n${custom}\n\nDeveloper: ${senderName}`,

        thread.threadID

      );

      sentCount++;

      ;

    } catch (error) {

      

      notSentCount++;

    }

    // Add a delay to avoid rate limiting

    await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second delay

  }

  for (const thread of threadList) {

    if (sentCount >= 10) { // Adjusted limit to 10

      console.log("[SENDNOTI] Reached max send limit of 10 threads");

      break;

    }

    if (thread.isGroup && thread.name !== thread.threadID && thread.threadID !== event.threadID) {

      await sendMessage(thread);

    }

  }

  let summaryMessage = `› Sent the notification successfully to ${sentCount} Threads\n`;

  if (notSentCount > 0) {

    summaryMessage += `› Failed to send to ${notSentCount} Threads`;

  }

  try {

    await api.unsendMessage(haha.messageID);

    const finalMessage = await api.sendMessage(summaryMessage, threadID, messageID);

    

  } catch (error) {

    

    api.sendMessage("Failed to send summary message.", threadID, messageID);

  }

};