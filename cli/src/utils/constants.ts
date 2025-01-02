import path from 'node:path';
import * as url from 'node:url';

const __filename = url.fileURLToPath(import.meta.url);
const repoRootPath = (() => {
    const initialRepoPath = path.dirname(path.dirname(path.dirname(path.dirname(path.resolve(__filename)))));
    return initialRepoPath === '/' ? '/app' : initialRepoPath;
})();

export const paths = {
    minifierDirs: {
        shell: path.join(repoRootPath, 'minifiers', 'shell'),
    },
    bin: {
        python: path.join(repoRootPath, 'minifiers', 'python-vendor', 'bin'),
        nodeJs: path.join(repoRootPath, 'minifiers', 'node_modules', '.bin'),
    },
    config: path.join(repoRootPath, 'minifiers', 'config'),
};
