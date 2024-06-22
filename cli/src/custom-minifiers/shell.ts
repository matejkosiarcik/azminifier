import fs from 'fs/promises';
import path from 'path';
import { customExeca } from '../utils/utils.ts';
import { paths } from '../utils/constants.ts';

function getShebang(fileContent: string): string | undefined {
    const firstLine = fileContent.split('\n')[0];
    if (!firstLine.startsWith('#!')) {
        return;
    }

    return firstLine.trim().replace(/^(#![^\s]+) +/, '$1 ');
}

function postProcessFile(fileContent: string, mode: 'bash' | 'zsh'): string {
    const initialPostProcessedFile = fileContent
        .split('\n')
        .slice(2, -1)
        .map((line) => line.replace(/^\s+/, ''))
        .map((line) => line.replace(/\s+$/, ''))
        .filter((line) => !!line)
        .join('\n');

    switch (mode) {
        case 'bash': {
            return initialPostProcessedFile;
                // .split('\n')
                // .map((line) => line.replace(/;$/, ''))
                // .join('\n');
        }
        case 'zsh': {
            return initialPostProcessedFile;
        }
    }
}

export async function minifyShellCustom(shellFile: string) {
    const extension = path.extname(shellFile).slice(1);
    const mode: 'bash' | 'sh' | 'zsh' = (() => {
        if (extension === 'bash') {
            return 'bash';
        } else if (extension === 'zsh') {
            return 'zsh'
        } else {
            return 'sh';
        }
    })();

    const shellContent = await fs.readFile(shellFile, 'utf8');
    if (shellContent === '') {
        // Guard against empty files
        await fs.writeFile(shellFile, '', 'utf8');
        return;
    }

    const shebang = getShebang(shellContent);
    if (shebang) {
        // Guard against almost empty files - which only contain shebang and nothing more
        const shellContentWithoutShebang = shellContent
            .split('\n')
            .slice(1)
            .map((line) => line.trim())
            .filter((line) => !!line)
            .join('\n');
        if (shellContentWithoutShebang === '') {
            await fs.writeFile(shellFile, shebang, 'utf8');
            return;
        }
    }

    const executable = mode === 'sh' ? 'bash' : mode;
    const scriptFilePath = path.join(paths.minifierDirs.shell, `minify-${mode}.${mode === 'zsh' ? 'zsh-mask': 'sh'}`);

    const minifiedFileCommand = await customExeca([executable, scriptFilePath, shellFile]);

    if (minifiedFileCommand.exitCode !== 0) {
        throw new Error(`Command ${minifiedFileCommand.escapedCommand} failed with ${minifiedFileCommand.exitCode}:\n${minifiedFileCommand.all}`);
    }

    const minifiedFileContent = postProcessFile(minifiedFileCommand.stdout, executable);

    let output = '';
    if (shebang) {
        output += `${shebang}\n`
    }
    output += minifiedFileContent;

    await fs.writeFile(shellFile, output, 'utf8');
}
