const fileInput = document.getElementById("fileInput");
const dropzone = document.getElementById("dropzone");
const previewWrap = document.getElementById("previewWrap");
const previewImage = document.getElementById("previewImage");
const clearBtn = document.getElementById("clearBtn");
const predictBtn = document.getElementById("predictBtn");
const statusText = document.getElementById("status");

const emptyState = document.getElementById("emptyState");
const resultBox = document.getElementById("resultBox");
const predictedClass = document.getElementById("predictedClass");
const confidenceText = document.getElementById("confidence");
const probabilityBars = document.getElementById("probabilityBars");

let selectedFile = null;

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.style.color = isError ? "#9b1f1f" : "";
}

function toTitleCase(label) {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function showImagePreview(file) {
  const reader = new FileReader();
  reader.onload = (event) => {
    previewImage.src = event.target?.result || "";
    previewWrap.classList.remove("hidden");
  };
  reader.readAsDataURL(file);
}

function clearSelection() {
  fileInput.value = "";
  selectedFile = null;
  previewImage.src = "";
  previewWrap.classList.add("hidden");
  predictBtn.disabled = true;
  setStatus("Image removed. Choose a new MRI image.");
}

function handleFile(file) {
  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    setStatus("Please upload a valid image file.", true);
    return;
  }

  selectedFile = file;
  showImagePreview(file);
  predictBtn.disabled = false;
  setStatus(`Selected: ${file.name}`);
}

function setResultVisibility(showResult) {
  resultBox.classList.toggle("hidden", !showResult);
  emptyState.classList.toggle("hidden", showResult);
}

function renderProbabilities(probabilities) {
  probabilityBars.innerHTML = "";

  const ordered = Object.entries(probabilities).sort((a, b) => b[1] - a[1]);

  for (const [label, value] of ordered) {
    const row = document.createElement("div");
    row.className = "bar-row";

    const name = document.createElement("span");
    name.textContent = toTitleCase(label);

    const track = document.createElement("div");
    track.className = "bar-track";

    const fill = document.createElement("div");
    fill.className = "bar-fill";

    const percent = document.createElement("span");
    percent.textContent = `${(value * 100).toFixed(1)}%`;

    track.appendChild(fill);
    row.appendChild(name);
    row.appendChild(track);
    row.appendChild(percent);
    probabilityBars.appendChild(row);

    // Trigger animation after paint.
    requestAnimationFrame(() => {
      fill.style.width = `${(value * 100).toFixed(1)}%`;
    });
  }
}

async function runInference() {
  if (!selectedFile) {
    setStatus("Please select an MRI image first.", true);
    return;
  }

  predictBtn.disabled = true;
  setStatus("Running inference...");

  const formData = new FormData();
  formData.append("file", selectedFile);

  try {
    const response = await fetch("/predict", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();

    predictedClass.textContent = toTitleCase(data.class || "unknown");
    confidenceText.textContent = `Confidence: ${((data.confidence || 0) * 100).toFixed(2)}%`;

    renderProbabilities(data.probabilities || {});
    setResultVisibility(true);
    setStatus("Inference completed successfully.");
  } catch (error) {
    setStatus(`Inference failed: ${error.message}`, true);
  } finally {
    predictBtn.disabled = !selectedFile;
  }
}

fileInput.addEventListener("change", (event) => {
  const [file] = event.target.files || [];
  handleFile(file);
});

clearBtn.addEventListener("click", clearSelection);
predictBtn.addEventListener("click", runInference);

["dragenter", "dragover"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add("drag-over");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove("drag-over");
  });
});

dropzone.addEventListener("drop", (event) => {
  const [file] = event.dataTransfer?.files || [];
  handleFile(file);
});
