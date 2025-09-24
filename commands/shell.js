const { exec } = require("child_process");

module.exports = {
  name: 'shell',
  description: 'Run shell commands.',
  usage: '[nashPrefix]shell [command]',
  nashPrefix: false,
  role: 3,
  execute: async (api, event, args) => {
    const send = (msg) => api.sendMessage(msg, event.threadID, event.messageID);
    if (!args.length) return send('Missing input.');
    exec(args.join(' '), (error, stdout, stderr) => {
      if (error) return send(`Error Output:\n${error.message}`);
      if (stderr) return send(`Error Output:\n${stderr}`);
      send(`Output:\n${stdout}`);
    });
  }
};