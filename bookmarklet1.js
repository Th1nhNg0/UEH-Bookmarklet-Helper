javascript: (async function () {
  let text = "";

  function createProgressUI() {
    const progressContainer = document.createElement("div");
    progressContainer.id = "ueh-progress-container";
    progressContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 300px;
      background: white;
      border: 1px solid #0066cc;
      border-radius: 8px;
      padding: 15px;
      z-index: 9999;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      font-family: Arial, sans-serif;
    `;

    const title = document.createElement("div");
    title.textContent = "Đang trích xuất văn bản...";
    title.style.cssText = `
      font-weight: bold;
      margin-bottom: 10px;
      color: #0066cc;
    `;

    const progressBarContainer = document.createElement("div");
    progressBarContainer.style.cssText = `
      width: 100%;
      background-color: #e0e0e0;
      border-radius: 4px;
      margin-bottom: 10px;
    `;

    const progressBar = document.createElement("div");
    progressBar.id = "ueh-progress-bar";
    progressBar.style.cssText = `
      width: 0%;
      height: 20px;
      background-color: #4CAF50;
      border-radius: 4px;
      transition: width 0.3s ease;
    `;
    progressBarContainer.appendChild(progressBar);

    const progressText = document.createElement("div");
    progressText.id = "ueh-progress-text";
    progressText.textContent = "0%";
    progressText.style.cssText = `
      text-align: center;
      margin-top: 5px;
      font-size: 14px;
    `;

    const statusText = document.createElement("div");
    statusText.id = "ueh-status-text";
    statusText.textContent = "Đang khởi tạo...";
    statusText.style.cssText = `
      margin-top: 10px;
      font-size: 14px;
      color: #555;
    `;

    progressContainer.appendChild(title);
    progressContainer.appendChild(progressBarContainer);
    progressContainer.appendChild(progressText);
    progressContainer.appendChild(statusText);
    document.body.appendChild(progressContainer);

    return {
      updateProgress: function (percent) {
        progressBar.style.width = `${percent}%`;
        progressText.textContent = `${Math.round(percent)}%`;
      },
      updateStatus: function (text) {
        statusText.textContent = text;
      },
      complete: function () {
        title.textContent = "Hoàn thành!";
        title.style.color = "#4CAF50";
        statusText.textContent = "Đang tải file...";
        setTimeout(() => {
          document.body.removeChild(progressContainer);
        }, 3000);
      },
      error: function (message) {
        title.textContent = "Lỗi!";
        title.style.color = "red";
        statusText.textContent = message || "Đã xảy ra lỗi.";
        setTimeout(() => {
          document.body.removeChild(progressContainer);
        }, 5000);
      },
    };
  }

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
        return "";
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
        return "";
      }
    } catch (fetchError) {
      return "";
    }
  }

  async function processPages(numPages, progressUI) {
    for (let page = 10; page <= numPages + 10; page += 10) {
      const percent = (page / numPages) * 100;
      progressUI.updateProgress(percent);
      progressUI.updateStatus(`Đang xử lý trang ${page}/${numPages}`);
      const pageText = await fetchPage(page);
      text += pageText + " ";
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
    if (typeof startDocument === "undefined" || !startDocument) {
      throw new Error(
        "Không tìm thấy tài liệu. Vui lòng đảm bảo bạn đang xem một tài liệu."
      );
    }

    if (typeof numPages === "undefined" || !numPages) {
      throw new Error(
        "Không thể xác định số trang. Vui lòng đảm bảo bạn đang xem một tài liệu."
      );
    }

    const progressUI = createProgressUI();
    progressUI.updateStatus(`Bắt đầu xử lý ${numPages} trang...`);

    await processPages(numPages, progressUI);
    text = cleanText(text);

    const documentName = startDocument.split("/").pop() || "document";
    progressUI.updateStatus(`Tạo file ${documentName}.txt...`);
    downloadTextAsFile(text, `${documentName}.txt`);
    progressUI.complete();
  } catch (e) {
    try {
      const progressUI = document.getElementById("ueh-progress-container");
      if (progressUI) {
        progressUI.error(e.message);
      } else {
        alert(`Lỗi: ${e.message}`);
      }
    } catch (ui_error) {
      alert(`Lỗi: ${e.message}`);
    }
  }
})();
