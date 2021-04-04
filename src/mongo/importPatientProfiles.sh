#! /usr/bin/env bash

set -e

# ----------
# script to import all images from a directory to MongoDB
# ----------

DB_PWD=
DB_USER=
DB_PORT=27023
DB_NAME=0
DIR_NAME=$HOME/Downloads/unsamples

# DECLARATIONS

declare -A patientMap
declare -A profileImageMap

# runs the command given and returns the value for the desired key (field)
# e.g. command=db.patients.find("8238e9j8...") key="patientNo" will only return the patientNo for the desired patient
function runDb {
  value= # to return response value
  command="$1"
  key="$2"
  sep="\""
  cutIndex=4
  # if it is an insert|deleteone command we want to return the nInsert|deletedCount
  # and this $sep will make that happen
  if [ "$key" == "nInserted" ] || [ "$key" == "deletedCount" ]
    then
      sep=" "
      if [ "$key" == "deletedCount" ]
        then
          cutIndex=7
      fi
    else
      command="$1.forEach(printjson)"
  fi
  if [ $DB_USER ] && [ $DB_PWD ]
    then
      value=$(mongo --port "$DB_PORT" -u $DB_USER -p "$DB_PWD" --eval "$command" "$DB_NAME" | grep "$key" | cut -d "$sep" -f "$cutIndex" )
    else
      value=$(mongo --port "$DB_PORT" --eval "$command" "$DB_NAME" | grep "$key" | cut -d "$sep" -f "$cutIndex" )
  fi
  echo "$value"
}

# Obtains the patient ID from the database
# takes $1=patientNo
function getPatientIdFromNo {
  fpcommand="db.patients.find({\"patientNo\":\"$1\"},{\"_id\":1})"
  patientId=$(runDb "$fpcommand" "_id")
  echo "$patientId"
}

# Obtains the patient number from the database
# takes $1=patientId
function getPatientNoFromId {
  fpcommand="db.patients.find(\"$1\",{\"_id\":0,\"patientNo\":1})"
  patientNo=$(runDb "$fpcommand" "patientNo")
  echo "$patientNo"
}

# returns all patient IDs from the database
function getAllPatientIds {
  facommand="db.patients.find({},{\"_id\":1})"
  patientIds=$(runDb "$facommand" "_id")
  echo "$patientIds"
}

# populates the patientMap as patientMap[patient._id]=patientNo
function populatePatientMap {
  patientIdList=$1
  _counter=0 # TODO remove after debug
  for patientId in $patientIdList
  do
    if [ $_counter -gt 2000 ]; then break; fi # TODO remove after debug
    patientNo=$(getPatientNoFromId "$patientId")
    patientMap["$patientId"]="$patientNo"
    _counter=$(( _counter + 1 )) # TODO remove after debug
  done
}

# map the image location to
function populateProfileImageMap {
  for patientId in "${!patientMap[@]}"
  do
    _imagePath=$(findPatientProfileImage "${patientMap[$patientId]}")
    if [ "$_imagePath" ]
      then
        profileImageMap["$patientId"]="$_imagePath"
    fi
  done
}

function randomNum {
  echo $((RANDOM % 10000))
}

# not used anymore ?
function createMediaId {
  timestamp=$(date +%s)
  echo "upload$timestamp$(randomNum)$(randomNum)"
}

