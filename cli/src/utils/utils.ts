import path from 'node:path';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import { execa as baseExeca, type ExecaError, type Options as ExecaOptions, type Result as ExecaResult } from 'execa';

export async function findFiles(fspath: string): Promise<string[]> {
    if (!fsSync.existsSync(fspath)) {
        throw new Error(`Directory "${fspath}" doesn't exist`);
    }

    const stats = await fs.stat(fspath);
    if (stats.isSymbolicLink()) {
        const realpath = await fs.readlink(fspath);
        return findFiles(realpath);
    } else if (stats.isFile()) {
        return [fspath];
    }

    const files = (await fs.readdir(fspath, { recursive: true }))
        .map((el) => path.resolve(path.join(fspath, el)));

    const outputFiles: string[] = [];
    for (const file of files) {
        if (outputFiles.includes(file)) {
            continue;
        }
        outputFiles.push(file);
    }

    return outputFiles;
}

export function filterFiles(list: string[], extension: string | string[]): string[] {
    const extensions = typeof extension === 'string' ? [extension] : extension;
    return list.filter((file) => extensions.some((ext) => file.endsWith(`.${ext}`)));
}

/**
 * Custom `execa` wrapper with useful default options
 */
export async function execa(command: string[], options?: ExecaOptions): Promise<ExecaResult | ExecaError> {
    options = {
        timeout: 60_000, // 1 minute
        stdio: 'pipe', // Capture output
        all: true, // Merge stdout and stderr
        encoding: 'utf8',
        ...options ?? {},
    };

    try {
        const program = await baseExeca(command[0], command.slice(1), options);
        return program;
    } catch (error) {
        return error as ExecaError;
    }
}

export function getExecaOutput(executedCommand: ExecaResult | ExecaError): string {
    const output = executedCommand.stdout;
    if (typeof output === 'string') {
        return output;
    } else if (Array.isArray(output)) {
        return output.join('\n');
    } else if (output) {
        return Buffer.from(output).toString('utf8');
    } else {
        return '';
    }
}

export function formatBytes(bytes: number): string {
    const metricPrefices = '_KMGTPEZYRQ';
    let i = 0;
    while (i >= 1024 && i < metricPrefices.length) {
        i += 1;
        bytes = bytes / 1024;
    }

    const prefix = i === 0 ? '' : metricPrefices[i];
    const roundBytes = bytes.toFixed(2).replace(/\.0+$/, '');
    return `${roundBytes} ${prefix}B`;
}

/**
 * Transform wildcard to regex
 * This might not be foolproof, but should be ok for our use-case
 * Handles even relatively complex things like '*.{c,h}{,pp}'
 */
export function wildcardToRegex(wildcard: string): RegExp {
    const regex = wildcard
        .replaceAll('\\', '\\\\')
        .replaceAll('-', '\\-')
        .replaceAll('.', '\\.')
        .replaceAll('?', '.')
        .replaceAll('+', '\\+')
        .replaceAll('[', '\\[')
        .replaceAll(']', '\\]')
        .replaceAll('{', '(')
        .replaceAll('}', ')')
        .replaceAll(',', '|')
        .replaceAll(/\*{2}\//g, '.<star>/')
        .replaceAll(/\*{2}/g, '.<star>')
        .replaceAll('*', '[^/\\\\]<star>')
        .replaceAll('<star>', '*');
    return new RegExp(`^(.*/)?${regex}$`, 'i');
}
