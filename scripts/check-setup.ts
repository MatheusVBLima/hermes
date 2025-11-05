#!/usr/bin/env tsx

/**
 * Setup Verification Script
 * Checks if the bot is properly configured before starting
 */

import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface CheckResult {
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message: string;
}

const results: CheckResult[] = [];

/**
 * Add check result
 */
function addResult(name: string, status: 'pass' | 'fail' | 'warn', message: string): void {
    results.push({ name, status, message });
}

/**
 * Print colored output
 */
function printResults(): void {
    console.log('\n🔍 Hermes Bot - Setup Verification\n');
    console.log('='.repeat(50));

    let hasErrors = false;
    let hasWarnings = false;

    results.forEach(result => {
        const icon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️ ' : '❌';
        const statusColor = result.status === 'pass' ? '\x1b[32m' : result.status === 'warn' ? '\x1b[33m' : '\x1b[31m';
        const resetColor = '\x1b[0m';

        console.log(`${icon} ${statusColor}${result.name}${resetColor}`);
        console.log(`   ${result.message}\n`);

        if (result.status === 'fail') hasErrors = true;
        if (result.status === 'warn') hasWarnings = true;
    });

    console.log('='.repeat(50));

    if (hasErrors) {
        console.log('\n❌ Setup verification failed! Please fix the errors above.\n');
        process.exit(1);
    } else if (hasWarnings) {
        console.log('\n⚠️  Setup verification passed with warnings.\n');
    } else {
        console.log('\n✅ Setup verification passed! Your bot is ready to start.\n');
    }
}

/**
 * Check Node.js version
 */
function checkNodeVersion(): void {
    const version = process.version;
    const majorVersion = parseInt(version.slice(1).split('.')[0]);

    if (majorVersion >= 20) {
        addResult('Node.js Version', 'pass', `Version ${version} (✓ >= 20.6.0)`);
    } else {
        addResult('Node.js Version', 'fail', `Version ${version} (✗ requires >= 20.6.0)`);
    }
}

/**
 * Check if .env file exists
 */
function checkEnvFile(): void {
    if (existsSync('.env')) {
        addResult('.env File', 'pass', 'Environment file exists');
    } else {
        addResult('.env File', 'fail', '.env file not found. Copy .env.example to .env');
    }
}

/**
 * Check required environment variables
 */
function checkEnvVariables(): void {
    const required = [
        { key: 'DISCORD_TOKEN', name: 'Discord Token' },
        { key: 'CLIENT_ID', name: 'Client ID' },
    ];

    const optional = [
        { key: 'GUILD_ID', name: 'Guild ID (for testing)' },
    ];

    let allPresent = true;

    // Check required
    required.forEach(({ key, name }) => {
        if (process.env[key] && process.env[key] !== 'your_bot_token_here' && process.env[key] !== 'your_client_id_here') {
            addResult(`Env: ${name}`, 'pass', `${key} is set`);
        } else {
            addResult(`Env: ${name}`, 'fail', `${key} is missing or not configured`);
            allPresent = false;
        }
    });

    // Check optional
    optional.forEach(({ key, name }) => {
        if (process.env[key] && process.env[key] !== 'your_guild_id_for_testing') {
            addResult(`Env: ${name}`, 'pass', `${key} is set`);
        } else {
            addResult(`Env: ${name}`, 'warn', `${key} is not set (optional but recommended for testing)`);
        }
    });
}

/**
 * Check if dependencies are installed
 */
function checkDependencies(): void {
    if (existsSync('node_modules')) {
        addResult('Dependencies', 'pass', 'node_modules folder exists');
    } else {
        addResult('Dependencies', 'fail', 'Dependencies not installed. Run: npm install');
    }
}

/**
 * Check if source files exist
 */
function checkSourceFiles(): void {
    const requiredFiles = [
        'src/index.ts',
        'src/config/config.ts',
        'src/deploy-commands.ts',
    ];

    let allPresent = true;

    requiredFiles.forEach(file => {
        if (existsSync(file)) {
            allPresent = allPresent && true;
        } else {
            addResult('Source Files', 'fail', `Missing file: ${file}`);
            allPresent = false;
        }
    });

    if (allPresent) {
        addResult('Source Files', 'pass', 'All core files present');
    }
}

/**
 * Check if commands exist
 */
function checkCommands(): void {
    const commandsPath = 'src/commands';

    if (!existsSync(commandsPath)) {
        addResult('Commands', 'fail', 'Commands directory not found');
        return;
    }

    let commandCount = 0;
    const categories = readdirSync(commandsPath);

    categories.forEach(category => {
        const categoryPath = join(commandsPath, category);
        const files = readdirSync(categoryPath).filter(f => f.endsWith('.ts'));
        commandCount += files.length;
    });

    if (commandCount > 0) {
        addResult('Commands', 'pass', `Found ${commandCount} command(s) in ${categories.length} categor(ies)`);
    } else {
        addResult('Commands', 'warn', 'No commands found');
    }
}

/**
 * Check if events exist
 */
function checkEvents(): void {
    const eventsPath = 'src/events';

    if (!existsSync(eventsPath)) {
        addResult('Events', 'fail', 'Events directory not found');
        return;
    }

    const eventFiles = readdirSync(eventsPath).filter(f => f.endsWith('.ts'));

    if (eventFiles.length > 0) {
        addResult('Events', 'pass', `Found ${eventFiles.length} event handler(s)`);
    } else {
        addResult('Events', 'warn', 'No event handlers found');
    }
}

/**
 * Run all checks
 */
function runChecks(): void {
    checkNodeVersion();
    checkEnvFile();
    checkEnvVariables();
    checkDependencies();
    checkSourceFiles();
    checkCommands();
    checkEvents();
}

// Run checks and print results
runChecks();
printResults();
