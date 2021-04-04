#!/bin/bash

script="$(readlink -f "$0")"
scriptPath="$(dirname "$script")"

set -ex

nodeVersion="$(grep -Po '(?<="node": ")[^"]*' "${scriptPath}/../../package.json")"

cd ~ || echo "Cwd to home dir failed." && exit 1
curl -L -k "https://nodejs.org/dist/v$nodeVersion/node-v${nodeVersion}.tar.gz" | tar -xz -C "."

cd "node-v${nodeVersion}" || echo "Cwd to node build dir failed." && exit 1
CPPFLAGS=-D__STDC_FORMAT_MACROS
LDFLAGS=-lrt
export CPPFLAGS LDFLAGS
scl enable devtoolset-8 python27 ./configure
scl enable devtoolset-8 python27 "ARCH=x64 make -j$(nproc) binary"
unset CPPFLAGS LDFLAGS

echo "Now copy node-v${nodeVersion}-linux-x64.tar.xz to NAS /git-static/packages/nodejs/node-v${nodeVersion}-linux-x64.tar.xz.el6"
