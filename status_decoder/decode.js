async function decodeStatus(inputValue) {
  const url = 'https://jgromes.github.io/RadioLib/group__status__codes.html';

  try {
      // Fetch the HTML content from the URL
      const response = await fetch(url);

      // Check if the response is successful
      if (!response.ok) {
          throw new Error(response.status);
      }

      // Retrieve the HTML text
      const htmlText = await response.text();

      // Parse the HTML text into a DOM document
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');

      // Find all macro definitions (adjust selector if necessary)
      const macros = doc.querySelectorAll('.memItemRight');

      // Loop through macros and check if any match the input value
      for (let macro of macros) {
          // Assuming the macro name is within a certain tag (e.g., `.memname`)
          const macroNameElement = macro.querySelector('.el');

          if (macroNameElement) {
              const macroName = macroNameElement.textContent.trim();
              const statusValue = getMacroVal(macro)

              // Check if the description contains the input value
              if (statusValue == inputValue) {
                const macroId = macro.parentElement.className.match(/memitem:(\S+)/)[1];
                const descriptionElement = doc.querySelector(`.memdesc\\:${macroId} .mdescRight`);

                if (descriptionElement) {
                    const description = descriptionElement.textContent.trim();
                    return { macroName, description }; // Return both macro name and description
                }
              }
          }
      }

      // If no match is found
      macroName = "No status code found for value:";
      description = inputValue;
      return { macroName, description };
  } catch (error) {
      macroName = "Error fetching or parsing the HTML:";
      description = error;
      return { macroName, description };
  }
}

function getMacroVal(element) {
  // Get the text content of the element
  const text = element.textContent;

  // Use a regular expression to match the number in parentheses
  const match = text.match(/\((-?\d+)\)/);

  // If a match is found, return the captured number, otherwise return null
  return match ? parseInt(match[1], 10) : null;
}

// Prefill form using hash value in the URL
function prefillFormFromHash() {
  const hash = location.hash;
  if (hash.startsWith("#statusValue=")) {
      const inputValue = parseInt(hash.split("=")[1], 10);
      const inputField = document.getElementById("statusValue");

      if (!isNaN(inputValue)) {
          inputField.value = inputValue;

          // Trigger search automatically
          document.getElementById("statusForm").dispatchEvent(new Event("submit"));
      }
  }
}

// Handle form submission
document.getElementById("statusForm").addEventListener("submit", async function(event) {
  event.preventDefault(); // Prevent the form from submitting traditionally

  const inputValue = document.getElementById("statusValue").value;
  const resultElement = document.getElementById("result");

  // Add the input value to the URL as a hashtag
  location.hash = `#statusValue=${inputValue}`;

  // Fetch the macro name based on input value
  resultElement.textContent = "Searching..."; // Show a loading message
  const result = await decodeStatus(inputValue);

  // Display the result
  if (typeof result === "object") {
    resultElement.innerHTML = `${result.macroName}\n${result.description}`;
  } else {
    resultElement.innerHTML = `Status code not found!`
  }
});

// Run prefill logic on page load
document.addEventListener("DOMContentLoaded", prefillFormFromHash);
