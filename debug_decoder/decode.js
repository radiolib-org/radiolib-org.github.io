function findByMarker(text, marker) {
  const matches = text.match(RegExp(marker + "(.*)", "g"));
  return(matches ? matches.map(match => match.replace(RegExp(marker), '')) : []);
}

function parseRegAddresses(text) {
  const regex = /#define\s+(\w*_REG\w*)\s+(0x[0-9A-Fa-f]+|\d+(\.\d+)?)/g;
  let match;
  const addresses = [];

  // Iterate over all matches and capture the macro name and value
  while ((match = regex.exec(text)) !== null) {
    const macroName = match[1];
    const macroValue = parseInt(match[2], 16);
    addresses.push({ name: macroName, value: macroValue });
  }

  return addresses;
}

function regAddrToName(text, names) {
  // Create a lookup map for macros based on their values for quick replacement
  const macroMap = Object.fromEntries(names.map(macro => [macro.value, macro.name]));

  // Regex to find lines with "R" or "W" followed by a number
  return text.replace(/\b([RW])\s+([0-9A-Fa-f]+)\b/g, (match, rw, number) => {
    const value = parseInt(number, 16);

    // Check if the value has a corresponding macro name in the macro map
    const macroName = macroMap[value];
    if (!macroName) {
      // If no matching macro is found, return the original match without changes
      return match;
    }

    const opName = rw === "R" ? "Read " : "Write";
    return `${opName} ${macroMap[value] || number}`;
  });
}

// Handle form submission
document.getElementById("debugForm").addEventListener("submit", async function(event) {
  event.preventDefault(); // Prevent the form from submitting traditionally

  // Get the input text from the textarea
  logText = document.getElementById('debugInput').value;
      
  // find the modules in use
  modules = findByMarker(logText, "RLB_DBG:\\sM\\s");
  baseModule = modules[0];

  // get the appropriate header files
  const urlBase = 'https://raw.githubusercontent.com/jgromes/RadioLib/refs/heads/master/src/modules/';
  for (let module of modules) {
    try {
      // Fetch the HTML content from the URL
      const response = await fetch(urlBase + baseModule + '/' + module + '.h');

      // Check if the response is successful
      if (!response.ok) {
        throw new Error(response.status);
      }

      // retrieve the header contents
      const headerText = await response.text();

      // parse register addresses
      const registers = parseRegAddresses(headerText)

      // replace register values with their names
      logText = regAddrToName(logText, registers);
      
    } catch (error) {
      macroName = "Error reading or parsing the header:";
      description = error;
      console.log(error)
    
    }
  }

  // Display the marked text in the output div
  document.getElementById('output').innerHTML = logText;
});
