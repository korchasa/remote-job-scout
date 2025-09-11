#!/usr/bin/env -S deno run --allow-read --allow-write

import { ensureDir } from "https://deno.land/std@0.208.0/fs/mod.ts";

console.log("🔨 Building Remote Job Scout...");

// Создаем директорию для сборки
await ensureDir("dist");

// Копируем статические файлы
console.log("📋 Copying static files...");
try {
  await Deno.copyFile("src/web/index.html", "dist/index.html");
  console.log("✅ Static files copied");
} catch (_error) {
  console.log("⚠️  No static files to copy");
}

// Создаем простой бандл (в будущем можно добавить настоящий bundler)
console.log("📦 Creating bundle...");
const bundle = `
console.log("🚀 Remote Job Scout is running!")
// TODO: Add actual bundling logic
`;

await Deno.writeTextFile("dist/bundle.js", bundle);
console.log("✅ Build completed!");
