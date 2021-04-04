/**
 * User: do
 * Date: 05/05/15  11:03
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */



/*jslint anon:true, nomen:true */
/*global YUI*/

YUI.add( 'dcinvoiceprocess', function( Y, NAME ) {
        const {formatPromiseResult} = require( 'dc-core' ).utils;

        var Prom = require( 'bluebird' ),
            _ = require( 'lodash' ),
            moment = require( 'moment' ),
            runDb = Prom.promisify( Y.doccirrus.mongodb.runDb ),
            getModel = Prom.promisify( Y.doccirrus.mongodb.getModel ),
            caseFolderTypeToScheinType = {
                PUBLIC: 'SCHEIN',
                PUBLIC_A: 'SCHEIN', // MOJ-14319
                PRIVATE: 'PKVSCHEIN',
                PRIVATE_A: 'PKVSCHEIN', // MOJ-14319
                PRIVATE_CH: 'PKVSCHEIN',
                PRIVATE_CH_UVG: 'PKVSCHEIN',
                PRIVATE_CH_IVG: 'PKVSCHEIN',
                PRIVATE_CH_MVG: 'PKVSCHEIN',
                PRIVATE_CH_VVG: 'PKVSCHEIN',
                BG: 'BGSCHEIN',
                SELFPAYER: 'PKVSCHEIN'
            },
            catalogShortByScheinType = {
                'SCHEIN': 'EBM',
                'PKVSCHEIN': {$in: ['GOÄ', 'GebüH', 'TARMED', 'TARMED_UVG_IVG_MVG', 'EAL', 'MIGEL', 'ARZT_KVG_VVG', 'Pandemieleistungen', 'AMV']},
                'BGSCHEIN': 'UVGOÄ'
            };

        function hasCaseFolderType( type, caseFolderType ) {
            if( !Array.isArray( caseFolderType ) ) {
                caseFolderType = [caseFolderType];
            }
            return caseFolderType.includes( type );
        }


        /**
         *  Collect items for an invoicelog
         *
         *  @param  config                  {Object}
         *  @param  config.user             {Object}    REST user or equivalent
         *  @param  config.invoicelogId     {String}    Added to new invoicelog entries? (may also be a pvslog _id)
         *  @param  config.mainLocationId   {String}    location _id
         *  @param  config.caseFolderType   {[String]}  Array of insurance/casefolder types: 'BG', 'PRIVATE', 'SELFPAYER'
         *  @param  config.locationFields   {Object}    collection of fields to copy into invoice log entries (CHECKME)
         *  @param  config.physicianFields  {Object}    collection of fields to copy into invoice log entries (CHECKME)
         *
         *  @param  config.useStartDate     {Boolean}   If true, then only include entries after startDate
         *  @param  config.useEndDate       {Boolean}   If true, then only consider entries before endDate
         *  @param  config.startDate        {Date}      From pvslog UI, optional
         *  @param  config.endDate          {Date}      From pvslog UI, optional
         *
         *  @param  config.useInsuranceStatus   {Boolean}   If true, then filter to specific insurance providers
         *  @param  config.insuranceStatus      {Object}    Array of insurance company descriptors
         *
         *  callbacks / events
         *  @param  config.onHeader         {Function}  Called when header entry has been generated (CHECKME)
         *  @return {*} Promise
         */

        function collect( config ) {
            var state = {
                    patients: [],
                    excludedPatientIds: config.excludedPatientIds || [],
                    excludedScheinIds: config.excludedScheinIds || [],
                    mediportNotAllowedPatientIds: config.mediportNotAllowedPatientIds || [],
                    unknownInsuranceScheinIds: config.unknownInsuranceScheinIds || [],
                    employees: config.employees,
                    employeeIds: Array.isArray( config.employees ) ? config.employees.map( employee => employee._id ) : undefined,
                    employeeFilterEnabled: config.employeeFilterEnabled,
                    header: {},
                    stats: {
                        start: new Date(),
                        end: null,
                        duration: null,
                        quarters: [],
                        nQuarters: 0,
                        nScheine: 0,
                        xnScheine: 0,
                        nTreatments: 0,
                        xnTreatments: 0,
                        nMedications: 0,
                        xnMedications: 0,
                        nDiagnoses: 0,
                        xnDiagnoses: 0,
                        nScheineNotApproved: 0,
                        xnScheineNotApproved: 0,
                        nTreatmentsNotApproved: 0,
                        xnTreatmentsNotApproved: 0,
                        nMedicationsNotApproved: 0,
                        xnMedicationNotApproved: 0,
                        nDiagnosesNotApproved: 0,
                        xnDiagnosesNotApproved: 0,
                        priceTotal: 0,
                        pointsTotal: 0,
                        pricePerPatient: {},
                        pointsPerPatient: {}
                    }
                },
                user = config.user;

            // ensure hat common fields are set; more should be added
            config.patientFields = {...config.patientFields};
            delete config.patientFields['insuranceStatus.unknownInsurance'];
            config.patientFields['insuranceStatus.unknownInsurance'] = 1;

            return Y.doccirrus.invoicelogutils
                //  delete any/all existing invoiceentries in the log
                .cleanInvoiceEntries( user, config.invoiceLogId )

                //  get additional locations / satellites of the main location for this invoicelog
                .then( function(result) {
                    Y.log( `cleanInvoiceEntries of invoiceLog before collect ID=${config.invoiceLogId} results ${JSON.stringify(result)}`, 'info', NAME );
                    return getLocations( {
                        user,
                        mainLocationId: config.mainLocationId,
                        slType: config.slType,
                        slReferences: config.slReferences,
                        fields: config.locationFields
                    } );
                } )
                .then( clone )

                //  for each location, get physicians and attach them to the location object
                .map( function( location ) {
                    return getPhysicians( {
                        user: user,
                        locationId: location._id,
                        fields: config.physicianFields,
                        state: state
                    } ).then( function( physicians ) {
                        location.physicians = clone( physicians );
                        return location;
                    } );
                } )

                //  attach the locations with physician information to the header
                .then( function( mappedLocations ) {
                    state.header.locations = mappedLocations;
                    state.header.locationIds = getLocationIds( mappedLocations );
                    return state;
                } )

                //  if a function was given to extend the header, run it now
                .then( config.onHeader || identity )

                //  stream patients
                .then( function( state ) {
                    return streamPatients( config, state );
                } ).then( function() {
                    return storeHeader( config, state.header );
                } ).then( function() {
                    return state;
                } );

        } // end collect

        function storeHeader( config, header ) {
            return runDb( {
                user: config.user,
                model: 'invoiceentry',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( {
                    invoiceLogId: config.invoiceLogId,
                    type: 'header',
                    caseFolderType: config.caseFolderType,
                    data: header
                } )
            } );
        }

        function patientCardSwipeState( data ) {
            const
                publicScheins = data.filter( schein => {
                    const insuranceStatus = schein.patient.insuranceStatus[0];
                    return (insuranceStatus && insuranceStatus.type) === 'PUBLIC';
                } ),
                nScheins = publicScheins.length,
                nScheinWthCardSwipe = publicScheins.filter( schein => {
                    const insuranceStatus = schein.patient.insuranceStatus[0];
                    return Boolean( insuranceStatus && insuranceStatus.cardSwipe );
                } ).length;
            let result = 'SOME';
            if( nScheins > 0 && nScheins === nScheinWthCardSwipe ) {
                result = 'ALL';
            }
            return result;
        }

        function patientVsdmStatusState( data ) {
            const
                publicScheins = data.filter( schein => {
                    const insuranceStatus = schein.patient.insuranceStatus[0];
                    return (insuranceStatus && insuranceStatus.type) === 'PUBLIC';
                } ),
                nScheins = publicScheins.length,
                nScheinWthVsdmStatus = publicScheins.filter( schein => {
                    const insuranceStatus = schein.patient.insuranceStatus[0];
                    return ['fk3010', 'fk3011', 'fk3012', 'fk3013'].some( vsdmProp => {
                        return Boolean( insuranceStatus[vsdmProp] );
                    } );
                } ).length;
            let result = 'SOME';
            if( nScheins > 0 && nScheins === nScheinWthVsdmStatus ) {
                result = 'ALL';
            }
            return result;
        }

        function storePatientData( config, patient, data, state ) {
            let headerLocations = state.header && state.header.locations || [];
            return Prom.join( runDb( {
                user: config.user,
                model: 'invoiceentry',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( {
                    invoiceLogId: config.invoiceLogId,
                    type: 'patient',
                    caseFolderType: config.caseFolderType,
                    data: {...patient, ...{locations: headerLocations}},
                    cardSwipeStatus: hasCaseFolderType( 'PUBLIC', config.caseFolderType ) ? patientCardSwipeState( data ) : 'ALL',
                    vsdmStatus: hasCaseFolderType( 'PUBLIC', config.caseFolderType ) ? patientVsdmStatusState( data ) : 'ALL'
                } )
            } ), Prom.map( data, function( schein ) {
                const header = state.header;
                schein.invoiceQuarter = header && header.quarter;
                schein.invoiceYear = header && header.year;
                return runDb( {
                    user: config.user,
                    model: 'invoiceentry',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( {
                        invoiceLogId: config.invoiceLogId,
                        type: 'schein',
                        caseFolderType: config.caseFolderType,
                        data: schein
                    } )
                } ).then( function() {
                    return Y.doccirrus.invoicelogutils.includeSchein( schein, config ) ?
                        Y.doccirrus.invoicelogutils.collectIdsToApprove( schein, true, true, true ) : [];
                } ).then( function( ids ) {
                    if( !ids.length ) {
                        Y.log( `storePatientData: no ids collected to mark with current invoice log process ID=${config.invoiceLogId} SCHEIN_ID=${schein._id}`, 'info', NAME );
                        return;
                    }

                    if( ['member', 'main'].includes( config.slType ) ) {
                        Y.log( `storePatientData: skip assigning activities to invoiceLog ${config.invoiceLogId} because it member of super location`, 'info', NAME );
                        return;
                    }

                    // set invoiceLogId also for medidataRejected invoiceRef
                    if( schein.medidataRejected && schein.invoiceRefId ) {
                        const excludedScheinIds = config.excludedScheinIds || [],
                            excludedPatientIds = config.excludedPatientIds || [],
                            patientId = schein.patient && schein.patient._id;

                        if( !excludedScheinIds.includes( schein.invoiceRefId ) && !excludedPatientIds.includes( patientId ) ) {
                            ids.push( schein.invoiceRefId );
                        }
                    }
                    return runDb( {
                        user: config.user,
                        action: 'update',
                        model: 'activity',
                        query: {
                            _id: { $in: ids }
                        },
                        data: { $set: {
                            invoiceLogId: config.invoiceLogId,
                            invoiceLogType: config.invoiceLogType
                        } },
                        options: { multi: true }
                    } );
                } );
            } ) );
        } // end storePatientData

        function identity( val ) {
            return val;
        }

        function clone( obj ) {
            return JSON.parse( JSON.stringify( obj ) );
        }

        /**
         *  Look up the set of locations (main and satellites) tied to ca central location _id
         *
         *  @param  {Object} args
         *  @param  {Object} args.user                  REST user or equivalent
         *  @param  {String} args.mainLocationId        location _id
         *  @param  {Object} args.fields                subset of fields to return from the location objects
         *  @param  {Object} args.slType                type of log entry( mainly differs for super location)
         *  @param  {Array<String>} args.slReferences   array of locations id that are connected to super location
         *
         *  @return                         {Object}    Promise
         */

        function getLocations( args ) {
            const
                { user, mainLocationId, fields, slType, slReferences } = args,
                query = {
                    $or: [
                        {_id: ( slType === 'super' ? { $in: slReferences } : mainLocationId ) },
                        {
                            mainLocationId: ( slType === 'super' ? { $in: slReferences } : mainLocationId ),
                            isAdditionalLocation: true
                        }
                    ]
                },
                sortOptions = slType === 'super' ? {
                    slMain: -1 //main location from super location first
                } : {
                    isAdditionalLocation: 1 // ensures that main location is listed first
                };

            return runDb( {
                user,
                model: 'location',
                query,
                options: {
                    sort: sortOptions,
                    fields
                }
            } );
        }

        /**
         *  Load the set of physicians associated with a given location
         *
         *  @param  args                    {Object}
         *  @param  args.user               {Object}    REST user or equivalent
         *  @param  args.locationId         {String}    location _id (main or satellite)
         *  @param  args.physicianFields    {Object}    subset of fields to return from phsician objects
         *  @return                         {Object}    Promise
         */

        function getPhysicians( args ) {
            const
                state = args.state,
                query = {
                    type: 'PHYSICIAN',
                    'locations._id': args.locationId
                };

            if( true === state.employeeFilterEnabled && Array.isArray( state.employeeIds ) ) {
                query._id = {$in: state.employeeIds};
            }

            return runDb( {
                user: args.user,
                model: 'employee',
                query: query,
                options: {
                    fields: args.fields
                }
            } );
        }

        /**
         *  Load the set of casefolder objects for a given patient matching type(s) and ASV additionalType
         *
         *  @param  args                {Object}
         *  @param  args.user           {Object}    REST user or equivalent
         *  @param  args.patientId      {String}    patient _id
         *  @param  args.caseFolderType {[String]}  Array of insurance/casefile types, 'BG', 'PRIVATE', etc
         *  @param  args.isASV          {Boolean}   DOCUMENTME
         *  @return                     {Object}    Promise
         */

        function getCaseFolders( args ) {
            var query = {
                imported: {$ne: true},
                patientId: args.patientId,
                type: Array.isArray( args.type ) ? {$in: args.type} : args.type
            };

            if( args.isASV ) {
                query.additionalType = 'ASV';
            }

            return runDb( {
                user: args.user,
                model: 'casefolder',
                query: query
            } );
        }

        async function unwindMedidataRejectedInvoices(config, state, scheine) {
            if( !config.collectMedidataRejected ) {
                return scheine;
            }

            let error, scheineResult = [], scheinIndex = 0;
            for( let schein of scheine ) {
                let invoiceRefs = [];
                const nextSchein = scheine[scheinIndex + 1],
                    start = schein.timestamp,
                    end = config.getScheinEnd( schein, nextSchein ),
                    baseQuery = getActivityBaseQuery( config, state, schein, start, end ),
                    query = {
                        ...baseQuery,
                        actType: {$in: ['INVOICEREF']},
                        status: {
                            $in: ['VALID', 'MEDIDATAREJECTED', 'MEDIDATAFIXED']
                        },
                        medidataRejected: true
                    };

                [error, invoiceRefs] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user: config.user,
                    model: 'activity',
                    query: query,
                    options: {
                        fields: config.invoiceFields
                    }
                } ) );

                if( error ) {
                    Y.log(`unwindMedidataRejectedInvoices(): Failed to get invoiceRefs.\nError: ${error.stack || error}`, 'error', NAME);
                    continue;
                }
                if( invoiceRefs && invoiceRefs.length ) {
                    scheineResult = scheineResult.concat( invoiceRefs.map( i => {
                        return {
                            ...schein,
                            ...i,
                            status: schein.status,
                            _id: schein._id,
                            invoiceRefId: i._id.toString(),
                            invoiceStatus: i.status
                        };
                    } ) );
                }
                scheinIndex++;
            }
            return scheineResult;
        }

        /**
         *  Return all *SCHEIN type activities in a casefolder
         *
         *  @param  args        {Object}
         *  @param  args.user   {Object}    REST user or equivalent
         *  @param  args.query  {Object}    Provided by getScheinQuery( ... ) below
         *  @param  args.fields {Object}    Subset of fields to load from activity object
         *  @return             {Promise}
         */

        function getScheine( args ) {
            return runDb( {
                user: args.user,
                model: 'activity',
                query: args.query,
                options: {
                    sort: {
                        timestamp: 1
                    },
                    fields: args.fields
                }
            } );

        }

        /**
         *  Build a mongo query for loading *SCHEIN type activities from a patient casefolder, according to config
         *
         *  TODO: check whether we should filter scheins by start and end dates
         *
         *  @param  config                      {Object}    As passed to Y.doccirrus.invoiceprocess.collect
         *  @param  config.getInvoiceEnd        {Function}  Method provided by caller to this API, returns a date
         *  @param  config.collectMedidataRejected        {String}
         *
         *  @param  state                       {Object}    Current state of complete invoice log
         *  @param  state.header                {Object}    Corresponds to header invoiceitem for this log
         *  @param  state.header.locationIds    {[String]}  Set of locations (main and satellites) thislog applies to
         *
         *  @param  patientId                   {String}    patient _id (should also be on caseFolder?)
         *  @param  caseFolder                  {Object}    From casefolders collection
         *
         *  @return {{patientId: *, locationId: {$in: (String[]|*)}, caseFolderId: *}}
         */

        function getScheinQuery( config, state, patientId, caseFolder ) {
            var
                invoiceEnd = config.getInvoiceEnd( state ), // to be modified to consider config.enddate
                query = {
                    patientId: patientId,
                    locationId: {$in: state.header.locationIds},
                    caseFolderId: caseFolder._id.toString()
                };

            query.actType = caseFolderTypeToScheinType[caseFolder.type];

            if( true === state.employeeFilterEnabled && Array.isArray( state.employeeIds ) ) {
                query.employeeId = {$in: state.employeeIds};
            }

            if( config.preValidation ) {
                query.$or = [
                    {status: 'APPROVED'},
                    {status: 'VALID'}
                ];

            } else {
                query.status = 'APPROVED';
            }

            if( invoiceEnd ) {
                query.timestamp = {$lte: invoiceEnd};
            }

            return query;
        }

        /**
         *  Get the set of _ids of patient objects which have VALID/APPROVED activities matching:
         *
         *      caseFolderType(s)
         *      locationIds
         *      quarter
         *      year
         *      date range (optional)
         *
         *  @param  args                    {Object}
         *  @param  args.user               {Object}    REST user or equivalent
         *  @param  args.preValidation      {Boolean}   If true then APPROVED activities are not considerd
         *
         *  filter on location and insurance/casefolder type
         *
         *  @param  args.caseFolderType     {[String]}  Array of allowed casefolder types: 'BG', 'PRIVATE', etc
         *  @param  args.locationIds        {[String]}  Array of location _ids
         *
         *  filter on quarter
         *
         *  @param  args.quarter            {String}    Quarter to consider ('1'|'2'|'3'|'4')
         *  @param  args.year               {String}    Year to consider, four digit - YYYY
         *
         *  filter on date range
         *
         *  @param  args.useStartDate       {Boolean}   True if log has a start date
         *  @param  args.useEndDate         {Boolean}   True if log has an end date
         *  @param  args.startDate          {Date}      From beginning of this day (optional)
         *  @param  args.endDate            {Date}      To end of this day (optional)
         *  @param  args.collectMedidataRejected            {Boolean}
         *
         *  @return                         {Promise}
         */

        function getPatientIds( args ) {
            return getModel( args.user, 'activity', true ).then( model => {
                return new Prom( function( resolve, reject ) {
                    let isQuarterSet = (args.quarter && args.year),
                        date = isQuarterSet ? moment( args.quarter + '/' + args.year, 'Q/YYYY' ) : moment(),
                        startDate = date.clone().subtract( 1, 'years' ).startOf( 'year' ),
                        endDate = date.endOf( 'quarter' ),
                        tempDate,
                        query = {
                            status: args.preValidation ?
                                {
                                    $in: [
                                        'VALID',
                                        'APPROVED'
                                    ]
                                } : 'APPROVED',
                            timestamp: {
                                $gte: startDate.toDate(),
                                $lte: endDate.toDate()
                            }
                        };

                    if( !Array.isArray( args.caseFolderType ) ) {
                        query.actType = caseFolderTypeToScheinType[args.caseFolderType];
                    } else {
                        query.actType = {$in: args.caseFolderType.map( type => caseFolderTypeToScheinType[type] )};
                    }

                    if( args.locationIds && args.locationIds.length ) {
                        query.locationId = {$in: args.locationIds.map( id => new require( 'mongodb' ).ObjectID( id ) )};
                    }

                    if( args.useStartDate && args.startDate ) {
                        tempDate = moment( args.startDate );
                        Y.log( 'Restricting date range to start on ' + tempDate.toString(), 'info', NAME );
                        query.timestamp.$gte = tempDate.toDate();
                    }

                    if ( args.useEndDate && args.endDate ) {
                        tempDate = moment( args.endDate );
                        Y.log( 'Restricting date range to end on ' + tempDate.toString(), 'info', NAME );
                        query.timestamp.$lte = tempDate.toDate();
                    }

                    Y.log( 'getPatientIds before invoiceprocess with query ' + JSON.stringify( query ), 'info', NAME );

                    model.mongoose.aggregate( [
                        {
                            $match: query
                        },
                        {
                            $group: {
                                _id: null,
                                patientIds: {$addToSet: "$patientId"}
                            }
                        }
                    ], ( err, results ) => {
                        if( err ) {
                            reject( err );
                        } else {
                            resolve( results && results[0] && results[0].patientIds || [] );
                        }
                    } ).hint( {timestamp: 1} );

                } );

            } );
        }

        /**
         *  Given a set of activities, return the number which are not in state 'APPROVED' (ie, are 'VALID')
         *
         *  @param  activities  {Object}    Array of activity objects
         *  @return             {Number}
         */

        function countNotApproved( activities ) {
            var notApproved = 0;
            (activities || []).forEach( function( activity ) {
                if( 'APPROVED' !== activity.status ) {
                    notApproved++;
                }
            } );
            return notApproved;
        }

        function countActivities( data ) {
            /*jshint validthis:true */
            let self = this,
                stats = this.stats,
                quarterStr,
                patientId = data[0] && data[0].patientId,
                eXcludedPatient = ( -1 !== this.excludedPatientIds.indexOf( patientId ) ),
                eXcludedActivity;

            const
                fx = () => {
                    return ( eXcludedPatient || eXcludedActivity ) ? 'x' : '';
                };

            data.forEach( function( schein ) {
                eXcludedActivity = self.excludedScheinIds.includes( schein.actType === 'INVOICEREF' ? schein.invoiceRefId : schein._id );
                stats[fx() + 'nScheine'] += 1;
                quarterStr = moment( schein.timestamp ).format( 'QYYYY' );
                if( -1 === stats.quarters.indexOf( quarterStr ) ) {
                    if(!eXcludedPatient && !eXcludedActivity){
                        stats.quarters.push( quarterStr );
                        stats.nQuarters += 1;
                    }
                }
                if( 'APPROVED' !== schein.status ) {
                    stats[fx() + 'nScheineNotApproved']++;
                }
                stats[fx() + 'nTreatments'] += (schein.treatments || []).length;
                stats[fx() + 'nTreatmentsNotApproved'] += countNotApproved( schein.treatments );
                stats[fx() + 'nMedications'] += (schein.medications || []).length;
                stats[fx() + 'nMedicationsNotApproved'] += countNotApproved( schein.medications );
                stats[fx() + 'nDiagnoses'] += ((schein.diagnoses || []).length + (schein.continuousDiagnoses || []).length);
                stats[fx() + 'nDiagnosesNotApproved'] += countNotApproved( schein.diagnoses );
                stats[fx() + 'nDiagnosesNotApproved'] += countNotApproved( schein.continuousDiagnoses );
            } );
            return data;
        }

        function checkAssignedEmployees( patient, data ) {
            /*jshint validthis:true */
            const self = this;
            let employeeIds = {};

            data
                .forEach( schein => {
                    employeeIds[schein.employeeId] = true;
                    schein.treatments.forEach( treatment => {
                        employeeIds[treatment.employeeId] = true;
                    } );
                    schein.diagnoses.forEach( diagnosis => {
                        employeeIds[diagnosis.employeeId] = true;
                    } );
                    schein.continuousDiagnoses.forEach( continuousDiagnosis => {
                        employeeIds[continuousDiagnosis.employeeId] = true;
                    } );
                } );

            patient.assignedEmployees = Object.keys( employeeIds ).map( empId => {
                const
                    allPhysicians = _.flatten( self.header.locations.map( location => location.physicians ) ),
                    physician = allPhysicians.find( physician => physician._id === empId );
                return physician ? _.pick( physician, ['_id', 'firstname', 'lastname', 'officialNo', 'qualiDignities'] ) : {_id: empId};
            } );
            return data;
        }

        /**
         *  Calculates prices for medidata invoicing
         *
         *  @method calculateMedidataPriceTotal
         *  @param {Object}         args
         *  @param {Array}          args.treatments
         *  @param {Array}          args.medications
         *  @return {Object}
         */
        function calculateMedidataPriceTotal( {treatments = [], medications = []} ) {
            const {total = 0, totalVat = 0} = Y.doccirrus.invoiceutils.calculateSwissInvoiceTotal({
                linkedActivities: treatments.concat( medications )
            });
            return { price: Y.doccirrus.commonutilsCh.roundSwissPrice( total + totalVat ) };
        }
        function calculateGKVPriceTotal(treatments, context){
            let
                euros = 0,
                points = 0,
                patientId = treatments && treatments[0] && treatments[0].patientId;

            if( treatments && treatments.length ) {
                treatments.forEach( treatment => {
                    if( treatment.price && 'Euro' === treatment.unit ) {
                        euros += treatment.price;
                    }
                    // recalculate points if Euro?
                    if( treatment.actualPrice && 'Punkte' === treatment.actualUnit ) {
                        points += treatment.actualPrice;
                    }
                } );
            }

            if( context && context.stats ) {
                context.stats.priceTotal += euros;
                context.stats.pointsTotal += points;
                if( patientId ) {
                    if( !context.stats.pricePerPatient[patientId] && 0 !== context.stats.pricePerPatient[patientId] ) {
                        context.stats.pricePerPatient[patientId] = 0;
                    }
                    if( !context.stats.pointsPerPatient[patientId] && 0 !== context.stats.pointsPerPatient[patientId] ) {
                        context.stats.pointsPerPatient[patientId] = 0;
                    }
                    context.stats.pricePerPatient[patientId] += context.stats.priceTotal;
                    context.stats.pointsPerPatient[patientId] += context.stats.pointsTotal;
                }
            }
            return {
                price: euros
            };
        }
        function calculatePriceTotal( data, patient, state ) {
            if( -1 !== state.excludedPatientIds.indexOf( patient._id ) ) {
                return data;
            }
            let
                priceTotal,
                invoices = [];
            data.filter( schein => -1 === state.excludedScheinIds.indexOf( schein.actType === 'INVOICEREF' ? schein.invoiceRefId : schein._id ) ).forEach( function( schein ) {
                let
                    result = {};
                switch( schein.caseFolderTypeSingle ) {
                    case 'BG':
                    case 'SELFPAYER':
                    case 'PRIVATE':
                    case 'PRIVATE_A':
                        invoices.push( result );
                        Y.doccirrus.invoiceutils.calcInvoice( result, schein, schein.treatments );
                        schein.invoiceData = [result];
                        break;
                    case 'PUBLIC':
                    case 'PUBLIC_A':
                        invoices.push( calculateGKVPriceTotal( schein.treatments, state ) );
                        break;
                    case 'PRIVATE_CH':
                    case 'PRIVATE_CH_UVG':
                    case 'PRIVATE_CH_IVG':
                    case 'PRIVATE_CH_VVG':
                    case 'PRIVATE_CH_MVG':
                        invoices.push( calculateMedidataPriceTotal( {
                            treatments: schein.treatments,
                            medications: schein.medications
                        } ) );
                        break;
                }
            } );
            priceTotal = invoices.reduce( ( sum, item ) => {
                return Y.doccirrus.comctl.dcSum( sum, item.price );
            }, 0 );
            patient.priceTotal = priceTotal;

            return data;
        }

        /**
         *
         *  @param  config  {Object}    As passed to Y.invoiceprocess.collect
         *  @param  state   {Object}    State object with locations set in header
         *  @return         {Object}    Promise
         */

        function streamPatients( config, state ) {
            const MAX_CONCURRENT_PATIENT_PROCESSES = 5;
            var error = null,
                patientCount,
                patientsProcessed = 0,
                concurrentPatientProcesses = 0,
                stream, promise, patientIds;

            Y.log( 'invoiceprocess: streamPatients', 'info', 'NAME' );

            promise = new Prom( function( resolve, reject ) {
                //  run a mongoose aggreggation on activites matching passed properties
                getPatientIds( {
                    user: config.user,
                    preValidation: config.preValidation,
                    caseFolderType: config.caseFolderType,
                    locationIds: state.header.locationIds,
                    quarter: state.header.quarter || null,
                    year: state.header.year || null,
                    useStartDate: config.useStartDate,
                    useEndDate: config.useEndDate,
                    startDate: config.startDate,
                    endDate: config.endDate,
                    collectMedidataRejected: config.collectMedidataRejected
                } )
                    //  create a patient model
                    .then( function( _patientIds ) {
                        patientIds = _patientIds;
                        patientCount = patientIds.length;
                        Y.log( 'invoiceprocess: patientCount ' + patientCount, 'info', 'NAME' );

                        //  used to start progress bar on the client
                        if( 'function' === typeof config.onPatientProgress ) {
                            config.onPatientProgress( {
                                total: patientCount,
                                current: patientsProcessed,
                                durationElapsed: ((new Date()) - state.stats.start),
                                type: 'collect'
                            } );
                        }

                        return getModel( config.user, 'patient', true );
                    } )
                    //  start a mongoose stream from the patient model of objects matching the patientIds
                    .then( function( patientModel ) {
                        const exportPromises = new Set();
                        //  when a single patient object is passed from the stream
                        function onData( patient ) {
                            var currentExportPromise;
                            patient = clone( patient );

                            if( concurrentPatientProcesses >= MAX_CONCURRENT_PATIENT_PROCESSES ) {
                                stream.pause();
                            }
                            concurrentPatientProcesses++;

                            currentExportPromise = exportPatientData( config, state, patient )
                                .then( function( data ) {
                                    data = filterTiersGarantAndPayant(data, config);
                                    if( data && data.length ) {
                                        return Prom.resolve( data )
                                            .then( function( data ) {
                                                return "function" === typeof config.onPatientData ? config.onPatientData( data ) : identity( data );
                                            } )
                                            .then( data => {
                                                let configCaseFolderType = config && config.caseFolderType || [];
                                                if( !Array.isArray(configCaseFolderType) ){
                                                    configCaseFolderType = [ configCaseFolderType ];
                                                }
                                                if( config.invoiceLogType !== 'Medidata' && config.invoiceLogType !== 'CASH' && (configCaseFolderType.includes( 'PRIVATE' ) || configCaseFolderType.includes( 'SELFPAYER' ) ||
                                                     configCaseFolderType.includes( 'BG' )) && !patient.dataTransmissionToPVSApproved ) {
                                                    state.skippedDueNotPVSapproved = [...(state.skippedDueNotPVSapproved || []), patient._id.toString()];
                                                    data = [];
                                                }

                                                // Swiss only logic.  Combines somehow the mediportNotAllowedPatientIds and excludedPatientIds
                                                // unclear why this is needed.
                                                if( 'Medidata' === config.invoiceLogType ) {
                                                    //Ignore patient if !dataTransmissionToMediportApproved
                                                    if( !patient.dataTransmissionToMediportApproved ) {
                                                        if( state.mediportNotAllowedPatientIds.indexOf( patient._id.toString() ) === -1 ) {
                                                            state.mediportNotAllowedPatientIds.push( patient._id.toString() );
                                                        }

                                                        if( state.excludedPatientIds.indexOf( patient._id.toString() ) === -1 ) {
                                                            state.excludedPatientIds.push( patient._id.toString() );
                                                        }

                                                        data = [];
                                                    } else {
                                                        let indexMediport = state.mediportNotAllowedPatientIds.indexOf( patient._id.toString() );
                                                        let indexExcludedIds = state.excludedPatientIds.indexOf( patient._id.toString() );

                                                        if( indexMediport > -1 ) {
                                                            if( indexExcludedIds > -1 ) {
                                                                state.excludedPatientIds.splice( indexExcludedIds, 1 );
                                                            }
                                                            state.mediportNotAllowedPatientIds.splice( indexMediport, 1 );
                                                        }
                                                    }
                                                }

                                                // if a patient is excluded clear data
                                                if( state.excludedPatientIds.indexOf( patient._id.toString() ) > -1 ) {
                                                    data = [];
                                                }

                                                return countActivities.call( state, data );
                                            } )
                                            .then( checkAssignedEmployees.bind( state, patient ) )
                                            .then( data => calculatePriceTotal( data, patient, state ) )
                                            .then( function( data ) {
                                                state.patients.push( {
                                                    priceTotal: patient.priceTotal || 0
                                                } );

                                                return storePatientData( config, patient, data, state );
                                            } );
                                    }
                                    return data;
                                } )
                                .then( function() {
                                    patientsProcessed++;
                                    if( 'function' === typeof config.onPatientProgress ) {
                                        config.onPatientProgress( {
                                            total: patientCount,
                                            current: patientsProcessed,
                                            durationElapsed: ((new Date()) - state.stats.start),
                                            type: 'collect'
                                        } );
                                    }

                                    concurrentPatientProcesses--;
                                    exportPromises.delete( currentExportPromise );
                                    if( concurrentPatientProcesses < MAX_CONCURRENT_PATIENT_PROCESSES ) {
                                        stream.resume();
                                    }

                                } ).catch( function( err ) {
                                    Y.log( 'invoiceprocess: streamPatients exportData error ' + err, 'error', NAME );
                                    error = err;
                                    exportPromises.delete( currentExportPromise );
                                    stream.destroy();
                                } );

                            exportPromises.add( currentExportPromise );
                        }

                        function filterTiersGarantAndPayant(data = [], config ) {
                            if (!Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland()) {
                                return data;
                            }
                            if (config.isTiersGarant === true) {
                                return data.filter(schein => schein.isTiersGarant);
                            } else {
                                return data.filter(schein => schein.isTiersPayant);
                            }
                        }

                        function onError( err ) {
                            Y.log( 'invoiceprocess: streamPatients onError ' + err, 'error', NAME );

                            error = err;
                            stream.close();
                        }

                        function onClose() {
                            // make sure that all patient export promises are is settled
                            if( Array.from( exportPromises ).some( exportPromise => exportPromise.isPending() ) ) {
                                Y.log( 'invoiceprocess: no all patient export promises are settled yet, wait 100ms and try again', 'info', NAME );
                                return setTimeout( onClose, 100 );
                            }
                            Y.log( `invoiceprocess: finished patient export with ${error ? '' : 'no'} error`, 'info', NAME );
                            if( error ) {
                                reject( error );
                            } else {
                                state.stats.end = new Date();
                                state.stats.duration = state.stats.end - state.stats.start;
                                resolve( state );
                            }
                        }

                        stream = patientModel.mongoose.find( {_id: {$in: patientIds} }, config.patientFields).cursor().addCursorFlag( 'noCursorTimeout', true );
                        stream.on( 'data', onData ).on( 'error', onError ).on( 'close', onClose );
                    }, function( err ) {
                        reject( err );
                    } );
            } );
            return promise;
        }

        /**
         *  Given an array of location objects, return an array of location._id strings
         *
         *  @param  locations   {Object}    Array of location objects
         *  @return             {[String]}  Array of location _id strings
         */

        function getLocationIds( locations ) {
            return locations.map( function( location ) {
                return location._id;
            } );
        }

        /**
         *  Get diagnoses regardless of location and schein in asv mode
         *  All diagnoses will be added to all scheins
         *
         *  NOTE: this is only called for casefolders which have ASV additionalType
         *
         *  @param  {Object}    config      As passed to Y.doccirrus.invoiceprocess.collect
         *  @param  {Object}    state       Current state of entire invoice log
         *  @param  {String}    patientId   Matching casefolder
         *  @param  {String}    caseFolder  Object from casefolders collection
         *  @returns {*}
         */
        function getDiagnosesAsv( config, state, patientId, caseFolder ) {
            const query = getDiagnosesQueryAsv( config, state, patientId, caseFolder );

            return runDb( {
                user: config.user,
                model: 'activity',
                query: query,
                options: {
                    fields: config.diagnosisFields,
                    sort: {
                        timestamp: 1
                    }
                }
            } );
        }

        /**
         *  Arguments as for getDiagnosesAsv
         */

        function getDiagnosesQueryAsv( config, state, patientId, caseFolder ) {
            var invoiceEnd = config.getInvoiceEnd( state ),
                query = {
                    patientId: patientId,
                    caseFolderId: caseFolder._id.toString(),
                    actType: 'DIAGNOSIS',
                    diagnosisTreatmentRelevance: 'TREATMENT_RELEVANT',
                    // MOJ-11762: invalidated diagnoses carry the invalidation date, exclude them from the beginning
                    $or: [
                        {diagnosisInvalidationDate: {$exists: false}},
                        {diagnosisInvalidationDate: null}
                    ]
                };

            if( config.preValidation ) {
                query.$or = [
                    {status: 'APPROVED'},
                    {status: 'VALID'}
                ];

            } else {
                query.status = 'APPROVED';
            }

            if( invoiceEnd ) {
                query.timestamp = {$lte: invoiceEnd};
            }

            return query;
        }

        /**
         *  Construct a query used to select activities belonging to a single schein (within a date range)
         *
         *  @param  config                      {Object}    As passed to Y.doccirrus.invoiceprocess.collect
         *  @param  config.useStartDate         {Boolean}   If true then invoicelog date range begins at startDate
         *  @param  config.useEndDate           {Boolean}   If true then invoicelog date range ends at endDate
         *  @param  config.startDate            {Date}      Of the invoicelog
         *  @param  config.endDate              {Date}      of the invoicelog
         *
         *  @/param  config.useInsuranceStatus   {Boolean}   If true, filter by specific insurance companies
         *  @/param  config.insuranceStatus      {Object}    Array of insurance company descriptors to allow (optiona)
         *
         *  @param  state                       {Object}    Current state of entire invoicelog
         *  @param  state.header                {Object}    Correspons to header invoiceentry for this log
         *  @param  state.header.locationIds    {Object}    Array of locations this invoicelog relates to
         *
         *  @param  schein                      {Object}    A *SCHEIN type activity augmented with other data
         *  @param  schein.patientId            {String}    _id of a patient object
         *  @param  schein.caseFolderId         {String}    _id of a casefolder object
         *
         *  @param  start                       {Date}      Of the schein
         *  @param  end                         {Date}      Of the schein
         *
         *  @return {{locationId: {$in: (String[]|*)}, patientId, caseFolderId: *, timestamp: {$gte: *, $lt: *}}}
         */

        function getActivityBaseQuery( config, state, schein, start, end ) {
            let
                baseQuery = {
                    invoiceId: { $exists: false },
                    locationId: {$in: state.header.locationIds},
                    patientId: schein.patientId,
                    caseFolderId: schein.caseFolderId,
                    timestamp: {
                        $gte: start,
                        $lt: end
                    }
                };

            if( ['member', 'main'].includes( config.slType ) ){
                baseQuery.$or = [
                    { invoiceLogId: config.slLogId },
                    { invoiceLogId: {$exists: false} }
                ];
            } else {
                baseQuery.invoiceLogId = {$exists: false};
            }

            if ( config.useStartDate ) {
                if ( moment( config.startDate ).isAfter( start ) ) {
                    Y.log( 'Restricting activity query to invoicelog startDate: ' + config.startDate, 'debug', NAME );
                    baseQuery.timestamp.$gte = moment( config.startDate ).toDate();
                }
            }

            if ( config.useEndDate ) {
                if ( moment( config.endDate ).isBefore( end ) ) {
                    Y.log( 'Restricting activity query to invoicelog endDate: ' + config.endDate, 'debug', NAME );
                    baseQuery.timestamp.$lte = moment( config.endDate ).toDate();
                }
            }

            if( true === state.employeeFilterEnabled && Array.isArray( state.employeeIds ) ) {
                baseQuery.employeeId = {$in: state.employeeIds};
            }

            if( config.preValidation ) {
                baseQuery.status = {$in: ['APPROVED', 'VALID']};
            } else {
                baseQuery.status = 'APPROVED';
            }

            return baseQuery;
        }

        /**
         *  Utility function to compare schein casefolder and patient with list of allowed insurance providers
         *
         *  @param  allowInsurance      {Object}    Array of insurance companies allowed in this invoicelog
         *  @param  cfType              {String}    Casefolder type of current schein
         *  @param  patientInsurance    {Object}    Array of insurance options a patient has
         *  @param  withEmptyInsurance  {Boolean}   If true, include PVS cases where insurance is unspecified
         */

        function matchInsurance( allowInsurance, cfType, patientInsurance, withEmptyInsurance ) {
            if ( 'SELFPAYER' === cfType ) {
                //  if invoice log allows self payer and patient has selfpayer casefolder then no insurance
                //  company to check - so this always passes
                return true;
            }

            //  find any [cfType] insurance provider for this patient and compare to list of allowed insurance providers

            //  currently disabled due to problems with aggregation MOJ-6981

            var i, j, ptI;
            for ( i = 0; i < patientInsurance.length; i++ ) {
                ptI = patientInsurance[i];
                if ( ptI.type === cfType ) {
                    for ( j = 0; j < allowInsurance.length; j++ ) {
                        //console.log( '(****) comparing patientInsurance: ', ptI , ' to allowInsurance: ' + allowInsurance );
                        if ( allowInsurance[j]._id === ptI._id.toString() ) {
                            //  this insurance company is specifically allowed in this invoice log
                            Y.log( 'Schein matches insurance company list by _id, including', 'debug', NAME );
                            return true;
                        }

                        if ( ptI.insuranceName && allowInsurance[j].name === ptI.insuranceName.toString() ) {
                            //  this insurance company is specifically allowed in this invoice log
                            Y.log( 'Schein matches insurance company list by name, including', 'debug', NAME );
                            return true;
                        }

                        if ( ptI.insurancePrintName && allowInsurance[j].name === ptI.insurancePrintName.toString() ) {
                            //  this insurance company is specifically allowed in this invoice log
                            Y.log( 'Schein matches insurance company list by printName, including', 'debug', NAME );
                            return true;
                        }
                    }

                    if ( withEmptyInsurance ) {
                        if ( !ptI.insuranceId || '' === ptI.insuranceId ) {
                            //  allow PVS insurance with
                            Y.log( 'Schein matches unspecified insurance company, including', 'debug', NAME );
                            return true;
                        }
                    }
                }
            }

            //  nothing specifically allows this case in the insurance company whitelist, deny
            Y.log( 'Schein does not match insurance company list, not including', 'debug', NAME );
            return false;
        }

        /**
         *  Load treatments and diagnoses and attach to schein
         *
         *  Actual work done by
         *      -> getActivityBaseQuery
         *      -> getTreatments
         *      -> getDiagnosisByIds
         *      -> getDiagnoses
         *
         *  @param  config                      {Object}    As passed to Y.doccirrus.invoiceprocess.collect
         *  @param  config.onTreatments         {Function}  Provided by caller to this API
         *
         *  @param  config.useInsuranceStatus   {Boolean}   If true then only include entries billable to listed insurance providers
         *  @param  config.insuranceStatus      {Object}    List of insurance providers
         *  @param  config.withEmptyInsurance   {Boolean}   True if PVS customers with no insurance company record
         *
         *  @param  state                       {Object}    Current state of entire invoice log
         *  @param  schein                      {Object}    A *SCHEIN type activity object
         *  @param  start                       {Date}      Of the schein
         *  @param  end                         {Date}      Of the schein
         *  @param  asvDiagnoses                {Object}    Diagnoses which are attached to all schein(e) in a casefolder
         *  @return                             {Object}    Promise
         */

        async function getActivities( config, state, schein, start, end, asvDiagnoses, isAsvCaseFolder ) {
            var
                medications,
                baseQuery = getActivityBaseQuery( config, state, schein, start, end ),
                whitelistInsurance;

            /*
             *  We may skip this schein is user has whitelisted a set of insurance companies to pick entries from
             */

            if ( config.useInsuranceStatus ) {
                //  filter to cases corresponding to allowed insurance status
                whitelistInsurance = matchInsurance(
                    config.insuranceStatus,                 //  whitelist of providers
                    schein.caseFolderTypeSingle,            //  casefolder type ('BG'|'SELFPAYER'|'PRIVATE')
                    schein.patient.insuranceStatus,         //  insurance providers of this schein's patient
                    config.withEmptyInsurance               //  for PKV patients with no insurance selected
                );

                if ( !whitelistInsurance ) {
                    //  skip this schein, it is from a case corresponding to an insurance option which falls outside
                    //  the insurance company filter for this invoicelog

                    schein.treatments = [];
                    schein.diagnoses = [];
                    schein.continuousDiagnoses = [];
                    schein.continuousIcds = [];
                    schein.skippedInsuranceProvider = true;

                    return Promise.resolve( clone( schein ) );
                }
            }

            if( config.medicationFields ) {
                Y.log( `medicationFields are set on config, get medications for schein`, 'debug', NAME );
                let err;
                [err, medications] = await formatPromiseResult( getMedications( config, baseQuery ) );
                if( err ) {
                    Y.log( `could not get medications for invoice ${err.stack || err}`, 'warn', NAME );
                }
            }

            return getTreatments( config, schein.actType, baseQuery )
                .then( clone )
                .then( "function" === typeof config.onTreatments ? config.onTreatments.bind( state, isAsvCaseFolder ) : identity )
                .filter( "function" === typeof config.filterTreatment ? config.filterTreatment.bind( state ) : identity )
                .then( function( treatments ) {
                    schein.treatments = treatments;
                    schein.diagnoses = [];
                    schein.continuousDiagnoses = [];
                    schein.medications = medications || [];
                    return Prom.resolve().then( () => {
                        if( asvDiagnoses ) {
                            return clone( asvDiagnoses );
                        }
                        if( !config.autoAssignmentOfDiagnosis ) {
                            return Prom.resolve( _.pluck( schein.treatments, 'icds' ) )
                                .then( _.flatten )
                                .then( _.uniq )
                                .then( function( ids ) {
                                    return getDiagnosisByIds( config, state, ids );
                                } );
                        } else {
                            return getDiagnoses( config, state, baseQuery );
                        }
                    } ).then( clone ).map( function( diagnosis ) {
                        if( 'ACUTE' === diagnosis.diagnosisType ) {
                            schein.diagnoses.push( diagnosis );
                        } else {
                            schein.continuousDiagnoses.push( diagnosis );
                        }
                        return diagnosis;
                    } );
                } ).then( () => {
                    return getDiagnosisByIds( config, state, schein.continuousIcds, true );
                } ).then( clone ).then( function( continuousDiagnoses ) {
                    mergeActivities( schein.continuousDiagnoses, continuousDiagnoses );
                    return schein;
                } );
        }

        /**
         *
         * @param {Object}          config
         * @param {Object}          state
         * @param {Array} ids
         * @param {boolean|undefined} excludeInvalidatedDiagnoses (optional, default: false)
         * @returns {Array|*}
         */
        function getDiagnosisByIds( config, state, ids, excludeInvalidatedDiagnoses ) {
            if( !ids ) {
                return [];
            }

            const
                query = {
                    _id: {$in: ids},
                    // MOJ-11762: never include invalidating diagnoses
                    diagnosisTreatmentRelevance: {$ne: 'INVALIDATING'}
                };

            /**
             * MOJ-11762
             * If selected, we exclude those diagnoses, which carry an invalidation date.
             */
            if( excludeInvalidatedDiagnoses ) {
                query.$or = [
                    {diagnosisInvalidationDate: {$exists: false}},
                    {diagnosisInvalidationDate: null}
                ];
            }

            // MOJ-10885: do not filter by employee selection configuration when fetching directly by ID

            return runDb( {
                user: config.user,
                model: 'activity',
                query: query,
                options: {
                    fields: config.diagnosisFields,
                    sort: {
                        timestamp: 1
                    }
                }
            } );
        }

        async function getMedications( config, baseQuery ) {
            const hasInStock = config.user && Y.doccirrus.licmgr.hasAdditionalService( config.user.tenantId, 'inStock' );
            if( hasInStock ) {
                if( baseQuery.status && baseQuery.status.hasOwnProperty( '$in' ) ) {
                    baseQuery.status.$in = baseQuery.status.$in.concat( ['DISPENSED'] );
                } else {
                    baseQuery.status = {$in: [baseQuery.status, 'DISPENSED']};
                }
            }

            const query = {
                ...baseQuery,
                actType: 'MEDICATION'
            };

            if( hasInStock && Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
                query.status = 'DISPENSED';
            }

            if(config.invoiceLogType === 'Medidata') {
                query.$or = [{orderId: {$exists: true, $ne: null}}, {isDispensed: true}];
            }

            if( query.$or ) {
                query.$and = [
                    {
                        $or: [
                            {noLongerValid: {$exists: false}},
                            {noLongerValid: false}
                        ]
                    },
                    {$or: query.$or}
                ];
                delete query.$or;
            } else {
                query.$or = [
                    {noLongerValid: {$exists: false}},
                    {noLongerValid: false}
                ];
            }

            return runDb( {
                user: config.user,
                model: 'activity',
                query: query,
                options: {
                    fields: config.medicationFields,
                    sort: {
                        timestamp: 1
                    }
                }
            } );
        }

        function getTreatments( config, scheinType, baseQuery ) {

            var query = {
                actType: 'TREATMENT',
                areTreatmentDiagnosesBillable: '1',
                catalogShort: catalogShortByScheinType[scheinType]
            };

            if (!config.doNotcheckCatalog) {
                query.catalog = true;
            }

            return runDb( {
                user: config.user,
                model: 'activity',
                query: _.extend( {}, baseQuery, query ),
                options: {
                    fields: config.treatmentFields,
                    sort: {
                        timestamp: 1
                    }
                }
            } );
        }

        function getDiagnoses( config, state, baseQuery ) {

            let query = {
                actType: 'DIAGNOSIS',
                diagnosisTreatmentRelevance: 'TREATMENT_RELEVANT',
                // MOJ-11762: invalidated diagnoses carry the invalidation date, exclude them from the beginning
                $or: [
                    {diagnosisInvalidationDate: {$exists: false}},
                    {diagnosisInvalidationDate: null}
                ]
            };

            if( true === state.employeeFilterEnabled && Array.isArray( state.employeeIds ) ) {
                query.employeeId = {$in: state.employeeIds};
            }

            // create the combined query, merging the base and the given query
            // WATCH OUT: two $or objects are given, they become an $and in the combined object
            if( baseQuery.$or && query.$or ) {
                query.$and = [
                    {$or: baseQuery.$or},
                    {$or: query.$or}
                ];
                delete query.$or;
                delete baseQuery.$or;
            }

            query = _.extend( {}, baseQuery, query );

            return runDb( {
                user: config.user,
                model: 'activity',
                query,
                options: {
                    fields: config.diagnosisFields,
                    sort: {
                        timestamp: 1
                    }
                }
            } );
        }

        function mergeActivities( targetArr, sourceArr ) {
            let filteredSourceArr = sourceArr.filter( s => {
                return !_.find( targetArr, t => t._id === s._id );
            } );
            sourceArr = null;
            Array.prototype.push.apply( targetArr, filteredSourceArr );
        }

        async function getMedidataRejectedActivities( config, state, schein ) {
            let error, treatments = [], medications = [], diagnoses = [], continuousDiagnoses = [];
            const activityIds = schein.activities || [],
                continuousDiagnosesIds = schein.icdsExtra || [],
                diagnosesIds = schein.icds || [];

            if( activityIds && activityIds.length ) {
                const activitiesQuery = {
                    _id: {
                        $in: activityIds
                    }
                };
                [error, treatments] = await formatPromiseResult( getTreatments( config, schein.actType, activitiesQuery ) );
                if( error ) {
                    Y.log( `getMedidataRejectedActivities(): Failed to get treatments for schein ${schein._id}. \nError: ${error.stack || error}`, 'error', NAME );
                    treatments = [];
                }

                [error, medications] = await formatPromiseResult( getMedications( config, activitiesQuery ) );
                if( error ) {
                    Y.log( `getMedidataRejectedActivities(): Failed to get medications for schein ${schein._id}. \nError: ${error.stack || error}`, 'error', NAME );
                    medications = [];
                }
            }
            [error, diagnoses] = await formatPromiseResult( getDiagnosisByIds( config, state, diagnosesIds ) );
            if( error ) {
                Y.log( `getMedidataRejectedActivities(): Failed to get diagnoses for schein ${schein._id}. \nError: ${error.stack || error}`, 'error', NAME );
                diagnoses = [];
            }

            [error, continuousDiagnoses] = await formatPromiseResult( getDiagnosisByIds( config, state, continuousDiagnosesIds ) );
            if( error ) {
                Y.log( `getMedidataRejectedActivities(): Failed to get continuousDiagnoses for schein ${schein._id}. \nError: ${error.stack || error}`, 'error', NAME );
                diagnoses = [];
            }
            schein.treatments = treatments;
            schein.medications = medications;
            schein.diagnoses = diagnoses;
            schein.continuousDiagnoses = continuousDiagnoses;

            return schein;
        }

        /**
         * Add scheins with unknown insurance to schein exclusion list or patient exclusion list if all scheins have unknown insurances.
         * Also store all schein ids with unknown insurance to detect if flag was removed next time the invoice log is validated. If
         * flag was removed, remove schein or patient id from exclusion lists.
         *
         * @param {Object}          config
         * @param {Object}          state
         * @param {ObjectId}        patientId
         * @param {Array}           scheins
         * @return {Promise<scheins>}
         */
        async function handleUnknownInsurances( config, state, patientId, scheins ) {
            const currentScheinIds = scheins.map( schein => schein._id.toString() );
            const scheinIdsWhichHadUnknownInsurances = state.unknownInsuranceScheinIds.filter(
                unknownInsuranceScheinId => currentScheinIds.includes( unknownInsuranceScheinId ) );

            // if patient had unknown insurance then remove all exclusions
            if( scheinIdsWhichHadUnknownInsurances.length ) {
                state.excludedPatientIds = state.excludedPatientIds.filter( excludedPatientId => excludedPatientId !== patientId.toString() );
                state.excludedScheinIds = state.excludedScheinIds.filter( excludedScheinId => !currentScheinIds.includes( excludedScheinId ) );
                state.unknownInsuranceScheinIds = state.unknownInsuranceScheinIds.filter( unknownInsuranceScheinId => !currentScheinIds.includes( unknownInsuranceScheinId ) );
            }

            const scheinsWithUnknownInsurances = [];
            scheins.forEach( schein => {
                const scheinId = schein._id.toString();
                const matchingInsurances = schein.patient.insuranceStatus.filter( insurance => config.caseFolderType.includes( insurance.type ) );
                const hasMatchingUnknownInsurances = matchingInsurances.some( matchingInsurance => matchingInsurance.unknownInsurance );
                if( hasMatchingUnknownInsurances ) {
                    scheinsWithUnknownInsurances.push( scheinId );
                }
            } );

            if( scheins.length && scheins.length === scheinsWithUnknownInsurances.length ) {
                state.excludedPatientIds.push( patientId.toString() );
            } else if( scheinsWithUnknownInsurances.length ) {
                [].push.apply( state.excludedScheinIds, scheinsWithUnknownInsurances );
            }

            [].push.apply( state.unknownInsuranceScheinIds, scheinsWithUnknownInsurances );

            return scheins;

        }

        /**
         *  Attaches patient/patientversion top schein and loads activities
         *
         *  @param  config
         *  @param  state           {Object}    Current state of complete invoice log
         *  @param  schein          {Object}    A *SCHEIN type activity object
         *  @param  start           {Date}      Of this schin
         *  @param  end             {Date}      Of this schein
         *  @param  asvDiagnoses    {Object}    Array of DIAGNOSIS objects attached to all scheine if ASV casefolder
         *  @return                 {Promise}
         */

        function getScheinData( config, state, schein, start, end, asvDiagnoses, isAsvCaseFolder ) {
            var promise;

            if( config.getPatientVersion ) {
                promise = config.getPatientVersion( config, state, schein, config.patientFields ).then( function( patientVersion ) {
                    return patientVersion;
                }, function( err ) {
                    // skip 'Patient Not Found' error
                    if( '4052' !== err.code ) {
                        throw err;
                    }
                } );
            } else {
                promise = Prom.resolve();
            }
            return promise.then( function( patientVersion ) {
                if( patientVersion ) {
                    schein.patient = clone( patientVersion );
                }

                if( 'function' === typeof config.onPatient ) {
                    return config.onPatient( config, state, schein, schein.patient );
                }
            } ).then( function() {
                var getActivitiesFn = config.collectMedidataRejected ? getMedidataRejectedActivities : getActivities;
                return getActivitiesFn( config, state, schein, start, end, asvDiagnoses, isAsvCaseFolder );
            } );
        }

        function hasTreatmentsOrMedications( schein ) {
            return Boolean( schein.treatments && schein.treatments.length ) ||
                Boolean(schein.medications && schein.medications.length );
        }

        function hasFakeInsurance( schein ) {
            const publicInsurance = schein.patient && schein.patient.insuranceStatus &&
                                    schein.patient.insuranceStatus.find( insurance => 'PUBLIC' === insurance.type );
            return publicInsurance ? publicInsurance.insuranceGrpId === '74799' : false;
        }

        function filterTreatmentsOrMedications( schein ) {
            return hasTreatmentsOrMedications( schein ) && !hasFakeInsurance( schein );
        }

        function checkMinTotal( schein, minTotal ){
            let
                treatmentsPrice = schein.treatments.map( treatment => treatment.price ),
                medicationsPrice = schein.medications.map( medication => medication.price ),
                total = treatmentsPrice.concat(medicationsPrice).reduce( ( a, b ) => a + b, 0 );
            return total > minTotal;
        }

        /**
         *
         *
         *  @param  config  {Object}    As passed to Y.doccirrus.invoiceprocess.collect
         *  @param  state   {Object}    State of complete log
         *  @param  patient {Object}    An object from the patients collection
         *  @return         {Promise}
         */

        function exportPatientData( config, state, patient ) {
            //  get the set of casefolders this patient has which match restrictions in config (type, additionalType)
            return getCaseFolders( {
                user: config.user,
                patientId: patient._id,
                type: config.caseFolderType,
                isASV: config.isASV
            } )
                // for each casefolder get the schein(e) and ASV diagnoses
                .map( function( caseFolder ) {
                    let promise,
                        isAsvCaseFolder = ( 'ASV' === caseFolder.additionalType ),
                        minTotal = Number( config.minTotal );

                    if( isAsvCaseFolder ) {
                        //   config, state, patientId, caseFolder
                        promise = getDiagnosesAsv( config, state, patient._id, caseFolder );
                    } else {
                        promise = Prom.resolve();
                    }

                    promise = promise.then( asvDiagnoses => {
                        return getScheine( {
                            user: config.user,
                            query: getScheinQuery( config, state, patient._id, caseFolder ),
                            fields: config.scheinFields
                        } ).then( clone )
                            .then( function ( scheine ) {
                                return unwindMedidataRejectedInvoices(config, state, scheine);
                            } )
                            .then( "function" === typeof config.onScheine ? config.onScheine.bind( state, patient ) : identity )
                            .then( function( scheine ) {
                                var i,
                                    start,
                                    end,
                                    schein,
                                    nextSchein,
                                    promises = [];

                                function checkBL( schein ) {
                                    const sumTreatments = function( sum, entry ) {
                                        return sum + Number( entry.fk4246 || 0 );
                                    };

                                    if( !schein.fk4235Set || !schein.fk4235Set.length ) {
                                        schein.blFinished = null;
                                        return;
                                    }

                                    schein.blFinished = schein.fk4235Set.every( function( fk4235Set ) {
                                        const maxTreatmentsOfInsuredPerson = fk4235Set.fk4252;
                                        const maxTreatmentsOfCareGiver = fk4235Set.fk4255;
                                        const sumTreatmentsOfInsuredPerson = (fk4235Set.fk4244Set || []).reduce( sumTreatments, 0 );
                                        const sumTreatmentsOfCareGiver = (fk4235Set.fk4256Set || []).reduce( sumTreatments, 0 );
                                        return (!maxTreatmentsOfInsuredPerson || sumTreatmentsOfInsuredPerson >= maxTreatmentsOfInsuredPerson) &&
                                               (!maxTreatmentsOfCareGiver || maxTreatmentsOfCareGiver >= sumTreatmentsOfCareGiver);
                                    } );
                                }

                                if( scheine && scheine.length ) {
                                    for( i = 0; i < scheine.length; i++ ) {

                                        schein = scheine[i];
                                        checkBL( schein );

                                        // CCDEV-62 must be cloned because in case there is no patient version ensureInsuranceStatusIndex
                                        // would alter the original patient insuranceStatus which can lead to problems if the patient has
                                        // also an additional insurance and schein (eg. PUBLIC_A or PRIVATE_A).
                                        schein.patient = clone( patient );
                                        schein.caseFolderTypeSingle = caseFolder.type;
                                        nextSchein = scheine[1 + i];
                                        //  get date range covered by this schein in current casefile
                                        start = schein.timestamp;
                                        end = config.getScheinEnd( schein, nextSchein );
                                        schein.end = end;
                                        promises.push( getScheinData( config, state, schein, start, end, isAsvCaseFolder ? asvDiagnoses : null, isAsvCaseFolder ) );
                                    }
                                    if( 'undefined' === typeof patient.blFinished || true === patient.blFinished ) {
                                        patient.blFinished = scheine.every( schein => {
                                            return null === schein.blFinished || true === schein.blFinished;
                                        } );
                                    }

                                }
                                return Prom.all( promises ).filter( filterTreatmentsOrMedications ).filter( schein => {
                                    if( minTotal ) {
                                        return checkMinTotal( schein, minTotal );
                                    } else {
                                        return true;
                                    }
                                } );
                            } );

                    } ).then( function( scheins ) {
                        return handleUnknownInsurances( config, state, patient._id, scheins );
                    } );

                    return promise;
                } ).then( _.flatten );
        }

        function noop() {

        }

        /**
         *  This will call call iterator for each invoice entry in sequence starting with header following each schein
         *
         *  excludes the patient head entry
         *
         *  NB: Each iterator call must return a promise
         *
         *  @param  args                {Object}
         *  @param  args.user           {Object}    REST user or equivalent
         *  @param  args.invoiceLogId   {String}    May be kbvlog _id or pvslog _id
         *  @param  args.iterator       {Function}  Will be called for each invoice in the invoice log
         *  @param  args.onProgress     {Function}  Called for each patient(?) to update progress on the client
         *  @param  args.startTime      {Object}    Used to time the operation
         *  @return                     {Object}    Promise
         */

        function forEachInvoiceEntry( args ) {
            var user = args.user,
                invoiceLogId = args.invoiceLogId,
                iterator = args.iterator,
                onProgress = args.onProgress || noop,
                startTime = args.startTime,
                entryCount, processedEntries = 1,
                excludedPatientIds = args.excludedPatientIds || [],
                excludedScheinIds = args.excludedScheinIds || [];

            if( !user ) {
                throw new TypeError( 'Missing user argument' );
            }
            if( !invoiceLogId ) {
                throw new TypeError( 'Missing invoiceLogId argument' );
            }
            if( !iterator ) {
                throw new TypeError( 'Missing iterator argument' );
            }

            return runDb( {
                user: user,
                model: 'invoiceentry',
                action: 'count',
                query: {
                    invoiceLogId: invoiceLogId,
                    $or: [{type: 'schein'}, {type: 'header'}]
                }
            } )
                .then( function( count ) {
                    entryCount = count;
                    return runDb( {
                        user: user,
                        model: 'invoiceentry',
                        query: {
                            invoiceLogId: invoiceLogId,
                            type: 'header'
                        }
                    } );
                } )
                .then( function( entries ) {
                    if( !entries || !entries.length ) {
                        throw new Error( 'no invoice entry of type header found' );
                    }
                    onProgress( {
                        total: entryCount,
                        current: processedEntries,
                        type: 'iterate',
                        durationElapsed: startTime ? ((new Date()) - startTime) : null
                    } );
                    return iterator( entries[0] );
                } )
                .then( function() {
                    return getModel( user, 'invoiceentry', true );
                } ).then( function( invoiceEntryModel ) {

                    return new Prom( function( resolve, reject ) {
                        var stream, error, currentIteratorPromise;

                        function onData( schein ) {
                            stream.pause();
                            currentIteratorPromise = Prom.resolve( schein ).then( iterator ).then( function() {
                                processedEntries++;
                                onProgress( {
                                    total: entryCount,
                                    current: processedEntries,
                                    type: 'iterate',
                                    durationElapsed: startTime ? ((new Date()) - startTime) : null
                                } );
                                stream.resume();
                            }, function( err ) {
                                error = err;
                                stream.destroy();
                            } );
                        }

                        function onError( err ) {
                            error = err;
                            stream.close();
                        }

                        function onClose() {
                            if( currentIteratorPromise && currentIteratorPromise.isPending() ) {
                                Y.log( 'invoiceprocess: last schein export is not yet settled, wait 100ms and try again', 'info', NAME );
                                return setTimeout( onClose, 100 );
                            }
                            if( error ) {
                                reject( error );
                            } else {
                                resolve();
                            }
                        }
                        stream = invoiceEntryModel.mongoose.find( {
                            invoiceLogId: invoiceLogId,
                            type: 'schein',
                            'data.patientId': {$nin: excludedPatientIds},
                            'data._id': {$nin: excludedScheinIds}
                        } ).cursor().addCursorFlag( 'noCursorTimeout', true );
                        stream.on( 'data', onData ).on( 'error', onError ).on( 'close', onClose );

                    } );
                } );

        } // end forEachInvoiceEntry

        Y.namespace( 'doccirrus' ).invoiceprocess = {
            collect,
            forEachInvoiceEntry,
            countActivities
        };

    },
    '0.0.1',
    {
        requires: ['dc-comctl']
    }
)
;
