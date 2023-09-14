import * as THREE from "three"

const loadImage = path => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous" // avoid CORS if used with Canvas
        img.src = path;
        img.onload = () => {
            resolve(img)
        }
        img.onerror = e => reject(e)
    })
}

export async function getPixelDataFromImage(url, size, aspectRatio) {
    let img = await loadImage(url);
    let width = 200;
    let canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = width;
    let ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, width);
    let canvasData = ctx.getImageData(0, 0, width, width).data;

    let pixels = [];
    for (let i = 0; i < canvasData.length; i += 4) {
        let x = (i / 4) % width;
        let y = Math.floor(i / 4 / width);
        if (canvasData[i] < 200) {
            pixels.push({ x: x / width - 0.5, y: 0.5 - y / width });
        }
    }

    const data = new Float32Array(4 * size * size);
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const index = i * size + j;
                let randomPxiels = pixels[Math.floor(Math.random() * pixels.length)]
                if (Math.random() > 0.9) {
                    randomPxiels = {x: 3 * (Math.random() - 0.5), y:3 * (Math.random() - 0.5)}
                }
                data[4 * index] = aspectRatio * 8 * randomPxiels.x + (Math.random() - 0.10) * 0.2 * aspectRatio / 2;
                data[4 * index + 1] =  aspectRatio * 8 * randomPxiels.y + (Math.random() - 0.5) * 0.2 * aspectRatio / 2;
                data[4 * index + 2] = (Math.random() - 0.5) * 0.01;
                data[4 * index + 3] = (Math.random() - 0.5) * 0.01;
            }
        }

    let dataTexture = new THREE.DataTexture(
        data,
        size,
        size,
        THREE.RGBAFormat,
        THREE.FloatType
    );
    dataTexture.needsUpdate = true;

    return dataTexture;
}
