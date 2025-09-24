import AuroraBetaStyler from "@aurora/styler";

const setxpCommand: ShadowBot.Command = {
  config: {
    name: "setxp",
    aliases: ["sx"],
    description: "Set a user's XP (in-memory only). Usage: setxp <userID|@mention|reply> <xp>",
    cooldown: 0,
    role: 3,
  },
  
  run: async (context: ShadowBot.CommandContext) => {
    const { api, event, args, usersData } = context;
    const { threadID, messageID, senderID } = event as any;
    
    let targetId: string | null = null;
    
    const mentionIds = event.mentions ? Object.keys(event.mentions) : [];
    if (mentionIds.length) targetId = mentionIds[0];
    
    if (!targetId && event.messageReply?.senderID) targetId = event.messageReply.senderID;
    
    if (!targetId && args[0] && /^\d{5,}$/.test(args[0])) targetId = args[0];
    
    if (!targetId) targetId = senderID;
    
    let xpStr: string | null = null;
    for (let i = args.length - 1; i >= 0; i--) {
      if (/^-?\d+$/.test(args[i])) { xpStr = args[i]; break; }
    }
    if (!xpStr) {
      await api.sendMessage(
        "⚠️ Provide an XP number. Example: setxp 100093844882993 2500",
        threadID,
        messageID
      );
      return;
    }
    const newXP = parseInt(xpStr, 10);
    
    const computeLevel = (xp: number) => Math.max(0, Math.floor(xp / 100));
    const newLevel = computeLevel(newXP);
    
    const g: any = global as any;
    if (!g.userXP || !(g.userXP instanceof Map)) g.userXP = new Map < string, number > ();
    if (!g.userLevel || !(g.userLevel instanceof Map)) g.userLevel = new Map < string, number > ();
    
    g.userXP.set(targetId, newXP);
    g.userLevel.set(targetId, newLevel);
    
    const current = usersData.get(targetId) || { balance: 0, bank: 0, xp: 0, level: 0 };
    current.xp = newXP;
    current.level = newLevel;
    usersData.set(targetId, current);
    
    const name = (() => {
      try {
        const u = (event.mentions && event.mentions[targetId]) ? event.mentions[targetId] : null;
        return u?.replace?.(/^@/, "") || "";
      } catch { return ""; }
    })();
    
    const msg = AuroraBetaStyler?.styleOutput ?
      AuroraBetaStyler.styleOutput({
        headerText: "XP Manager",
        headerSymbol: "🛠️",
        headerStyle: "bold",
        bodyText: `Set XP for ${name ? `@${name}` : targetId}\nXP: ${newXP}\nLevel: ${newLevel}`,
        bodyStyle: "sansSerif",
        footerText: "In-memory only (no DB).",
      }) :
      `✅ Set XP\nUser: ${name || targetId}\nXP: ${newXP}\nLevel: ${newLevel}`;
    
    await api.sendMessage(
      msg,
      threadID,
      messageID
    );
  },
};

export default setxpCommand;