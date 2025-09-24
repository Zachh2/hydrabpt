
/**
 * Discord bot entry
 * @Author: Aljur Pogoy
 */

const chalk = require("chalk");
global.log = {
  info: (msg) => console.log(chalk.blue("[INFO]"), msg),
  warn: (msg) => console.log(chalk.yellow("[WARN]"), msg),
  error: (msg) => console.log(chalk.red("[ERROR]"), msg),
  success: (msg) => console.log(chalk.green("[SUCCESS]"), msg),
  event: (msg) => console.log(chalk.magenta("[EVENT]"), msg),
};

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  Collection,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("./config.json");
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();
const commands = [];
const commandsPath = path.join(__dirname, "scripts", "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((f) => f.endsWith(".js"));

for (const file of commandFiles) {
  const cmd = require(path.join(commandsPath, file));
  client.commands.set(cmd.name, cmd);
  commands.push({ name: cmd.name, description: cmd.description });
}

const rest = new REST({ version: "10" }).setToken(config.token);
async function registerCommands(appId) {
  try {
    global.log.info("Registering slash commands…");
    await rest.put(Routes.applicationCommands(appId), { body: commands });
    global.log.success("✅ Commands registered.");
  } catch (err) {
    global.log.error(`Command registration failed: ${err}`);
  }
}
client.once("clientReady", async () => {
  global.log.success(`✅ Logged in as ${client.user.tag}`);
  await registerCommands(config.clientId);
});
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.run({ interaction });
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "❌ An error occurred.",
      ephemeral: true,
    });
  }
});

client.login(config.token);
