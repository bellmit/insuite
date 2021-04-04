/**
 * User: dcdev
 * Date: 11/23/20  9:56 AM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/* global db:true */
print( '==== Remove invoiceLogId for Medidata rejected invoices KAT-210 ====' );
db = db.getSiblingDB( "0" );

const query = {
    actType: 'INVOICEREF',
    medidataRejected: true
};
const data = {
    $unset: {
        invoiceLogId: 1,
        invoiceLogType: 1
    }
};
const options = {multi: true};
const result = db.activities.update( query, data, options );
print( 'Remove invoiceLogId result: \n' );
printjson( result );
print( '\n==== Remove invoiceLogId for Medidata rejected invoices FINISHED! ====' );