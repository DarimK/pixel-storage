const DELIMITER = "|";
const DELIMITER_BINARY = toBinary(DELIMITER);


function toBinary(str) {
    return str.split("").map(char => char.charCodeAt(0).toString(2).padStart(8, "0")).join("");
}

function embedHeader(image, bits, length, type) {
    const binaryData = toBinary(`${bits} ${length} ${type}${DELIMITER}`);
    let i = 0;

    for (let dataIdx = 0; dataIdx < binaryData.length && i < image.length; i++) {
        if (i % 4 !== 3 && image[(i & -4) + 3] === 255) image[i] = (image[i] & ~1) | parseInt(binaryData[dataIdx++], 2);
    }

    return i;
}

function embedData(image, data, bits, headerIdx) {
    const binaryData = Array.from(data).map(byte => byte.toString(2).padStart(8, "0")).join("").padEnd(Math.ceil(data.length * 8 / bits) * bits, "0");
    const bitsSpace = -(2 ** bits);
    let dataIdx = 0;
    let i = headerIdx;

    for (; dataIdx < binaryData.length && i < image.length; i++) {
        if (i % 4 !== 3 && image[(i & -4) + 3] === 255) image[i] = (image[i] & bitsSpace) | parseInt(binaryData.substring(dataIdx, dataIdx += bits), 2);
    }

    const storageUsed = i / image.length;

    for (; i < image.length; i++) {
        if (i % 4 !== 3 && image[(i & -4) + 3] === 255) image[i] = (image[i] & bitsSpace) | Math.floor(Math.random() * -bitsSpace);
    }

    if (dataIdx < binaryData.length) {
        throw new Error("Data is too large");
    }

    return storageUsed;
}

function embed(image, data, bits, type) {
    if (typeof data === "string") {
        data = (new TextEncoder()).encode(data);
        type = "text/plain";
    }

    const headerIdx = embedHeader(image, bits, data.length * 8, type);
    return embedData(image, data, bits, headerIdx);
}


function toBytes(binaryData) {
    const bytes = [];
    for (let i = 0; i < binaryData.length; i += 8) {
        bytes.push(parseInt(binaryData.slice(i, i + 8), 2));
    }
    return bytes;
}

function extractHeader(image) {
    let binaryData = "";
    let i = 0;

    for (; i < image.length; i++) {
        if (i % 4 !== 3 && image[(i & -4) + 3] === 255) binaryData += (image[i] & 1).toString();
        if (binaryData.length % 8 === 0 && binaryData.endsWith(DELIMITER_BINARY) || binaryData.length > 512) break;
    }

    const bytes = toBytes(binaryData.substring(0, binaryData.length - 8));
    const header = bytes.map(byte => String.fromCharCode(byte)).join("").split(" ");
    return [Number(header[0]), Number(header[1]), header[2], i + 1];
}

function extractData(image, bits, length, headerIdx) {
    const data = [];
    let bitBuffer = 0;
    let bitCount = 0;
    let extractedBits = 0;

    for (let i = headerIdx; i < image.length && extractedBits < length; i++) {
        if (i % 4 === 3 || image[(i & -4) + 3] !== 255) continue;
        const value = image[i];
        const lsb = value & ((1 << bits) - 1);

        for (let b = bits - 1; b >= 0 && extractedBits < length; b--) {
            const bit = (lsb >> b) & 1;
            bitBuffer = (bitBuffer << 1) | bit;
            bitCount++;
            extractedBits++;

            if (bitCount === 8) {
                data.push(bitBuffer);
                bitBuffer = 0;
                bitCount = 0;
            }
        }
    }

    if (bitCount > 0) {
        data.push(bitBuffer);
    }

    return new Uint8Array(data);
}

function extract(image) {
    const [bits, length, type, headerIdx] = extractHeader(image);

    if (bits && length && type) {
        const data = extractData(image, bits, length, headerIdx);
        return { data, type };
    } else {
        throw new Error("Cannot extract data from the image");
    }
}