#!/bin/bash

#
# example:
# "dc-core" project contains "lib" folder
# current folder contains "dc-insuite"
# run command: dc-insuite/src/git-scripts/update-content.sh --project dc-core --target ./test-dc-core --source ./lib/
# effect: current folder contains "test-dc-core" folder, which contains same content as "lib" folder of "dc-core" project
#
# installed in crontab, as follows:
#
# MAILTO=rw@doc-cirrus.com
# PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
# */5 * * * * /var/lib/prc/src/js/git/update-content.sh --target /var/lib/prc/mojits/PfITASVSplitterMojit --source . --project ext-partner-pfit/pfit-asv --branch test

gitHost="git@gitlab.intra.doc-cirrus.com"

function displayHelp {
  echo
  echo "Usage: $0 --target <target path> --source <source path> --project <project> [--branch <branch>]";
  echo
  echo "The following happens:"
  echo "1) The given project is checked out."
  echo "2) The source content of the project is copied into the target"
  echo "default branch = 'master'"
  echo
  exit 0
}

# process options
while [[ $# -ge 1 ]]
do
key="$1"
shift
case "$key" in
    --project)
      project="$1"
      shift
      ;;
    --branch)
      branch="$1"
      shift
      ;;
    --target)
      target="$1"
      shift
      ;;
    --source)
      source="$1"
      shift
      ;;
    *)
      # unknown
    ;;
esac
done

if [ -z "$project" -o -z "$target" -o -z "$source" ]; then
  displayHelp
fi

projectName="$(basename $project)"
tmpDir="./tmp-$projectName"
sourcePath="$tmpDir/$source"

if [[ "$target" == "/" ]]; then
    echo "bad target path: $target"
    exit 0;
fi

# easy switching group context
if [[ "$project" == *\/* ]]; then
  gitBase="$gitHost:$(dirname $project)"
  project=$(basename $project)
else
  gitBase="$gitHost:dev"
fi

if [ -z "$branch" ]; then
    branch="master"
fi

gitRepo="$gitBase/$project.git"

# can remove server dir by mistake
#echo rm -rf $target
rm -rf $target
#echo mkdir -p $target
mkdir -p $target
#echo mkdir -p $tmpDir
mkdir -p $tmpDir

#echo "git archive --format=tar --remote=$gitRepo $branch | tar -xf - -C $tmpDir/"
git archive --format=tar --remote=$gitRepo $branch | tar -xf - -C $tmpDir/

#echo cp -r $sourcePath $target
cp -r $sourcePath $target
#echo rm -rf $tmpDir
rm -rf $tmpDir
