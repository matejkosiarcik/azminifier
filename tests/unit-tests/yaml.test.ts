import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import process from 'process';
import { minifyYaml } from '../../src/minifiers.js';
import { expect } from 'chai';
import { test } from 'mocha';

context('Minify YAML', function () {
    let tmpDir: string;
    let currDir: string;

    test('foo', async function () {
        console.log('Running test');
    });

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
            name: 'multiline string',
            input: ' foo \n bar ',
            output: 'foo bar',
        },
    ];
    for (const test of scalarTests) {
        it(`Test minifying scalars - ${test.name}`, async () => {
            await fs.writeFile('file.yml', test.input, 'utf8');

            const returnCode = await minifyYaml('file.yml');
            expect(returnCode, 'File should be minified successfully with exit status 0').eq(true);

            const minifiedContent = await fs.readFile('file.yml', 'utf8');
            expect(minifiedContent, 'File should be minified as expected').eq(test.output);
        });
    }


    const booleanTests = [
        {
            name: 'positive',
            // inputs: ['ON', 'On', 'on', 'YES', 'Yes', 'yes', 'TRUE', 'True', 'true', 'Y', 'y'],
            inputs: ['TRUE', 'True', 'true'],
            output: 'true',
        },
        {
            name: 'negative',
            // inputs: ['OFF', 'Off', 'off', 'NO', 'No', 'no', 'FALSE', 'False', 'false', 'N', 'n'],
            inputs: ['FALSE', 'False', 'false'],
            output: 'false',
        },
    ];
    for (const testType of booleanTests) {
        for (const input of testType.inputs) {
            it(`Test minifying booleans - ${testType.name} - "${input}"`, async () => {
                await fs.writeFile('file.yml', ` ${input} `, 'utf8');

                const returnCode = await minifyYaml('file.yml');
                expect(returnCode, 'File should be minified successfully with exit status 0').eq(true);

                const minifiedContent = await fs.readFile('file.yml', 'utf8');
                expect(minifiedContent, 'File should be minified as expected').eq(testType.output);
            });
        }
    }
});
