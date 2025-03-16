javascript: (function () {
  function getParam(name) {
    const regex = new RegExp("[?&]" + name + "=([^&]*)"),
      results = regex.exec(location.search);
    return results ? decodeURIComponent(results[1].replace(/\+/g, " ")) : null;
  }
  const subfolder = getParam("subfolder"),
    doc = getParam("doc");
  if (!subfolder || !doc) {
    alert("Missing subfolder or doc in URL");
    return;
  }
  const numPages = window.numPages || 115;
  (baseUrl = `services/view.php?doc=${doc}&subfolder=${subfolder}&format=jpg&page=`),
    (imageUrls = []);
  for (let i = 1; i <= numPages; i++) imageUrls.push(baseUrl + i);
  console.log("Fetching", numPages, "pages...");
  function createPDF(urls) {
    Promise.all(
      urls.map((url) =>
        fetch(url).then((res) => {
          if (res.ok) return res.blob();
          throw new Error("Fetch failed: " + url);
        })
      )
    )
      .then((blobs) => {
        const images = blobs.map((blob) => {
          const img = new Image();
          img.src = URL.createObjectURL(blob);
          return img;
        });
        return Promise.all(
          images.map((img) => new Promise((resolve) => (img.onload = resolve)))
        ).then(() => images);
      })
      .then((images) => {
        const { jsPDF } = window.jspdf,
          pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4",
          });
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
          console.log(`Page ${idx + 1}/${images.length}`);
        });
        pdf.save("document.pdf");
        console.log("PDF downloaded");
      })
      .catch((err) => console.error("Error:", err));
  }
  if (!window.jspdf) {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.onload = () => createPDF(imageUrls);
    document.head.appendChild(script);
  } else createPDF(imageUrls);
})();
