import fs from 'fs';
import process from 'process';
import YAML, { ParseOptions as YamlParseOptions, DocumentOptions as YamlDocumentOptions } from 'yaml';

function getYamlVersion(yamlContent: string): '1.1' | '1.2' | undefined {
    const firstLine = yamlContent.split('\n')[0].trim();
    if (/^%YAML 1.1\s*$/.test(firstLine)) {
        return '1.1';
    } else if (/^%YAML 1.2\s*$/.test(firstLine)) {
        return '1.2';
    } else {
        return;
    }
}

function stringifyYaml(value: unknown, depth: number, version: string | undefined): string {
    if (typeof value === 'string') {
        let indentPrefix = '';
        for (let i = 0; i < depth; i++) {
            indentPrefix += ' ';
        }

        return YAML.stringify(value)
            .split('\n')
            .map((el) => el.trimStart())
            .map((el, index) => index === 0 ? el : indentPrefix + el)
            .join('\n')
            .trimEnd();
    } else if (typeof value === 'number') {
        return value.toString();
    } else if (typeof value === 'boolean') {
        const positiveValue = version === '1.1' ? 'y' : 'true';
        const negativeValue = version === '1.1' ? 'n' : 'false';
        return value ? positiveValue : negativeValue;
    } else if (value === null) {
        return 'null';
    } else if (Array.isArray(value)) {
        const content = value.map((el) => stringifyYaml(el, depth + 1, version)).join(',');
        return `[${content}]`;
    } else if (typeof value === 'object') {
        let content = Object.keys(value).map((key) => {
            return `${key}: ${stringifyYaml(value[key as keyof typeof value], depth + 1, version)}`;
        }).join(depth > 0 ? ',' : '\n');
        if (depth > 0) {
            content = `{${content}}`;
        }
        return content;
    } else {
        throw new Error(`Unknown YAML node ${typeof value}: ${value}`);
    }
}

// main
(() => {
    const yamlFile = process.argv.at(-1)!;
    let yamlContent = fs.readFileSync(yamlFile, 'utf8');

    const version = getYamlVersion(yamlContent);
    const yamlOptions: YamlParseOptions & YamlDocumentOptions = {};
    if (version) {
        yamlOptions.version = version;
        yamlContent = yamlContent.replace(/^.+---\n/s, '');
    }
    const yamlObject = YAML.parse(yamlContent, yamlOptions);
    const isEmpty = !yamlObject && yamlContent.length === 0;

    let minifiedYamlContent = isEmpty ? '' : stringifyYaml(yamlObject, 0, version);
    if (version) {
        minifiedYamlContent = `%YAML ${version}\n---\n${minifiedYamlContent}`;
    }

    fs.writeFileSync(yamlFile, minifiedYamlContent, 'utf8');
})();
