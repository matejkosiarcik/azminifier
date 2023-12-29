import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { main, presetType } from './main.ts';
import { log } from './utils/log.ts';

(async () => {
    const version = '0.0.0';

    let argumentParser = yargs(hideBin(process.argv))
        .scriptName('uniminify')
        .command('$0 [options] <path..>', 'Minify files', (yargs) => {
            yargs.positional('path', {
                describe: 'Path to file/directory to minify',
                type: 'string',
            });
        })
        .version(version)
        .help(true)
        .locale('en')
        .option('help', {
            alias: 'h', describe: 'Show usage', type: 'boolean',
        })
        .option('verbose', {
            alias: 'v', describe: 'More logging', type: 'boolean',
        })
        .option('quiet', {
            alias: 'q', describe: 'Less logging', type: 'boolean',
        })
        .option('dry-run', {
            alias: 'n', describe: 'Just analyze and do not modify files', type: 'boolean',
        })
        .option('exclude', {
            describe: 'Exclude specified files (space separated list, can contain a wildcards)', type: 'array',
        })
        .options('preset', {
            describe: 'Preset', type: 'string', choices: ['safe', 'medium', 'brute'], default: 'medium',
        })
        // JS specific arguments
        .options('js-preset', {
            describe: 'Override global preset with preset specific to JavaScript', type: 'string', choices: ['safe', 'medium', 'brute'],
        })
        // XML specific arguments
        .options('xml-preset', {
            describe: 'Override global preset with preset specific to XML', type: 'string', choices: ['safe', 'medium', 'brute'],
        })
        // YAML specific arguments
        .options('yaml-preset', {
            describe: 'Override global preset with preset specific to XML', type: 'string', choices: ['safe', 'medium', 'brute'],
        })
        .options('yaml-version', {
            describe: 'Force specific Yaml version', type: 'string', choices: ['1.1', '1.2', 'unset'], default: 'unset',
        })
        .options('yaml-always-quote-booleans', {
            describe: 'Force quoting for all strings which could be interpreted as booleans', type: 'boolean',
        });

    if (process.env['NOWRAP'] === '1') {
        argumentParser = argumentParser.wrap(null);
    }

    const args = await argumentParser.parse();

    if (args.quiet && args.verbose) {
        console.error("Can't combine --quiet with --verbose");
        process.exit(1);
    }

    const excludePatterns = args.exclude?.map((el) => `${el}`) ?? [];

    try {
        await main({
            paths: args['path'] as string[],
            log: args.quiet ? 'quiet' : args.verbose ? 'verbose' : 'default',
            exclude: excludePatterns,
            preset: args.preset as presetType,
            minifierOptions: {
                js: {
                    preset: args.jsPreset as presetType | undefined,
                },
                xml: {
                    preset: args.xmlPreset as presetType | undefined,
                },
                yaml: {
                    version: args.yamlVersion as '1.1' | '1.2' | 'unset',
                    quoteAllBooleans: args.yamlAlwaysQuoteBooleans,
                },
            },
        });
    } catch (error) {
        log.error(error);
        process.exit(1);
    }
})();
