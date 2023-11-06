const fs = require('fs');
const process = require('process');
const YAML = require('yaml');

function getYamlVersion(yamlContent) {
    const firstLine = yamlContent.split('\n')[0].trim();
    if (/^%YAML 1.1\s*$/.test(firstLine)) {
        return '1.1';
    } else if (/^%YAML 1.2\s*$/.test(firstLine)) {
        return '1.2';
    } else {
        return null;
    }
}

function stringifyYaml(value, depth, version) {
    if (typeof value === 'string') {
        const output = YAML.stringify(value.trim())
            .trim()
            .replace(/^\|-?/, '')
            .trim()
            .replaceAll('\n', '\\n');
        return output;
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
            return `${key}: ${stringifyYaml(value[key], depth + 1, version)}`;
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
    const yamlFile = process.argv.at(-1);
    let yamlContent = fs.readFileSync(yamlFile, 'utf8');

    const version = getYamlVersion(yamlContent);
    const yamlOptions = {};
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
