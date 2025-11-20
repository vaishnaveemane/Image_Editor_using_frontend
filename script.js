const upload = document.getElementById("upload");
const emptyMsg = document.getElementById("emptyMsg");

const brightnessEl = document.getElementById("brightness");
const contrastEl = document.getElementById("contrast");
const saturateEl = document.getElementById("saturate");
const blurEl = document.getElementById("blur");
const invertEl = document.getElementById("invert");

const rotateEl = document.getElementById("rotate");
const flipHBtn = document.getElementById("flipH");
const flipVBtn = document.getElementById("flipV");
const zoomInBtn = document.getElementById("zoomIn");
const zoomOutBtn = document.getElementById("zoomOut");

const textInput = document.getElementById("textInput");
const addTextBtn = document.getElementById("addText");
const addHeartBtn = document.getElementById("addHeart");
const addStarBtn = document.getElementById("addStar");

const startCropBtn = document.getElementById("startCrop");
const resetBtn = document.getElementById("reset");
const downloadBtn = document.getElementById("download");

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let img = new Image();
let originalOffscreen = null;

let loaded = false;
let flipH = false,
  flipV = false;
let rotation = 0;
let zoom = 1;

let overlays = []; // for text & stickers
let cropMode = false;
let cropStart = null;
let cropRect = null;

// SHOW/HIDE CANVAS
function showCanvas() {
  emptyMsg.style.display = "none";
  canvas.style.display = "block";
}

function hideCanvas() {
  emptyMsg.style.display = "block";
  canvas.style.display = "none";
}

// FIT CANVAS TO HOLDER
function fitCanvasToHolder() {
  const holder = canvas.parentElement;
  const maxW = holder.clientWidth - 20;
  const maxH = holder.clientHeight - 20;

  const iw = originalOffscreen.width;
  const ih = originalOffscreen.height;
  const ratio = iw / ih;

  let w = maxW;
  let h = w / ratio;

  if (h > maxH) {
    h = maxH;
    w = h * ratio;
  }

  canvas.width = w;
  canvas.height = h;
}

// MAIN DRAW FUNCTION
function applyAll() {
  if (!loaded) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();

  // FILTERS
  ctx.filter = `
    brightness(${brightnessEl.value}%)
    contrast(${contrastEl.value}%)
    saturate(${saturateEl.value}%)
    blur(${blurEl.value}px)
    invert(${invertEl.value}%)
  `;

  // MOVE TO CENTER
  ctx.translate(canvas.width / 2, canvas.height / 2);

  // TRANSFORMS
  ctx.scale(zoom * (flipH ? -1 : 1), zoom * (flipV ? -1 : 1));
  ctx.rotate((rotation * Math.PI) / 180);

  const imgW = originalOffscreen.width;
  const imgH = originalOffscreen.height;
  const ratio = imgW / imgH;

  // TARGET W/H (fit inside canvas)
  let drawW = canvas.width;
  let drawH = drawW / ratio;

  if (drawH > canvas.height) {
    drawH = canvas.height;
    drawW = drawH * ratio;
  }

  // APPLY ZOOM (fixed scaling)
  drawW *= zoom;
  drawH *= zoom;

  // DRAW IMAGE CENTERED
  ctx.drawImage(originalOffscreen, -drawW / 2, -drawH / 2, drawW, drawH);

  // OVERLAYS
  overlays.forEach((ov) => {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.font = ov.font;
    ctx.fillStyle = ov.color;
    ctx.fillText(ov.content, ov.x, ov.y);

    ctx.restore();
  });

  ctx.restore();

  // CROP BOX DRAWING
  if (cropMode && cropRect) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
    ctx.restore();
  }
}

