/** Package only verified manifest-owned output for Sites and direct offline opening. */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
execFileSync(process.execPath, ["scripts/build.mjs", "--check"], {
  cwd: root,
  stdio: "inherit",
});
const artifacts = path.join(root, "artifacts");
fs.mkdirSync(artifacts, { recursive: true });
const stage = fs.mkdtempSync(path.join(artifacts, "release-"));
try {
  const publicRoot = path.join(stage, "dist");
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, "dist/build-manifest.json")),
  );
  for (const name of [...Object.keys(manifest.files), "build-manifest.json"]) {
    const source = path.resolve(root, "dist", name),
      destination = path.resolve(publicRoot, name);
    if (
      !source.startsWith(path.join(root, "dist") + path.sep) ||
      !destination.startsWith(publicRoot + path.sep)
    )
      throw new Error(`Unsafe manifest path: ${name}`);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }
  fs.mkdirSync(path.join(publicRoot, ".openai"), { recursive: true });
  fs.copyFileSync(
    path.join(root, ".openai/hosting.json"),
    path.join(publicRoot, ".openai/hosting.json"),
  );
  fs.copyFileSync(
    path.join(root, "OFFLINE-README.txt"),
    path.join(publicRoot, "OFFLINE-README.txt"),
  );
  const archive = path.join(artifacts, "site.tar.gz"),
    zip = path.join(artifacts, "Zheng-Lee-Portfolio-Offline.zip");
  execFileSync("tar", ["-czf", archive, "-C", stage, "dist"], {
    stdio: "inherit",
  });
  // Recreate this known artifact so removed assets cannot survive in an older ZIP.
  fs.rmSync(zip, { force: true });
  if (process.platform === "win32") {
    // PowerShell literal quoting prevents path text from being evaluated as shell code.
    const quote = (value) => "'" + value.replaceAll("'", "''") + "'";
    execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `$ErrorActionPreference = 'Stop'; Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory(${quote(publicRoot)}, ${quote(zip)})`,
      ],
      { stdio: "inherit" },
    );
  } else {
    // Other platforms use a standard zip binary; no shell is involved.
    execFileSync("zip", ["-qr", zip, "."], {
      cwd: publicRoot,
      stdio: "inherit",
    });
  }
  console.log(`Created ${archive}\nCreated ${zip}`);
} finally {
  // Validate the exact temporary directory before recursive removal.
  const resolvedStage = path.resolve(stage);
  if (
    path.dirname(resolvedStage) !== path.resolve(artifacts) ||
    !path.basename(resolvedStage).startsWith("release-")
  )
    throw new Error("Unsafe packaging cleanup path");
  fs.rmSync(resolvedStage, { recursive: true, force: true });
}
