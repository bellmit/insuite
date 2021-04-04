/**
 * User: maximilian.kramp
 * Date: 2/18/21  6:50 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

db = db.getSiblingDB( "0" );

db.tmp_hciarticles.drop();
db.tmp_hcicodes.drop();
db.tmp_hciproduct_units.drop();
db.tmp_hcisubstances.drop();
db.tmp_hcicatalogs.drop();
db.tmp_hciproduct_substance_units.drop();
db.tmp_hciproducts.drop();

//force refresh of catalogs
db.admins.update( {_id: ObjectId( "000000000000000000000001" )}, {$set: {catalogsVersion: 0}} );