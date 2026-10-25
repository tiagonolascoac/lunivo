export async function createProofPreview(
  file,
  {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.78,
    watermarkText = "PROVA • LUNIVO",
  } = {}
) {
  const image = await loadImage(file);

  const scale = Math.min(
    maxWidth / image.width,
    maxHeight / image.height,
    1
  );

  const width = Math.round(
    image.width * scale
  );

  const height = Math.round(
    image.height * scale
  );

  const canvas =
    document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const context =
    canvas.getContext("2d");

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  context.drawImage(
    image,
    0,
    0,
    width,
    height
  );

  drawWatermark(
    context,
    width,
    height,
    watermarkText
  );

  const blob = await new Promise(
    (resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (!result) {
            reject(
              new Error(
                "Não foi possível gerar a prova."
              )
            );

            return;
          }

          resolve(result);
        },
        "image/webp",
        quality
      );
    }
  );

  // Alguns navegadores convertem automaticamente para PNG quando
  // não suportam o formato solicitado. O tipo real é preservado.
  return {
    blob,
    contentType: blob.type || "image/png",
    width,
    height,
    size: blob.size,
  };
}

function loadImage(file) {
  return new Promise(
    (resolve, reject) => {
      const image = new Image();

      const objectUrl =
        URL.createObjectURL(file);

      image.onload = () => {
        URL.revokeObjectURL(
          objectUrl
        );

        resolve(image);
      };

      image.onerror = () => {
        URL.revokeObjectURL(
          objectUrl
        );

        reject(
          new Error(
            `Não foi possível processar ${file.name}`
          )
        );
      };

      image.src = objectUrl;
    }
  );
}

function drawWatermark(
  context,
  width,
  height,
  text
) {
  context.save();

  const baseSize = Math.max(
    16,
    Math.round(width * 0.019)
  );

  /*
    Marca central ligeiramente mais visível.
  */

  context.textAlign = "center";
  context.textBaseline = "middle";

  context.font =
    `600 ${baseSize}px Arial`;

  context.fillStyle =
    "rgba(255,255,255,0.23)";

  context.strokeStyle =
    "rgba(0,0,0,0.12)";

  context.lineWidth = 2;

  context.strokeText(
    text,
    width / 2,
    height / 2
  );

  context.fillText(
    text,
    width / 2,
    height / 2
  );

  /*
    Marcas secundárias muito leves.
  */

  context.font =
    `500 ${Math.round(
      baseSize * 0.72
    )}px Arial`;

  context.fillStyle =
    "rgba(255,255,255,0.15)";

  const positions = [
    [0.25, 0.25],
    [0.75, 0.25],
    [0.25, 0.75],
    [0.75, 0.75],
  ];

  positions.forEach(
    ([x, y]) => {
      context.fillText(
        text,
        width * x,
        height * y
      );
    }
  );

  context.restore();
}