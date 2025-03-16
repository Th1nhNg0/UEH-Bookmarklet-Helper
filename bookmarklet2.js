javascript: (function () {
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
    title.textContent = "Đang tạo PDF...";
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
        statusText.textContent = "Đang tải PDF...";
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

  function getParam(name) {
    const regex = new RegExp("[?&]" + name + "=([^&]*)"),
      results = regex.exec(location.search);
    return results ? decodeURIComponent(results[1].replace(/\+/g, " ")) : null;
  }

  try {
    const subfolder = getParam("subfolder"),
      doc = getParam("doc");

    if (!subfolder || !doc) {
      throw new Error("Thiếu thông tin subfolder hoặc doc trong URL");
    }

    const numPages = window.numPages || 115;
    const baseUrl = `services/view.php?doc=${doc}&subfolder=${subfolder}&format=jpg&page=`;
    const imageUrls = [];

    for (let i = 1; i <= numPages; i++) imageUrls.push(baseUrl + i);

    const progressUI = createProgressUI();
    progressUI.updateStatus(`Chuẩn bị tải ${numPages} trang...`);

    function createPDF(urls) {
      let fetchedCount = 0;

      Promise.all(
        urls.map((url, index) =>
          fetch(url).then((res) => {
            if (!res.ok) throw new Error("Fetch failed: " + url);
            fetchedCount++;
            const percent = (fetchedCount / urls.length) * 50;
            progressUI.updateProgress(percent);
            progressUI.updateStatus(
              `Đang tải trang ${fetchedCount}/${urls.length}`
            );
            return res.blob();
          })
        )
      )
        .then((blobs) => {
          progressUI.updateStatus("Đang xử lý ảnh...");
          const images = blobs.map((blob) => {
            const img = new Image();
            img.src = URL.createObjectURL(blob);
            return img;
          });
          return Promise.all(
            images.map(
              (img) => new Promise((resolve) => (img.onload = resolve))
            )
          ).then(() => images);
        })
        .then((images) => {
          progressUI.updateStatus("Đang tạo file PDF...");
          const { jsPDF } = window.jspdf,
            pdf = new jsPDF({
              orientation: "portrait",
              unit: "mm",
              format: "a4",
            });

          let pagesDone = 0;
          images.forEach((img, idx) => {
            if (idx > 0) pdf.addPage();
            const iw = img.width,
              ih = img.height,
              pw = pdf.internal.pageSize.width,
              ph = pdf.internal.pageSize.height,
              scale = Math.min(pw / iw, ph / ih),
              sw = iw * scale,
              sh = ih * scale,
              x = (pw - sw) / 2,
              y = (ph - sh) / 2;
            pdf.addImage(img, "JPEG", x, y, sw, sh);

            pagesDone++;
            const percent = 50 + (pagesDone / images.length) * 50;
            progressUI.updateProgress(percent);
            progressUI.updateStatus(
              `Đang xử lý PDF: ${pagesDone}/${images.length}`
            );
          });

          progressUI.updateStatus("Hoàn tất, đang tải xuống...");
          pdf.save("document.pdf");
          progressUI.complete();
        })
        .catch((err) => {
          progressUI.error(err.message || "Đã xảy ra lỗi khi tạo PDF");
        });
    }

    if (!window.jspdf) {
      progressUI.updateStatus("Đang tải thư viện jsPDF...");
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      script.onload = () => {
        progressUI.updateStatus("Đã tải thư viện, đang bắt đầu xử lý...");
        createPDF(imageUrls);
      };
      script.onerror = () => {
        progressUI.error("Không thể tải thư viện jsPDF");
      };
      document.head.appendChild(script);
    } else {
      createPDF(imageUrls);
    }
  } catch (err) {
    alert(`Lỗi: ${err.message}`);
  }
})();
