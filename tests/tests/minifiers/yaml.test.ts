import { test } from '@playwright/test';
import { performSimpleTest, setupTest, teardownTest } from './utils.ts';

async function performTest(input: string, output: string) {
    await performSimpleTest({
        input: input,
        output: output,
        extension: 'yml',
        minifyOptions: {
            preset: 'default',
        },
    });
}

const yaml11VersionPrefix = '%YAML 1.1\n---\n';
const yaml12VersionPrefix = '%YAML 1.2\n---\n';

test.describe('Minify YAML', () => {
    let tmpDir: string;
    let currDir: string;

    test.beforeEach(async () => {
        [currDir, tmpDir] = await setupTest();
    });

    test.afterEach(async () => {
        await teardownTest(currDir, tmpDir);
    });

    test(`Test minifying empty document`, async () => {
        await performTest('', '');
    });

    test(`Test minifying empty document - with YAML 1.1 preamble`, async () => {
        await performTest(yaml11VersionPrefix, yaml11VersionPrefix);
    });

    test(`Test minifying empty document - with YAML 1.2 preamble`, async () => {
        await performTest(yaml12VersionPrefix, yaml12VersionPrefix);
    });

    const scalarTests = [
        {
            name: 'null',
            input: ' null ',
            output: 'null'
        },
        {
            name: 'basic number',
            input: ' 1 ',
            output: '1',
        },
        {
            name: 'number with trailing .0',
            input: ' 1.0 ',
            output: '1',
        },
        {
            name: 'number with trailing .900',
            input: ' 1.900 ',
            output: '1.9',
        },
        {
            name: 'unquoted string',
            input: ' foo ',
            output: 'foo',
        },
        {
            name: 'quoted string (double-quotes)',
            input: ' "foo" ',
            output: 'foo',
        },
        {
            name: 'quoted string (single-quotes)',
            input: " 'foo' ",
            output: 'foo',
        },
        {
            name: 'complex quoted string (double-quotes)',
            input: ' "this \\"is\\" \'sparta\'" ',
            output: 'this "is" \'sparta\'',
        },
        {
            name: 'complex quoted string (single-quotes)',
            input: " 'this \"is\"' ",
            output: 'this "is"',
        },
        {
            name: 'multiline string',
            input: ' foo \n bar ',
            output: 'foo bar',
        },
    ];
    for (const variant of scalarTests) {
        test(`Test minifying scalars - ${variant.name}`, async () => {
            await performTest(variant.input, variant.output);
        });

        test(`Test minifying scalars - ${variant.name} - YAML 1.1`, async () => {
            await performTest(`${yaml11VersionPrefix}${variant.input} `, `${yaml11VersionPrefix}${variant.output}`);
        });

        test(`Test minifying scalars - ${variant.name} - YAML 1.2`, async () => {
            await performTest(`${yaml12VersionPrefix}${variant.input} `, `${yaml12VersionPrefix}${variant.output}`);
        });
    }

    const booleanTestsForSafeBooleans = [
        {
            name: 'positive',
            inputs: ['TRUE', 'True', 'true'],
            outputYaml11: 'y',
            outputYaml12: 'true',
        },
        {
            name: 'negative',
            inputs: ['FALSE', 'False', 'false'],
            outputYaml11: 'n',
            outputYaml12: 'false',
        },
    ];
    for (const variant of booleanTestsForSafeBooleans) {
        for (const input of variant.inputs) {
            test(`Test minifying booleans - ${variant.name} - "${input}"`, async () => {
                await performTest(` ${input} `, variant.outputYaml12);
            });

            test(`Test minifying booleans - ${variant.name} - "${input}" - YAML 1.1`, async () => {
                await performTest(`${yaml11VersionPrefix}${input} `, `${yaml11VersionPrefix}${variant.outputYaml11}`);
            });

            test(`Test minifying booleans - ${variant.name} - "${input}" - YAML 1.2`, async () => {
                await performTest(`${yaml12VersionPrefix}${input} `, `${yaml12VersionPrefix}${variant.outputYaml12}`);
            });
        }
    }

    const booleanTestsForAllBooleans = [
        {
            name: 'positive',
            inputs: ['ON', 'On', 'on', 'YES', 'Yes', 'yes', 'TRUE', 'True', 'true', 'Y', 'y'],
            output: 'y',
        },
        {
            name: 'negative',
            inputs: ['OFF', 'Off', 'off', 'NO', 'No', 'no', 'FALSE', 'False', 'false', 'N', 'n'],
            output: 'n',
        },
    ];
    for (const variant of booleanTestsForAllBooleans) {
        for (const input of variant.inputs) {
            test(`Test minifying booleans ${variant.name} - "${input}" - YAML 1.1`, async () => {
                await performTest(`${yaml11VersionPrefix}${input} `, `${yaml11VersionPrefix}${variant.output}`);
            });

            if (!['false', 'true'].includes(input.toLowerCase())) {
                test(`Test minifying booleans ${variant.name} - "${input}"`, async () => {
                    await performTest(`${input} `, input);
                });

                test(`Test minifying booleans ${variant.name} - "${input}" - YAML 1.2`, async () => {
                    await performTest(`${yaml12VersionPrefix}${input} `, `${yaml12VersionPrefix}${input}`);
                });
            }
        }
    }

    const arrayAndObjectTests = [
        {
            name: 'oneline array',
            input: ' [ foo, bar, 123 ] ',
            output: '[foo,bar,123]',
        },
        {
            name: 'multiline array',
            input: '- foo\n- bar  \n- 123',
            output: '[foo,bar,123]',
        },
        {
            name: 'object',
            input: 'foo: \n  key: value\n  key2: "value2"',
            output: 'foo: {key: value,key2: value2}',
        },
        {
            name: 'object with curly braces',
            input: '{ foo: { key: value, key2: "value2" }}',
            output: 'foo: {key: value,key2: value2}',
        },
        {
            name: 'object with curly braces 2',
            input: 'foo:\n  key: value\nbar:\n  key2: value2\n',
            output: 'foo: {key: value}\nbar: {key2: value2}',
        },
    ];
    for (const variant of arrayAndObjectTests) {
        test(`Test minifying ${variant.name}`, async () => {
            await performTest(variant.input, variant.output);
        });

        test(`Test minifying ${variant.name} - YAML 1.1`, async () => {
            await performTest(`${yaml11VersionPrefix}${variant.input} `, `${yaml11VersionPrefix}${variant.output}`);
        });

        test(`Test minifying ${variant.name} - YAML 1.2`, async () => {
            await performTest(`${yaml12VersionPrefix}${variant.input} `, `${yaml12VersionPrefix}${variant.output}`);
        });
    }

    const multilineStringTests = [
        {
            name: 'basic 1',
            input: 'foo: "foo\n    bar"',
            output: 'foo: foo bar',
        },
        {
            name: 'basic 2',
            input: "foo: 'foo\n    bar'",
            output: 'foo: foo bar',
        },
        {
            name: 'basic 3',
            input: "foo: foo\n    bar",
            output: 'foo: foo bar',
        },
        {
            name: 'basic 4',
            input: "foo:\n  foo\n  bar",
            output: 'foo: foo bar',
        },
        {
            name: 'basic 5',
            input: "foo: \n  foo\n  bar",
            output: 'foo: foo bar',
        },
        // {
        //     name: 'pipe 1',
        //     input: "foo: |\n  foo\n  bar\n",
        //     output: 'foo: |\n foo\n bar\n',
        // },
        // {
        //     name: 'pipe 2',
        //     input: "foo: |\n  foo\n  bar",
        //     output: 'foo: |-\n foo\n bar',
        // },
        // {
        //     name: 'pipe 3',
        //     input: "foo: |-\n  foo\n  bar\n",
        //     output: 'foo: |-\n foo\n bar',
        // },
        // {
        //     name: 'pipe 4',
        //     input: "foo: |-\n  foo\n  bar",
        //     output: 'foo: |-\n foo\n bar',
        // },
        // {
        //     name: 'pipe 5',
        //     input: `
        //         foo:
        //             - |
        //               first

        //               second
        //     `,
        //     output: 'foo:\n - |\n  first\n\n  second',
        // },
    ];
    for (const variant of multilineStringTests) {
        test(`Test minifying multiline string ${variant.name}`, async () => {
            await performTest(variant.input, variant.output);
        });

        test(`Test minifying multiline string ${variant.name} - YAML 1.1`, async () => {
            await performTest(`${yaml11VersionPrefix}${variant.input} `, `${yaml11VersionPrefix}${variant.output}`);
        });

        test(`Test minifying multiline string ${variant.name} - YAML 1.2`, async () => {
            await performTest(`${yaml12VersionPrefix}${variant.input} `, `${yaml12VersionPrefix}${variant.output}`);
        });
    }

    const complexTests = [
        {
            name: '1',
            input: 'key:\n  - "foo bar"\n  - key: val',
            output: 'key: [foo bar,{key: val}]',
        },
        {
            name: '2',
            input: 'key:\n    - "foo bar"\n    - key: val',
            output: 'key: [foo bar,{key: val}]',
        },
        {
            name: '3',
            input: 'key:\n    - "foo bar"\nfoo: [ 1, 2 ]\nbar: \n  foo: \n    lol: 123',
            output: 'key: [foo bar]\nfoo: [1,2]\nbar: {foo: {lol: 123}}',
        },
    ];
    for (const variant of complexTests) {
        test(`Test minifying complex structure ${variant.name}`, async () => {
            await performTest(variant.input, variant.output);
        });

        test(`Test minifying complex structure ${variant.name} - YAML 1.1`, async () => {
            await performTest(`${yaml11VersionPrefix}${variant.input} `, `${yaml11VersionPrefix}${variant.output}`);
        });

        test(`Test minifying complex structure ${variant.name} - YAML 1.2`, async () => {
            await performTest(`${yaml12VersionPrefix}${variant.input} `, `${yaml12VersionPrefix}${variant.output}`);
        });
    }
});
