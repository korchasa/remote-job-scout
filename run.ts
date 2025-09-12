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

// Helper function to read all data from a readable stream
async function readAllStream(
  stream: ReadableStream<Uint8Array>,
): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return new TextDecoder().decode(
    new Uint8Array(await new Blob(chunks).arrayBuffer()),
  );
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

    try {
      // Check if Docker is available
      console.log("🔍 Checking Docker availability...");
      const dockerCheck = new Deno.Command("docker", {
        args: ["--version"],
        stdout: "piped",
        stderr: "piped",
      });
      const dockerCheckProcess = dockerCheck.spawn();
      const dockerCheckStatus = await dockerCheckProcess.status;

      if (dockerCheckStatus.code === 0) {
        console.log("🐳 Using Docker development environment...");

        // Stop any existing containers with the same name
        console.log("🛑 Stopping previous containers...");
        const stopCmd = new Deno.Command("docker", {
          args: ["rm", "-f", "remote-job-scout-dev"],
          stdout: "piped",
          stderr: "piped",
        });
        const stopProcess = stopCmd.spawn();
        await stopProcess.status; // Don't check status, container might not exist

        // Build Docker image
        console.log("🔨 Building Docker image...");
        const buildCmd = new Deno.Command("docker", {
          args: ["build", "-t", "remote-job-scout-dev", "."],
          stdout: "inherit",
          stderr: "inherit",
        });
        const buildProcess = buildCmd.spawn();
        const buildStatus = await buildProcess.status;

        if (buildStatus.code !== 0) {
          throw new Error("Failed to build Docker image");
        }

        // Start container with volume mounts
        console.log("🚀 Starting development container...");
        const runCmd = new Deno.Command("docker", {
          args: [
            "run",
            "--name",
            "remote-job-scout-dev",
            "--rm",
            "-p",
            "3000:3000",
            "-v",
            `${Deno.cwd()}/src:/app/src:cached`,
            "-v",
            `${Deno.cwd()}/tests:/app/tests:cached`,
            "-e",
            "DENO_ENV=development",
            "-e",
            "DENO_WATCH=true",
            "remote-job-scout-dev",
          ],
          stdout: "inherit",
          stderr: "inherit",
        });
        const runProcess = runCmd.spawn();
        await runProcess.status;

        return;
      }

      // Fall back to local development
      console.log("💻 Using local Deno development environment...");
      console.log("💡 Tip: Install Docker for better development experience");

      const command = new Deno.Command(Deno.execPath(), {
        args: [
          "serve",
          "--watch",
          "--allow-net",
          "--allow-read",
          "--allow-write",
          "--host",
          "localhost",
          "--port",
          "3000",
          "--watch-exclude=node_modules",
          "--watch-exclude=.git",
          "--watch-exclude=documents",
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
    } catch (error) {
      console.log(
        `❌ Failed to start development environment: ${error}`,
      );
      Deno.exit(1);
    }
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

      // Read all output from both stdout and stderr
      const [stdout, stderr] = await Promise.all([
        readAllStream(compileProcess.stdout),
        readAllStream(compileProcess.stderr),
      ]);
      const compileStatus = await compileProcess.status;

      if (compileStatus.code === 0) {
        console.log("✅ Compiling TypeScript completed successfully");
      } else {
        console.log("❌ Compiling TypeScript failed");

        // Output stderr if there are errors
        if (stderr) {
          console.log("\n🔍 TypeScript compilation errors:");
          console.log(stderr);
        }

        // Also output stdout if there's any
        if (stdout && stdout.trim()) {
          console.log("\n🔍 TypeScript compilation output:");
          console.log(stdout);
        }

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
        args: ["fmt"],
        stdout: "piped",
        stderr: "piped",
      });
      const fmtProcess = fmtCmd.spawn();

      // Read all output from both stdout and stderr
      const [stdout, stderr] = await Promise.all([
        readAllStream(fmtProcess.stdout),
        readAllStream(fmtProcess.stderr),
      ]);
      const fmtStatus = await fmtProcess.status;

      if (fmtStatus.code === 0) {
        console.log("✅ Formatting code completed successfully");
      } else {
        console.log("❌ Formatting code failed");

        // Output stderr if there are errors
        if (stderr) {
          console.log("\n🔍 Formatting errors:");
          console.log(stderr);
        }

        // Also output stdout if there's any
        if (stdout && stdout.trim()) {
          console.log("\n🔍 Formatting output:");
          console.log(stdout);
        }

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

      // Read all output from both stdout and stderr
      const [stdout, stderr] = await Promise.all([
        readAllStream(lintProcess.stdout),
        readAllStream(lintProcess.stderr),
      ]);
      const lintStatus = await lintProcess.status;

      if (lintStatus.code === 0) {
        console.log("✅ Linting code completed successfully");
      } else {
        console.log("❌ Linting code failed");

        // Output stderr if there are errors
        if (stderr) {
          console.log("\n🔍 Linting errors:");
          console.log(stderr);
        }

        // Also output stdout if there's any
        if (stdout && stdout.trim()) {
          console.log("\n🔍 Linting output:");
          console.log(stdout);
        }

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

        console.error("⚠️  Found comment issues");
        Deno.exit(1);
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

      // Read all output from both stdout and stderr
      const [stdout, stderr] = await Promise.all([
        readAllStream(testProcess.stdout),
        readAllStream(testProcess.stderr),
      ]);
      const testStatus = await testProcess.status;

      if (testStatus.code === 0) {
        console.log("✅ Running tests completed successfully");
      } else {
        console.log("❌ Running tests failed");

        // Output stderr if there are errors
        if (stderr) {
          console.log("\n🔍 Test errors:");
          console.log(stderr);
        }

        // Also output stdout if there's any
        if (stdout && stdout.trim()) {
          console.log("\n🔍 Test output:");
          console.log(stdout);
        }

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
  dev                 Run project in development mode with auto-restart (Docker preferred)
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
