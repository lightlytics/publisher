export function providersScanner(addData) {
  let blockCnt = 0;
  let providersBlockLines = "";
  let moduleName = "";
  let providers = false;

  function processLine(line) {
    const sanitizedLine = String(line).trim();
    // ignore comments
    if (sanitizedLine.startsWith("#")) return;

    // find module block and count it. increase the block counter each { occurrence
    if (sanitizedLine.startsWith('module "')) {
      moduleName = sanitizedLine.match(/"([^"]+)"/)[1];
      blockCnt = 1;
      providersBlockLines = "";
    } else if (blockCnt > 0 && sanitizedLine.includes("{")) {
      blockCnt += (sanitizedLine.match(/{/g) || []).length;
    }

    // find the providers block and add the block lines to the providersBlockLines until the end of block
    if (blockCnt > 0 && sanitizedLine.startsWith("providers = {")) {
      providers = true;
    } else if (providers && !sanitizedLine.includes("}")) {
      providersBlockLines += line;
    }

    // decrease the block counter each } occurrence. if it is the end of the module block and there is provider data, add it by the module name
    if (blockCnt > 0 && sanitizedLine.includes("}")) {
      blockCnt -= (sanitizedLine.match(/}/g) || []).length;
      providers = false;
      if (blockCnt === 0 && providersBlockLines) {
        addData({ [moduleName]: providersBlockLines });
      }
    }
  }
  return processLine;
}
