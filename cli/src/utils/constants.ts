import path from 'node:path';
import * as url from 'node:url';

const __filename = url.fileURLToPath(import.meta.url);
const repoRootPath = path.dirname(path.dirname(path.dirname(path.dirname(path.resolve(__filename)))));

export const paths = {
    minifierDirs: {
        shell: path.join(repoRootPath, 'minifiers', 'shell'),
    },
    bin: {
        python: path.join(repoRootPath, 'minifiers', 'python', 'bin'),
        nodeJs: path.join(repoRootPath, 'minifiers', 'node_modules', '.bin'),
    }
};
