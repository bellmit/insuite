/**
 * User: do
 * Date: 09/01/18  11:28
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'lab-utils', function( Y, NAME ) {

        const
            moment = require( 'moment' ),
            Promise = require( 'bluebird' ),
            writeFile = Promise.promisify( require( 'fs' ).writeFile ),
            joinPaths = require( 'path' ).join,
            LDK_XPM_TMP_TYPE = 'pm-ldk',
            rearrangeArrayByType = Y.doccirrus.compareutils.rearrangeArrayByType,
            patientSchema = Y.doccirrus.schemas.patient.schema,
            ldt3PatientComparator = Y.doccirrus.compareutils.getComparator( {
                schema: patientSchema,
                whiteList: [
                    'title',
                    'firstname',
                    'nameaffix',
                    'fk3120',
                    'lastname',
                    'kbvDob',
                    'gender',
                    'insuranceStatus.0.type',
                    'insuranceStatus.0.insuranceNo',
                    'insuranceStatus.0.insuranceId',
                    'insuranceStatus.0.insuranceName',
                    'insuranceStatus.0.insuranceGrpId',
                    'insuranceStatus.0.costCarrierBillingSection',
                    'insuranceStatus.0.cardSwipe',
                    'insuranceStatus.0.fk4133',
                    'insuranceStatus.0.fk4110',
                    'insuranceStatus.0.insuranceKind',
                    'insuranceStatus.0.persGroup',
                    'insuranceStatus.0.dmp',
                    'insuranceStatus.0.locationFeatures',
                    'addresses.0.street',
                    'addresses.0.houseno',
                    'addresses.0.zip',
                    'addresses.0.city',
                    'addresses.0.postbox',
                    'addresses.0.kind',
                    'addresses.0.country',
                    'addresses.0.countryCode',
                    'addresses.0.addon'
                ]
            } ),
            countryMap = {};

        function init( callback ) {
            const runDb = Promise.promisify( Y.doccirrus.mongodb.runDb );
            const catalog = Y.doccirrus.api.catalog.getCatalogDescriptor(
                {
                    actType: '_CUSTOM',
                    short: 'SDCOUNTRIES'
                }, true );

            if( !catalog ) {
                throw Error( 'catalog descriptor not found' );
            }

            runDb( {
                user: Y.doccirrus.auth.getSUForLocal(),
                model: 'catalog',
                query: {
                    catalog: catalog.filename
                }
            } ).each( entry => {
                countryMap[entry.sign] = entry.country;
            } ).then( () => {
                Y.log( `stored country catalog`, 'debug', NAME );
                return callback();
            } ).catch( err => {
                Y.log( `could not init countryMap ${err && err.stack || err}`, 'error', NAME );
                return callback();
            } );
        }

        function getCountryByKbvCode( val ) {
            return countryMap[val];
        }

        function checkLdtFile( args ) {

            const
                now = moment(),
                {user, fileName, fileBuffer} = args;

            let tmpDir, filePath;

            return Promise.resolve().then( () => {
                return Y.doccirrus.tempFileManager.get( user, LDK_XPM_TMP_TYPE );
            } ).then( _tmpDir => {
                tmpDir = _tmpDir;
                Y.log( `got tmpDir ${tmpDir.path}`, 'debug', NAME );
                filePath = joinPaths( tmpDir.path, fileName || 'file.ldt' );
                Y.log( `write ldt file to temp directory ${filePath}`, 'debug', NAME );
                return writeFile( filePath, fileBuffer );
            } ).then( () => {
                let pm = Y.doccirrus.xpm.getPm( {
                    type: 'LDK',
                    quarter: now.quarter(),
                    year: now.year()
                } );

                Y.log( `execute ldk pm ${pm}`, 'debug', NAME );

                return pm.execute( {
                    input: filePath,
                    tmpDir: tmpDir.path,
                    parseAuditLog: 'XML',
                    additionalParams: {
                        pruef_modus: 'kbv'
                    },
                    configPath: 'Konfig/konfig.xml'
                } );
            } ).finally( () => {
                if( tmpDir ) {
                    Y.log( `clean tmpDir ${tmpDir.path}`, 'debug', NAME );
                    tmpDir.done();
                }
            } );

        }

        /**
         *  When receiving an LDT2 file, check for bad Andforderungs-ident sent by a specific lab, see SUP-13150
         *
         *  This is done after first parse of the file, before it is saved to the database
         *
         *  @param  {Object}    ldtJson
         */

        function replaceBadLabRequestId( ldtJson ) {
            const BAD_IDENTS = [ '9999999999P', '9999999999', '9999999999K' ];
            let i, rec, newId;

            //  only for LDT 2 files which have records
            if (
                !ldtJson.versionUsed ||
                !ldtJson.versionUsed.name ||
                'ldt20' !== ldtJson.versionUsed.name ||
                !ldtJson.records
            ) {
                return ldtJson;
            }

            for ( i = 0; i < ldtJson.records.length; i++ ) {
                rec = ldtJson.records[i];
                if ( -1 !== BAD_IDENTS.indexOf( rec.recordRequestId ) ) {
                    newId = rec.labReqNo ? `${rec.recordRequestId}__${rec.labReqNo}` : Y.doccirrus.comctl.getRandId();
                    Y.log( `Bad labRequestId found in LDT, replacing ${rec.recordRequestId} with ${newId}`, 'warn', NAME );
                    rec.recordRequestId = newId;
                }
            }

            return ldtJson;
        }

        function compareFindingDataWithPatientData( args ) {
            const
                {user, patientId, labLogId, findingJson} = args;

            let findingPatientData;

            return Promise.resolve().then( () => {

                if( !patientId ) {
                    throw Error( 'missing patientId' );
                }
                if( !labLogId ) {
                    throw Error( 'missing labLogId' );
                }

                if( !findingJson ) {
                    Y.log( `no lab finding passed to compareFindingDataWithPatientData`, 'debug', NAME );
                    return;
                }

                findingPatientData = Y.doccirrus.schemas.lablog.mapRecordPatientToDCPatient( findingJson, getCountryByKbvCode );

                if( !findingPatientData.firstname || !findingPatientData.lastname ) {
                    Y.log( `nothing to compare`, 'debug', NAME );
                    return;
                }
                return Promise.resolve( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'patient',
                    query: {_id: patientId}
                } ) ).get( 0 ).then( patient => {
                    if( !patient ) {
                        throw Error( `could not  find patient with id: ${patientId}` );
                    }
                    rearrangeArrayByType( patient, findingPatientData, 'insuranceStatus', 'type', ['PUBLIC', 'PRIVATE'] );
                    rearrangeArrayByType( patient, findingPatientData, 'addresses', 'kind', ['OFFICIAL', 'POSTBOX'] );
                    const
                        compareResult = ldt3PatientComparator.compare( patient, findingPatientData, {} );
                    if( 0 < compareResult.diffs ) {
                        // TODO: save diffs
                        Y.log( `detected diffs while comparing ldf finding patient data attach to patient with actual patient data: ${compareResult.diffs} diff`, 'info', NAME );
                    }

                    return compareResult;
                } );

            } ).catch( err => {
                Y.log( `could not compare lab finding with patient data: ${ err }`, 'error', NAME );
                throw err;
            } );
        }

        Y.namespace( 'doccirrus' ).labutils = {

            name: NAME,
            initLabUtils: init,
            checkLdtFile,
            compareFindingDataWithPatientData,
            replaceBadLabRequestId
        };
    },
    '0.0.1', {requires: ['tempdir-manager', 'xpm', 'lablog-schema', 'compareutils', 'patient-schema', 'catalog-api','dcmongodb']}
);

