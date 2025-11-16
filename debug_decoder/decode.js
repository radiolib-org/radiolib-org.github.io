function findByMarker(text, marker) {
  const matches = text.match(RegExp(marker + "(.*)", "g"));
  return(matches ? matches.map(match => match.replace(RegExp(marker), '').trim()) : []);
}

function macroValToName(text, names, pattern, readMarker) {
  const regex = new RegExp(pattern, "g");

  // Create a lookup map for macros based on their values for quick replacement
  const macroMap = Object.fromEntries(names.map(macro => [macro.value, macro.name]));

  // Regex to find lines with "R" or "W" followed by a number
  return text.replace(regex, (match, rw, number) => {
    const value = parseInt(number, 16);

    // Check if the value has a corresponding macro name in the macro map
    const macroName = macroMap[value];
    if (!macroName) {
      // If no matching macro is found, return the original match without changes
      return match;
    }

    const opName = rw === readMarker ? "Read " : "Write";
    return `${opName} ${macroMap[value] || number}`;
  });
}

function parseMacroNames(text, pattern) {
  const regex = new RegExp(pattern, "g");
  let match;
  const result = [];

  // Iterate over all matches and capture the macro name and value
  while ((match = regex.exec(text)) !== null) {
    const macroName = match[1];
    const macroValue = parseInt(match[2], 16);
    result.push({ name: macroName, value: macroValue });
  }

  return result;
}

async function getHeaderUrls(base, modules) {
  headers = []
  for (let module of modules) {
    // if this file is not yet in the headers, add it
    if(!headers.includes(base + modules[0] + '/' + module + '.h')) {
      headers.push(base + modules[0] + '/' + module +  '.h')
    }

    try {
      // fetch the HTML content from the URL
      const response = await fetch(base + modules[0] + '/' + module + '.h');

      // Check if the response is successful
      if (!response.ok) {
        throw new Error(response.status);
      }

      // retrieve the header contents
      const headerText = await response.text();

      // find if there are further included header files
      const matches = headerText.matchAll(RegExp("#include \"SX126x_(.*).h\"", "g"));
      for (const match of matches) {
        const filename = base + modules[0] + '/' + modules[0] + '_' + match[1] + '.h'
        if(!headers.includes(filename)) {
          headers.push(filename)
        }
      }

    } catch (error) {
      console.log(error)
    
    }
  }

  console.log(headers)
  return headers
}

// Handle form submission
document.getElementById("debugForm").addEventListener("submit", async function(event) {
  event.preventDefault(); // Prevent the form from submitting traditionally

  // Get the input text from the textarea
  logText = document.getElementById('debugInput').value;

  // get the ref type
  const isMaster = document.getElementById('refMaster').checked;
  const isTag = document.getElementById('refTag').checked;
  ref = document.getElementById('commit').value;
      
  // find the modules in use
  modules = findByMarker(logText, "RLB_DBG:\\sM\\s");
  baseModule = modules[0];

  // decide whether this is a register-based module or stream-based module
  const regex = /^(SX126x|SX128x|LR11x0)$/;
  isStreamType = regex.test(baseModule);

  // get the appropriate header files
  if (isMaster) {
    ref = 'refs/heads/master';
  } else if (isTag) {
    ref = 'refs/tags/' + document.getElementById('tag').value;
  }
  const urlBase = 'https://raw.githubusercontent.com/jgromes/RadioLib/' + ref + '/src/modules/';
  
  const headers = await getHeaderUrls(urlBase, modules);
  for (let header of headers) {
    try {
      // Fetch the HTML content from the URL
      const response = await fetch(header);

      // Check if the response is successful
      if (!response.ok) {
        throw new Error(response.status);
      }

      // retrieve the header contents
      const headerText = await response.text();

      if(!isStreamType) {
        // parse register addresses
        const registers = parseMacroNames(headerText, "#define\\s+(\\w*_REG\\w*)\\s+(0x[0-9A-Fa-f]+|\\d+(\\.\\d+)?)");
  
        // replace register values with their names
        logText = macroValToName(logText, registers, "\\b([RW])\\s+([0-9A-Fa-f]+)\\b", "R");
      } else {
        // parse SPI commands
        const commands = parseMacroNames(headerText, "#define\\s+(\\w*_CMD\\w*)\\s+(0x[0-9A-Fa-f]+|\\d+(\\.\\d+)?)");
        console.log(commands);
        
        // replace command values with their names
        logText = macroValToName(logText, commands, "\\b(CMDR|CMDW)\\s+([0-9A-Fa-f]+)\\b", "CMDR");
      }
      
    } catch (error) {
      macroName = "Error reading or parsing the header:";
      description = error;
      console.log(error)
    
    }
  }

  // Display the marked text in the output div
  document.getElementById('output').innerHTML = logText;
});
