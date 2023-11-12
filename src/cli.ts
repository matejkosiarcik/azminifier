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
        .option('version', {
            alias: 'V', describe: 'Show version', type: 'boolean',
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
        .option('jobs', {
            alias: 'j', describe: 'Count of cocurrent jobs to use (when set to "0" will use cpu-threads)', type: 'number', default: 0,
        });

    if (process.env['NOWRAP'] === '1') {
        argumentParser = argumentParser.wrap(null);
    }

    const args = await argumentParser.parse();

    if (args.quiet && args.verbose) {
        console.error("Can't combine --quiet with --verbose");
        process.exit(1);
    }

    try {
        await main({
            paths: args['path'] as string[],
            log: args.quiet ? 'quiet' : args.verbose ? 'verbose' : 'default',
            jobs: args.jobs,
        });
    } catch (error) {
        log.error(error);
        process.exit(1);
    }
})();
