#
# checkov:skip=CKV_DOCKER_2:Disable HEALTHCHECK
# ^^^ Healhcheck doesn't make sense, because we are building a CLI tool, not server program
# checkov:skip=CKV_DOCKER_7:Disable FROM :latest
# ^^^ false positive for `--platform=$BUILDPLATFORM`

# hadolint global ignore=DL3042
# ^^^ Allow pip's cache, because we use it for cache mount
# hadolint global ignore=SC1091
# ^^^ False positives for sourcing files into current shell

### Reusable components ###

## Gitman ##

FROM --platform=$BUILDPLATFORM debian:12.9-slim AS helper--gitman--base
WORKDIR /app
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
        python3-pip python3 >/dev/null && \
    rm -rf /var/lib/apt/lists/*
COPY ./docker-utils/dependencies/gitman/requirements.txt ./
RUN --mount=type=cache,target=/root/.cache/pip \
    python3 -m pip install --requirement requirements.txt --target python-vendor --quiet

FROM --platform=$BUILDPLATFORM debian:12.9-slim AS helper--gitman--final
WORKDIR /app
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
        ca-certificates git python3 >/dev/null && \
    rm -rf /var/lib/apt/lists/*
COPY --from=helper--gitman--base /app/ ./
ENV PATH="/app/python-vendor/bin:$PATH" \
    PYTHONPATH=/app/python-vendor

### Runtimes ###

## NodeJS runtime ##

FROM --platform=$BUILDPLATFORM helper--gitman--final AS runtime--nodejs--nodenv--gitman
WORKDIR /app
COPY ./docker-utils/dependencies/gitman/nodenv/gitman.yml ./
RUN gitman install --quiet && \
    find . -type d -name .git -prune -exec rm -rf {} \;

FROM --platform=$BUILDPLATFORM helper--gitman--final AS runtime--nodejs--node-build--gitman
WORKDIR /app
COPY ./docker-utils/dependencies/gitman/node-build/gitman.yml ./
RUN gitman install --quiet && \
    find . -type d -name .git -prune -exec rm -rf {} \;

# TODO: Run on current architecture
FROM debian:12.9-slim AS runtime--nodejs--build1
WORKDIR /app
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
        g++ gcc make >/dev/null && \
    rm -rf /var/lib/apt/lists/*
COPY --from=runtime--nodejs--nodenv--gitman /app/gitman-repositories/nodenv/ ./nodenv/
ENV NODENV_ROOT=/app/nodenv
RUN ./nodenv/src/configure && \
    make -C ./nodenv/src
COPY --from=runtime--nodejs--node-build--gitman /app/gitman-repositories/node-build/ ./nodenv/plugins/node-build/

# TODO: Setup cross compilation variables
FROM --platform=$BUILDPLATFORM debian:12.9-slim AS runtime--nodejs--build2
ARG TARGETARCH TARGETVARIANT
WORKDIR /app
RUN export CFLAGS="-s" && \
    export CXXFLAGS="-s" && \
    export CC="gcc-11" && \
    export CXX="g++-11" && \
    export CONFIGURE_OPTS="" && \
    export NODE_CONFIGURE_OPTS="" && \
    export NODE_CONFIGURE_OPTS2="--cross-compiling --dest-os=linux" && \
    export NODE_MAKE_OPTS="" && \
    export NODE_MAKE_OPTS2="-j$(nproc --all)" && \
    export MAKE_OPTS2="-j$(nproc --all)" && \
    if [ "$TARGETARCH" = 386 ] || [ "$TARGETARCH" = amd64 ]; then \
        export CFLAGS2="$CFLAGS -mtune=generic" && \
        export CXXFLAGS2="$CXXFLAGS -mtune=generic" && \
        if [ "$TARGETARCH" = 386 ]; then \
            export CONFIGURE_OPTS="--openssl-no-asm" && \
            export NODE_CONFIGURE_OPTS="--openssl-no-asm" && \
            export CFLAGS2="$CFLAGS -march=i686 -msse2" && \
            export CXXFLAGS2="$CXXFLAGS -march=i686 -msse2" && \
            export NODE_CONFIGURE_OPTS2="$NODE_CONFIGURE_OPTS2 --dest-cpu=x86" && \
        true; elif [ "$TARGETARCH" = amd64 ]; then \
            export CFLAGS2="$CFLAGS -march=x86-64" && \
            export CXXFLAGS2="$CXXFLAGS -march=x86-64" && \
            export NODE_CONFIGURE_OPTS2="$NODE_CONFIGURE_OPTS2 --dest-cpu=x86_64" && \
        true; else \
            printf 'Unsupported architecture %s/%s\n' "$TARGETARCH" "$TARGETVARIANT" && \
            exit 1 && \
        true; fi && \
    true; elif [ "$TARGETARCH" = arm ] || [ "$TARGETARCH" = arm32 ] || [ "$TARGETARCH" = arm64 ]; then \
        export CFLAGS2="$CFLAGS -mtune=generic-arch" && \
        export CXXFLAGS2="$CXXFLAGS -mtune=generic-arch" && \
        if [ "$TARGETVARIANT" = v5 ] || ( [ "$TARGETARCH" = arm ] && [ "$TARGETVARIANT" = '' ] ) || ( [ "$TARGETARCH" = arm32 ] && [ "$TARGETVARIANT" = '' ] ); then \
            export CFLAGS2="$CFLAGS -march=armv5t -mfloat-abi=soft" && \
            export CXXFLAGS2="$CXXFLAGS -march=armv5t -mfloat-abi=soft" && \
            export NODE_CONFIGURE_OPTS2="$NODE_CONFIGURE_OPTS2 --dest-cpu=arm --with-arm-float-abi=soft" && \
        true; elif [ "$TARGETVARIANT" = v6 ]; then \
            # TODO: If running the produced executable has problems
            # First try "-march=armv6z+fp -mfloat-abi=softfp"
            # Alternatively try out "-march=armv6z+nofp -mfloat-abi=soft"
            export CFLAGS2="$CFLAGS -march=armv6z+fp -mfloat-abi=hard" && \
            export CXXFLAGS2="$CXXFLAGS -march=armv6z+fp -mfloat-abi=hard" && \
            export NODE_CONFIGURE_OPTS2="$NODE_CONFIGURE_OPTS2 --dest-cpu=arm --with-arm-float-abi=hard --with-arm-fpu=vfp" && \
        true; elif [ "$TARGETVARIANT" = v7 ]; then \
            export CFLAGS2="$CFLAGS -march=armv7-a+vfpv4 -mfloat-abi=hard" && \
            export CXXFLAGS2="$CXXFLAGS -march=armv7-a+vfpv4 -mfloat-abi=hard" && \
            export NODE_CONFIGURE_OPTS2="$NODE_CONFIGURE_OPTS2 --dest-cpu=arm --with-arm-float-abi=hard --with-arm-fpu=vfpv3" && \
        true; elif [ "$TARGETVARIANT" = v8 ] || ( [ "$TARGETARCH" = arm64 ] && [ "$TARGETVARIANT" = '' ] ); then \
            export CFLAGS2="$CFLAGS -march=armv8-a+simd -mfloat-abi=hard" && \
            export CXXFLAGS2="$CXXFLAGS -march=armv8-a+simd -mfloat-abi=hard" && \
            export NODE_CONFIGURE_OPTS2="$NODE_CONFIGURE_OPTS2 --dest-cpu=arm64 --with-arm-float-abi=hard --with-arm-fpu=neon" && \
        true; elif [ "$TARGETVARIANT" = v9 ]; then \
            export CFLAGS2="$CFLAGS -march=armv9-a -mfloat-abi=hard" && \
            export CXXFLAGS2="$CXXFLAGS -march=armv9-a -mfloat-abi=hard" && \
            export NODE_CONFIGURE_OPTS2="$NODE_CONFIGURE_OPTS2 --dest-cpu=arm64 --with-arm-float-abi=hard --with-arm-fpu=neon" && \
        true; else \
            printf 'Unsupported architecture %s/%s\n' "$TARGETARCH" "$TARGETVARIANT" && \
            exit 1 && \
        true; fi && \
    true; elif [ "$TARGETARCH" = ppc64le ]; then \
        export NODE_CONFIGURE_OPTS2="$NODE_CONFIGURE_OPTS2 --dest-cpu=ppc64" && \
    true; elif [ "$TARGETARCH" = mips64le ]; then \
        export NODE_CONFIGURE_OPTS2="$NODE_CONFIGURE_OPTS2 --dest-cpu=mips64el" && \
    true; elif [ "$TARGETARCH" = s390x ]; then \
        export NODE_CONFIGURE_OPTS2="$NODE_CONFIGURE_OPTS2 --dest-cpu=s390x" && \
    true; elif [ "$TARGETARCH" = riscv64 ]; then \
        export NODE_CONFIGURE_OPTS2="$NODE_CONFIGURE_OPTS2 --dest-cpu=riscv64" && \
    true; else \
        printf 'Unsupported architecture %s/%s\n' "$TARGETARCH" "$TARGETVARIANT" && \
        exit 1 && \
    true; fi && \
    printf 'export CC="%s"\n' "$CC" >>build-env.sh && \
    printf 'export CXX="%s"\n' "$CXX" >>build-env.sh && \
    printf 'export CFLAGS="%s"\n' "$CFLAGS" >>build-env.sh && \
    printf 'export CXXFLAGS="%s"\n' "$CXXFLAGS" >>build-env.sh && \
    printf 'export CONFIGURE_OPTS="%s"\n' "$CONFIGURE_OPTS" >>build-env.sh && \
    printf 'export NODE_CONFIGURE_OPTS="%s"\n' "$NODE_CONFIGURE_OPTS" >>build-env.sh && \
    printf 'export NODE_MAKE_OPTS="%s"\n' "$NODE_MAKE_OPTS" >>build-env.sh
COPY .node-version ./
RUN printf 'export _NODE_VERSION="%s"\n' "$(cat .node-version)" >>build-env.sh
COPY --from=runtime--nodejs--build1 /app/ ./

# TODO: Test optimization options from https://www.reddit.com/r/cpp/comments/d74hfi/additional_optimization_options_in_gcc/
# -fdevirtualize-at-ltrans
# -fipa-pta
# TODO: Maybe try ccache for speedup? https://ccache.dev https://github.com/nodejs/node/blob/main/BUILDING.md#speeding-up-frequent-rebuilds-when-developing
# export CC="ccache $CC"
# export CXX="ccache $CXX"
# TODO: Cross-compile NodeJS in this stage
# - CONFIGURE_OPTS="--cross-compiling"
# - NODE_CONFIGURE_OPTS="--cross-compiling"
# TODO: Setup cache downloads directory
# TODO: Setup cache builds directory
# TODO: Enable LTO:
# - CONFIGURE_OPTS="--enable-lto"
# - NODE_CONFIGURE_OPTS="--enable-lto"
# - CFLAGS="-flto"
# - CXXFLAGS="-flto"
# Compile NodeJS
FROM debian:12.9-slim AS runtime--nodejs--build3
WORKDIR /app
# There is a probably bug with GCC-12, that's why GCC-11 is installed instead
# See more: https://github.com/nodejs/node/issues/53633
# TODO: Use default GCC(-12) after this problem is fixed or GCC-13 if it's available in stable debian
# TODO: Remove binutils
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
        binutils ca-certificates curl g++-11 gcc-11 git libc6 make moreutils python3 time >/dev/null && \
    rm -rf /var/lib/apt/lists/*
ENV NODENV_ROOT=/app/nodenv \
    PATH="/app/nodenv/bin:$PATH"
COPY --from=runtime--nodejs--build2 /app/ ./
# TODO: Enable build cache
# RUN --mount=type=cache,target=/app/node-downloads \
#     --mount=type=cache,target=/app/node-builds \
# TODO: Run compilation under "chronic"
# TODO: Remove debug multiple builds
RUN export NODE_BUILD_CACHE_PATH="/app/node-downloads/$(cat .node-version)" && \
    export NODE_BUILD_BUILD_PATH="/app/node-builds/$(shasum /app/build-env.sh | sed 's~ .*$~~')" && \
    mkdir -p "$NODE_BUILD_CACHE_PATH" "$NODE_BUILD_BUILD_PATH" && \
    find "$NODE_BUILD_CACHE_PATH" >downloads-dir-before.txt && \
    find "$NODE_BUILD_BUILD_PATH" >builds-dir-before.txt && \
    . /app/build-env.sh && \
    printf 'Time 1:\n' >>time.txt && \
    ( time chronic nodenv install --compile --keep --verbose "$(cat .node-version)" 2>&1 ) 2>>time.txt && \
    find "$NODE_BUILD_CACHE_PATH" >downloads-dir-after.txt && \
    find "$NODE_BUILD_BUILD_PATH" >builds-dir-after.txt && \
    mv "./nodenv/versions/$(cat .node-version)" './nodenv/versions/default' && \
    rm -rf "./nodenv/versions/default/share" "./nodenv/versions/default/include" && \
    strip --strip-all './nodenv/versions/default/bin/node' && \
    printf 'Time 2:\n' >>time.txt && \
    ( time chronic nodenv install --compile --keep --verbose "$(cat .node-version)" 2>&1 ) 2>>time.txt && \
    find "$NODE_BUILD_CACHE_PATH" >downloads-dir-after2.txt && \
    find "$NODE_BUILD_BUILD_PATH" >builds-dir-after2.txt && \
    mv "./nodenv/versions/$(cat .node-version)" './nodenv/versions/default2' && \
    rm -rf "./nodenv/versions/default2/share" "./nodenv/versions/default2/include" && \
    strip --strip-all './nodenv/versions/default2/bin/node' && \
    printf 'Time 3:\n' >>time.txt && \
    ( time chronic nodenv install --keep --verbose "$(cat .node-version)" 2>&1 ) 2>>time.txt && \
    find "$NODE_BUILD_CACHE_PATH" >downloads-dir-after3.txt && \
    find "$NODE_BUILD_BUILD_PATH" >builds-dir-after3.txt && \
    mv "./nodenv/versions/$(cat .node-version)" './nodenv/versions/default3' && \
    rm -rf "./nodenv/versions/default2/share" "./nodenv/versions/default3/include" && \
    strip --strip-all './nodenv/versions/default3/bin/node'

# TODO: Optimize and minify /app/nodenv/versions/default/lib/node_modules
# TODO: Minify files /app/nodenv/versions/default/bin/{corepack,npm,npx}

FROM debian:12.9-slim AS runtime--nodejs--final
WORKDIR /app
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
        moreutils >/dev/null && \
    if [ "$(dpkg --print-architecture)" = armel ]; then \
        dpkg --add-architecture armhf && \
        apt-get update -qq && \
        DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
            libatomic1:armhf libc6:armhf libstdc++6:armhf >/dev/null && \
    true; elif [ "$(dpkg --print-architecture)" = armhf ]; then \
        DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
            libatomic1 >/dev/null && \
    true; fi && \
    rm -rf /var/lib/apt/lists/*
COPY --from=runtime--nodejs--build3 /app/nodenv/versions/default/ ./.node/
ENV PATH="/app/.node/bin:$PATH"
# Validate installation
RUN chronic node --version && \
    chronic npm --version

## Python ##

## Ruby runtime - rbenv ##

# Rbenv installer
FROM --platform=$BUILDPLATFORM helper--gitman--final AS runtime--ruby--rbenv--gitman
WORKDIR /app
COPY ./docker-utils/dependencies/gitman/rbenv-installer/gitman.yml ./
RUN gitman install --quiet && \
    find . -type d -name .git -prune -exec rm -rf {} \;

# Install ruby with rbenv
FROM debian:12.9-slim AS runtime--ruby--rbenv--final
WORKDIR /app
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
        autoconf bison build-essential ca-certificates curl git moreutils \
        libffi-dev libgdbm-dev libncurses5-dev libreadline-dev libreadline-dev libssl-dev libyaml-dev zlib1g-dev >/dev/null && \
    rm -rf /var/lib/apt/lists/*
COPY --from=runtime--ruby--rbenv--gitman /app/gitman-repositories/rbenv-installer ./rbenv-installer
ENV PATH="/root/.rbenv/bin:/.rbenv/bin:/.rbenv/shims:$PATH" \
    RBENV_ROOT=/.rbenv
RUN bash rbenv-installer/bin/rbenv-installer
COPY ./docker-utils/build/rbenv-install-logging.sh /utils/
COPY ./.ruby-version ./
# hadolint ignore=DL3001
RUN --mount=type=cache,target=/.rbenv/cache \
    ruby_version="$(cat .ruby-version)" && \
    (sh '/utils/rbenv-install-logging.sh' &) && \
    chronic rbenv install "$ruby_version" && \
    kill "$(cat '/utils/logging-pid.txt')" && \
    ln -s "/.rbenv/versions/$ruby_version" /.rbenv/versions/current

# Install ruby with rbenv
FROM --platform=$BUILDPLATFORM debian:12.9-slim AS runtime--ruby--rbenv--buildplatform--final
WORKDIR /app
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
        autoconf bison build-essential ca-certificates curl git moreutils \
        libffi-dev libgdbm-dev libncurses5-dev libreadline-dev libreadline-dev libssl-dev libyaml-dev zlib1g-dev >/dev/null && \
    rm -rf /var/lib/apt/lists/*
COPY --from=runtime--ruby--rbenv--gitman /app/gitman-repositories/rbenv-installer ./rbenv-installer
ENV PATH="/root/.rbenv/bin:/.rbenv/bin:/.rbenv/shims:$PATH" \
    RBENV_ROOT=/.rbenv
RUN bash rbenv-installer/bin/rbenv-installer
COPY ./docker-utils/build/rbenv-install-logging.sh /utils/
COPY ./.ruby-version ./
# hadolint ignore=DL3001
RUN --mount=type=cache,target=/.rbenv/cache \
    ruby_version="$(cat .ruby-version)" && \
    (sh '/utils/rbenv-install-logging.sh' &) && \
    chronic rbenv install "$ruby_version" && \
    kill "$(cat '/utils/logging-pid.txt')" && \
    ln -s "/.rbenv/versions/$ruby_version" /.rbenv/versions/current

### Main CLI ###

FROM --platform=$BUILDPLATFORM node:23.8.0-slim AS minifiers--cli--build
WORKDIR /app
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
        moreutils \
        >/dev/null && \
    rm -rf /var/lib/apt/lists/*
COPY ./cli/package.json cli/package-lock.json ./
COPY ./cli/patches/ ./patches/
RUN --mount=type=cache,target=/root/.npm \
    NODE_OPTIONS=--dns-result-order=ipv4first npm ci --unsafe-perm --no-progress --no-audit --no-fund --loglevel=error && \
    chronic npx modclean --patterns default:safe --run --error-halt --no-progress
COPY ./cli/tsconfig.json ./
COPY ./cli/rollup.config.js ./
COPY ./cli/src/ ./src/
RUN npm run --silent build && \
    npm prune --production --silent --no-progress --no-audit
COPY ./docker-utils/prune-dependencies/prune-npm.sh docker-utils/prune-dependencies/.common.sh /utils/
RUN sh /utils/prune-npm.sh

FROM debian:12.9-slim AS minifiers--cli--final
WORKDIR /app
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
        moreutils nodejs npm \
        >/dev/null && \
    rm -rf /var/lib/apt/lists/*
COPY --from=minifiers--cli--build /app/node_modules ./node_modules
COPY --from=minifiers--cli--build /app/package.json ./package.json
COPY --from=minifiers--cli--build /app/dist/ ./dist/
COPY ./docker-utils/sanity-checks/check-minifiers-custom.sh /utils/check-minifiers-custom.sh
RUN chronic sh /utils/check-minifiers-custom.sh

FROM --platform=$BUILDPLATFORM debian:12.9-slim AS minifiers--minifiers--cli--buildplatform--final
WORKDIR /app
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
        moreutils nodejs npm \
        >/dev/null && \
    rm -rf /var/lib/apt/lists/*
COPY --from=minifiers--cli--build /app/node_modules ./node_modules
COPY --from=minifiers--cli--build /app/package.json ./package.json
COPY --from=minifiers--cli--build /app/dist/ ./dist/

### 3rd party minifiers ###

# NodeJS #

FROM --platform=$BUILDPLATFORM node:23.8.0-slim AS minifiers--nodejs--build1
WORKDIR /app/minifiers
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
        moreutils \
        >/dev/null && \
    rm -rf /var/lib/apt/lists/*
COPY ./minifiers/package.json ./minifiers/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    NODE_OPTIONS=--dns-result-order=ipv4first npm ci --unsafe-perm --no-progress --no-audit --no-fund --loglevel=error && \
    chronic npx modclean --patterns default:safe --run --error-halt --no-progress && \
    npm prune --production --silent --no-progress --no-audit

FROM --platform=$BUILDPLATFORM debian:12.9-slim AS minifiers--nodejs--build2
WORKDIR /app/minifiers
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
        moreutils nodejs inotify-tools psmisc \
        >/dev/null && \
    rm -rf /var/lib/apt/lists/*
COPY --from=minifiers--nodejs--build1 /app/minifiers/node_modules/ ./node_modules/
COPY --from=minifiers--nodejs--build1 /app/minifiers/package.json ./package.json
COPY ./docker-utils/sanity-checks/check-minifiers-nodejs.sh /utils/
ENV PATH="/app/minifiers/node_modules/.bin:$PATH"
# TODO: Reenable
# RUN touch /usage-list.txt && \
#     inotifywait --daemon --recursive --event access /app/node_modules --outfile /usage-list.txt --format '%w%f' && \
#     chronic sh /utils/check-minifiers-nodejs.sh && \
#     killall inotifywait
# COPY ./docker-utils/prune-dependencies/prune-inotifylist.sh /utils/prune-inotifylist.sh
# RUN sh /utils/prune-inotifylist.sh ./node_modules /usage-list.txt

FROM debian:12.9-slim AS minifiers--nodejs--final
WORKDIR /app/minifiers
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
        moreutils nodejs \
        >/dev/null && \
    rm -rf /var/lib/apt/lists/*
COPY --from=minifiers--nodejs--build2 /app/minifiers/node_modules ./node_modules/
COPY --from=minifiers--nodejs--build2 /app/minifiers/package.json ./package.json
COPY ./docker-utils/sanity-checks/check-minifiers-nodejs.sh /utils/
ENV PATH="/app/minifiers/node_modules/.bin:$PATH"
RUN chronic sh /utils/check-minifiers-nodejs.sh

FROM --platform=$BUILDPLATFORM debian:12.9-slim AS minifiers--nodejs--buildplatform--final
WORKDIR /app/minifiers
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
        moreutils nodejs \
        >/dev/null && \
    rm -rf /var/lib/apt/lists/*
COPY --from=minifiers--nodejs--build2 /app/minifiers/node_modules ./node_modules/
COPY --from=minifiers--nodejs--build2 /app/minifiers/package.json ./package.json

# Python #

FROM --platform=$BUILDPLATFORM debian:12.9-slim AS minifiers--python--build1
WORKDIR /app/minifiers
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
        git moreutils python3 python3-pip \
        >/dev/null && \
    rm -rf /var/lib/apt/lists/*
COPY ./minifiers/requirements.txt ./
RUN --mount=type=cache,target=/root/.cache/pip \
    python3 -m pip install --requirement requirements.txt --target "$PWD/python-vendor" --quiet && \
    find /app/minifiers/python-vendor -type f -iname '*.py[co]' -delete && \
    find /app/minifiers/python-vendor -type d -iname '__pycache__' -prune -exec rm -rf {} \;
WORKDIR /app/minifiers/python-vendor/pyminifier
COPY ./minifiers/python-patches/minification.py.patch ./
RUN git apply minification.py.patch && \
    rm -f minification.py.patch

FROM --platform=$BUILDPLATFORM debian:12.9-slim AS minifiers--python--build2
WORKDIR /app/minifiers
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
        moreutils python3 inotify-tools psmisc \
        >/dev/null && \
    rm -rf /var/lib/apt/lists/*
COPY --from=minifiers--python--build1 /app/minifiers/python-vendor/ ./python-vendor/
COPY ./docker-utils/sanity-checks/check-minifiers-python.sh /utils/
ENV PATH="/app/minifiers/python-vendor/bin:$PATH" \
    PYTHONPATH=/app/minifiers/python-vendor \
    PYTHONDONTWRITEBYTECODE=1
# TODO: Reenable
# RUN touch /usage-list.txt && \
#     inotifywait --daemon --recursive --event access /app/minifiers/python-vendor --outfile /usage-list.txt --format '%w%f' && \
#     chronic sh /utils/check-minifiers-python.sh && \
#     killall inotifywait
# COPY ./docker-utils/prune-dependencies/prune-inotifylist.sh /utils/prune-inotifylist.sh
# RUN sh /utils/prune-inotifylist.sh ./python-vendor /usage-list.txt

FROM debian:12.9-slim AS minifiers--python--final
WORKDIR /app/minifiers
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
        moreutils python3 \
        >/dev/null && \
    rm -rf /var/lib/apt/lists/*
COPY --from=minifiers--python--build2 /app/minifiers/python-vendor ./python-vendor/
COPY ./docker-utils/sanity-checks/check-minifiers-python.sh /utils/
ENV PATH="/app/minifiers/python-vendor/bin:$PATH" \
    PYTHONPATH=/app/minifiers/python-vendor \
    PYTHONDONTWRITEBYTECODE=1
RUN chronic sh /utils/check-minifiers-python.sh

FROM --platform=$BUILDPLATFORM debian:12.9-slim AS minifiers--python--buildplatform--final
WORKDIR /app/minifiers
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
        moreutils python3 \
        >/dev/null && \
    rm -rf /var/lib/apt/lists/*
COPY --from=minifiers--python--build2 /app/minifiers/python-vendor ./python-vendor

# Ruby #

FROM debian:12.9-slim AS minifiers--ruby--build
WORKDIR /app/minifiers
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
        build-essential libyaml-0-2 moreutils >/dev/null && \
    rm -rf /var/lib/apt/lists/*
COPY ./minifiers/Gemfile ./minifiers/Gemfile.lock ./
COPY --from=runtime--ruby--rbenv--final /.rbenv/versions /.rbenv/versions
ENV BUNDLE_DISABLE_SHARED_GEMS=true \
    BUNDLE_FROZEN=true \
    BUNDLE_GEMFILE=/app/minifiers/Gemfile \
    BUNDLE_PATH=/app/minifiers/bundle \
    BUNDLE_PATH__SYSTEM=false \
    PATH="/.rbenv/versions/current/bin:$PATH"
RUN chronic bundle install --quiet

FROM --platform=$BUILDPLATFORM debian:12.9-slim AS minifiers--ruby--buildplatform--build
WORKDIR /app/minifiers
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
        build-essential libyaml-0-2 moreutils >/dev/null && \
    rm -rf /var/lib/apt/lists/*
COPY ./minifiers/Gemfile ./minifiers/Gemfile.lock ./
COPY --from=runtime--ruby--rbenv--buildplatform--final /.rbenv/versions /.rbenv/versions
ENV BUNDLE_DISABLE_SHARED_GEMS=true \
    BUNDLE_FROZEN=true \
    BUNDLE_GEMFILE=/app/minifiers/Gemfile \
    BUNDLE_PATH=/app/minifiers/bundle \
    BUNDLE_PATH__SYSTEM=false \
    PATH="/.rbenv/versions/current/bin:$PATH"
RUN chronic bundle install --quiet

FROM debian:12.9-slim AS minifiers--ruby--final
WORKDIR /app/minifiers
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
        moreutils >/dev/null && \
    rm -rf /var/lib/apt/lists/*
COPY ./minifiers/Gemfile ./minifiers/Gemfile.lock ./
COPY --from=runtime--ruby--rbenv--final /.rbenv/versions /.rbenv/versions
COPY --from=minifiers--ruby--build /app/minifiers/bundle ./bundle
COPY ./docker-utils/sanity-checks/check-minifiers-ruby.sh /utils/
ENV BUNDLE_GEMFILE=/app/minifiers/Gemfile \
    BUNDLE_PATH=/app/minifiers/bundle \
    PATH="/.rbenv/versions/current/bin:$PATH"
RUN chronic sh /utils/check-minifiers-ruby.sh

FROM --platform=$BUILDPLATFORM debian:12.9-slim AS minifiers--ruby--buildplatform--final
WORKDIR /app/minifiers
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
        moreutils >/dev/null && \
    rm -rf /var/lib/apt/lists/*
COPY ./minifiers/Gemfile ./minifiers/Gemfile.lock ./
COPY --from=runtime--ruby--rbenv--buildplatform--final /.rbenv/versions /.rbenv/versions
COPY --from=minifiers--ruby--buildplatform--build /app/minifiers/bundle ./bundle

# Shell #

FROM debian:12.9-slim AS minifiers--shell--final
COPY ./minifiers/shell /app/minifiers/shell

FROM --platform=$BUILDPLATFORM debian:12.9-slim AS minifiers--shell--buildplatform--final
COPY ./minifiers/shell /app/minifiers/shell

# Pre-Final #
# The purpose of this stage is to be 99% the same as the final stage
# Mainly the apt install scripts should be the same
# But since it's not actually final we can run some sanity-checks, which fo not baloon the size of the output docker image

FROM --platform=$BUILDPLATFORM debian:12.9-slim AS minified--helper
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
        moreutils nodejs python3 \
        >/dev/null && \
    rm -rf /var/lib/apt/lists/* && \
    printf '%s\n%s\n%s\n' '#!/bin/sh' 'set -euf' 'node /app/dist/cli.js $@' >/usr/bin/azminifier && \
    chmod a+x /usr/bin/azminifier
COPY ./docker-utils/sanity-checks/check-system.sh /utils/
RUN chronic sh /utils/check-system.sh
COPY ./VERSION.txt /app/
COPY --from=minifiers--minifiers--cli--buildplatform--final /app/ /app/
COPY --from=minifiers--nodejs--buildplatform--final /app/minifiers /app/minifiers
COPY --from=minifiers--python--buildplatform--final /app/minifiers /app/minifiers
COPY --from=minifiers--ruby--buildplatform--final /app/minifiers /app/minifiers
COPY --from=minifiers--ruby--buildplatform--final /.rbenv /.rbenv
COPY --from=minifiers--shell--buildplatform--final /app/minifiers /app/minifiers
COPY ./minifiers/config/terser.default.config.json ./minifiers/config/svgo.default.config.cjs /app/minifiers/config/

FROM --platform=$BUILDPLATFORM debian:12.9-slim AS minifiers--cli--minified
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
        moreutils nodejs python3 \
        >/dev/null && \
    rm -rf /var/lib/apt/lists/*
COPY --from=minified--helper /usr/bin/azminifier /usr/bin/azminifier
COPY --from=minified--helper /app /app
COPY --from=minified--helper /.rbenv /.rbenv
COPY --from=minifiers--cli--final /app /app-minified
RUN chronic azminifier /app-minified

FROM --platform=$BUILDPLATFORM debian:12.9-slim AS minifiers--config--minified
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
        moreutils nodejs python3 \
        >/dev/null && \
    rm -rf /var/lib/apt/lists/*
COPY --from=minified--helper /usr/bin/azminifier /usr/bin/azminifier
COPY --from=minified--helper /app /app
COPY --from=minified--helper /.rbenv /.rbenv
COPY ./minifiers/config/terser.default.config.json ./minifiers/config/svgo.default.config.cjs /app-minified/minifiers/config/
RUN chronic azminifier /app-minified

FROM --platform=$BUILDPLATFORM debian:12.9-slim AS minifiers--nodejs--minified
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
        moreutils nodejs python3 \
        >/dev/null && \
    rm -rf /var/lib/apt/lists/*
COPY --from=minified--helper /usr/bin/azminifier /usr/bin/azminifier
COPY --from=minified--helper /app /app
COPY --from=minified--helper /.rbenv /.rbenv
COPY --from=minifiers--nodejs--final /app/minifiers/ /app-minified/minifiers/
RUN chronic azminifier /app-minified

FROM --platform=$BUILDPLATFORM debian:12.9-slim AS minifiers--python--minified
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
        moreutils nodejs python3 \
        >/dev/null && \
    rm -rf /var/lib/apt/lists/*
COPY --from=minified--helper /usr/bin/azminifier /usr/bin/azminifier
COPY --from=minified--helper /app /app
COPY --from=minified--helper /.rbenv /.rbenv
COPY --from=minifiers--python--final /app/minifiers/ /app-minified/minifiers/
RUN chronic azminifier /app-minified

FROM --platform=$BUILDPLATFORM debian:12.9-slim AS minifiers--ruby--minified
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
        moreutils nodejs python3 build-essential libyaml-0-2 libyaml-dev moreutils \
        >/dev/null && \
    rm -rf /var/lib/apt/lists/*
COPY --from=minified--helper /usr/bin/azminifier /usr/bin/azminifier
COPY --from=minified--helper /app /app
COPY --from=minified--helper /.rbenv /.rbenv
COPY --from=minifiers--ruby--final /app/minifiers/ /app-minified/minifiers/
RUN chronic azminifier /app-minified

FROM --platform=$BUILDPLATFORM debian:12.9-slim AS minifiers--shell--minified
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
        moreutils nodejs python3 \
        >/dev/null && \
    rm -rf /var/lib/apt/lists/*
COPY --from=minified--helper /usr/bin/azminifier /usr/bin/azminifier
COPY --from=minified--helper /app /app
COPY --from=minified--helper /.rbenv /.rbenv
COPY --from=minifiers--shell--final /app/minifiers/ /app-minified/minifiers/
RUN chronic azminifier /app-minified

FROM --platform=$BUILDPLATFORM debian:12.9-slim AS runtime--ruby--rbenv--minified
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
        moreutils nodejs python3 \
        >/dev/null && \
    rm -rf /var/lib/apt/lists/*
COPY --from=minified--helper /usr/bin/azminifier /usr/bin/azminifier
COPY --from=minified--helper /app /app
COPY --from=minified--helper /.rbenv /.rbenv
COPY --from=runtime--ruby--rbenv--final /.rbenv/versions /.rbenv-minified/versions
# TODO: Enable minification
# RUN chronic azminifier /.rbenv-minified

FROM debian:12.9-slim AS prefinal
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
        moreutils nodejs python3 \
        >/dev/null && \
    rm -rf /var/lib/apt/lists/*
COPY --from=minified--helper /usr/bin/azminifier /usr/bin/azminifier
COPY ./docker-utils/sanity-checks/check-system.sh /utils/
RUN chronic sh /utils/check-system.sh
COPY ./VERSION.txt /app/
COPY --from=minifiers--cli--minified /app-minified/ /app/
COPY --from=minifiers--config--minified /app-minified/minifiers/config/ /app/minifiers/config/
COPY --from=minifiers--nodejs--minified /app-minified/minifiers/ /app/minifiers/
COPY --from=minifiers--python--minified /app-minified/minifiers/ /app/minifiers/
COPY --from=minifiers--ruby--minified /app-minified/minifiers/ /app/minifiers/
COPY --from=minifiers--shell--minified /app-minified/minifiers/ /app/minifiers/
COPY --from=runtime--ruby--rbenv--minified /.rbenv-minified/ /.rbenv/

### Final stage ###

FROM debian:12.9-slim
RUN find / -type f -not -path '/proc/*' -not -path '/sys/*' >/filelist.txt 2>/dev/null && \
    apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive DEBCONF_TERSE=yes DEBCONF_NOWARNINGS=yes apt-get install -qq --yes --no-install-recommends \
        nodejs python3 \
        >/dev/null && \
    rm -rf /var/lib/apt/lists/* /var/log/apt /var/cache/apt && \
    find /usr/share/bug /usr/share/doc /var/cache /var/lib/apt /var/log -type f | while read -r file; do \
        if ! grep -- "$file" </filelist.txt >/dev/null; then \
            rm -f "$file" && \
        true; fi && \
    true; done && \
    rm -f /filelist.txt && \
    printf '%s\n%s\n%s\n' '#!/bin/sh' 'set -euf' 'node /app/dist/cli.js $@' >/usr/bin/azminifier && \
    chmod a+x /usr/bin/azminifier && \
    useradd --create-home --no-log-init --shell /bin/sh --user-group --system azminifier
COPY --from=runtime--ruby--rbenv--final /.rbenv/versions /.rbenv/versions
COPY --from=prefinal /app/ /app/
ENV NODE_OPTIONS=--dns-result-order=ipv4first \
    PYTHONDONTWRITEBYTECODE=1
USER azminifier
WORKDIR /project
ENTRYPOINT ["azminifier"]
CMD []
