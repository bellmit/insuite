/**
 * User: dcdev
 * Date: 5/8/17  11:58 AM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global Y, should, it, describe */

const user = Y.doccirrus.auth.getSUForLocal();

let
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    company = {
        communications: [],
        coname: 'TestData',
        cotype: 'ARZTPRAXIS',
        countryMode: [mochaUtils.getCountryMode()],
        addresses: [
            {
                street: 'Strasse',
                houseno: '',
                zip: '11111',
                city: 'Stadt',
                kind: 'OFFICIAL',
                country: 'Deutschland',
                countryCode: 'D',
                addon: ''
            }],
        customerNo: null,
        prodServices: [
            {ps: 'NEWSLETTER', config: []},
            {ps: 'VPRC', config: [{"key": "isTemplate", "value": false}]}],
        licenseScope: [
            {
                specialModules: [],
                baseSystemLevel: 'enterprise',
                baseServices: ["inCase", "inTime", "inForm", "inVoice", "inPort"],
                additionalServices: ["inTouch", "inScribe", "inScan", "inSight", "inOut", "inBackup"],
                supportLevel: 'premium'
            }],
        tenants: []
    },
    contact = {
        confirmed: false,
        firstname: 'ContactName',
        dob: '1995-12-08T23:00:00.000Z',
        title: '',
        nameaffix: '',
        middlename: '',
        fk3120: '',
        lastname: 'ContactLastName',
        accounts: [],
        communications: [
            {
                type: 'EMAILJOB',
                value: 'email@example.com',
                signaling: true,
                confirmed: false,
                confirmNeeded: false
            }],
        addresses: [],
        talk: 'MR'
    },
    supportContact = {
        baseContactType: 'SUPPORT',
        addresses: [],
        communications: [],
        talk: 'MR',
        title: '',
        firstname: 'Vorname',
        lastname: 'Nachname',
        institutionType: 'OTHER',
        companyName: 'TestFirma'
    },
    data = {
        company: company,
        contact: contact,
        supportContact: supportContact,
        automaticCustomerNo: true
    },
    companyId,
    contactId,
    supportContactId;

describe( 'Tenant-api test.', () => {

    describe( '0. Setup db.', function() {
        it( 'cleans db', function( done ) {
            this.timeout( 20000 );
            mochaUtils.cleanDB( {user}, function( err ) {
                should.not.exist( err );
                done();
            } );
        } );

    } );

    describe( '1. Create tenant', function() {

        it( 'Makes "post" call', function( done ) {
            Y.doccirrus.api.tenant.post( {
                user: user,
                data: data,
                callback: function( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.be.an( 'Object' );
                    companyId = result.companyId;
                    contactId = result.contactId;
                    supportContactId = result.supportId;
                    done();
                }
            } );
        } );

    } );

    describe( '2. Update tenant', function() {
        it( 'Makes "put" call', function( done ) {

            data.company.coname = "UpdatedTestData";
            data.contact.firstname = "UpdatedContactName";
            data.supportContact.firstname = "UpdatedVorname";

            data.supportContact._id = supportContactId;
            data.contact._id = contactId;

            Y.doccirrus.api.tenant.put( {
                user: user,
                query: {_id: companyId},
                forTest: true,
                data: data,
                callback: function( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.be.an( 'array' ).which.has.lengthOf( 3 );
                    result[0].coname.should.equal( "UpdatedTestData" );
                    result[1].firstname.should.equal( "UpdatedContactName" );
                    result[2].firstname.should.equal( "UpdatedVorname" );
                    done();
                }
            } );
        } );

    } );
    describe( '3. Delete tenant', function() {
        it( 'Make "delete" call', function( done ) {
            Y.doccirrus.api.tenant.delete( {
                user: user,
                query: {_id: companyId},
                callback: function( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.be.an( 'Object' ).that.have.property( '_id' );
                    done();
                }
            } );
        } );
    } );

} );