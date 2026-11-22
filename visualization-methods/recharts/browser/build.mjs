import { copyFile, mkdir, readFile, readdir } from "node:fs/promises";
import { isAbsolute, join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const project = fileURLToPath(new URL(".", import.meta.url));
const [output] = process.argv.slice(2);
if (!output || !isAbsolute(output) || process.argv.length !== 3) {
  throw new Error("Pass the absolute generated resources directory to build.mjs.");
}

const bundle = await build({
  absWorkingDir: project,
  entryPoints: ["renderer.jsx"],
  outfile: join(output, "web", "recharts-renderer.js"),
  bundle: true,
  minify: true,
  metafile: true,
  format: "iife",
  platform: "browser",
  target: "es2022",
  legalComments: "eof",
  define: { "process.env.NODE_ENV": '"production"' },
});

const packages = new Set();
for (const { inputs } of Object.values(bundle.metafile.outputs)) {
  for (const [file, { bytesInOutput }] of Object.entries(inputs)) {
    if (!bytesInOutput) continue;
    const parts = file.split("/");
    const index = parts.lastIndexOf("node_modules");
    if (index < 0) continue;
    const end = index + (parts[index + 1].startsWith("@") ? 3 : 2);
    packages.add(join(project, parts.slice(0, end).join(sep)));
  }
}

const licenses = join(output, "META-INF", "licenses");
await mkdir(licenses, { recursive: true });
for (const directory of [...packages].sort()) {
  const { name, version } = JSON.parse(await readFile(join(directory, "package.json"), "utf8"));
  const entries = (await readdir(directory)).filter((file) => /^(licen[cs]e|copying|notice)([_.-]|$)/i.test(file));
  if (!entries.length) throw new Error(`No redistribution notice was found for ${name}@${version}.`);
  const prefix = `${name.replace(/^@/, "").replaceAll("/", "-")}-${version}`;
  for (const file of entries.sort()) {
    const destination = name === "recharts" && file === "LICENSE" ? "recharts-LICENSE" : `${prefix}-${file}`;
    await copyFile(join(directory, file), join(licenses, destination));
  }
}