// UPLOAD IMAGE
upload.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    img = new Image();
    img.onload = () => {
      // CREATE MASTER IMAGE
      const off = document.createElement("canvas");
      off.width = img.width;
      off.height = img.height;
      off.getContext("2d").drawImage(img, 0, 0);
      originalOffscreen = off;

      loaded = true;
      flipH = flipV = false;
      rotation = 0;
      zoom = 1;
      overlays = [];
      cropMode = false;

      fitCanvasToHolder();
      showCanvas();
      applyAll();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

// FILTERS
[brightnessEl, contrastEl, saturateEl, blurEl, invertEl].forEach((el) =>
  el.addEventListener("input", applyAll)
);

rotateEl.addEventListener("input", (e) => {
  rotation = Number(e.target.value);
  applyAll();
});

// FLIP
flipHBtn.addEventListener("click", () => {
  flipH = !flipH;
  applyAll();
});
flipVBtn.addEventListener("click", () => {
  flipV = !flipV;
  applyAll();
});


zoomInBtn.addEventListener("click", () => {
  if (!loaded) return;
  zoom = Math.min(4, zoom + 0.15);
  applyAll();
});

zoomOutBtn.addEventListener("click", () => {
  if (!loaded) return;
  zoom = Math.max(0.3, zoom - 0.15);
  applyAll();
});

// TEXT
addTextBtn.addEventListener("click", () => {
  if (!loaded) return;
  const txt = textInput.value.trim();
  if (!txt) return;

  overlays.push({
    type: "text",
    content: txt,
    x: 0,
    y: 0,
    font: "28px Inter, Arial",
    color: "white",
  });

  textInput.value = "";
  applyAll();
});

// STICKERS
addHeartBtn.addEventListener("click", () => {
  if (!loaded) return;

  overlays.push({
    type: "sticker",
    content: "❤️",
    x: 0,
    y: 0,
    font: "52px serif",
    color: "white",
  });

  applyAll();
});

addStarBtn.addEventListener("click", () => {
  if (!loaded) return;

  overlays.push({
    type: "sticker",
    content: "⭐",
    x: 0,
    y: 0,
    font: "52px serif",
    color: "white",
  });

  applyAll();
});

// CROP MODE
startCropBtn.addEventListener("click", () => {
  if (!loaded) return;
  cropMode = true;
  cropRect = null;
  cropStart = null;
  canvas.style.cursor = "crosshair";
});

// MOUSE EVENTS FOR CROP
canvas.addEventListener("mousedown", (e) => {
  if (!cropMode) return;

  const r = canvas.getBoundingClientRect();
  cropStart = {
    x: e.clientX - r.left,
    y: e.clientY - r.top,
  };

  cropRect = {
    x: cropStart.x,
    y: cropStart.y,
    w: 0,
    h: 0,
  };
});

window.addEventListener("mousemove", (e) => {
  if (!cropMode || !cropStart) return;

  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;

  cropRect = {
    x: Math.min(x, cropStart.x),
    y: Math.min(y, cropStart.y),
    w: Math.abs(x - cropStart.x),
    h: Math.abs(y - cropStart.y),
  };

  applyAll();
});

window.addEventListener("mouseup", () => {
  if (!cropMode || !cropRect) return;

  if (cropRect.w < 10 || cropRect.h < 10) {
    cropMode = false;
    cropRect = null;
    canvas.style.cursor = "default";
    applyAll();
    return;
  }

  // CREATE TEMP CANVAS
  const temp = document.createElement("canvas");
  temp.width = cropRect.w;
  temp.height = cropRect.h;
  const tctx = temp.getContext("2d");

  tctx.drawImage(
    canvas,
    cropRect.x,
    cropRect.y,
    cropRect.w,
    cropRect.h,
    0,
    0,
    cropRect.w,
    cropRect.h
  );

  // UPDATE MASTER IMAGE
  const newOff = document.createElement("canvas");
  newOff.width = temp.width;
  newOff.height = temp.height;
  newOff.getContext("2d").drawImage(temp, 0, 0);

  originalOffscreen = newOff;
  overlays = [];
  zoom = 1;
  rotation = 0;
  flipH = flipV = false;

  fitCanvasToHolder();
  cropMode = false;
  cropRect = null;
  canvas.style.cursor = "default";
  applyAll();
});

// RESET  
resetBtn.addEventListener("click", () => {
  if (!loaded) return;

  brightnessEl.value = 100;
  contrastEl.value = 100;
  saturateEl.value = 100;
  blurEl.value = 0;
  invertEl.value = 0;

  rotation = 0;
  flipH = flipV = false;
  zoom = 1;
  overlays = [];

  applyAll();
});

// DOWNLOAD
downloadBtn.addEventListener("click", () => {
  if (!loaded) return;

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = "edited_image.png";
  link.click();
});

// RESIZE
window.addEventListener("resize", () => {
  if (!loaded) return;
  fitCanvasToHolder();
  applyAll();
});

// INIT
hideCanvas();
