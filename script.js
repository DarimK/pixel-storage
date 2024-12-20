const image = document.getElementById("image");

const imageDisplay = document.getElementById("imageDisplay");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const storageInfo = document.getElementById("storageInfo");

const form = document.getElementById("form");
const bitsSelect = document.getElementById("bits");
const file = document.getElementById("file");
const text = document.getElementById("text");
const embedButton = document.getElementById("embedButton");
const extractButton = document.getElementById("extractButton");

const result = document.getElementById("result");
const resultInfo = document.getElementById("resultInfo");
const resultImage = document.getElementById("resultImage");
const resultText = document.getElementById("resultText");
const resultLink = document.getElementById("resultLink");

let bits = 1, imageData, fileData, fileType, url;


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
    imageData = undefined;
    visible(imageDisplay, false);
    visible(form, false);

    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                imageData = ctx.getImageData(0, 0, img.width, img.height);

                visible(imageDisplay, true);
                visible(form, true);
                displayStorage();
                form.scrollIntoView();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

file.addEventListener("change", (event) => {
    const file = event.target.files[0];
    fileData = undefined;
    fileType = file && file.type;

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
        visible(resultImage, false);
        visible(resultText, false);
        visible(resultLink, false);
        setInfo("Please upload a data file or enter some text");
        return;
    }

    const newImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    try {
        embed(newImageData.data, fileData || text.value, bits, fileType || "text/plain");
        const tempCanvas = document.createElement("canvas");
        const tempCtx = tempCanvas.getContext("2d");
        tempCanvas.width = imageData.width;
        tempCanvas.height = imageData.height;
        tempCtx.putImageData(newImageData, 0, 0);
        resultLink.href = resultImage.src = tempCanvas.toDataURL("image/png");
        resultLink.download = "image";
        resultLink.textContent = "Download";
        visible(resultImage, true);
        visible(resultLink, true);
        setInfo("Data has been embedded into the image");
    } catch (e) {
        visible(resultImage, false);
        visible(resultLink, false);
        setInfo(e.message);
    }

    visible(result, true);
    visible(resultText, false);
    result.scrollIntoView();
});

extractButton.addEventListener("click", (event) => {
    event.preventDefault();

    try {
        const { data, type } = extract(imageData.data);

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
            url = URL.createObjectURL(blob);
            resultLink.href = url;
            resultLink.download = "data";
            resultLink.textContent = "Download";
            visible(resultText, false);
            visible(resultLink, true);
        }

        setInfo("Data has been extracted from the image");
    } catch (e) {
        visible(resultText, false);
        visible(resultLink, false);
        setInfo(e.message);
    }

    visible(result, true);
    visible(resultImage, false);
    result.scrollIntoView();
});

resultLink.addEventListener("click", () => {
    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 100);
    visible(result, false);
});