import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { main } from './main.ts';
import { log } from './log.ts';

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
            alias: 'n', describe: 'Dry run - just analyze, does not modify files', type: 'boolean',
        })
        .option('exclude', {
            describe: 'Exclude specified files (space separated list - can be a wildcard)', type: 'array',
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
        });
    } catch (error) {
        log.error(error);
        process.exit(1);
    }
})();
