import { log, setLogLevel } from './log.ts';
import { minifyFile } from './minifiers.ts';
import { findFiles } from './utils.ts';

export async function main(options: {
    paths: string[],
    jobs: number,
    log: 'verbose' | 'default' | 'quiet',
}) {
    const logLevel = (() => {
        const logLevels = {
            verbose: 'debug',
            default: 'info',
            quiet: 'error',
        } as const;
        return logLevels[options.log];
    })();
    setLogLevel(logLevel);

    const files = (await Promise.all(options.paths.map(async (el) => findFiles(el)))).flat();
    log.debug('Found files:');
    for (const file of files) {
        log.debug(`- ${file}`);
        log.debug('');
    }

    for (const file of files) {
        await minifyFile(file);
    }
}
