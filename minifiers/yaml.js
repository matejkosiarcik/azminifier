const fs = require('fs');
const process = require('process');
const YAML = require('yaml');

const yamlFile = process.argv.at(-1);
const yamlContent = fs.readFileSync(yamlFile, 'utf8');
const yamlObject = YAML.parse(yamlContent);

function stringifyYaml(value) {
    console.log(`JSON: ${JSON.stringify(value)}`);

    if (typeof value === 'string') {
        console.log(`String: "${value}"`);
        const output = YAML.stringify(value.trim())
            .trim()
            .replace(/^\|-?/, '')
            .trim()
            .replaceAll('\n', '\\n');
        console.log(`Return string: "${output}"`);
        return output;
    } else if (typeof value === 'number') {
        console.log(`Number: ${value}`);
        return value.toString();
    } else if (typeof value === 'boolean') {
        console.log(`Boolean: ${value}`);
        return value ? 'true' : 'false';
    } else if (value === null) {
        console.log(`Null`);
        return 'null';
    } else if (Array.isArray(value)) {
        console.log(`Array: ${JSON.stringify(value)}`);
        const content = value.map((el) => stringifyYaml(el)).join(',');
        return `[${content}]`;
    } else {
        console.log(`Object: ${JSON.stringify(value)}`);
        const content = Object.keys(value).map((key) => {
            console.log(`Key: ${key}`);
            return `${key}: ${stringifyYaml(value[key])}`;
        }).join(',');
        return `{${content}}`;
    }
}

const minifiedYamlContent = stringifyYaml(yamlObject);
console.log('Minified:', minifiedYamlContent);
if (minifiedYamlContent.length < yamlContent.length) {
    fs.writeFileSync(yamlFile, minifiedYamlContent, 'utf8');
}
