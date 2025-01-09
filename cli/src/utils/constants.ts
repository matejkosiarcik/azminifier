import path from 'node:path';
import * as url from 'node:url';

const __filename = url.fileURLToPath(import.meta.url);
const repoRootPath = (() => {
    const initialRepoPath = path.dirname(path.dirname(path.dirname(path.dirname(path.resolve(__filename)))));
    return initialRepoPath === '/' ? '/app' : initialRepoPath;
})();

export const paths = {
    minifiers: {
        root: path.join(repoRootPath, 'minifiers'),
        nodeJs: path.join(repoRootPath, 'minifiers', 'node_modules', '.bin'),
        python: path.join(repoRootPath, 'minifiers', 'python-vendor', 'bin'),
        ruby: path.join(repoRootPath, 'minifiers', 'bundle', 'bin'),
        shell: path.join(repoRootPath, 'minifiers', 'shell'),
    },
    runtimes: {
        ruby: path.join('/', '.rbenv', 'versions', 'current', 'bin'),
    },
    config: path.join(repoRootPath, 'minifiers', 'config'),
};
