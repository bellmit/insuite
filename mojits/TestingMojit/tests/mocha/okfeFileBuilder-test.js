/*global Y, it, describe, before, after */
const getTmpDir = Y.doccirrus.tempFileManager.get;
const createFileWriter = Y.doccirrus.edocFileWriter.createFileWriter;
const {readFile} = require( 'fs' ).promises;
const {join} = require( 'path' );
const user = Y.doccirrus.auth.getSUForLocal();
const filterxml = require( 'filterxml' );

function filterXmlFile( xml ) {
    return new Promise( ( resolve, reject ) => {
        filterxml( xml, ['x:version', 'x:data_target', 'x:id', 'x:set_id', 'x:guid', 'x:quarter', 'x:origination_dttm', 'x:modification_dttm', 'x:DokAbschlDat'], {x: 'urn:gba:sqg'}, function( err, xmlOut ) {
            if( err ) {
                reject( err );
            } else {
                resolve( xmlOut );
            }
        } );
    } );
}

describe( 'okfeFileBuilder', function mainDescribe() {
    [
        {
            type: 'ZKA',
            fixtureFileName: 'zka',
            description: 'that are valid'
        },
        {
            type: 'ZKA',
            fixtureFileName: 'zka-1',
            description: 'that have just all fields set'
        },
        {
            type: 'ZKH',
            fixtureFileName: 'zkh',
            description: 'that are valid'
        },
        {
            type: 'ZKH',
            fixtureFileName: 'zkh-1',
            description: 'that have just all fields set'
        },
        {
            type: 'ZKP',
            fixtureFileName: 'zkp',
            description: 'that are valid'
        },
        {
            type: 'ZKP',
            fixtureFileName: 'zkp-1',
            description: 'that have just all fields set'
        },
        {
            type: 'ZKZ',
            fixtureFileName: 'zkz',
            description: 'that are valid'
        },
        {
            type: 'ZKZ',
            fixtureFileName: 'zkz-1',
            description: 'that have just all fields set'
        }
    ].forEach( ( {type, fixtureFileName, description} ) => {
        describe( `Builds ${type} xml docs ${description}`, async function() {
            before( async function() {
                this.testFixture = require( `../fixtures/zervix/${fixtureFileName}` );
                const locationId = this.testFixture.context.location._id.toString();
                this.tempDir = await getTmpDir( user, 'okfe' );
                this.destination = join( this.tempDir.path, `'${type}'_${locationId}.xml` );

                const writer = createFileWriter( {
                    destination: this.destination,
                    user
                } );
                await Y.doccirrus.okfeFileBuilder.buildDocXml( {context: this.testFixture.context, writer} );
                const result = await readFile( this.destination, 'utf-8' );
                this.result = await filterXmlFile( result );
            } );

            after( async function() {
                await this.tempDir.done();
            } );

            it( `should equal`, async function returnParsedData() {
                const filtered = await filterXmlFile( this.testFixture.result );
                this.result.should.eql( filtered );
            } );

        } );

    } );

} );
