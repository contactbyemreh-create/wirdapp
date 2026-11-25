// Recolle src/app.html (la page servie par le Worker) dans src/worker.js.
// Usage : node scripts/build.mjs   puis   wrangler deploy
import fs from "node:fs";
const w = fs.readFileSync("src/worker.js", "utf8");
const h = fs.readFileSync("src/app.html", "utf8");
const a = w.indexOf("const HTML=") + "const HTML=".length;
const b = w.indexOf(";\nconst enc=");
if (a < "const HTML=".length || b < 0) throw new Error("src/worker.js : ligne const HTML introuvable");
fs.writeFileSync("src/worker.js", w.slice(0, a) + JSON.stringify(h) + w.slice(b));
console.log("src/app.html intégré dans src/worker.js");
