#!/usr/bin/env node

import { parseArgs } from 'node:util';
import { execSync, spawn } from 'child_process';
import { existsSync, rmSync, readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';

// Unified logging functions
function logInfo(message: string): void {
  console.log(`ℹ️  ${message}`);
}

function logSuccess(message: string): void {
  console.log(`✅ ${message}`);
}

function logError(message: string): void {
  console.log(`❌ ${message}`);
}

function logProgress(message: string): void {
  console.log(`🔧 ${message}...`);
}

// Clean build artifacts function
function cleanBuildArtifacts(): void {
  logProgress('Cleaning build artifacts');
  try {
    if (existsSync('dist')) {
      rmSync('dist', { recursive: true, force: true });
      logSuccess('Clean completed');
    } else {
      logInfo('Nothing to clean');
    }
  } catch {
    logInfo('Nothing to clean');
  }
}

// Format code function
async function formatCode(): Promise<void> {
  logProgress('Formatting code');
  await runCommand(['npx', 'prettier', '--write', '.'], 'Code formatting');
}

// Helper function to run command and check status
async function runCommand(cmd: string[], description: string, cwd?: string): Promise<void> {
  logProgress(description);
  try {
    execSync(cmd.join(' '), {
      stdio: 'inherit',
      cwd: cwd || process.cwd(),
      env: { ...process.env, FORCE_COLOR: '1' },
    });
    logSuccess(`${description} completed successfully`);
  } catch {
    process.exit(1);
  }
}

// Helper function to run command in background
async function runCommandBackground(cmd: string[], description: string): Promise<boolean> {
  logProgress(description);
  return new Promise((resolve) => {
    const child = spawn(cmd[0], cmd.slice(1), {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: { ...process.env, FORCE_COLOR: '1' },
      detached: false,
    });

    child.on('close', (code) => {
      if (code === 0) {
        logSuccess(`${description} completed successfully`);
        resolve(true);
      } else {
        logError(`${description} failed`);
        resolve(false);
      }
    });

    child.on('error', (error) => {
      logError(`${description} failed with error: ${error.message}`);
      resolve(false);
    });
  });
}

// Build project function
async function buildProject(): Promise<void> {
  logProgress('Building Remote Job Scout');

  logProgress('Building client');
  await runCommand(
    ['npx', 'vite', 'build', '--config', 'src/client/vite.config.ts'],
    'Client build',
  );

  logProgress('Building server');
  await runCommand(['npx', 'tsc', '--project', 'tsconfig.server.json'], 'Server build');

  logSuccess('Build completed!');
}

// Comment scanning function
async function scanComments(): Promise<void> {
  // Configuration constants
  const EXCLUDED_PATTERNS = [
    /node_modules/,
    /\.git/,
    /dist/,
    /build/,
    /\.DS_Store/,
    /references/,
    /documents/,
    /\.vscode/,
    /\.idea/,
    /\.cursor/,
  ];

  const COMMENT_PATTERNS = [
    { regex: /\/\/\s*TODO[:\s]*(.+)/i, type: 'TODO' },
    { regex: /\/\*\s*TODO[:\s]*(.+?)\*\//i, type: 'TODO' },
    { regex: /\/\/\s*FIXME[:\s]*(.+)/i, type: 'FIXME' },
    { regex: /\/\*\s*FIXME[:\s]*(.+?)\*\//i, type: 'FIXME' },
    { regex: /\/\/\s*HACK[:\s]*(.+)/i, type: 'HACK' },
    { regex: /\/\*\s*HACK[:\s]*(.+?)\*\//i, type: 'HACK' },
    { regex: /\/\/\s*BUG[:\s]*(.+)/i, type: 'BUG' },
    { regex: /\/\*\s*BUG[:\s]*(.+?)\*\//i, type: 'BUG' },
    { regex: /\/\/\s*DEBUG[:\s]*(.+)/i, type: 'DEBUG' },
    { regex: /\/\*\s*DEBUG[:\s]*(.+?)\*\//i, type: 'DEBUG' },
    { regex: /\/\/\s*eslint-disable/i, type: 'ESLINT_DISABLE' },
    { regex: /\/\/\s*tslint:disable/i, type: 'TSLINT_DISABLE' },
  ];

  logProgress('Scanning for TODOs, FIXMEs, debug prints and linter suppressions');
  const results: string[] = [];

  function scanDir(dirPath: string): void {
    try {
      const entries = readdirSync(dirPath);

      for (const entry of entries) {
        const fullPath = join(dirPath, entry);
        const relativePath = fullPath.replace(process.cwd() + '/', '');

        // Skip excluded paths
        if (EXCLUDED_PATTERNS.some((pattern) => pattern.test(relativePath))) continue;

        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (stat.isFile() && /\.(ts|js|tsx|jsx|md)$/.test(entry)) {
          try {
            const content = readFileSync(fullPath, 'utf8');

            content.split('\n').forEach((line, index) => {
              for (const pattern of COMMENT_PATTERNS) {
                const match = line.match(pattern.regex);
                if (match) {
                  results.push(
                    `${relativePath}:${index + 1} - ${pattern.type} - ${match[1]?.trim() || line.trim()}`,
                  );
                }
              }
            });
          } catch (error) {
            console.warn(
              `Warning: Could not read file ${relativePath}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
      }
    } catch (error) {
      console.warn(
        `Warning: Could not scan directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  scanDir('.');

  if (results.length === 0) {
    logSuccess('No comment issues found');
    return;
  }

  console.log(`\n📋 Found ${results.length} comment items:\n`);

  // Display results
  results.forEach((item) => {
    console.log(`🔸 ${item}`);
  });

  logError('Found forbidden comments - build failed');
  process.exit(1);
}

// Comprehensive project check function
async function runCheck(): Promise<void> {
  logProgress('Running comprehensive project check');
  // Clean build artifacts
  cleanBuildArtifacts();
  // Build project
  await buildProject();
  // Format code
  await formatCode();
  // Lint code
  await runCommand(['npx', 'eslint', '.', '--fix', '--max-warnings', '0'], 'Code linting');
  // Scan for comments and issues
  await scanComments();
  // Run tests
  await runCommand(['npx', 'vitest', 'run', '--config', 'vitest.config.ts'], 'Test execution');

  logSuccess('All checks passed!');
}

// Development server function
async function runDev(): Promise<void> {
  logProgress('Starting development server');
  logInfo('Server will be available at http://localhost:3000');
  logInfo('Press Ctrl+C to stop the server');

  try {
    await runDevStop();

    // if --no-check is not set, run check
    if (!values.noCheck && !values.help && !values.version) {
      await runCheck();
    }

    // Build Docker image
    logProgress('Building Docker image');
    await runCommand(['docker', 'build', '-t', 'remote-job-scout-dev', '.'], 'Docker image build');
    // Start container with volume mounts
    logProgress('Starting container');
    await runCommandBackground(
      [
        'docker',
        'run',
        '--name',
        'remote-job-scout-dev',
        '--rm',
        '-p',
        '3000:3000',
        '-v',
        `${process.cwd()}/dist:/app/dist:cached`,
        '-e',
        'NODE_ENV=development',
        'remote-job-scout-dev',
      ],
      'Container',
    );
  } catch (error) {
    logError(`Failed to start environment: ${error}`);
    process.exit(1);
  }
}

// Stop development server function
async function runDevStop(): Promise<void> {
  logProgress('Stopping server');
  execSync('docker rm -f remote-job-scout-dev', { stdio: 'pipe' });
}

// Help function
function runHelp(): void {
  console.log(`
Remote Job Scout - CLI Tool

Usage: ./run <command> [args...]

Commands:
  check               Run all checks: cleanup, formatting, linting, analyze, build, test
  test <test_id>      Run a single test by relative path.
  start               Run the project in development mode
  stop                Stop the project in development mode
  help                Show this help
    `);
}

// Parse command line arguments
const { positionals, values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: 'boolean', short: 'h' },
    version: { type: 'boolean', short: 'v' },
    noCheck: { type: 'boolean', short: 'n' },
  },
  allowPositionals: true,
});

const command = positionals[0];

const commands = {
  start: runDev,
  stop: runDevStop,
  check: runCheck,
  help: runHelp,
};

if (values.help || values.version) {
  commands.help();
} else if (command && commands[command as keyof typeof commands]) {
  await commands[command as keyof typeof commands]();
} else {
  console.log(`❌ Unknown command: ${command}`);
  commands.help();
  process.exit(1);
}
