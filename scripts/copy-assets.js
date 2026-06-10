import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const desktopRoot = path.resolve(__dirname, "..");
const distDir = path.join(desktopRoot, "dist");

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 1. Copiar a pasta de skills
const srcSkills = path.resolve(desktopRoot, "skills");
const destSkills = path.join(distDir, "skills");
console.log(`[Copy] Copiando skills de ${srcSkills} para ${destSkills}...`);
copyDirRecursive(srcSkills, destSkills);

// 2. Copiar a pasta dist compilada do dashboard
const srcDashboard = path.resolve(desktopRoot, "dashboard/dist");
const destDashboard = path.join(distDir, "dashboard");

if (fs.existsSync(srcDashboard)) {
  console.log(`[Copy] Copiando dashboard de ${srcDashboard} para ${destDashboard}...`);
  copyDirRecursive(srcDashboard, destDashboard);
} else {
  console.warn(`[Warning] Pasta de build do Dashboard não encontrada em ${srcDashboard}. Execute o build do dashboard primeiro.`);
}

// 3. Copiar a pasta do core do plugin (packages/core/dist)
const homeDir = os.homedir();
const possibleCorePaths = [
  path.resolve(desktopRoot, "packages/core/dist"),
  path.join(desktopRoot, "../understand-anything-plugin/packages/core/dist"),
  path.join(homeDir, ".understand-anything/repo/understand-anything-plugin/packages/core/dist"),
  path.join(homeDir, ".gemini/config/plugins/understand-anything-plugin/packages/core/dist")
];

let srcCore = null;
for (const p of possibleCorePaths) {
  if (fs.existsSync(p)) {
    srcCore = p;
    break;
  }
}

if (srcCore) {
  const destCore = path.join(distDir, "packages/core/dist");
  console.log(`[Copy] Copiando core compilado de ${srcCore} para ${destCore}...`);
  copyDirRecursive(srcCore, destCore);
} else {
  console.error("[Error] Não foi possível localizar packages/core/dist nos caminhos conhecidos.");
  console.error("Caminhos verificados:");
  possibleCorePaths.forEach(p => console.error(` - ${p}`));
  process.exit(1);
}

console.log("[Copy] Cópia de assets concluída com sucesso.");

