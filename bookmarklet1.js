javascript: (async function () {
  let text = "";

  function getSubfolderFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const subfolder = urlParams.get("subfolder");
    return subfolder || "";
  }

  async function fetchPage(page) {
    try {
      const subfolder = getSubfolderFromUrl();
      const result = await fetch(
        `https://digital.lib.ueh.edu.vn/viewer/services/view.php?doc=${startDocument}&format=jsonp&page=${page}&subfolder=${subfolder}&callback=`
      );
      const tt = await result.text();
      let temp = tt.slice(1, tt.length - 1);
      if (temp.trim() === "") {
        console.warn(`Page ${page} is empty`);
        return;
      }
      try {
        const data = JSON.parse(temp);
        let pageText = "";
        for (const item of data) {
          for (const t of item.text) {
            pageText += t[5];
          }
        }
        return pageText;
      } catch (jsonError) {
        console.warn(jsonError);
        return "";
      }
    } catch (fetchError) {
      console.error(`Error fetching page ${page}:`, fetchError);
      return "";
    }
  }

  async function processPages(numPages) {
    for (let page = 10; page <= numPages; page += 10) {
      console.log(`Processing page ${page}/${numPages}`);
      const pageText = await fetchPage(page);
      text += pageText;
      console.log(`Completed page ${page}/${numPages}`);
    }
  }

  function downloadTextAsFile(text, filename = "document.txt") {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  function cleanText(text) {
    return text.replace(/actionGoTo:\d+/g, "");
  }

  try {
    await processPages(numPages);
    text = cleanText(text);
    console.log(text);

    const documentName = startDocument.split("/").pop() || "document";
    downloadTextAsFile(text, `${documentName}.txt`);
    console.log("Download initiated!");
  } catch (e) {
    console.error("Failed to download document:", e);
  }
})();
