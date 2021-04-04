/**
 *  Handles assignments of forms to printers (per-customer configuration)
 *
 *  User: strix
 *  (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jshint latedef:false */
/*global YUI */



YUI.add( 'formprinter-api', function( Y , NAME ) {

        const
            Promise = require( 'bluebird' ),
            async = require( 'async' ),
            {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils;

        /**
         *  Get the full set of form assignments to printers for the current user
         *  @param args
         */

        function getAssignments(args) {
            Y.log('Entering Y.doccirrus.api.formprinter.getAssignments', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formprinter.getAssignments');
            }
            var
                runDb = Promise.promisify(Y.doccirrus.mongodb.runDb),
                params = args.originalParams,
                showFor = params.showFor || 'user',
                locationId = params.locationId || '000000000000000000000001',       //  default location
                dbSetup = {
                    'user': args.user,
                    'action': 'get',
                    'model': 'formprinter',
                    'query': {
                        'identityId': 'default',
                        'locationId': locationId
                    }
                },
                defaultAssignments,
                userAssignments;

            if ('user' === showFor) {
                //  load user assignments and add any default not covered
                runDb( dbSetup ).then( onDefaultMappingsLoaded ).done( onUserMappingsLoaded, onErr );
            } else {
                //  load only default assignments for all users
                runDb( dbSetup ).done( sendDefaultMappings, onErr );
            }

            function onDefaultMappingsLoaded(data) {
                defaultAssignments = data;
                dbSetup.query.identityId = args.user.identityId;
                return runDb(dbSetup);
            }

            function sendDefaultMappings(data) {
                defaultAssignments = data;
                Y.log('Sending only default assignments for location: ' + locationId, 'debug', NAME);
                args.callback(null, formatAssignments(defaultAssignments));
            }

            function onUserMappingsLoaded( data) {
                userAssignments = data;
                var i;

                //  add all default assignments not specified in the user mapping
                //  ie, user assignments have precedence

                for (i = 0; i < defaultAssignments.length; i++) {
                    if ('' === getAssignment(defaultAssignments[i].canonicalId, userAssignments)) {
                        userAssignments.push(defaultAssignments[i]);
                    }
                }

                args.callback(null, formatAssignments(userAssignments));
            }

            //  make plain string format used by editor
            function formatAssignments(userAssignments) {
                var i, strAssignments = [];
                for (i = 0; i < userAssignments.length; i++) {
                    strAssignments.push(userAssignments[i].canonicalId + '::' + userAssignments[i].printerName);
                }
                return strAssignments;
            }

            function onErr(err) {
                Y.log('Error loading user form assignments: ' + JSON.stringify(err), 'warn', NAME);
                args.callback(err);
            }

        }

        /**
         *  Overwrite the full set of form assignments to printers for the current user
         *
         *  This assumes that the complete set of user assignments is passed, any existing assignments not passed will
         *  be deleted.  The client-side editor passes a string of the format
         *
         *  @param args
         */

        function setAssignments(args) {
            Y.log('Entering Y.doccirrus.api.formprinter.setAssignments', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formprinter.setAssignments');
            }
            var
                runDb = Promise.promisify(Y.doccirrus.mongodb.runDb),
                params = args.originalParams,
                locationId = params.locationId || '000000000000000000000001',       //  default location
                mapping = params.assignments || [],
                identityId = args.hasOwnProperty('makeDefault') ? 'default' : args.user.identityId + '',
                msg = '',

                dbSetup = {
                    'user': args.user,
                    'action': 'get',
                    'model': 'formprinter',
                    'query': {
                        'identityId': identityId,
                        'locationId': locationId
                    }
                };

            runDb( dbSetup ).then( onMappingsLoaded ).done( onAllChanges, onErr );

            function onMappingsLoaded( data ) {

                Y.log('Loaded ' + data.length + ' existing assignments for this user and location', 'debug', NAME);

                var
                    promises = [],
                    i, j,
                    parts,
                    expanded = [],
                    canonicalId,
                    printerName,
                    assigned,
                    found;

                //  expand the string format
                for (i = 0; i < mapping.length; i++) {
                    parts = mapping[i].split('::');
                    if (2 === parts.length) {
                        expanded.push(parts);
                    }
                }

                //  for each assignment passed by the client, check if it needs to be created or updated

                for (i = 0; i < expanded.length; i++) {
                    parts = expanded[i];
                    canonicalId = parts[0];
                    printerName = parts[1];
                    assigned = getAssignment(canonicalId, data);

                    if ('' === assigned) {
                        //  create a new entry in index table for this form and printer
                        promises.push(saveNewMapping(canonicalId, printerName));
                    } else {
                        if (assigned !== printerName) {
                            //  printer name has changed, update this record
                            promises.push(updateExistingMapping(canonicalId, printerName));
                        }
                    }
                }

                //  for each existing assignment, check if it was not passed
                for (i = 0; i < data.length; i++) {
                    found = false;
                    for (j = 0; j < expanded.length; j++) {
                        parts = expanded[j];
                        if (parts[0] === data[i].canonicalId) {
                            found = true;
                        }
                    }

                    if (false === found) {
                        promises.push(deleteMapping(data[i]._id + ''));
                    }
                }

                return Promise.all(promises);
            }

            function updateExistingMapping(canonicalId, printerName) {
                //  if an existing set of assignments then overwrite that, rather than creating a duplicate record
                var
                    dbPutSetup = {
                        'user': args.user,
                        'action': 'put',
                        'model': 'formprinter',
                        'query': {
                            'identityId': identityId,
                            'locationId': locationId,
                            'canonicalId': canonicalId
                        },
                        'data': {
                            'fields_': [ 'printerName' ],
                            'printerName': printerName
                        }
                    };

                msg = msg + 'updating existing printer assignment for form: ' + canonicalId + ' --> ' + printerName + "\n";
                dbPutSetup.data = Y.doccirrus.filters.cleanDbObject(dbPutSetup.data);
                return runDb(dbPutSetup);
            }

            function saveNewMapping(canonicalId, printerName) {

                var
                    dbPostSetup = {
                        'user': args.user,
                        'action': 'post',
                        'model': 'formprinter',
                        'data': {
                            'identityId': identityId,
                            'locationId': locationId,
                            'canonicalId': canonicalId,
                            'printerName': printerName
                        }
                    };

                msg = msg + 'creating new printer assignment: ' + canonicalId + ' --> ' + printerName + "\n";
                dbPostSetup.data = Y.doccirrus.filters.cleanDbObject(dbPostSetup.data);
                Y.log('Saving new form assignment: ' + JSON.stringify(dbPostSetup.data), 'debug', NAME );
                return runDb(dbPostSetup);
            }

            function deleteMapping(id) {
                var
                    dbDelSetup = {
                        'user': args.user,
                        'action': 'delete',
                        'model': 'formprinter',
                        'query': { '_id': id + '' }
                    };

                msg = msg + 'deleting printer assignment: ' + id + "\n";
                Y.log('Deleting form assignment: ' + JSON.stringify(dbDelSetup.data), 'debug', NAME );
                return runDb(dbDelSetup);
            }

            function onAllChanges() {
                Y.log('Printer mapping saved for user: ' + "\n" + msg, 'debug', NAME);
                args.callback(null, { 'msg': msg });
            }

            function onErr(err) {
                Y.log('Could not update printer settings: ' + JSON.stringify(err), 'warn', NAME);
                args.callback(err);
            }
        }

        /**
         *  Clear user assignments, altogether or for a specific printer and location
         *
         *  This is for use by dev/support, or when removing printers in the location settings
         */

        function clearUserAssignments( args ) {
            Y.log('Entering Y.doccirrus.api.formprinter.clearUserAssignments', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formprinter.clearUserAssignments');
            }
            var
                params = args.originalParams,
                locationId = params.locationId || null,
                printerName = params.printerName || null,
                toDelete = [];

            if ( '' === printerName ) { printerName = null; }
            if ( '' === locationId ) { locationId = null; }

            Y.log( 'Clearing per-user assignments to printer: ' + printerName + ' at location: ' + locationId, 'debug', NAME );

            Y.doccirrus.mongodb.runDb( {
                'user': args.user,
                'action': 'get',
                'model': 'formprinter',
                'query': { 'identityId': { $ne: 'default' } },
                'callback': onUserSettingsLoaded
            } );

            function onUserSettingsLoaded( err, data ) {
                if ( err ) {
                    Y.log( 'Error loading user settings: ' + JSON.stringify( err ), 'warn', NAME );
                    args.callback( err );
                    return;
                }

                Y.log( 'Loaded ' + data.length + ' per-user formprinter assignments.', 'debug', NAME );

                var i, deleteMe, assignment;
                for (i = 0; i < data.length; i++) {
                    assignment = data[i];
                    deleteMe = true;

                    if ( locationId && assignment.locationId !== locationId ) {
                        deleteMe = false;
                    }

                    if ( printerName && assignment.printerName !== printerName ) {
                        deleteMe = false;
                    }

                    if ( deleteMe ) {
                        Y.log( 'Enqueue for deletion: ', assignment._id, 'debug', NAME );
                        toDelete.push( assignment );
                    }
                }

                Y.log( 'Removing ' + toDelete.length + ' per-user assignments for printer ' + printerName, 'debug', NAME );
                async.eachSeries( toDelete, removeSingleAssignment, onAllDeleted );
            }

            function removeSingleAssignment( assignment, itcb ) {
                function onRemoveSingle( err, result ) {
                    if ( err ) {
                        itcb( err );
                        return;
                    }
                    Y.log(
                        'Removed single formprinter assignment: ' + JSON.stringify( result ) +  ' - ' + JSON.stringify( assignment ),
                        'debug',
                        NAME
                    );
                    itcb( null );
                }

                Y.log( 'Removing single assignment: ' + assignment._id, 'debug', NAME );

                Y.doccirrus.mongodb.runDb( {
                    'user': args.user,
                    'model': 'formprinter',
                    'action': 'delete',
                    'query': { '_id': assignment._id + '' },
                    'callback': onRemoveSingle
                } );
            }

            function onAllDeleted( err ) {
                if ( err ) {
                    Y.log( 'Error removing assignments: ' + JSON.stringify( err ), 'warn', NAME );
                }

                Y.log( 'All per-user form/printer assignments cleared.', 'info', NAME );
                args.callback( err );
            }

        }

        /**
         *  Utility function, not exposed
         *
         *  @param  canonicalId     {String}    Database _id of a formtemplate object
         *  @param  data            {Object}    Array of formprinters objects
         *  @returns                {String}    Name of printer assignmed to this form, or '' if unspecified
         */

        function getAssignment(canonicalId, data) {
            var i;
            for (i = 0; i < data.length; i++) {
                if (data[i].canonicalId === canonicalId) {
                    return data[i].printerName;
                }
            }
            return '';
        }

        /**
         *  Overwrite the default set of form associations
         *  @param args
         */

        function setDefaultAssignments(args) {
            Y.log('Entering Y.doccirrus.api.formprinter.setDefaultAssignments', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formprinter.setDefaultAssignments');
            }
            args.makeDefault = true;
            setAssignments(args);
        }

        /**
         *  Get the printer associated with the current form for the current user, if any
         *
         *  This requires params:
         *
         *      canonicalId     {String}    Database _id of a formtemplate object
         *      locationId      {String}    Database _id of a location object
         *
         *  @param args
         */

        function getPrinter(args) {
            Y.log('Entering Y.doccirrus.api.formprinter.getPrinter', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formprinter.getPrinter');
            }
            var
                params = args.originalParams,
                locationId = params.locationId || '000000000000000000000001',       //  default location
                canonicalId = params.canonicalId || '',

                dbSetup = {
                    'user': args.user,
                    'action': 'get',
                    'model': 'formprinter',
                    'query': {
                        'identityId': args.user.identityId + '',
                        'locationId': locationId,
                        'canonicalId': canonicalId
                    }
                };

            if ('' === canonicalId) {
                args.callback(new Error('Canonical form id not passed'));
                return;
            }

            Y.log('Finding printer for form: ' + canonicalId + ' at location: ' + locationId, 'debug', NAME);

            Y.doccirrus.mongodb.runDb( dbSetup, onUserAssignmentLoaded );

            function onUserAssignmentLoaded(err, data) {

                if (err) {
                    args.callback(err);
                    return;
                }

                if (data && data[0]) {
                    //   user has an explicit assignment for this form and location
                    args.callback(null, data[0].printerName);
                    return;
                }

                //  user does not have a printer assigned to this form at this location, check if there is a default
                dbSetup.query.identityId = 'default';
                Y.doccirrus.mongodb.runDb( dbSetup, onDefaultAssignmentLoaded );
            }

            function onDefaultAssignmentLoaded(err, data) {
                if (err) {
                    args.callback(err);
                    return;
                }

                if (data && data[0]) {
                    //   there exists a default assignment for this form and location
                    args.callback(null, data[0].printerName);
                    return;
                }

                //  no printer assigned for this form and location, see if location has a default printer
                dbSetup.model = 'location';
                dbSetup.query = { '_id': locationId };
                Y.doccirrus.mongodb.runDb( dbSetup, onLocationLoaded );
            }

            function onLocationLoaded(err, data) {
                if (err) {
                    args.callback(err);
                    return;
                }

                if (data && data[0] && data[0].defaultPrinter && '' !== data[0].defaultPrinter) {
                    //   there exists a default printer at this location
                    args.callback(null, data[0].defaultPrinter);
                    return;
                }

                //  no printers configured, client will show the browser's print dialog
                args.callback(null, '');
            }
        }

        /**
         *  Update a single form -> printer assignment for a given user and location
         *  @param args
         */

        function setSingle(args) {
            Y.log('Entering Y.doccirrus.api.formprinter.setSingle', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formprinter.setSingle');
            }
            var
                params = args.originalParams,
                canonicalId = params.canonicalId || '',
                locationId = params.locationId || '',
                printerName = params.printerName || '',
                identityId = params.userId ? params.userId :  args.user.identityId + '',
                location,
                assignment = null;

            if ('' === canonicalId || '' === locationId || '' === printerName) {
                Y.log('Missing required POST var: ' + canonicalId + ',' + locationId + ',' + printerName, 'warn', NAME);
                args.callback(new Error('Missing required POST var'));
                return;
            }

            Y.log('Assigning form ' + canonicalId + ' to printer ' + printerName + ' at location ' + locationId, 'debug', NAME);

            async.series(
                [
                    loadLocation,
                    lookupIndividualAssignment,
                    createNewIndividualAssignment,
                    updateIndividualAssignment
                ],
                onAllDone
            );

            //  1. Load the current location to check against requested settings change
            function loadLocation( itcb ) {
                Y.doccirrus.mongodb.runDb( {
                    'user': args.user,
                    'model': 'location',
                    'query': { '_id': locationId + '' },
                    'callback': onLocationLoaded
                } );

                function onLocationLoaded( err, data ) {
                    if ( !err && 0 === data.length ) {
                        err = Y.doccirrus.errors.rest( 404, 'Location not found: ' + locationId );
                    }
                    if ( err ) {
                        return itcb( err );
                    }

                    location = data[0];

                    if ( !checkPrinterName( printerName ) ) {
                        return itcb( Y.doccirrus.errors.rest( 404, 'Printer not enabled at this location: ' + printerName ) );
                    }

                    itcb( null );
                }
            }

            //  2. Check whether this user already has a preference for this form and location
            function lookupIndividualAssignment( itcb ) {
                //  look up any current assignment for this user, form and location
                Y.doccirrus.mongodb.runDb({
                    'user': args.user,
                    'model': 'formprinter',
                    'query': {
                        'locationId': locationId,
                        'identityId': identityId,
                        'canonicalId': canonicalId
                    },
                    'options': { 'lean': true },
                    'callback': onExtantCheck
                });


                function onExtantCheck(err, data) {
                    if ( err ) {
                        args.callback(err);
                        return;
                    }

                    if ( 1 === data.length ) {
                        assignment = data[0];
                    }

                    if ( assignment && assignment.printerName === printerName ) {
                        //  no change to this, we can skip everything and call back immediately
                        return args.callback( null );
                    }

                    itcb( null );
                }

            }

            //  3. Create a new assignment, if necessary
            function createNewIndividualAssignment( itcb ) {
                //  skip this step if an assignment already exists
                if ( assignment ) { return itcb( null ); }

                var
                    postData = {
                        'identityId': identityId,
                        'locationId': locationId,
                        'canonicalId': canonicalId,
                        'printerName': printerName,
                        'alternatives': []
                    };

                postData = Y.doccirrus.filters.cleanDbObject( postData );

                Y.doccirrus.mongodb.runDb( {
                    'user': args.user,
                    'model': 'formprinter',
                    'action': 'post',
                    'data': postData,
                    'callback': onCreateNewAssignment
                } );

                function onCreateNewAssignment( err ) {
                    if ( err ) { return itcb( err ); }
                    Y.log( 'Created new formprinter assignment.', 'debug', NAME );
                    itcb( null );
                }
            }

            //  4. Update an existing assignment, if necessary
            function updateIndividualAssignment( itcb ) {
                //  if assignment as just created then skip this step
                if ( !assignment ) { return itcb( null ); }

                var
                    putData = {
                        'fields_': [ 'printerName', 'alternatives' ],
                        'printerName': printerName,
                        'alternatives': []
                    }, i;

                //  assignment may not have an alternatives array
                assignment.alternatives = assignment.alternatives ? assignment.alternatives : [];

                //  add previous default assignment to alternatives list (may be removed by next step)
                putData.alternatives.push( assignment.printerName );

                //  check that existing entries are valid (must unique, enabled at location and not the current default)
                for ( i = 0; i < assignment.alternatives.length; i++ ) {
                    //  must be enabled
                    if ( checkPrinterName( assignment.alternatives[i] ) ) {
                        //  must not be default
                        if ( assignment.alternatives[i] !== printerName ) {
                            //  must not be duplicates
                            if ( -1 === putData.alternatives.indexOf( assignment.alternatives[i] ) ) {
                                putData.alternatives.push( assignment.alternatives[i] );
                            }
                        }
                    }
                }

                putData = Y.doccirrus.filters.cleanDbObject( putData );

                Y.doccirrus.mongodb.runDb( {
                    'user': args.user,
                    'model': 'formprinter',
                    'action': 'put',
                    'query': { '_id': assignment._id + '' },
                    'data': putData,
                    'callback': onUpdateAssignment
                } );

                function onUpdateAssignment( err ) {
                    if ( err ) { return itcb( err ); }
                    Y.log( 'Updated formprinters assignment: ' + JSON.stringify( putData ), 'info', NAME );
                    itcb( null );
                }
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not set formprinter assignment: ' + JSON.stringify( err ), 'warn', NAME );
                    return args.callback( err );
                }
                args.callback( null );
            }

            //  Helper, check that the given printer name is enabled at current location
            function checkPrinterName( printerName ) {
                var
                    enabledPrinters = location.enabledPrinters || [],
                    i;

                for ( i = 0; i < enabledPrinters.length; i++ ) {
                    if ( enabledPrinters[i] === printerName ) {
                        return true;
                    }
                }

                return false;
            }
        }

        /**
         *  Server-side lookup of a single printer
         *
         *  @param user
         *  @param canonicalId
         *  @param locationId
         *  @param callback
         */

        function getPrinterServer(user, canonicalId, locationId, callback) {
            var
                args = {
                    'user': user,
                    'originalParams': {
                        'canonicalId': canonicalId,
                        'locationId': locationId
                    },
                    'callback': callback
                };

            getPrinter(args);
        }

        function loadIndividualAssignment( args ) {
            Y.log('Entering Y.doccirrus.api.formprinter.loadIndividualAssignment', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formprinter.loadIndividualAssignment');
            }
            var
                assignment = null,
                params = args.originalParams,
                locationId = params.locationId || '',
                canonicalId = params.canonicalId || '',
                identityId = params.userId ? params.userId :  args.user.identityId + '';

            Y.doccirrus.mongodb.runDb( {
                'user': args.user,
                'model': 'formprinter',
                'query': {
                    'identityId': identityId,
                    'canonicalId': canonicalId,
                    'locationId': locationId
                },
                'options': { 'lean': true },
                'callback': onIndividualSettingLookup
            } );

            function onIndividualSettingLookup( err, data ) {
                if ( err ) {
                    Y.log( `Could not look up printer assignment: ${err.stack||err}`, 'warn', NAME );
                    return args.callback( err );
                }


                if ( data && data.length > 0 ) {
                   assignment = data[0];
                }
                args.callback( null, assignment );
            }
        }

        /**
         *  Create and return an object recording the current printer assignment for a form, alternatives (used before)
         *  and all printers configured at the current location
         */

        async function getAllAlternatives( args ) {
            Y.log('Entering Y.doccirrus.api.formprinter.getAllAlternatives', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formprinter.getAllAlternatives');
            }

            const
                { user, originalParams: { locationId, canonicalId, userId }, callback } = args,
                getPrinter = promisifyArgsCallback( Y.doccirrus.api.printer.getPrinter );

            let
                assignment = null,
                identityId = userId || user.identityId + '',
                cupsPrinters = [];

            if ( !locationId ) {
                return callback( Y.doccirrus.errors.rest( 500, 'Missing parameter locationId' ) );
            }

            //  1. First check where there is a formprinters entry for this user at this location with this form
            if( canonicalId ){ //check only if form Id for activity resolved
                let [ err, individualAssignments ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'formprinter',
                        query: {
                            identityId,
                            canonicalId,
                            locationId
                        }
                    } )
                );
                if( err ){
                    Y.log( `getAllAlternatives: error getting exact formprinter ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }
                if ( individualAssignments && individualAssignments.length ) {
                    assignment = individualAssignments[0];
                }
            }

            //  2. If no individual assignment, look for a default assignment for this location and form
            if ( !assignment && canonicalId ){
                let [ err, defaultAssignments ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'formprinter',
                        query: {
                            identityId: 'default',
                            canonicalId,
                            locationId
                        }
                    } )
                );
                if( err ){
                    Y.log( `getAllAlternatives: error getting default formprinter ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }
                if ( defaultAssignments && defaultAssignments.length ) {
                    assignment = defaultAssignments[0];
                }
            }

            //  3. Query CUPS interface for all available printers
            let [ err, allPrinters] = await formatPromiseResult(
                getPrinter( { data: { printerName: '' } } )
            );

            if( err ){
                Y.log( `getAllAlternatives: error getting CUPS printers ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }
            cupsPrinters = allPrinters || [];
            Y.log( `getAllAlternatives: Loaded list of ${cupsPrinters.length} printers from CUPS.`, 'debug', NAME );

            //  4. Add the set of printers recorded at this location
            if ( !assignment ) {
                assignment = {
                    'printerName': '',
                    'alternatives': [],
                    'locationPrinters': []
                };
            }
            let location, locations;
            [ err, locations ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'location',
                    query: { _id: locationId }
                } )
            );
            if( err ){
                Y.log( `getAllAlternatives: error getting locations ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }
            if( !locations || !locations.length ){
                return callback( Y.doccirrus.errors.rest( 500, 'Location not found' ) );
            }
            location = locations[0];
            location.enabledPrinters = location.enabledPrinters || [];
            assignment.locationPrinters = location.enabledPrinters.filter( enabledPrinter => {
                let cupsEnabledForLocation = (cupsPrinters || []).find( cupsPrinter => cupsPrinter.name === enabledPrinter );
                if( !cupsEnabledForLocation ){
                    Y.log( `getAllAlternatives: Location lists printer ${enabledPrinter} but it is not known to CUPS.`, 'warn', NAME );
                }
                return cupsEnabledForLocation;
            } );

            //  5. Check that all user print settings still match the printers available at this location and shown by CUPS
            if ( !isEnabledPrinter( assignment.printerName ) ) {
                assignment.printerName = '';
            }
            assignment.alternatives = (assignment.alternatives || []).filter( isEnabledPrinter );

            //  check that a printer is in the set enabled at this location
            function isEnabledPrinter( printerName ) {
                return (assignment.locationPrinters || []).some( locationPrinter => locationPrinter === printerName );
            }

            callback( null, assignment );
        }

        /**
         *  Remove an alternative assignment for a form (for a specific location and user)
         *
         *  Process:
         *
         *      1. Load the assignment from database
         *      2. Remove the printer from the set of alternative printer names
         *      3. Save the assignment back to the database
         *
         *  @param  args                                {Object}    REST v1
         *  @param  args.user                           {Object}    REST user or equivalent
         *  @param  args.originalParams                 {Object}
         *  @param  args.originalParams.assignmentId    {String}    _id of a formprinters object
         *  @param  args.originalParams.printerName     {String}    Alternative printer to remove
         *  @param  args.callback                       {Function}
         */

        function removeAlternative( args ) {
            Y.log('Entering Y.doccirrus.api.formprinter.removeAlternative', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formprinter.removeAlternative');
            }
            var
                params = args.originalParams,
                assignmentId = params.assignmentId || null,
                printerName = params.printerName || null,
                assignment,
                updateResult;

            if ( !assignmentId || !printerName ) {
                return args.callback( Y.doccirrus.errors.rest( 500, 'Missing assignmentId or printerName' ) );
            }

            async.series(
                [
                    loadAssignment,
                    updateAssignment,
                    saveAssignment
                ],
                onAllDone
            );

            //  1. Load the assignment from database
            function loadAssignment( itcb ) {
                var
                    getParams = {
                        user: args.user,
                        model: 'formprinter',
                        action: 'get',
                        query: { _id: assignmentId },
                        options: { plain: true },
                        callback: onAssignmentLoaded
                    };

                Y.doccirrus.mongodb.runDb( getParams );

                function onAssignmentLoaded( err, result ) {
                    if ( !err && 0 === result.length ) {
                        err = Y.doccirrus.errors.rest( 404, 'Assignment not found: ' + assignmentId, true );
                    }
                    if ( err ) {
                        return itcb( err );
                    }
                    assignment = result[0];
                    itcb( null );
                }
            }

            //  2. Remove the printer from the set of alternative printer names
            function updateAssignment( itcb ) {
                var
                    newAlt = [],
                    found = false,
                    i;

                for ( i = 0; i < assignment.alternatives.length; i++ ) {
                    if ( assignment.alternatives[i] === printerName ) {
                        found = true;
                    } else {
                        newAlt.push( assignment.alternatives[i] );
                    }
                }

                if ( !found ) {
                    return itcb( Y.doccirrus.errors.rest( 404, 'Printer not in assignment: ' + printerName, true ) );
                }

                assignment.alternatives = newAlt;
                itcb( null );
            }

            //  3. Save the assignment back to the database
            function saveAssignment( itcb ) {
                var
                    putParams = {
                        user: args.user,
                        model: 'formprinter',
                        action: 'put',
                        query: { _id: assignmentId },
                        data: {
                            fields_: [ 'alternatives' ],
                            alternatives: assignment.alternatives
                        },
                        callback: onAssignmentUpdated
                    };

                putParams.data = Y.doccirrus.filters.cleanDbObject( putParams.data );
                Y.doccirrus.mongodb.runDb( putParams );

                function onAssignmentUpdated( err, result ) {
                    if ( err ) {
                        return itcb( err );
                    }
                    updateResult = result;
                    itcb( null );
                }
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not remove formprinter assignment: ' + JSON.stringify( err ), 'warn', NAME );
                    return args.callback( err );
                }
                args.callback( null, updateResult );
            }
        }

        //  FORMPRINTER REST API

        Y.namespace( 'doccirrus.api' ).formprinter = {
            'getprinter': getPrinter,
            'getassignments': getAssignments,
            'setassignments': setAssignments,
            'clearuserassignments': clearUserAssignments,
            'setdefaultassignments': setDefaultAssignments,
            'setsingle': setSingle,
            'getPrinterServer': getPrinterServer,
            'getAllAlternatives': getAllAlternatives,
            'loadIndividualAssignment' : loadIndividualAssignment,
            'removeAlternative': removeAlternative
        };

    },
    '0.0.1', {requires: [
        'formtemplate-schema',
        'dcforms-confighelper',
        'dcforms-exportutils'
    ]}
);