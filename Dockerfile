#
# checkov:skip=CKV_DOCKER_2:Disable HEALTHCHECK
# ^^^ Healhcheck doesn't make sense, because we are building a CLI tool, not server program
# checkov:skip=CKV_DOCKER_7:Disable FROM :latest
# ^^^ false positive for `--platform=$BUILDPLATFORM`

# hadolint global ignore=DL3042
# ^^^ Allow pip's cache, because we use it for cache mount

### CLI ###

# Main CLI #
FROM --platform=$BUILDPLATFORM node:21.2.0-slim AS cli-build
WORKDIR /app
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends moreutils >/dev/null && \
    rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    NODE_OPTIONS=--dns-result-order=ipv4first npm ci --unsafe-perm --no-progress --no-audit --quiet && \
    chronic npx modclean --patterns default:safe --run --error-halt --no-progress
COPY tsconfig.json ./
COPY rollup.config.js ./
COPY src/ ./src/
RUN npm run --silent build && \
    npm prune --production --silent --no-progress --no-audit
COPY docker-utils/prune-dependencies/prune-npm.sh docker-utils/prune-dependencies/.common.sh /utils/
RUN sh /utils/prune-npm.sh

FROM debian:12.2-slim AS cli-final
WORKDIR /app
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends nodejs npm >/dev/null && \
    rm -rf /var/lib/apt/lists/*
COPY --from=cli-build /app/node_modules ./node_modules
COPY --from=cli-build /app/package.json ./package.json
COPY --from=cli-build /app/dist/ ./dist/
COPY docker-utils/sanity-checks/check-minifiers-custom.sh /utils/check-minifiers-custom.sh
RUN sh /utils/check-minifiers-custom.sh

### 3rd party minifiers ###

# NodeJS/NPM #

FROM --platform=$BUILDPLATFORM node:21.2.0-slim AS minifiers-nodejs-build1
WORKDIR /app
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends moreutils >/dev/null && \
    rm -rf /var/lib/apt/lists/*
COPY minifiers/package.json minifiers/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    NODE_OPTIONS=--dns-result-order=ipv4first npm ci --unsafe-perm --no-progress --no-audit --quiet && \
    chronic npx modclean --patterns default:safe --run --error-halt --no-progress && \
    npm prune --production --silent --no-progress --no-audit
COPY docker-utils/prune-dependencies/prune-npm.sh docker-utils/prune-dependencies/.common.sh /utils/
RUN sh /utils/prune-npm.sh

FROM --platform=$BUILDPLATFORM debian:12.2-slim AS minifiers-nodejs-build2
WORKDIR /app
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends nodejs npm inotify-tools psmisc >/dev/null && \
    rm -rf /var/lib/apt/lists/*
COPY --from=minifiers-nodejs-build1 /app/node_modules/ ./node_modules/
COPY --from=minifiers-nodejs-build1 /app/package.json ./package.json
COPY docker-utils/sanity-checks/check-minifiers-nodejs.sh /utils/check-minifiers-nodejs.sh
RUN export PATH="/app/node_modules/.bin:$PATH" && \
    touch /usage-list.txt && \
    inotifywait --daemon --recursive --event access /app/node_modules --outfile /usage-list.txt --format '%w%f' && \
    sh /utils/check-minifiers-nodejs.sh && \
    killall inotifywait
COPY docker-utils/prune-dependencies/prune-inotifylist.sh /utils/prune-inotifylist.sh
RUN sh /utils/prune-inotifylist.sh node_modules /usage-list.txt

FROM debian:12.2-slim AS minifiers-nodejs-final
WORKDIR /app
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends nodejs npm >/dev/null && \
    rm -rf /var/lib/apt/lists/*
COPY --from=minifiers-nodejs-build2 /app/node_modules ./node_modules/
COPY --from=minifiers-nodejs-build2 /app/package.json ./package.json
COPY docker-utils/sanity-checks/check-minifiers-nodejs.sh /utils/check-minifiers-nodejs.sh
RUN export PATH="/app/node_modules/.bin:$PATH" && \
    sh /utils/check-minifiers-nodejs.sh

# TODO: More minifier environments #

# Pre-Final #

FROM debian:12.2-slim AS pre-final
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
        nodejs npm \
        >/dev/null && \
    rm -rf /var/lib/apt/lists/* && \
    printf '%s\n%s\n%s\n' '#!/bin/sh' 'set -euf' 'node /app/dist/cli.js $@' >/usr/bin/uniminify && \
    chmod a+x /usr/bin/uniminify
COPY docker-utils/sanity-checks/check-system.sh ./
RUN sh check-system.sh
WORKDIR /app
COPY VERSION.txt ./
COPY --from=cli-final /app/ ./
WORKDIR /app/minifiers
COPY --from=minifiers-nodejs-final /app/ ./
WORKDIR /utils

### Final stage ###

FROM debian:12.2-slim
WORKDIR /app
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
        nodejs npm \
        >/dev/null && \
    rm -rf /var/lib/apt/lists/* /var/log/apt /var/log/dpkg* /var/cache/apt /usr/share/zsh/vendor-completions && \
    useradd --create-home --no-log-init --shell /bin/sh --user-group --system uniminify
COPY --from=pre-final /usr/bin/uniminify /usr/bin/
COPY --from=pre-final /app/ ./
ENV NODE_OPTIONS=--dns-result-order=ipv4first
USER uniminify
WORKDIR /project
ENTRYPOINT ["uniminify"]
CMD []
