#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function resolvePython() {
  const rootDir = path.resolve(__dirname, '..', '..');
  const isWindows = process.platform === 'win32';
  
  const testCmd = (cmd) => {
    try {
      const { execSync } = require('child_process');
      execSync(`"${cmd}" --version`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  };

  // 1. Check if virtualenv is already activated in environment
  if (process.env.VIRTUAL_ENV) {
    const venvPythonWin = path.join(process.env.VIRTUAL_ENV, 'Scripts', 'python.exe');
    const venvPythonUnix = path.join(process.env.VIRTUAL_ENV, 'bin', 'python');
    if (isWindows && fs.existsSync(venvPythonWin) && testCmd(venvPythonWin)) return venvPythonWin;
    if (!isWindows && fs.existsSync(venvPythonUnix) && testCmd(venvPythonUnix)) return venvPythonUnix;
  }

  // 2. Check local workspace .venv
  if (isWindows) {
    const localVenvWin = path.join(rootDir, '.venv', 'Scripts', 'python.exe');
    if (fs.existsSync(localVenvWin) && testCmd(localVenvWin)) {
      return localVenvWin;
    }
  } else {
    const localVenvUnix = path.join(rootDir, '.venv', 'bin', 'python');
    if (fs.existsSync(localVenvUnix) && testCmd(localVenvUnix)) {
      return localVenvUnix;
    }
  }

  // 3. Fallback: try python, python3, or py
  const candidates = isWindows
    ? ['python.exe', 'py.exe', 'python']
    : ['python3', 'python'];

  for (const cmd of candidates) {
    try {
      const { execSync } = require('child_process');
      execSync(`${cmd} --version`, { stdio: 'ignore' });
      return cmd;
    } catch {
      // Continue to next candidate
    }
  }

  return isWindows ? 'python' : 'python3';
}

const pythonExe = resolvePython();
const args = process.argv.slice(2);

const child = spawn(pythonExe, args, {
  stdio: 'inherit',
  shell: false,
});

child.on('error', (err) => {
  console.error(`\n[PromisePay Launcher] Failed to execute Python (${pythonExe}):`, err.message);
  console.error('\nTroubleshooting:');
  console.error('1. If on Windows, make sure you activate your venv: .\\.venv\\Scripts\\Activate.ps1');
  console.error('2. Make sure Python 3.11+ is installed and packages are installed: pip install -r requirements.txt\n');
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
