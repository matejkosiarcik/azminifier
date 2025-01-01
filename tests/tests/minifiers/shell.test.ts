import { test } from '@playwright/test';
import { performSimpleTest, setupTest, teardownTest } from './utils.ts';

async function performTest(input: string, output: string, variant?: 'bash' | 'sh' | 'zsh' | ('bash' | 'sh' | 'zsh')[] | undefined) {
    const variants = variant ? (Array.isArray(variant) ? variant : [variant]) : ['bash', 'sh'];

    for (const variant of variants) {
        await performSimpleTest({
            input: input,
            output: output,
            extension: variant,
            minifyOptions: {
                preset: 'default',
            },
        });
    }
}

test.describe('Minify Bash', () => {
    let tmpDir: string;
    let currDir: string;

    test.beforeEach(async () => {
        [currDir, tmpDir] = await setupTest();
    });

    test.afterEach(async () => {
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
            input: 'echo   123  abc  ',
            output: 'echo 123 abc',
            name: 'simple document with multiple arguments',
        },
        {
            input: 'echo 123;',
            output: 'echo 123',
            name: 'simple document with semicolon',
        },
    ];
    for (const scenario of scenarios) {
        test(`Minify ${scenario.name}`, async () => {
            await performTest(scenario.input, scenario.output);
        });
    }
});
