#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write --allow-net --allow-env

import { parse } from "https://deno.land/std@0.208.0/flags/mod.ts";
import { walk } from "https://deno.land/std@0.208.0/fs/walk.ts";

// Interface for scan results
interface ScanResult {
  file: string;
  line: number;
  type: string;
  content: string;
}

const args = parse(Deno.args);
const command = args._[0] as string;

// Helper function to run command and check status
async function runCommand(
  cmd: string[],
  description: string,
): Promise<boolean> {
  console.log(`🔧 ${description}...`);
  const command = new Deno.Command(Deno.execPath(), {
    args: cmd,
    stdout: "piped",
    stderr: "piped",
  });
  const process = command.spawn();
  const status = await process.status;

  if (status.code === 0) {
    console.log(`✅ ${description} completed successfully`);
    return true;
  } else {
    console.log(`❌ ${description} failed`);
    return false;
  }
}

// Comment scanning functions
async function scanComments(): Promise<ScanResult[]> {
  const results: ScanResult[] = [];

  const patterns = [
    { regex: /\/\/\s*TODO[:\s]*(.+)/i, type: "TODO" },
    { regex: /\/\*\s*TODO[:\s]*(.+?)\*\//i, type: "TODO" },
    { regex: /\/\/\s*FIXME[:\s]*(.+)/i, type: "FIXME" },
    { regex: /\/\*\s*FIXME[:\s]*(.+?)\*\//i, type: "FIXME" },
    { regex: /\/\/\s*HACK[:\s]*(.+)/i, type: "HACK" },
    { regex: /\/\*\s*HACK[:\s]*(.+?)\*\//i, type: "HACK" },
    { regex: /\/\/\s*BUG[:\s]*(.+)/i, type: "BUG" },
    { regex: /\/\*\s*BUG[:\s]*(.+?)\*\//i, type: "BUG" },
    { regex: /\/\/\s*NOTE[:\s]*(.+)/i, type: "NOTE" },
    { regex: /\/\*\s*NOTE[:\s]*(.+?)\*\//i, type: "NOTE" },
    { regex: /\/\/\s*DEBUG[:\s]*(.+)/i, type: "DEBUG" },
    { regex: /\/\*\s*DEBUG[:\s]*(.+?)\*\//i, type: "DEBUG" },
    { regex: /\/\/\s*eslint-disable/i, type: "ESLINT_DISABLE" },
    { regex: /\/\/\s*tslint:disable/i, type: "TSLINT_DISABLE" },
    { regex: /\/\/\s*deno-lint-ignore/i, type: "DENO_LINT_IGNORE" },
  ];

  for await (
    const entry of walk(".", {
      exts: [".ts", ".js", ".tsx", ".jsx", ".md"],
      skip: [/node_modules/, /\.git/, /dist/, /build/, /\.DS_Store/],
    })
  ) {
    if (entry.isFile) {
      try {
        const content = await Deno.readTextFile(entry.path);
        const lines = content.split("\n");

        lines.forEach((line, index) => {
          for (const pattern of patterns) {
            const match = line.match(pattern.regex);
            if (match) {
              results.push({
                file: entry.path,
                line: index + 1,
                type: pattern.type,
                content: match[1]?.trim() || line.trim(),
              });
            }
          }
        });
      } catch (error) {
        console.warn(
          `Warning: Could not read file ${entry.path}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  return results;
}

const commands = {
  init: async () => {
    console.log("📦 Installing dependencies...");
    const success = await runCommand(
      ["deno", "install"],
      "Dependencies installation",
    );
    if (success) {
      console.log("✅ Dependencies installed successfully");
    } else {
      console.log("❌ Failed to install dependencies");
      Deno.exit(1);
    }
  },

  "test-one": async () => {
    const testPath = args._[1] as string;
    if (!testPath) {
      console.log("❌ Please provide a test path");
      console.log("Usage: ./run.ts test-one <test_path>");
      Deno.exit(1);
    }

    console.log(`🧪 Running specific test: ${testPath}`);
    const success = await runCommand(
      [
        "deno",
        "test",
        "--allow-read",
        "--allow-net",
        "--allow-write",
        testPath,
      ],
      `Test ${testPath}`,
    );

    if (!success) {
      Deno.exit(1);
    }
  },

  cleanup: async () => {
    console.log("🧹 Cleaning project...");
    try {
      // Clean build artifacts
      await Deno.remove("dist", { recursive: true });
    } catch {
      // Ignore if dist doesn't exist
    }

    try {
      // Clean deno.lock if needed
      await Deno.remove("deno.lock");
    } catch {
      // Ignore if deno.lock doesn't exist
    }

    console.log("✅ Project cleanup completed");
    return true;
  },

  dev: async () => {
    console.log("🚀 Starting development server...");
    console.log("🌐 Server will be available at http://localhost:3000");
    console.log("📝 Press Ctrl+C to stop the server");

    const command = new Deno.Command(Deno.execPath(), {
      args: [
        "serve",
        "--watch",
        "--allow-net",
        "--allow-read",
        "--allow-write",
        "--port",
        "3000",
        "--watch-exclude=node_modules",
        "--watch-exclude=.git",
        "--watch-exclude=dist",
        "--watch-exclude=build",
        "src/web/server.ts",
        "src/types/",
        "src/services/",
        "src/web/",
      ],
      stdout: "inherit",
      stderr: "inherit",
    });

    const process = command.spawn();
    await process.status;
  },

  check: async () => {
    console.log("🔍 Running comprehensive project check...");

    // Clean build artifacts directly
    console.log("🧹 Cleaning build artifacts...");
    try {
      await Deno.remove("dist", { recursive: true });
      console.log("✅ Clean completed");
    } catch {
      console.log("ℹ️  Nothing to clean");
    }

    // Check TypeScript compilation
    try {
      console.log("🔧 Compiling TypeScript...");
      const compileCmd = new Deno.Command(Deno.execPath(), {
        args: ["check"],
        stdout: "piped",
        stderr: "piped",
      });
      const compileProcess = compileCmd.spawn();
      const compileStatus = await compileProcess.status;
      if (compileStatus.code === 0) {
        console.log("✅ Compiling TypeScript completed successfully");
      } else {
        console.log("❌ Compiling TypeScript failed");
        Deno.exit(1);
      }
    } catch (error) {
      console.log(`❌ Compiling TypeScript failed with error: ${error}`);
      Deno.exit(1);
    }

    // Check formatting
    try {
      console.log("🔧 Formatting code...");
      const fmtCmd = new Deno.Command(Deno.execPath(), {
        args: ["fmt", "--check"],
        stdout: "piped",
        stderr: "piped",
      });
      const fmtProcess = fmtCmd.spawn();
      const fmtStatus = await fmtProcess.status;
      if (fmtStatus.code === 0) {
        console.log("✅ Formatting code completed successfully");
      } else {
        console.log("❌ Formatting code failed");
        Deno.exit(1);
      }
    } catch (error) {
      console.log(`❌ Formatting code failed with error: ${error}`);
      Deno.exit(1);
    }

    // Check linting
    try {
      console.log("🔧 Linting code...");
      const lintCmd = new Deno.Command(Deno.execPath(), {
        args: ["lint"],
        stdout: "piped",
        stderr: "piped",
      });
      const lintProcess = lintCmd.spawn();
      const lintStatus = await lintProcess.status;
      if (lintStatus.code === 0) {
        console.log("✅ Linting code completed successfully");
      } else {
        console.log("❌ Linting code failed");
        Deno.exit(1);
      }
    } catch (error) {
      console.log(`❌ Linting code failed with error: ${error}`);
      Deno.exit(1);
    }

    // Scan for comments and issues
    try {
      console.log(
        "🔍 Scanning for TODOs, FIXMEs, debug prints and linter suppressions...",
      );
      const scanResults = await scanComments();

      if (scanResults.length === 0) {
        console.log("✅ No comment issues found");
      } else {
        console.log(`\n📋 Found ${scanResults.length} comment items:\n`);

        const grouped = scanResults.reduce((acc, result) => {
          if (!acc[result.type]) {
            acc[result.type] = [];
          }
          acc[result.type].push(result);
          return acc;
        }, {} as Record<string, ScanResult[]>);

        for (const [type, items] of Object.entries(grouped)) {
          console.log(`🔸 ${type} (${items.length}):`);
          items.forEach((item) => {
            console.log(`  📄 ${item.file}:${item.line} - ${item.content}`);
          });
          console.log();
        }

        // Exit with error if there are critical issues
        const criticalTypes = ["TODO", "FIXME", "BUG", "HACK"];
        const hasCritical = scanResults.some((r) =>
          criticalTypes.includes(r.type)
        );

        if (hasCritical) {
          console.log("⚠️  Found critical comment issues");
          Deno.exit(1);
        } else {
          console.log("ℹ️  Only informational comment items found");
        }
      }
    } catch (error) {
      console.log(`❌ Comment scanning failed with error: ${error}`);
      Deno.exit(1);
    }

    // Run tests
    try {
      console.log("🔧 Running tests...");
      const testCmd = new Deno.Command(Deno.execPath(), {
        args: ["test", "--allow-read", "--allow-net", "--allow-write"],
        stdout: "piped",
        stderr: "piped",
      });
      const testProcess = testCmd.spawn();
      const testStatus = await testProcess.status;
      if (testStatus.code === 0) {
        console.log("✅ Running tests completed successfully");
      } else {
        console.log("❌ Running tests failed");
        Deno.exit(1);
      }
    } catch (error) {
      console.log(`❌ Running tests failed with error: ${error}`);
      Deno.exit(1);
    }

    console.log("✅ All checks passed!");
  },

  clean: async () => {
    console.log("🧹 Cleaning build artifacts...");
    try {
      await Deno.remove("dist", { recursive: true });
      console.log("✅ Clean completed");
      return true;
    } catch {
      console.log("ℹ️  Nothing to clean");
      return true;
    }
  },

  test: async () => {
    const testId = args._[1] as string;
    if (testId) {
      console.log(`🧪 Running test: ${testId}`);
      const success = await runCommand(
        [
          "deno",
          "test",
          "--allow-read",
          "--allow-net",
          "--allow-write",
          testId,
        ],
        `Test ${testId}`,
      );
      if (!success) {
        Deno.exit(1);
      }
    } else {
      console.log("🧪 Running all tests...");
      const success = await runCommand(
        ["deno", "test", "--allow-read", "--allow-net", "--allow-write"],
        "All tests",
      );
      if (!success) {
        Deno.exit(1);
      }
    }
  },

  help: () => {
    console.log(`
Remote Job Scout - CLI Tool

Usage: ./run.ts <command> [args...]

Commands:
  init                Install dependencies
  test-one <path>     Run specific test by path
  cleanup             Clean project (artifacts, caches, etc.)
  dev                 Run project in development mode with watch
  check               Run comprehensive project check with stages:
                      clean → compile → format → lint → comment-scan → analyze → test
  clean               Clean build artifacts (legacy command)
  test <test_id>      Run test by relative path (legacy command)
  help                Show this help
    `);
  },
};

if (command && commands[command as keyof typeof commands]) {
  await commands[command as keyof typeof commands]();
} else {
  console.log(`❌ Unknown command: ${command}`);
  commands.help();
}
