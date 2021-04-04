#! /usr/bin/env bash

set -e

scriptName="raml-doc.sh"
inspect=""
countryMode=""
force=""

function displayHelp {
  echo
  echo "Usage: $scriptName [OPTIONS]";
  echo
  echo "Options:"
  echo "  --inspect, --debug    Starts the RAML generator in inspect mode in order to debug the RAML generator"
  echo "  --force               Will generate the RAML docs without asking for user input (in case this is run automatically)"
  echo
  exit 0
}

function confirmContinue {
  echo -n "Do you wish to continue? [y/N] "
  read -rn 1 confirm
  if [ "$confirm" != "y" ]; then
    echo
    exit 1
  fi
  echo # newline
}

# ----------
# process options
# ----------

while [[ $# -gt 0 ]]; do
    key="$1"
    case "$key" in
    "--inspect" | "--debug")
        inspect="--inspect"
        shift
        ;;
    "--force")
        force="true"
        shift
        ;;
    "--help" | "-h")
        displayHelp
        shift # past value
        ;;
    *) # unknown option
        displayHelp
        shift              # past argument
        ;;
    esac
done

# ----------
# warning to avoid headaches
# ----------

currentBranch="$(git symbolic-ref --short -q HEAD)"

if [ -z "$force" ] && ! [ "$currentBranch" == "dev" ]
  then
    echo
    echo "You should be on DEV branch to regenerate RAML, to avoid headaches."
    echo "You can continue but please revert the automatically updated files."
    echo
    confirmContinue
fi

# ----------
# script to generate the RAML documentation and the HTML version
# ----------
RAML_DIR="$DC_ENV/dc-insuite/src/raml"

# ----------
# ---------------------------------create German RAML through insuite
# ----------
cd "$DC_ENV/dc-insuite"; node --experimental-specifier-resolution=node --experimental-modules server.js start 8000 --raml-doc --countryMode de --nofork --server-type prc --skipJadeCacheFull $inspect
echo "The countryMode is: German"

# ----------
# add custom functions
# ----------
echo "Adding customs functions to German RAML docs"
cd "$RAML_DIR"; cat appendix.raml >> dc-api-2-de.raml

# ----------
# check if the RAML generator left any undefined values
# ----------
if grep -q "[[:space:]]*undefined:$" dc-api-2-de.raml; then
    echo "Found undefined values in dc-api-2-de.raml - removing them."
    sed -i "" "/[[:space:]]*undefined:$/d" dc-api-2-de.raml
fi

# ----------
# convert RAML to HTML
# ----------
echo "Converting German RAML to HTML"
npx raml2html@3.0.1 dc-api-2-de.raml -o dc-api-de.html

# ----------
# copy docs to assets to make it available to clients
# ----------
echo "Copying the new docs to assets/de ..."
cp {dc-api-de.html,dc-api-2-de.raml,dc-schema-2-de.raml} "$DC_ENV/dc-insuite/assets/de/"
echo "Done with German Documentation"



# ----------
#-----------------------------------create Swiss RAML through insuite
# ----------
cd "$DC_ENV/dc-insuite"; node --experimental-specifier-resolution=node --experimental-modules server.js start 8000 --raml-doc --countryMode ch --nofork --server-type prc --skipJadeCacheFull $inspect
echo "The countryMode is: Swiss"

# ----------
# add custom functions
# ----------
echo "Adding customs functions to Swiss RAML docs"
cd "$RAML_DIR"; cat appendix.raml >> dc-api-2-ch.raml

# ----------
# check if the RAML generator left any undefined values
# ----------
if grep -q "[[:space:]]*undefined:$" dc-api-2-ch.raml; then
    echo "Found undefined values in dc-api-2-ch.raml - removing them."
    sed -i "" "/[[:space:]]*undefined:$/d" dc-api-2-ch.raml
fi

# ----------
# convert RAML to HTML
# ----------
echo "Converting Swiss RAML to HTML"
npx raml2html@3.0.1 dc-api-2-ch.raml -o dc-api-ch.html

# ----------
# copy docs to assets to make it available to clients
# ----------
echo "Copying the new docs to assets/ch ..."
cp {dc-api-ch.html,dc-api-2-ch.raml,dc-schema-2-ch.raml} "$DC_ENV/dc-insuite/assets/ch/"
echo "Done with Swiss Documentation"



# ----------
# copy the newest changelog.txt to assets
# ----------

# this shouldn't be needed if we follow proper protocol

cd "$DC_ENV/dc-insuite/autoload/RAML";

if [[ "$DC_ENV/dc-insuite/autoload/RAML/changelog.txt" -nt "$DC_ENV/dc-insuite/assets/changelog.txt" ]]
  then
    echo "Copying changelog from dc-insuite/autoload/RAML to assets"
    cp changelog.txt "$DC_ENV/dc-insuite/assets/"
  else
    echo "Copying changelog from assets to dc-insuite/autoload"
    cp "$DC_ENV/dc-insuite/assets/changelog.txt" .
fi

echo "√ Done."
exit 0

