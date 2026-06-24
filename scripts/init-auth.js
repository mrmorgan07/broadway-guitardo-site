const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const hash = bcrypt.hashSync("12345", 10);
const authPath = path.join(__dirname, "..", "backend", "data", "auth.json");
fs.writeFileSync(authPath, JSON.stringify({ login: "admin", passwordHash: hash }, null, 2));
console.log(hash);
