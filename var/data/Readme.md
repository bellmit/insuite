# Dummy Data

## How to Load ALL

1. Change directories into the var/data directory

2. Execute the following command

    ./import_data.sh

3.  Type 'y' when prompted.  If the command was successfully
carried out, you will see output similar to the following for
each script carried out.

MongoDB shell version: 2.2.1
connecting to: test
...


## How to Load

Create dummy Identities

    mongo identity-create.js

Create dummy Patient(s)

    mongo patient-create.js

Create dummy Calendar(s)

    mongo calendar-create.js

Create dummy Customers(s) -- needed on the DC-PRC

    mongo 0 customer-create.js


## Multi-tenancy
NB
The above scripts set the DB to '0' and '2777' writing thus data that can be used
in all single-tenancy systems, as well as multi-tenant systems that are running in
context  development:environment.

## How to Delete a certain collection
Delete patients collection in DB 2777
WARNING THERE IS NO PROMPT -- ALL PATIENT DATA WILL BE DELETED!
   mongo --eval "db.patients.drop();" 2777

## How to Delete a whole DB
Delete DB 2777, the default tenant DB
   mongo
   use 2777
   db.dropDatabase()


## Legacy Data Script:

DO NOT USE this.

   mongoimport -d dcpatient -c patients -f PATFNAME,PATLASTNAME,PATDOB,PATSEX,PATSTREET,PATCASENO,PATINSURE,PATDR,PATMVZF  ./loadPatients.json.txt
