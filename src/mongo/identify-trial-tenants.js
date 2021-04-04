/**
 * User: rrrw
 * Date: 23/02/2016  11:25 AM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*globals db*/
/* on DCPRC */
db.companies.find({"prodServices.config.key":"isTemplate","prodServices.config.value":"true"});