function findPatientProfileImage {
  patientNo=$1
  path= # leave empty
  for file in "$DIR_NAME"/*.jpg
  do
    filecodename=$(echo "${file%.*}" | cut -d '/' -f6)
    if [ "$filecodename" == "$patientNo" ]
      then
        path="$file"
        break
    fi
  done
  echo "$path"
}

function checkIfMediaExists {
  ccommand="db.media.find({\"ownerId\":\"$1\",\"ownerCollection\":\"patient\",\"label\":\"logo\"},{\"_id\":1})"
  _mediaId=$(runDb "$ccommand" "_id")
  echo "$_mediaId"
}

# obtains the image dimensions using ImageMagick's "identify"
function getMediaDimensions {
  widthxHeight=$(identify "$1" | cut -d " " -f3)
  echo "${widthxHeight//[x]/,}"
}

function destroyMedia {
  dcommand="db.media.deleteOne({\"_id\":ObjectId(\"$1\"),\"ownerId\":\"$2\"})"
  res=$(runDb "$dcommand" "deletedCount")
  echo "$res"
}

# creates a media document
# returns the new media object
function createNewMedia {
  _mediaId= # empty for now
  patId="$1"
  imgPath="$2"
  width=$(echo "$3" | cut -d "," -f1)
  height=$(echo "$3" | cut -d "," -f2)
  name=$(basename "$imgPath")
  descrDate=$(date -u "+%A %B %d %Y %H:%M:%S GMT +00:00")
  mediaObject="{
    \"ownerId\":\"$patId\",
    \"ownerCollection\":\"patient\",
    \"widthPx\":\"$width\",
    \"heightPx\":\"$height\",
    \"origFilename\":\"$imgPath\",
    \"name\":\"$name\",
    \"descr\":\"Read from disk on $descrDate\",
    \"source\":\"\",
    \"label\":\"logo\",
    \"gridfs\":true,
    \"binary\":true,
    \"mime\":\"IMAGE_JPEG\"
  }"
  echo "$mediaObject"
}

# inserts a media document
function insertNewMedia {
  mediaObject="$1"
  icommand="db.media.insert($mediaObject)"
  res=$(runDb "$icommand" "nInserted")
  echo "$res"
}

# returns the media id from patientId and imagePath
function getMediaId {
  _mediaId= # empty for now
  patId="$1"
  imgPath="$2"
  name=$(basename "$imgPath")
  if [ "$res" == 1 ]
    then
      _mediaId=$(runDb "db.media.find({\"ownerId\":\"$patId\",\"ownerCollection\":\"patient\",\"name\":\"$name\"})" "_id")
  fi
  echo "$_mediaId"
}

# copies image and renames it within the new media directory
function copyAndRenameImage {
  mId="$1"
  currentPath="$2"
  newPath="$3/$mId.jpg"
  cp "$currentPath" "$newPath"
  echo "$newPath"
}

# uploads the file to mongo via gridFS
function uploadToGridFS {
  filePath=$1
  fileName=$2
  if [ $DB_USER ] && [ $DB_PWD ]
    then
      _uploadResponse=$(mongofiles --port "$DB_PORT" -d "$DB_NAME" -u "$DB_USER" -p "$DB_PWD" --authenticationDatabase "admin" -l "$filePath" put "$fileName")
    else
      _uploadResponse=$(mongofiles --port "$DB_PORT" -d "$DB_NAME" --authenticationDatabase "admin" -l "$filePath" put "$fileName")
  fi
  echo "$_uploadResponse"
}

# MAIN OPERATIONS

echo -e "\nQuerying database for patient IDs (this may take a few minutes)..."

# get all patient ids
patientIds=$(getAllPatientIds)

# populate patientMap as array[patient._id]=patientNo
populatePatientMap "$patientIds"
echo -e "√ Found ${#patientMap[@]} patient IDs in the databse"

# populate patientImageMap as array[patient._id]=/path/to/image.jpg
populateProfileImageMap
echo -e "√ Found ${#profileImageMap[@]} patient images in $DIR_NAME"

# create new directory to store images with media id
MEDIA_DIR_NAME="$DIR_NAME/media-ready"
if [ ! -d "$MEDIA_DIR_NAME" ]
  then
    mkdir -p "$MEDIA_DIR_NAME"
    echo -e "√ Created new directory $MEDIA_DIR_NAME to store images as <media._id>.jpg"
  else
    echo -e "√ $MEDIA_DIR_NAME already exists, this will be used to store images as <media._id>.jpg"
fi

overrideExistingMedia="true" # to override any existing media
loopCounter=0
mediaUploadCounter=0

# loop through all images and get dimensions using ImageMagick
# check if media object already exists and, if not, create one and keep media._id
# create a copy of the image renaming it as [media._id].jpg
# put file in gridfs
for patientId in "${!profileImageMap[@]}"
do
  # --- TODO remove after debug START
  if [ $loopCounter -gt 10 ]
    then
      exit 1
  fi
  # --- remove after debug END
  imagePath="${profileImageMap[$patientId]}"
  existingMedia=$(checkIfMediaExists "$patientId")

  # ask user whether to override existing media
  if [ "$existingMedia" ] && [ ! "$overrideExistingMedia" ]
    then
      echo -e "\nPatient already has existing media!"
      read -p "Do you wish to override all existing media for all patients (y/n)? " -n 1 -r
      echo
      if [[ $REPLY =~ ^[Yy]$ ]]
        then
          read -p "Are you sure (y/n)?" -n 1 -r
          echo
          if [[ $REPLY =~ ^[Yy]$ ]]
            then
              overrideExistingMedia="true"
            else
              overrideExistingMedia="false"
          fi
        else
          overrideExistingMedia="false"
      fi
  fi

  # create documents if no media exists or user wants to override
  if [ ! "$existingMedia" ] || [ "$overrideExistingMedia" == "true" ]
    then
      printf "Creating new media document for patient... "
      dimensions=$(getMediaDimensions "$imagePath")
      if [ "$existingMedia" ]
        then
          deletedCount=$(destroyMedia "$existingMedia" "$patientId")
          if [ "$deletedCount" == "0" ]
            then
              printf "%s" "failed to delete ($deletedCount) existing media with id $existingMedia... "
            else
              printf "%s" "deleted ($deletedCount) existing media with id $existingMedia... "
          fi
      fi
      mediaObj=$(createNewMedia "$patientId" "$imagePath" "$dimensions")
      printf "%s" "inserting new media object: $mediaObj... "
      res=$(insertNewMedia "$mediaObj")
      if [ "$res" == 1 ]
        then
          printf "%s" "√ new media document inserted successfully... "
          mediaId=$(getMediaId "$patientId" "$imagePath")
      fi
#      mediaId=$(createNewMedia "$patientId" "$imagePath" "$dimensions")
      if [ "$mediaId" ]
        then
          echo "media created!"
          newPath=$(copyAndRenameImage "$mediaId" "$imagePath" "$MEDIA_DIR_NAME")
          uploadResponse=$(uploadToGridFS "$newPath" "$mediaId")
          # uploadResponse isn't being logged yet
          echo -e "√ Media uploaded to gridFS from $newPath\n"
          mediaUploadCounter=$(( mediaUploadCounter + 1 ))
        else
          echo "X Failed to create media for image $imagePath"
      fi
  fi
  loopCounter=$(( loopCounter + 1 )) # TODO remove after debug
done

echo "√ Done. Matched and uploaded $mediaUploadCounter profile pictures out of ${#patientMap[@]} patients"
