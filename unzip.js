const unzipper = require("unzipper");
const fs = require("fs");

fs.createReadStream("hydra2.zip")
  .pipe(unzipper.Extract({ path: "output" }))
  .on("close", () => console.log("✅ Done!"));
