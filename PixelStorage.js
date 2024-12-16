const DELIMITER = "|";
const DELIMITER_BINARY = toBinary(DELIMITER);


function toBinary(str) {
    return str.split('').map(char => char.charCodeAt(0).toString(2).padStart(8, '0')).join('');
}

function embedHeader(image, bits, length, type) {
    const binaryData = toBinary(`${bits} ${length} ${type}${DELIMITER}`);
    let i = 0;

    for (let dataIdx = 0; dataIdx < binaryData.length && i < image.length; i++) {
        if (i % 4 !== 3) image[i] = (image[i] & ~1) | parseInt(binaryData[dataIdx++], 2);
    }

    return i;
}

function embedData(image, data, bits, headerIdx) {
    const binaryData = Array.from(data).map(byte => byte.toString(2).padStart(8, '0')).join('');
    const bitsSpace = -(2 ** bits);

    for (let i = headerIdx, dataIdx = 0; dataIdx < binaryData.length && i < image.length; i++) {
        if (i % 4 !== 3) image[i] = (image[i] & bitsSpace) | parseInt(binaryData.substring(dataIdx, dataIdx += bits), 2);
    }
}

function embed(image, data, bits, type) {
    if (typeof data === "string") {
        data = (new TextEncoder()).encode(data);
        type = "text/plain";
    }

    const headerIdx = embedHeader(image, bits, data.length * 8, type);
    embedData(image, data, bits, headerIdx);

    for (let i = 0; i < image.length; i += 4) {
        if (image[i + 3] === 0) image[i + 3] = 255;
    }

    return image;
}


function toBytes(binaryData) {
    const bytes = [];
    for (let i = 0; i < binaryData.length; i += 8) {
        bytes.push(parseInt(binaryData.slice(i, i + 8), 2));
    }
    return bytes;
}

function extractHeader(image) {
    let binaryData = '';
    let i = 0;

    for (; i < image.length; i++) {
        if (i % 4 !== 3) binaryData += (image[i] & 1).toString();
        if (binaryData.length % 8 === 0 && binaryData.endsWith(DELIMITER_BINARY)) break;
    }

    const bytes = toBytes(binaryData.substring(0, binaryData.length - 8));
    const header = bytes.map(byte => String.fromCharCode(byte)).join("").split(" ");
    return [Number(header[0]), Number(header[1]), header[2], i + 1];
}

function extractData(image, bits, length, headerIdx) {
    const bitsMask = (2 ** bits - 1);
    let binaryData = '';

    for (let i = headerIdx; i < image.length && binaryData.length < length; i++) {
        if (i % 4 !== 3) binaryData += (image[i] & bitsMask).toString(2).padStart(bits, '0');
    }

    return new Uint8Array(toBytes(binaryData));
}

function extract(image) {
    const [bits, length, type, headerIdx] = extractHeader(image);
    const data = extractData(image, bits, length, headerIdx);
    return { data, type };
}