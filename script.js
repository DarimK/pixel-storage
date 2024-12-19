const image = document.getElementById("image");

const imageDisplay = document.getElementById("imageDisplay");
const canvas = document.getElementById("canvas");
const storageInfo = document.getElementById("storageInfo");

const form = document.getElementById("form");
const bitsSelect = document.getElementById("bits");
const file = document.getElementById("file");
const text = document.getElementById("text");
const embedButton = document.getElementById("embedButton");
const extractButton = document.getElementById("extractButton");

const result = document.getElementById("result");
const resultInfo = document.getElementById("resultInfo");
const resultCanvas = document.getElementById("resultCanvas");
const resultText = document.getElementById("resultText");
const resultLink = document.getElementById("resultLink");

let bits = 1, imageData, fileData, fileType;


function visible(element, visibility) {
    if (visibility) {
        element.classList.remove("hidden");
    } else {
        element.classList.add("hidden");
    }
}

function displayStorage() {
    if (imageData) {
        storageInfo.textContent = `Potential Storage: ${imageData.width * imageData.height * 3 * bits / 8} bytes`;
    } else {
        storageInfo.textContent = "";
    }
}

function setInfo(message) {
    if (message !== "") {
        visible(resultInfo, true);
        resultInfo.textContent = message;
    } else {
        visible(resultInfo, false);
        resultInfo.textContent = "";
    }
}


image.addEventListener("change", (event) => {
    const file = event.target.files[0];
    visible(imageDisplay, false);
    visible(form, false);

    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const ctx = canvas.getContext("2d");
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                imageData = ctx.getImageData(0, 0, img.width, img.height);

                visible(imageDisplay, true);
                visible(form, true);
                displayStorage();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

file.addEventListener("change", (event) => {
    const file = event.target.files[0];
    fileType = event.target.files[0].type;
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            fileData = new Uint8Array(event.target.result);
        };
        reader.readAsArrayBuffer(file);
    }
});

bitsSelect.addEventListener("change", () => {
    bits = Number(bitsSelect.value);
    displayStorage();
});

embedButton.addEventListener("click", (event) => {
    event.preventDefault();
    if (!fileData && !text.value) {
        visible(result, true);
        visible(resultCanvas, false);
        visible(resultText, false);
        visible(resultLink, false);
        setInfo("Please upload a data file or enter some text");
        return;
    }

    embed(imageData.data, fileData || text.value, bits, fileType || "text/plain");
    resultCanvas.width = imageData.width;
    resultCanvas.height = imageData.height;
    const ctx = resultCanvas.getContext("2d");
    ctx.putImageData(imageData, 0, 0);
    resultLink.href = resultCanvas.toDataURL("image/png");
    resultLink.download = "image";
    resultLink.textContent = "Download";

    visible(result, true);
    visible(resultCanvas, true);
    visible(resultText, false);
    visible(resultLink, true);

    setInfo("Data has been embedded into the image");
});

extractButton.addEventListener("click", (event) => {
    event.preventDefault();
    const { data, type } = extract(imageData.data);
    visible(result, true);
    visible(resultCanvas, false);

    if (type.startsWith("text") && data.length < 2 ** 12) {
        resultText.value = (new TextDecoder()).decode(data);
        visible(resultText, true);
        visible(resultLink, false);
        setTimeout(() => {
            resultText.style.height = "auto";
            resultText.style.height = resultText.scrollHeight + "px";
        }, 100);
    } else {
        const blob = new Blob([data], { type });
        const url = URL.createObjectURL(blob);
        resultLink.href = url;
        resultLink.download = "data";
        resultLink.textContent = "Download";
        resultLink.addEventListener("click", () => {
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 100);
            visible(result, false);
        });
        visible(resultText, false);
        visible(resultLink, true);
    }

    setInfo("Data has been extracted from the image");
});