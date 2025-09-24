const fs = require("fs");

const path = require("path");

module.exports = {

  config: {

    name: "system",

    description: "Manage bot commands (install/unload/load)",

    role: 3,

    cooldown: 5,

    aliases: ["sys"],

  },

  async run({ api, event, args, commands }) {

    const { threadID, messageID } = event;

    const commandsDir = path.join(__dirname);

    if (!commands || !(commands instanceof Map)) {

      console.error("[SYSTEM] Commands map is not initialized or not a Map:", commands);

      return api.sendMessage("❌ Internal error: Commands system is not initialized. Check console logs.", threadID, messageID);

    }

    if (args.length < 2) {

      return api.sendMessage(

        "Usage: #system install <commandName> <code>\n#system unload <commandName>\n#system load <commandName>",

        threadID,

        messageID

      );

    }

    const action = args[0].toLowerCase();

    const commandName = args[1];

    const installCommand = async (commandName, code, commandsDir, commandsMap) => {

      let filePath;

      try {

        if (!commandsMap) {

          throw new Error("Commands map is undefined. Please ensure commands are initialized.");

        }

        if (!commandName.endsWith(".js")) commandName += ".js";

        filePath = path.join(commandsDir, commandName);

        fs.writeFileSync(filePath, code);

        const commandModule = require(filePath);

        const command = commandModule.default || commandModule;

        if (!command.config || !command.config.name || !command.config.description) {

          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

          throw new Error("Invalid command structure. Must have config (name, description).");

        }

        const normalizedCommand = {

          config: {

            name: command.config.name.toLowerCase(),

            description: command.config.description,

            role: command.config.role || 0,

            cooldown: command.config.cooldown || 0,

            aliases: command.config.aliases || [],

            nonPrefix: command.config.nonPrefix || false,

          },

          run: command.run || (async ({ api, event, args, message }) => {

            try {

              if (command.onStart) {

                await command.onStart({ api, event, args, message });

              } else {

                throw new Error("No run or onStart function defined.");

              }

            } catch (error) {

              console.error(`[COMMAND ERROR] Failed to execute '${command.config.name}':`, error);

              api.sendMessage(`Error executing command '${command.config.name}': ${error.message}`, event.threadID, event.messageID);

            }

          }),

        };

        commandsMap.set(normalizedCommand.config.name, normalizedCommand);

        if (normalizedCommand.config.aliases) {

          normalizedCommand.config.aliases.forEach(alias => commandsMap.set(alias.toLowerCase(), normalizedCommand));

        }

        if (normalizedCommand.config.nonPrefix) {

          global.nonPrefixCommands.set(normalizedCommand.config.name.toLowerCase(), normalizedCommand);

        }

        delete require.cache[require.resolve(filePath)];

        console.log(`[SYSTEM] Installed command: ${commandName}`);

        return `✅ Installed command: ${commandName}`;

      } catch (error) {

        console.error(`[SYSTEM] Failed to install command ${commandName}:`, error);

        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);

        return `❌ Failed to install command: ${error.message}`;

      }

    };

    const unloadCommand = async (commandName, commandsDir, commandsMap) => {

      let filePath;

      try {

        if (!commandsMap) {

          throw new Error("Commands map is undefined. Please ensure commands are initialized.");

        }

        if (!commandName.endsWith(".js")) commandName += ".js";

        filePath = path.join(commandsDir, commandName);

        if (!fs.existsSync(filePath)) {

          return `❌ Command ${commandName} not found.`;

        }

        const commandModule = require(filePath);

        const command = commandModule.default || commandModule;

        commandsMap.delete(command.config.name.toLowerCase());

        if (command.config.aliases) {

          command.config.aliases.forEach(alias => commandsMap.delete(alias.toLowerCase()));

        }

        if (command.config.nonPrefix) {

          global.nonPrefixCommands.delete(command.config.name.toLowerCase());

        }

        fs.unlinkSync(filePath);

        delete require.cache[require.resolve(filePath)];

        console.log(`[SYSTEM] Unloaded command: ${commandName}`);

        return `✅ Unloaded command: ${commandName}`;

      } catch (error) {

        console.error(`[SYSTEM] Failed to unload command ${commandName}:`, error);

        return `❌ Failed to unload command: ${error.message}`;

      }

    };

    const loadCommand = async (commandName, commandsDir, commandsMap) => {

      let filePath;

      try {

        if (!commandsMap) {

          throw new Error("Commands map is undefined. Please ensure commands are initialized.");

        }

        if (!commandName.endsWith(".js")) commandName += ".js";

        filePath = path.join(commandsDir, commandName);

        if (!fs.existsSync(filePath)) {

          return `❌ Command ${commandName} file not found.`;

        }

        const commandModule = require(filePath);

        const command = commandModule.default || commandModule;

        if (!command.config || !command.config.name || !command.config.description) {

          throw new Error("Invalid command structure. Must have config (name, description).");

        }

        const normalizedCommand = {

          config: {

            name: command.config.name.toLowerCase(),

            description: command.config.description,

            role: command.config.role || 0,

            cooldown: command.config.cooldown || 0,

            aliases: command.config.aliases || [],

            nonPrefix: command.config.nonPrefix || false,

          },

          run: command.run || (async ({ api, event, args, message }) => {

            try {

              if (command.onStart) {

                await command.onStart({ api, event, args, message });

              } else {

                throw new Error("No run or onStart function defined.");

              }

            } catch (error) {

              console.error(`[COMMAND ERROR] Failed to execute '${command.config.name}':`, error);

              api.sendMessage(`Error executing command '${command.config.name}': ${error.message}`, event.threadID, event.messageID);

            }

          }),

        };

        commandsMap.set(normalizedCommand.config.name, normalizedCommand);

        if (normalizedCommand.config.aliases) {

          normalizedCommand.config.aliases.forEach(alias => commandsMap.set(alias.toLowerCase(), normalizedCommand));

        }

        if (normalizedCommand.config.nonPrefix) {

          global.nonPrefixCommands.set(normalizedCommand.config.name.toLowerCase(), normalizedCommand);

        }

        delete require.cache[require.resolve(filePath)];

        console.log(`[SYSTEM] Loaded command: ${commandName}`);

        return `✅ Loaded command: ${commandName}`;

      } catch (error) {

        console.error(`[SYSTEM] Failed to load command ${commandName}:`, error);

        return `❌ Failed to load command: ${error.message}`;

      }

    };

    if (action === "install") {

      if (args.length < 3) {

        return api.sendMessage("Please provide the command code after the command name.", threadID, messageID);

      }

      const code = args.slice(2).join(" ");

      const result = await installCommand(commandName, code, commandsDir, commands);

      await api.sendMessage(result, threadID, messageID);

    } else if (action === "unload") {

      const result = await unloadCommand(commandName, commandsDir, commands);

      if (result.includes("✅ Unloaded command:")) {

        await api.sendMessage(`Successful unload ${commandName} command`, threadID, messageID);

      } else {

        await api.sendMessage(result, threadID, messageID);

      }

    } else if (action === "load") {

      const result = await loadCommand(commandName, commandsDir, commands);

      await api.sendMessage(result, threadID, messageID);

    } else {

      await api.sendMessage("Invalid action. Use 'install', 'unload', or 'load'.", threadID, messageID);

    }

  },

};