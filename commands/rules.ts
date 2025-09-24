import AuroraBetaStyler = require('@aurora/styler');

module.exports = {
  config: {
    name: "rules",
    description: "Displays the group rules.",
    role: 0,
    usage: "rules",
    category: "Utility 📜",
  },
  run: async ({ api, event }) => {
    const { threadID, messageID } = event;
    const rules = [
      "1. Be respectful to all members.",
      "2. No spamming or flooding the chat.",
      "3. Avoid sharing personal information.",
      "4. Follow the group’s topic and purpose.",
      "5. Report issues to moderators privately.",
      "6. No frustrating to other members.",
      "7. Watch your word.",
      "8. Bot developer turned on the blacklist sometimes.",
      "9. Respect Developer, Moderators, Admins",
      "10. No sending nude images or else you'll get kicked.", 
      "11. No scamming Of course"
    ];
    const bodyText = rules.join("\n");
    await api.sendMessage(
      AuroraBetaStyler.styleOutput({
        headerText: "Group Rules",
        headerSymbol: "📜",
        headerStyle: "bold",
        bodyText: bodyText,
        bodyStyle: "sansSerif",
        footerText: "Developer: **Aljur Pogoy** ",
      }),
      threadID,
      messageID
    );
  },
};