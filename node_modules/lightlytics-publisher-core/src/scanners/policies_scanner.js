export function policiesScanner(addData) {
  let blockCnt = 0;
  let policyBlockLines = "";
  let resourceName = "";
  let policy = false;

  function processLine(line) {
    const sanitizedLine = String(line).trim();

    // find resource block and count it. increase the block counter each { occurrence
    if (sanitizedLine.startsWith("resource")) {
      const splittedLine = sanitizedLine.split('"');
      if (splittedLine.length > 3) {
        resourceName = `${splittedLine[1]}.${splittedLine[3]}`;
        blockCnt = 1;
      }
    } else if (blockCnt > 0 && sanitizedLine.includes("{")) {
      blockCnt += (sanitizedLine.match(/{/g) || []).length;
    }

    // find the policy block and add the block lines to the policyBlockLines
    if (blockCnt > 0 && sanitizedLine.includes("policy =")) {
      policy = true;
    }

    if (policy) {
      policyBlockLines += line;
    }

    // decrease the block counter each } occurrence. if it is the end of the resource block and there is policy data, add it by the resource name
    if (blockCnt > 0 && sanitizedLine.includes("}")) {
      blockCnt -= (sanitizedLine.match(/}/g) || []).length;
      // if there is a policy block and the block counter is 1, it means that it is the end of the policy block
      if (policy && blockCnt === 1) {
        policy = false;
      }
      if (blockCnt === 0 && policyBlockLines) {
        addData({ [resourceName]: policyBlockLines });
        policyBlockLines = "";
      }
    }
  }
  return processLine;
}
