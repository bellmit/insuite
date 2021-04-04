#! /bin/bash

set -e

# ----------
# script to import all images from a directory to MongoDB
# ----------

DB_USER=
DB_PWD=
DB_PORT=27023
DB_NAME=0
DIR_NAME=$HOME/Downloads/unsamples
BASE_URL=http://prc.dev.dc

read -p "Enter PRC username: " username
read -p "Enter PRC password: " password

# Obtains the patient ID from the database
# takes $1=patientNo
function getPatientId {
  if [ $DB_USER ] && [ $DB_PWD ]
    then
      patientId=$(mongo --port "$DB_PORT" -u "$DB_USER" -p "$DB_PWD" --eval "db.patients.find({\"patientNo\":\"$1\"},{\"_id\":1}).pretty().shellPrint()" "$DB_NAME" | grep "_id" | cut -d '"' -f 4 )
    else
      patientId=$(mongo --port "$DB_PORT" --eval "db.patients.find({\"patientNo\":\"$1\"},{\"_id\":1}).pretty().shellPrint()" "$DB_NAME" | grep "_id" | cut -d '"' -f 4 )
  fi
  echo "$patientId"
}

function randomNum {
  echo $((RANDOM % 10000))
}

function createMediaId {
  timestamp=$(date +%s)
  num=$(randomNum)
  echo "upload$timestamp$num"
}

# takes $1=patientId $2=jpgBase64 $3=fileName
function createData {
  id=$(createMediaId)
  echo "{\"fileName\":\"$3\",\"id\":\"$id\",\"label\":\"logo\",\"name\":\"$3\",\"ownerCollection\":\"patient\",\"ownerId\":\"$1\",\"source\":\"$2\"}"
}

# takes $1=patientId $2=jpgBase64 $3=fileName
function uploadToApi {
  data=$(createData "$1" "$2" "$3")
  echo -e "\tUploading to server..."
  echo "$data"
#  curl -X POST "$BASE_URL/1/media/:upload64" -u "$username:$password" -d "$data"
}

count=0
failed=0

# loop through all images and upload to server to handle
for file in "$DIR_NAME"/*.jpg
do
  echo "Adding $file"
  patientNo=$(echo "${file%.*}" | cut -d '/' -f6)
  jpgBase64=$(convert "$file" | base64)
  patientId=$(getPatientId "$patientNo")

  if [ "$patientId" ]
    then
      uploadToApi "$patientId" "$jpgBase64" "$patientNo.jpg"
      count=$(( count + 1 ))
    else
      failed=$(( failed + 1 ))
  fi
done

if [ "$failed" -gt 0 ]
  then
    echo -e "\nFailed to add $failed images"
fi
echo "√ Finished - added $count images to database"
