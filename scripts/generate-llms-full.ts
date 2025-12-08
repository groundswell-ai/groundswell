#!/usr/bin/env npx tsx
/**
 * Generates llms_full.txt by combining:
 * 1. README.md and its linked markdown documentation files
 * 2. Examples README and all example source files
 *
 * Future-proof design:
 * - Auto-discovers markdown files linked from README.md (docs/*.md pattern)
 * - Auto-discovers all example files matching examples/examples/*.ts
 * - New docs and examples are automatically included without script changes
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_FILE = path.join(ROOT_DIR, "llms_full.txt");

interface Section {
  title: string;
  content: string;
  filePath?: string;
}

function readFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    console.warn(`Warning: Could not read ${filePath}`);
    return "";
  }
}

function extractMarkdownLinks(content: string, baseDir: string): string[] {
  // Match markdown links: [text](path.md) - only .md files
  const linkRegex = /\[([^\]]+)\]\(([^)]+\.md)\)/g;
  const links: string[] = [];
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const linkPath = match[2];
    // Only include relative links (not http/https)
    if (!linkPath.startsWith("http://") && !linkPath.startsWith("https://")) {
      const absolutePath = path.resolve(baseDir, linkPath);
      if (fs.existsSync(absolutePath) && !links.includes(absolutePath)) {
        links.push(absolutePath);
      }
    }
  }

  return links;
}

function discoverDocsMarkdown(): string[] {
  const docsDir = path.join(ROOT_DIR, "docs");
  if (!fs.existsSync(docsDir)) {
    return [];
  }

  return fs
    .readdirSync(docsDir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => path.join(docsDir, file))
    .sort();
}

function discoverExamples(): string[] {
  const examplesDir = path.join(ROOT_DIR, "examples", "examples");
  if (!fs.existsSync(examplesDir)) {
    return [];
  }

  return fs
    .readdirSync(examplesDir)
    .filter((file) => file.endsWith(".ts"))
    .sort() // Sorting ensures NN- prefixed files are in order
    .map((file) => path.join(examplesDir, file));
}

function formatSection(section: Section): string {
  const separator = "=".repeat(80);
  const relativePath = section.filePath
    ? path.relative(ROOT_DIR, section.filePath)
    : "";

  let header = `${separator}\n${section.title}`;
  if (relativePath) {
    header += `\nFile: ${relativePath}`;
  }
  header += `\n${separator}\n\n`;

  return header + section.content.trim() + "\n\n";
}

function generateLlmsFull(): void {
  const sections: Section[] = [];
  const processedFiles = new Set<string>();

  // 1. Main README
  const readmePath = path.join(ROOT_DIR, "README.md");
  const readmeContent = readFile(readmePath);
  if (readmeContent) {
    sections.push({
      title: "PROJECT README",
      content: readmeContent,
      filePath: readmePath,
    });
    processedFiles.add(readmePath);
  }

  // 2. Documentation files from docs/ directory
  // First, get links from README to preserve intended order
  const linkedDocs = extractMarkdownLinks(readmeContent, ROOT_DIR);
  // Then discover all docs to catch any not linked
  const allDocs = discoverDocsMarkdown();

  // Process linked docs first (preserves README order)
  for (const docPath of linkedDocs) {
    if (
      docPath.includes("/docs/") &&
      !processedFiles.has(docPath) &&
      fs.existsSync(docPath)
    ) {
      const content = readFile(docPath);
      const fileName = path.basename(docPath, ".md").toUpperCase();
      sections.push({
        title: `DOCUMENTATION: ${fileName}`,
        content,
        filePath: docPath,
      });
      processedFiles.add(docPath);
    }
  }

  // Add any docs not linked from README
  for (const docPath of allDocs) {
    if (!processedFiles.has(docPath)) {
      const content = readFile(docPath);
      const fileName = path.basename(docPath, ".md").toUpperCase();
      sections.push({
        title: `DOCUMENTATION: ${fileName}`,
        content,
        filePath: docPath,
      });
      processedFiles.add(docPath);
    }
  }

  // 3. Examples README
  const examplesReadmePath = path.join(ROOT_DIR, "examples", "README.md");
  if (fs.existsSync(examplesReadmePath)) {
    const content = readFile(examplesReadmePath);
    sections.push({
      title: "EXAMPLES OVERVIEW",
      content,
      filePath: examplesReadmePath,
    });
    processedFiles.add(examplesReadmePath);
  }

  // 4. All example source files
  const examples = discoverExamples();
  for (const examplePath of examples) {
    const content = readFile(examplePath);
    const fileName = path.basename(examplePath);
    // Extract example number and name from filename (e.g., "01-basic-workflow.ts")
    const match = fileName.match(/^(\d+)-(.+)\.ts$/);
    const exampleName = match
      ? `Example ${parseInt(match[1])}: ${match[2].replace(/-/g, " ")}`
      : fileName;

    sections.push({
      title: `EXAMPLE: ${exampleName.toUpperCase()}`,
      content,
      filePath: examplePath,
    });
  }

  // Build output
  const header = `GROUNDSWELL - LLM DOCUMENTATION
Generated: ${new Date().toISOString()}
${"=".repeat(80)}

This file contains the complete documentation and examples for the Groundswell project.
It is auto-generated by scripts/generate-llms-full.ts

Contents:
${sections.map((s, i) => `  ${i + 1}. ${s.title}`).join("\n")}

`;

  const output =
    header + sections.map((section) => formatSection(section)).join("\n");

  // Write output
  fs.writeFileSync(OUTPUT_FILE, output);
  console.log(`Generated ${path.relative(process.cwd(), OUTPUT_FILE)}`);
  console.log(`Total sections: ${sections.length}`);
  console.log(`Total size: ${(output.length / 1024).toFixed(1)} KB`);
}

// Run
generateLlmsFull();
