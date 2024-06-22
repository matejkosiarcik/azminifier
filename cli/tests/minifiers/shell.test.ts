import { test, describe } from 'node:test';
import { performSimpleTest, setupTest, teardownTest } from './utils.ts';

async function performTest(input: string, output: string) {
    await performSimpleTest({
        input: input,
        output: output,
        extension: 'bash',
        minifyOptions: {
            preset: 'default',
        },
    });
}

describe('Minify Bash', function () {
    let tmpDir: string;
    let currDir: string;

    test.beforeEach(async function () {
        [currDir, tmpDir] = await setupTest();
    });

    test.afterEach(async function () {
        await teardownTest(currDir, tmpDir);
    });

    test(`Minify empty document`, async () => {
        await performTest('', '');
    });

    test(`Minify shebang`, async () => {
        await performTest('#!/usr/bin/env  bash', '#!/usr/bin/env bash');
        await performTest('#!/bin/bash  -e', '#!/bin/bash -e');
    });

    const scenarios = [
        {
            input: 'echo   123',
            output: 'echo 123',
            name: 'simple document',
        },
        {
            input: '#!/bin/sh\necho   123',
            output: '#!/bin/sh\necho 123',
            name: 'simple document with shebang',
        },
        {
            input: 'echo   123  abc',
            output: 'echo 123 abc',
            name: 'simple document with multiple arguments',
        },
        // {
        //     input: 'echo 123;',
        //     output: 'echo 123',
        //     name: 'simple document with semicolon',
        // },
    ];
    for (const scenario of scenarios) {
        test(`Minify ${scenario.name}`, async () => {
            await performTest(scenario.input, scenario.output);
        });
    }

    // test(`Minify simple document`, async () => {
    //     await performTest('echo   123', 'echo 123');
    // });

    // test(`Minify simple document with shebang`, async () => {
    //     await performTest('#!/bin/sh\necho   123', '#!/bin/sh\necho 123');
    // });

    // test(`Minify simple document with multiple arguments`, async () => {
    //     await performTest('echo  123   abc  ', 'echo 123 abc');
    // });
});
