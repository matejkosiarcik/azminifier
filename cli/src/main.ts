import { log, setLogLevel } from './utils/log.ts';
import { minifyFile } from './minifiers.ts';
import { findFiles } from './utils/utils.ts';

export type presetType = 'safe' | 'default' | 'brute';

export async function main(options: {
    paths: string[],
    exclude: string[],
    log: 'verbose' | 'default' | 'quiet',
    preset: presetType,
    minifierOptions: {
        js: {
            preset: presetType | undefined,
        },
        xml: {
            preset: presetType | undefined,
        },
        yaml: {
            version: '1.1' | '1.2' | 'unset',
            quoteAllBooleans: boolean | undefined,
        },
    },
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

    options.minifierOptions.js.preset = options.minifierOptions.js.preset ?? options.preset;
    options.minifierOptions.xml.preset = options.minifierOptions.xml.preset ?? options.preset;

    const files = (await Promise.all(options.paths.map(async (el) => findFiles(el)))).flat();
    log.debug('Found files:');
    for (const file of files) {
        log.debug(`- ${file}`);
        log.debug('');
    }

    for (const file of files) {
        // TODO: Dynamically pass preset
        await minifyFile(file, { preset: 'default' });
    }
}
