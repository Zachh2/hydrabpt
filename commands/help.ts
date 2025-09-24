const fs = require("fs");
const path = require("path");
const AuroraBetaStyler = require("@aurora/styler");
const { LINE } = AuroraBetaStyler;

const helpCommand = {
  config: {
    name: "help",
    description: "Displays all available commands or detailed info about a specific command",
    usage: "-help or -help <command> or -help <page> or -help all",
    aliases: [],
    category: "Utility"
  },
  run: async ({ api, event, prefix, args }) => {
    const { threadID, messageID } = event;
    const commandsDir = path.join(__dirname, "..", "commands");

    if (!fs.existsSync(commandsDir)) {
      await new Promise(resolve => {
        api.sendMessage(
          AuroraBetaStyler.styleOutput({
            headerText: "Error",
            headerSymbol: "❌",
            headerStyle: "bold",
            bodyText: "Commands directory not found.",
            bodyStyle: "sansSerif",
            footerText: ""
          }),
          threadID,
          (err, info) => resolve(info),
          messageID
        );
      });
      return;
    }

    let commandList = [];
    let eventList = [];

    try {
      const commandFiles = getAllCommandFiles(commandsDir);
      commandFiles.forEach(file => {
        try {
          delete require.cache[require.resolve(file)];
          const commandModule = require(file);
          const command = commandModule.default || commandModule;
          const commandName = path.basename(file).replace(/\.js|\.ts/, "");
          if (typeof command !== "object" || (!command.config?.name && !command.name)) return;

          const name = command.config?.name || command.name;
          if (command.handleEvent) {
            eventList.push(` ${name}`);
          } else if (command.run || command.execute) {
            commandList.push(`${name} (${file.endsWith(".ts") ? "TS" : "JS"})`);
          }
        } catch (cmdError) {
          // Skip invalid command files
        }
      });
    } catch (error) {
      await new Promise(resolve => {
        api.sendMessage(
          AuroraBetaStyler.styleOutput({
            headerText: "Error",
            headerSymbol: "❌",
            headerStyle: "bold",
            bodyText: "Error loading command list.",
            bodyStyle: "sansSerif",
            footerText: ""
          }),
          threadID,
          (err, info) => resolve(info),
          messageID
        );
      });
      return;
    }

    const styledMessage = (header, body, symbol) =>
      AuroraBetaStyler.styleOutput({
        headerText: header,
        headerSymbol: symbol,
        headerStyle: "bold",
        bodyText: body,
        bodyStyle: "sansSerif",
        footerText: ""
      });

    let sentMessageID;

    if (args.length > 0 && args[0].toLowerCase() === "all") {
      const allCommands = [...commandList, ...eventList].join("\n");
      await new Promise(resolve => {
        api.sendMessage(
          styledMessage("All Commands", allCommands || "No commands available.", "🌐"),
          threadID,
          (err, info) => {
            sentMessageID = info?.messageID;
            resolve(info);
          },
          messageID
        );
      });
      return;
    }

    if (args.length > 0 && isNaN(parseInt(args[0]))) {
      const commandName = args[0].toLowerCase();
      const jsPath = path.join(commandsDir, `${commandName}.js`);
      const tsPath = path.join(commandsDir, `${commandName}.ts`);
      const commandPath = fs.existsSync(jsPath) ? jsPath : tsPath;

      if (!fs.existsSync(commandPath)) {
        await new Promise(resolve => {
          api.sendMessage(
            styledMessage("Error", `❌ Command "${commandName}" not found.`, "⚠️"),
            threadID,
            (err, info) => {
              sentMessageID = info?.messageID;
              resolve(info);
            },
            messageID
          );
        });
        return;
      }

      try {
        delete require.cache[require.resolve(commandPath)];
        const commandModule = require(commandPath);
        const command = commandModule.default || commandModule;

        if (typeof command !== "object" || (!command.config?.name && !command.name)) {
          await new Promise(resolve => {
            api.sendMessage(
              styledMessage("Error", `❌ Invalid command: ${commandName}`, "⚠️"),
              threadID,
              (err, info) => {
                sentMessageID = info?.messageID;
                resolve(info);
              },
              messageID
            );
          });
          return;
        }

        const name = command.config?.name || command.name;
        const bodyText = `
Name: ${name || "N/A"}
Category: ${command.config?.category || "N/A"}
Description: ${command.config?.description || command.description || "No description available"}
Author: ${command.config?.author || command.author || "Cid Kagenou"}
Version: ${command.config?.version || command.version || "1.0"}
Usage: ${command.config?.usage || command.usage || `/${name}`}
        `.trim();

        await new Promise(resolve => {
          api.sendMessage(
            styledMessage("Command Info", bodyText, "ℹ️"),
            threadID,
            (err, info) => {
              sentMessageID = info?.messageID;
              resolve(info);
            },
            messageID
          );
        });
        return;
      } catch (error) {
        await new Promise(resolve => {
          api.sendMessage(
            styledMessage("Error", `❌ Error loading command: ${commandName}`, "⚠️"),
            threadID,
            (err, info) => {
              sentMessageID = info?.messageID;
              resolve(info);
            },
            messageID
          );
        });
        return;
      }
    }

    const commandsPerPage = 15;
    const totalPages = Math.ceil(commandList.length / commandsPerPage);
    const page = args.length > 0 && !isNaN(parseInt(args[0])) ? parseInt(args[0]) : 1;

    if (page < 1 || page > totalPages) {
      await new Promise(resolve => {
        api.sendMessage(
          styledMessage("Error", `❌ Invalid page. Choose between 1 and ${totalPages}.`, "⚠️"),
          threadID,
          (err, info) => {
            sentMessageID = info?.messageID;
            resolve(info);
          },
          messageID
        );
      });
      return;
    }

    const startIndex = (page - 1) * commandsPerPage;
    const endIndex = Math.min(startIndex + commandsPerPage, commandList.length);
    const paginatedCommands = commandList.slice(startIndex, endIndex);

    const bodyText = ` 
📌 Commands:
${paginatedCommands.length > 0 ? paginatedCommands.join("\n") : "No commands on this page."}
${LINE}
📖 Page ${page}/${totalPages}
${totalPages > 1 ? "> 🔄 Next page: -help " + (page + 1) + "\n" : ""}> ℹ️ Details: ${prefix}help <command>                                                            >🌟 All Commands: ${prefix}help all                        >Thank you for using our Chatbot!
    `.trim();

    await new Promise(resolve => {
      api.sendMessage(
        styledMessage("Help", bodyText, "🌐"),
        threadID,
        (err, info) => {
          sentMessageID = info?.messageID;
          resolve(info);
        },
        messageID
      );
    });
  }
};

// Recursive function to get all command files
function getAllCommandFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllCommandFiles(filePath));
    } else if (file.endsWith(".js") || file.endsWith(".ts")) {
      results.push(filePath);
    }
  });
  return results;
}

module.exports = helpCommand;
