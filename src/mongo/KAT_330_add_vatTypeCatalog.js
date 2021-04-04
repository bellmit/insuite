/* global db:true */
print( '==== KAT-330: Extend instock items with vatTypeCatalog value ====' );
db = db.getSiblingDB( "0" );
let count = 0;
const instockTotal = db.instocks.find( {} ).count();
db.instocks.find( {} ).forEach( stockItem => {
    const catalogItem = db.medicationscatalogs.findOne( {phPZN: stockItem.phPZN} );
    if( catalogItem ) {
        const vatType = catalogItem.vatType;
        const result = db.instocks.update( {phPZN: stockItem.phPZN}, {
            $set: {
                vatTypeCatalog: catalogItem.vatType,
                vatType: catalogItem.vatType,
                vat: vatType === 0 ? 1003 : parseFloat( '100' + vatType.toString() )
            }
        } );
        count += result.nModified;
    }

} );

print( '==== KAT-330: Extended ' + count + ' instock items (from ' + instockTotal + ' instock total) with vatTypeCatalog value ====' );
