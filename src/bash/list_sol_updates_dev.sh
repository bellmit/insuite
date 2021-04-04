#!/usr/bin/env bash

set +e

doccirrusPath="$1"
cd "$doccirrusPath" || exit

declare -a solUpdatesList

entryTemplate='{"name":"SOLNAME","packageName":"dc-insuite-sol-SOLNAME","version":"SOLVERSION"}'

function getLatestTag() {
  latestTagHash=$(git rev-list --tags --max-count=1)
  [ ! "$latestTagHash" ] && return 1
  git describe --tags --always "$latestTagHash" || echo "NA"
}

function join_by() {
  local IFS="$1"
  shift
  echo "$*"
}

solRepos=($(ls | grep 'dc-insuite-sol-'))

for solPath in "${solRepos[@]}"; do
  cd "$solPath" || continue
  solTag="$(getLatestTag)"
  if [ ! "$solTag" ] || [ -z "$solTag" ]; then
    cd ..
    continue
  fi
  solName="$(echo "$solPath" | sed -e "s/dc-insuite-sol-//")"
  newEntry=$(echo "$entryTemplate" | sed -e "s/SOLNAME/$solName/g" | sed -e "s/SOLVERSION/$solTag/")
  solUpdatesList=("${solUpdatesList[@]}" "$newEntry")
  cd ..
done

echo "{\"updateSols\":[$(join_by , "${solUpdatesList[@]}")]}"
