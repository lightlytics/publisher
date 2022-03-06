export function localsCollector(addData) {
  let blockCnt = 0;
  let currentBlockLines = "";

  function processLine(line) {
    const sanitizedLine = String(line).trim();
    if (sanitizedLine.startsWith("#")) return;

    if (blockCnt > 0) {
      currentBlockLines += line;
    }

    if (blockCnt > 0 && sanitizedLine === "{") {
      blockCnt++;
    }

    if (sanitizedLine === "locals {") {
      currentBlockLines = "";
      blockCnt = 1;
    }

    if (sanitizedLine === "}" && blockCnt > 0) {
      blockCnt--;
      if (blockCnt === 0) {
        addData(currentBlockLines)
      }
    }
  }

  return processLine
}