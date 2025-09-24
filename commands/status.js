const os = require("os");

module.exports = {

    name: "stats",

    description: "Shows system information.",

    usage: "/stats",

    async run({ api, event }) {

        try {

            const platform = os.platform();

            const arch = os.arch();

            const cpuCores = os.cpus().length;

            const cpuModel = os.cpus()[0].model;

            const hostname = os.hostname();

            const type = os.type();

            const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);

            const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);

            const usedMem = (totalMem - freeMem).toFixed(2);

            const memUsagePercent = ((usedMem / totalMem) * 100).toFixed(2);

            const serverTime = new Date().toLocaleString();

            const message = 

`🖥️ System Info:

- Platform: ${platform}

- Architecture: ${arch}

- CPU Model: ${cpuModel}

- CPU Cores: ${cpuCores}

- Hostname: ${hostname}

- Type: ${type}

📈 Memory:

- Total RAM: ${totalMem} GB

- Used RAM: ${usedMem} GB (${memUsagePercent}%)

- Free RAM: ${freeMem} GB

🕒 Server Time:

- ${serverTime}`;

            api.sendMessage(message, event.threadID, event.messageID);

        } catch (error) {

            console.error(error);

            api.sendMessage("❌ Error fetching system info.", event.threadID, event.messageID);

        }

    }

};