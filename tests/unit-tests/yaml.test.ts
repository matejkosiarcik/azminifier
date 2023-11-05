import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import process from 'process';
import { minifyYaml } from '../../src/minifiers.js';
import { expect } from 'chai';

async function performTest(input: string, output: string) {
    await fs.writeFile('file.yml', input, 'utf8');

    const returnCode = await minifyYaml('file.yml');
    expect(returnCode, 'File should be minified successfully with exit status 0').eq(true);

    const minifiedContent = await fs.readFile('file.yml', 'utf8');
    expect(minifiedContent, 'File should be minified as expected').eq(output);

    const returnCode2 = await minifyYaml('file.yml');
    expect(returnCode2, 'File should be minified successfully again with exit status 0').eq(true);

    const minifiedContent2 = await fs.readFile('file.yml', 'utf8');
    expect(minifiedContent2, 'File should be minified as expected again').eq(output);
}

context('Minify YAML', function () {
    let tmpDir: string;
    let currDir: string;

    this.beforeEach(async function () {
        currDir = process.cwd();
        tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'universal-minifier-tests-'));
        process.chdir(tmpDir);
    });

    this.afterEach(async function () {
        process.chdir(currDir);
        await fs.rm(tmpDir, { force: true, recursive: true });
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
            name: 'basic string',
            input: ' foo ',
            output: 'foo',
        },
        {
            name: 'quoted string',
            input: ' "foo" ',
            output: 'foo',
        },
        {
            name: 'multiline string',
            input: ' foo \n bar ',
            output: 'foo bar',
        },
    ];
    for (const test of scalarTests) {
        it(`Test minifying scalars - ${test.name}`, async () => {
            await performTest(test.input, test.output);
        });
    }

    const booleanTests = [
        {
            name: 'positive',
            inputs: ['TRUE', 'True', 'true'],
            output: 'true',
        },
        {
            name: 'negative',
            inputs: ['FALSE', 'False', 'false'],
            output: 'false',
        },
    ];
    for (const testType of booleanTests) {
        for (const input of testType.inputs) {
            it(`Test minifying booleans - ${testType.name} - "${input}"`, async () => {
                await performTest(` ${input} `, testType.output);
            });
        }
    }

    const booleanTestsForYaml11 = [
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
    for (const testType of booleanTestsForYaml11) {
        for (const input of testType.inputs) {
            it(`Test minifying booleans - YAML 1.1 ${testType.name} - "${input}"`, async () => {
                const versionPrefix = '%YAML 1.1\n---\n';
                await performTest(`${versionPrefix} ${input} `, `${versionPrefix}${testType.output}`);
            });
        }
    }

    const arrayAndObjectTests = [
        {
            name: 'array',
            input: ' [ foo, bar, 123 ] ',
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
            name: 'object with curly braces',
            input: 'foo:\n  key: value\nbar:\n  key2: value2\n',
            output: 'foo: {key: value}\nbar: {key2: value2}',
        },
    ];
    for (const test of arrayAndObjectTests) {
        it(`Test minifying ${test.name}`, async () => {
            await performTest(test.input, test.output);
        });
    }

    const complexTests = [
        {
            name: '1',
            input: 'key:\n  - "foo bar"\n  - key: val',
            output: 'key: [foo bar,{key: val}]',
        }
    ];
    for (const test of complexTests) {
        it(`Test minifying complex structure ${test.name}`, async () => {
            await performTest(test.input, test.output);
        });
    }
});
