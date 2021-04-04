/**
 * User: pi
 * Date: 10/03/16  15:25
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */
/*global Y, should, describe, it*/

const
    {formatPromiseResult} = require( 'dc-core' ).utils,
    {wait} = require( '../utils' ),
    user = Y.doccirrus.auth.getSUForLocal();

function getPhycisianBaseContactData( data = {} ) {
    let
        baseContact = {
            "baseContactType": "PHYSICIAN",
            "expertise": "GP",
            "officialNo": "999999900",
            "bsnrs": [
                "317400200"
            ],
            "lastname": "test",
            "firstname": "guy",
            "talk": "MR"
        };
    return Object.assign( {}, baseContact, data );
}

function getInstitutionBaseContactData( data ) {
    let
        baseContact = {
            "baseContactType": "INSTITUTION",
            "institutionName": "company",
            "institutionType": "HOSPICE"
        };
    return Object.assign( {}, baseContact, data );
}

function getFirstVendorBaseContactData( data ) {
    let
        baseContact = {
            "baseContactType": "VENDOR",
            "institutionName": "Lieferant 1",
            "institutionType": "OTHER",
            "isMainSupplier": true
        };
    return Object.assign( {}, baseContact, data );
}

function getSecondVendorBaseContactData( data ) {
    let
        baseContact = {
            "baseContactType": "VENDOR",
            "institutionName": "Lieferant 2",
            "institutionType": "OTHER",
            "isMainSupplier": true
        };
    return Object.assign( {}, baseContact, data );
}

