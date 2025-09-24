import axios from "axios";
import https from "https";
import fs from "fs";
import { Readable } from "stream";

/* defined shadowBot ts :) */

namespace ShadowBot {
  export interface Command {
    config: {
      name: string;
      description: string;
      usage: string;
      nonPrefix: boolean;
    };
    run: (context: { api: any; event: any; args: string[] }) => Promise<void>;
  }
}

const mlbbCommand: ShadowBot.Command = {
  config: {
    name: "mlbb",
    description: "Fetch MLBB pro player or hero info with subcommands.",
    usage: "/mlbb <subcommand> <value>\n- Subcommands: pro, hero-info\n- Example: /mlbb pro Kairi, /mlbb hero-info Hanzo",
    nonPrefix: true,
  },
  run: async ({ api, event, args }: { api: any; event: any; args: string[] }) => {
    const { threadID, messageID } = event;

    if (args.length < 1) {
      return api.sendMessage("Please provide a subcommand. Usage: /mlbb <subcommand> <value>\n- Subcommands: pro, hero-info", threadID, messageID);
    }

    const subcommand = args[0].toLowerCase();
    const value = args.slice(1).join(" ").trim();

    if (!value) {
      return api.sendMessage(`Please provide a value for '${subcommand}'. Usage: /mlbb ${subcommand} <value>`, threadID, messageID);
    }

    try {
      switch (subcommand) {
        case "pro":
          const proResponse = await axios.get(`https://ml-api-en.vercel.app/api/mlbb-pro?name=${encodeURIComponent(value)}`);
          const proData = proResponse.data;

          if (proData && proData.error) {
            return api.sendMessage(`Error: ${proData.error}`, threadID, messageID);
          }

          if (proData) {
            const {
              Name,
              Nationality,
              Born,
              Status,
              Role,
              Team,
              "Expert Hero": expertHeroes,
              "Social Media": socialMedia,
              Trophies,
              Trivia,
              Statistics,
              "Pro Photo": photoUrl,
              "Alternate IDs": alternateIds,
              "Approx. Total Winnings": winnings,
            } = proData;

            const messageText = `
MLBB Pro Player Details:
- Name: ${Name || "N/A"}
- Nationality: ${Nationality || "N/A"}
- Born: ${Born || "N/A"}
- Status: ${Status || "N/A"}
- Role: ${Role || "N/A"}
- Team: ${Team || "N/A"}
- Expert Heroes: ${expertHeroes ? expertHeroes.join(", ") : "N/A"}
- Social Media: ${socialMedia ? Object.entries(socialMedia).map(([platform, url]) => `${platform}: ${url}`).join("\n  - ") : "N/A"}
- Trophies: ${Trophies ? Trophies.join(", ") : "N/A"}
- Trivia: ${Trivia ? Trivia.join("\n  - ") : "N/A"}
- Statistics: ${Statistics ? Statistics.join("\n  - ") : "N/A"}
- Alternate IDs: ${alternateIds || "N/A"}
- Approx. Total Winnings: $${winnings || "N/A"}
`;

            if (photoUrl) {
              let attachmentStream;
              try {
                // Create a readable stream from the HTTP response
                attachmentStream = await new Promise((resolve, reject) => {
                  https.get(photoUrl, (res) => {
                    if (res.statusCode !== 200) {
                      reject(new Error(`Failed to fetch photo, status: ${res.statusCode}`));
                      return;
                    }
                    console.log("Photo stream started, status:", res.statusCode); // Debug log
                    resolve(res); // Return the readable stream directly
                  }).on("error", (err) => {
                    console.error("HTTPS request error:", err.message);
                    reject(err);
                  });
                });

                const message = {
                  body: messageText,
                  attachment: attachmentStream,
                };
                await new Promise((resolve, reject) => {
                  api.sendMessage(message, threadID, (err, info) => {
                    if (err) {
                      console.error("Error sending message with stream attachment:", err);
                      reject(err);
                    } else {
                      resolve(info);
                    }
                  }, messageID);
                });
              } catch (attachmentError) {
                console.error("Stream attachment failed, falling back to file:", attachmentError.message);
                // Fallback: Save to temporary file and use createReadStream
                const filePath = `/tmp/mlbb_pro_photo_${Date.now()}.png`;
                await new Promise((resolve, reject) => {
                  https.get(photoUrl, (res) => {
                    const writeStream = fs.createWriteStream(filePath);
                    res.pipe(writeStream);
                    writeStream.on("finish", () => resolve(filePath));
                    writeStream.on("error", reject);
                  }).on("error", reject);
                });
                attachmentStream = fs.createReadStream(filePath);
                console.log("Using file stream from:", filePath); // Debug log
                const message = {
                  body: messageText,
                  attachment: attachmentStream,
                };
                await new Promise((resolve, reject) => {
                  api.sendMessage(message, threadID, (err, info) => {
                    if (err) {
                      console.error("Error sending message with file stream:", err);
                      reject(err);
                    } else {
                      resolve(info);
                    }
                  }, messageID);
                });
                fs.unlinkSync(filePath); // Clean up
              }
            } else {
              await api.sendMessage(messageText, threadID, messageID);
            }
          } else {
            api.sendMessage(`No data found for player '${value}'.`, threadID, messageID);
          }
          break;

        case "hero-info":
          const heroResponse = await axios.get(`https://ml-api-en.vercel.app/api/mlbb?hero=${encodeURIComponent(value)}`);
          const heroData = heroResponse.data;

          if (heroData && heroData.error) {
            return api.sendMessage(`Error: ${heroData.error}`, threadID, messageID);
          }

          if (heroData) {
            const { heroInfo, skillInfo, lores, proPlayers } = heroData;
            const { price, lane, heroType, specialty, region, city, quote, resourceBar, releaseDate, voiceActor, winRate, baseStats } = heroInfo;

            const messageText = `
MLBB Hero Info:
- Name: ${value}
- Price: ${price || "N/A"}
- Lane: ${lane || "N/A"}
- Hero Type: ${heroType || "N/A"}
- Specialty: ${specialty || "N/A"}
- Region: ${region || "N/A"}
- City: ${city || "N/A"}
- Quote: "${quote || "N/A"}"
- Resource Bar: ${resourceBar || "N/A"}
- Release Date: ${releaseDate || "N/A"}
- Voice Actor: ${voiceActor || "N/A"}
- Win Rate: ${winRate || "N/A"}
- Base Stats: HP: ${baseStats?.health || "N/A"}, Attack: ${baseStats?.physicalAttack || "N/A"}, Defense: ${baseStats?.physicalDefense || "N/A"}
- Passive: ${skillInfo?.passive || "N/A"}
- Skill 1: ${skillInfo?.skill_1_description || "N/A"}
- Skill 2: ${skillInfo?.skill_2_description || "N/A"}
- Skill 3: ${skillInfo?.skill_3_description || "N/A"}
- Lore: ${lores?.lore || "N/A"}
- Pro Players: ${proPlayers ? proPlayers.join(", ") : "N/A"}
`;

            await api.sendMessage(messageText, threadID, messageID);
          } else {
            api.sendMessage(`No data found for hero '${value}'.`, threadID, messageID);
          }
          break;

        default:
          api.sendMessage(`Invalid subcommand '${subcommand}'. Usage: /mlbb <subcommand> <value>\n- Subcommands: pro, hero-info`, threadID, messageID);
      }
    } catch (error) {
      console.error("Error querying MLBB API:", error);
      api.sendMessage("An error occurred while fetching data.", threadID, messageID);
    }
  },
};

export default mlbbCommand;