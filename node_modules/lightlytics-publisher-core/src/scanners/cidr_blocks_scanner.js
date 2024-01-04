export function cidrBlocksScanner(addData) {
  let blockCnt = 0
  let cidrBlockLines = ''
  let resourceName = ''
  let ingressCidrBlock = false
  let egressCidrBlock = false
  let cidrBlock = false

  function processLine(line) {
    const sanitizedLine = String(line).trim()

    // find resource block and count it. increase the block counter each { occurrence
    if (sanitizedLine.startsWith('resource') || sanitizedLine.startsWith('data')) {
      const splittedLine = sanitizedLine.split('"')
      if (splittedLine.length > 3) {
        resourceName = `${splittedLine[1]}.${splittedLine[3]}`
        blockCnt = 1
      }
    } else if (blockCnt > 0 && sanitizedLine.includes('{')) {
      blockCnt += (sanitizedLine.match(/{/g) || []).length
      if (sanitizedLine.includes('ingress {')) {
        ingressCidrBlock = true
      } else if (sanitizedLine.includes('egress {')) {
        egressCidrBlock = true
      }
    }

    // find the cidr block and add the block lines to the cidrBlockLines
    if (blockCnt > 0 && sanitizedLine.includes('cidr_blocks =') && (ingressCidrBlock || egressCidrBlock)) {
      cidrBlockLines += '{'
      cidrBlock = true
    }

    if (cidrBlock) {
      cidrBlockLines += line
    }

    // decrease the block counter each } occurrence. if it is the end of the resource block and there is cidr data, add it by the resource name
    if (blockCnt > 0 && sanitizedLine.includes('}')) {
      blockCnt -= (sanitizedLine.match(/}/g) || []).length
      // if there is a cidr block and the block counter is 1, it means that it is the end of the cidr block
      if (cidrBlock && blockCnt === 1) {
        cidrBlock = false
      }
      if (blockCnt === 0 && cidrBlockLines) {
        if (ingressCidrBlock) {
          addData({ [resourceName]: { 'ingress': cidrBlockLines } })
        } else if (egressCidrBlock) {
          addData({ [resourceName]: { 'egress': cidrBlockLines } })
        }
        ingressCidrBlock = false
        egressCidrBlock = false
        cidrBlock = false
        cidrBlockLines = ''
      }
    }
  }

  return processLine
}