describe( 'Basecontact test', function() {
    let
        model = 'basecontact';
    describe( '1. Link contact during creation', function() {
        let
            firstContact,
            secondContact;
        it( '1.1. Should be possible to create base contact without contacts. first contact.', function( callback ) {
            let
                data = getPhycisianBaseContactData();
            Y.doccirrus.mongodb.runDb( {
                user,
                model,
                action: 'post',
                fields: Object.keys( data ),
                data: Y.doccirrus.filters.cleanDbObject( data )
            }, ( err, results ) => {
                should.not.exist( err );
                should.exist( results );
                results.should.be.an( 'array' );
                results.should.have.lengthOf( 1 );
                [firstContact] = results;
                callback();
            } );
        } );
        it( '1.2. Should be possible to create base contact with links to another contact via contacts field. second contact.', function( callback ) {
            let
                data = getInstitutionBaseContactData( {
                    contacts: [firstContact]
                } );
            Y.doccirrus.mongodb.runDb( {
                user,
                model,
                action: 'post',
                fields: Object.keys( data ),
                data: Y.doccirrus.filters.cleanDbObject( data )
            }, ( err, results ) => {
                should.not.exist( err );
                should.exist( results );
                results.should.be.an( 'array' );
                results.should.have.lengthOf( 1 );
                [secondContact] = results;
                callback();
            } );
        } );
        it( '1.3. After second contact linked first contact, first contact should also got link to second contact.', async function() {
            let error, results;
            await wait( this, 300 );
            [error, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model,
                action: 'get',
                query: {
                    _id: firstContact
                },
                options: {
                    lean: true,
                    select: {
                        contacts: 1
                    }
                }
            } ) );
            should.not.exist( error );
            should.exist( results );
            results.should.be.an( 'array' );
            results.should.have.lengthOf( 1 );
            results[0].contacts.should.be.an( 'array' );
            results[0].contacts.map( item => item.toString() ).should.include( secondContact );
        } );
        it( '1.4. Should be possible to unlink second contact from first contact.', function( callback ) {
            Y.doccirrus.mongodb.runDb( {
                user,
                model,
                action: 'put',
                fields: 'contacts',
                data: Y.doccirrus.filters.cleanDbObject( {contacts: []} ),
                query: {
                    _id: firstContact
                }
            }, ( err ) => {
                should.not.exist( err );
                callback();
            } );
        } );
        it( '1.5. After first contact unlinked second contact, second contact should NOT have a link to first contact.', async function() {
            let error, results;
            await wait( this, 300 );
            [error, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model,
                action: 'get',
                query: {
                    _id: secondContact
                },
                options: {
                    lean: true,
                    select: {
                        contacts: 1
                    }
                }
            } ) );
            should.not.exist( error );
            should.exist( results );
            results.should.be.an( 'array' );
            results.should.have.lengthOf( 1 );
            results[0].contacts.should.be.an( 'array' );
            results[0].contacts.should.have.lengthOf( 0 );
        } );
    } );
    describe( '2. Link contact during updating', function() {
        let
            firstContact,
            secondContact;
        it( '2.1. Should be possible to create physician base contact without contacts. first contact.', function( callback ) {
            let
                data = getPhycisianBaseContactData();
            Y.doccirrus.mongodb.runDb( {
                user,
                model,
                action: 'post',
                fields: Object.keys( data ),
                data: Y.doccirrus.filters.cleanDbObject( data )
            }, ( err, results ) => {
                should.not.exist( err );
                should.exist( results );
                results.should.be.an( 'array' );
                results.should.have.lengthOf( 1 );
                [firstContact] = results;
                callback();
            } );
        } );
        it( '2.2.  Should be possible to create institution base contact without contact. second contact.', function( callback ) {
            let
                data = getInstitutionBaseContactData();
            Y.doccirrus.mongodb.runDb( {
                user,
                model,
                action: 'post',
                fields: Object.keys( data ),
                data: Y.doccirrus.filters.cleanDbObject( data )
            }, ( err, results ) => {
                should.not.exist( err );
                should.exist( results );
                results.should.be.an( 'array' );
                results.should.have.lengthOf( 1 );
                [secondContact] = results;
                callback();
            } );
        } );
        it( '2.2.  Should be possible to link second contact during first contact update.', function( callback ) {
            let
                data = {
                    contacts: [secondContact]
                };
            Y.doccirrus.mongodb.runDb( {
                user,
                model,
                action: 'put',
                fields: 'contacts',
                data: Y.doccirrus.filters.cleanDbObject( data ),
                query: {
                    _id: firstContact
                }
            }, ( err ) => {
                should.not.exist( err );
                callback();
            } );
        } );
        it( '2.3. After first contact linked second contact, second contact should also got link to first contact.', async function() {
            let error, results;
            await wait( this, 300 );
            [error, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model,
                action: 'get',
                query: {
                    _id: secondContact
                },
                options: {
                    lean: true,
                    select: {
                        contacts: 1
                    }
                }
            } ) );
            should.not.exist( error );
            should.exist( results );
            results.should.be.an( 'array' );
            results.should.have.lengthOf( 1 );
            results[0].contacts.should.be.an( 'array' );
            results[0].contacts.map( item => item.toString() ).should.include( firstContact );
        } );

        it( '2.4. Should be possible to unlink first contact from second contact.', function( callback ) {
            Y.doccirrus.mongodb.runDb( {
                user,
                model,
                action: 'put',
                fields: 'contacts',
                data: Y.doccirrus.filters.cleanDbObject( {contacts: []} ),
                query: {
                    _id: secondContact
                }
            }, ( err ) => {
                should.not.exist( err );
                callback();
            } );
        } );
        it( '2.5. After second contact unlinked first contact, first contact should NOT have a link to second contact.', async function() {
            let error, results;
            await wait( this, 300 );
            [error, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model,
                action: 'get',
                query: {
                    _id: firstContact
                },
                options: {
                    lean: true,
                    select: {
                        contacts: 1
                    }
                }
            } ) );
            should.not.exist( error );
            should.exist( results );
            results.should.be.an( 'array' );
            results.should.have.lengthOf( 1 );
            results[0].contacts.should.be.an( 'array' );
            results[0].contacts.should.have.lengthOf( 0 );
        } );
    } );
    describe( '3. Update existingMainSuppliers during creation - basecontatc-process.server', function() {
        let
            firstSupplier,
            secondSupplier;
        it( '3.1. Should be possible to create first supplier with isMainSupplier: true.', async function() {
            let
                error,
                results,
                data = getFirstVendorBaseContactData();

            [error, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model,
                action: 'post',
                fields: Object.keys( data ),
                data: Y.doccirrus.filters.cleanDbObject( data )
            } ) );
            should.not.exist( error );
            should.exist( results );
            results.should.be.an( 'array' );
            results.should.have.lengthOf( 1 );
            [firstSupplier] = results;
        } );
        it( '3.2. The first supplier should have mainSupplier: true.', async function() {
            let error,
                results;

            [error, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model,
                action: 'get',
                query: {
                    _id: firstSupplier
                },
                options: {
                    lean: true,
                    select: {
                        isMainSupplier: 1
                    }
                }
            } ) );
            should.not.exist( error );
            should.exist( results );
            results.should.be.an( 'array' );
            results.should.have.lengthOf( 1 );
            results[0].isMainSupplier.should.be.a( 'boolean' );
            results[0].isMainSupplier.should.equal( true );
        } );
        it( '3.3. Should be possible to create second mainSupplier.', async function() {
            let data = getSecondVendorBaseContactData();
            let error,
                results;
            [error, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model,
                action: 'post',
                fields: Object.keys( data ),
                data: Y.doccirrus.filters.cleanDbObject( data )
            } ) );
            should.not.exist( error );
            should.exist( results );
            results.should.be.an( 'array' );
            results.should.have.lengthOf( 1 );
            [secondSupplier] = results;
        } );
        it( '3.4. The second supplier should have mainSupplier: true.', async function() {
            let error, results;
            [error, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model,
                action: 'get',
                query: {
                    _id: secondSupplier
                },
                options: {
                    lean: true,
                    select: {
                        isMainSupplier: 1
                    }
                }
            } ) );
            should.not.exist( error );
            should.exist( results );
            results.should.be.an( 'array' );
            results.should.have.lengthOf( 1 );
            results[0].isMainSupplier.should.be.a( 'boolean' );
            results[0].isMainSupplier.should.equal( true );
        } );
        it( '3.5. The first Supplier should now have mainSupplier: false.', async function() {
            let error, results;
            [error, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model,
                action: 'get',
                query: {
                    _id: firstSupplier
                },
                options: {
                    lean: true,
                    select: {
                        isMainSupplier: 1
                    }
                }
            } ) );
            should.not.exist( error );
            should.exist( results );
            results.should.be.an( 'array' );
            results.should.have.lengthOf( 1 );
            results[0].isMainSupplier.should.be.a( 'boolean' );
            results[0].isMainSupplier.should.equal( false );
        } );
        it( '3.6. Should be possible to update first supplier and set mainSupplier to true again.', async function() {
            let error;
            [error] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model,
                action: 'put',
                fields: 'isMainSupplier',
                data: Y.doccirrus.filters.cleanDbObject( {isMainSupplier: true} ),
                query: {
                    _id: firstSupplier
                }
            } ) );
            should.not.exist( error );
        } );
        it( '3.7. The first supplier should have mainSupplier: true.', async function() {
            let error, results;
            [error, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model,
                action: 'get',
                query: {
                    _id: firstSupplier
                },
                options: {
                    lean: true,
                    select: {
                        isMainSupplier: 1
                    }
                }
            } ) );
            should.not.exist( error );
            should.exist( results );
            results.should.be.an( 'array' );
            results.should.have.lengthOf( 1 );
            results[0].isMainSupplier.should.be.a( 'boolean' );
            results[0].isMainSupplier.should.equal( true );
        } );
        it( '3.8. The second supplier should now have mainSupplier: false.', async function() {
            let error, results;
            [error, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model,
                action: 'get',
                query: {
                    _id: secondSupplier
                },
                options: {
                    lean: true,
                    select: {
                        isMainSupplier: 1
                    }
                }
            } ) );
            should.not.exist( error );
            should.exist( results );
            results.should.be.an( 'array' );
            results.should.have.lengthOf( 1 );
            results[0].isMainSupplier.should.be.a( 'boolean' );
            results[0].isMainSupplier.should.equal( false );
        } );
    } );
} );
