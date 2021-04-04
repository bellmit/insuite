/*global YUI*/
/*jshint esnext:true */



YUI.add( 'SyncAux', function( Y, NAME ) {

    const
        dcCore = require( 'dc-core' ),
        formatPromiseResult = dcCore.utils.formatPromiseResult;

    /**
     * SyncAux
     * Update part of data in reporting entries when auxiliary entry change
     * @param {Object}          auxObj
     * @param {String}          modelName
     * @param {Object}          user
     * @constructor
     */
    function SyncAux( auxObj, modelName, user ) {
        this.user = user;
        this.auxObj = auxObj;
        this.mappedObj = {};
        this.modelName = modelName;
        this.idField = this.getIdField( modelName );
        this.mapperFnName = this.getMapperFnName( modelName );
    }

    /**
     * Map: modelName - name of fn in genericmapper-util.common.js
     * @type {{location: string, employee: string, patient: string}}
     */
    SyncAux.prototype.mappers = {
        location: 'getFormDataLocation',
        employee: 'getFormDataEmployee',
        patient: 'inSight2Patient',
        basecontact: 'getFormDataBasecontact',
        caseFolder: 'getFormDataCaseFolder',
        document: 'getFormDataDocument',
        catalogUsage: 'getFormDataCatalogUsage'
    };

    SyncAux.prototype.getMapperFnName = function( modelName ) {
        const name = this.mappers[modelName];
        if( !name ) {
            Y.log( 'No mapper fn name for modelName ' + modelName, 'warn', NAME );
        }
        return name;
    };

    /**
     * Map: modelName - name of property in reporting entry
     * @type {{location: string, employee: string, patient: string}}
     */
    SyncAux.prototype.idFields = {
        location: 'locId',
        employee: 'employeeId',
        patient: 'patientDbId',
        basecontact: 'basecontactId',
        caseFolder: 'caseFolderId',
        document: 'documentId',
        catalogUsage: 'catalogUsageId'
    };

    SyncAux.prototype.getIdField = function( modelName ) {
        const name = this.idFields[modelName];
        if( !name ) {
            Y.log( 'No idField value for modelName ' + modelName, 'warn', NAME );
        }
        return name;
    };

    SyncAux.prototype.getMapper = function() {
        return Y.dcforms.mapper.genericUtils[this.mapperFnName];
    };

    SyncAux.prototype.getMappedObject = function() {
        const self = this;

        return new Promise( async function( resolve, reject ) {
            let
                currentMapper = self.getMapper(),
                context = {},
                err;

            if( currentMapper ) {
                context[self.modelName] = self.auxObj;

                if ( 'patient' === self.modelName ) {
                    [ err ] = await formatPromiseResult( getPatientMarkers( self.user, context ) );
                    if ( err ) {
                        Y.log( `Could not load patient markers ${err.stack||err}`, 'error', NAME );
                    }
                }

                currentMapper( context, function( err, done ) {
                    if( err ) {
                        Y.log( `Err in mapper ${self.mapperFnName} for model ${self.modelName}: ${JSON.stringify( err )}`, 'error', NAME );
                        reject( err );
                    } else {
                        resolve( done );
                    }
                } );
            }
        } );
    };

    async function getPatientMarkers( user, context ) {
        if ( !context.patient || !context.patient.markers ) { return; }

        let
            err, result,
            markerQuery = { _id: { $in: context.patient.markers } },
            markerParams = {
                'user': user,
                'model': 'marker',
                'query': markerQuery
            };

        [ err, result ] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( markerParams ) );

        if ( err ) {
            Y.log( `Could not load patient markers from database: ${err.stack||err}`, 'warn', NAME );
            return;
        }

        context.patientMarkers = result;
    }

    SyncAux.prototype.getModel = function( user, model ) {
        return new Promise( function( resolve, reject ) {
            Y.doccirrus.mongodb.getModel( user, model, true, function( err, model ) {
                if( err ) {
                    Y.log( 'CANT GET REPORTING MODEL ' + err, 'error', NAME );
                    reject();
                } else {
                    resolve( model );
                }
            } );
        } );
    };

    /**
     * Update data in reporting entries
     * @returns {*}
     */
    SyncAux.prototype.updateReportings = function() {

        var query = {};

        if( 'patient' === this.modelName && this.mappedObj.insuranceType ) {
            query.insuranceType = this.mappedObj.insuranceType;
        }

        query[this.idField] = this.auxObj._id.toString();

        if( !this.mappedObj ) {
            Y.log( 'Missing update to reporting, nothing to do, skipping.', 'warn', NAME );
            //  nothing to do
            return new Promise( function( resolve ) {
                resolve();
            } );
        }

        if( Object.keys( this.mappedObj ).length === 0 && this.mappedObj.constructor === Object ) {
            Y.log( 'Empty update to reporting, nothing to do, skipping.', 'debug', NAME );
            //  nothing to do
            return new Promise( function( resolve ) {
                resolve();
            } );
        }

        if( Object.keys( this.mappedObj ).length === 0 ) {
            Y.log( 'All mapped object fields are filtered out for ' + this.modelName, 'warn', NAME );
            return new Promise( function( resolve ) {
                resolve();
            } );
        } else {
            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.reporting.reportingDBaction( {
                    mongoose: true,
                    user: this.user,
                    action: 'update',
                    query,
                    data: {$set: this.mappedObj},
                    options: {
                        multi: true
                    },
                    callback: ( err, result ) => {
                        if( err ) {
                            reject( err );
                        }
                        resolve( result );
                    }
                } );
            } );
        }
    };

    /**
     * Insert model into syncauxreporting schema for latter update
     */
    SyncAux.prototype.queueInsert = function() {
        let
            self = this,
            entryId =  ( self.auxObj._id && self.auxObj._id.toString() ) || '',
            syncItem = {
                entryId: entryId,
                entityName: self.modelName,
                timestamp: new Date()
            };

        self.getModel( self.user, 'syncauxreporting' ).then( function( model ) {
            return model.mongoose.findOneAndUpdate( {
                entryId: entryId,
                entityName: self.modelName
            }, syncItem, { upsert: true } ).exec();
        } );

    };

    /**
     * Filter out kes from mapped object that are not in InCase_T
     *
     * @return {Promise}
     */
    SyncAux.prototype.filterMappedObj = function() {
        let self = this,
            allowedFlds = [],
            ict = Y.dcforms.schema.InCase_T,
            mappedObj = this.mappedObj;

        //  special case for markerArray, EXTMOJ-1958, is on markers model but needed by patient update
        if ( 'patient' === self.modelName ) { allowedFlds.push( 'markerArray' ); }

        return new Promise( resolve => {
            for( let key in ict ) {
                if( ict.hasOwnProperty( key ) ) {
                    let ictObj = ict[key];
                    if( self.modelName === ictObj.model ) {
                        allowedFlds.push( key );
                    }
                }
            }
            for( let key in mappedObj ) {
                if( mappedObj.hasOwnProperty( key ) && !allowedFlds.includes( key ) ) {
                    delete mappedObj[key];
                }
            }
            resolve();
        } );
    };

    /**
     * Run update process
     * @return {Promise}
     */
    SyncAux.prototype.run = function() {
        var self = this;
        return new Promise( function( resolve, reject ) {

            self.getMappedObject().then( function( res ) {
                self.mappedObj = res;
                return self.filterMappedObj();
            } ).then( function() {
                return self.updateReportings();
            } ).then( function() {
                resolve();
            } ).catch( function( err ) {
                Y.log( `Error during syncAux run: ${JSON.stringify( err )}`, 'error', NAME );
                reject( err );
            } );
        } );
    };

    Y.namespace( 'doccirrus.insight2' ).SyncAux = SyncAux;

}, '0.0.1', {
    requires: []
} );