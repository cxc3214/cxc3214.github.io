import { mkdir, readFile, writeFile } from "node:fs/promises";
import QRCode from "qrcode";

const apps = JSON.parse(await readFile(new URL("../src/config/apps.json", import.meta.url), "utf8"));
const outputDirectory = new URL("../public/apps/", import.meta.url);

await mkdir(outputDirectory, { recursive: true });

for (const app of apps) {
  const svg = await QRCode.toString(app.downloadUrl, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    color: { dark: "#11140f", light: "#fffdf6" },
  });
  await writeFile(new URL(`${app.id}-download-qr.svg`, outputDirectory), svg, "utf8");
}
