/**
 * User: ma
 * Date: 04/04/14  14:48
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */

/**
 * New pattern for cascading pre and post processes.
 * Automatically called by the DB Layer before any mutation (CUD, excl R) is called on a data item.
 *
 * @module activity-process
 */
YUI.add( 'activity-process', function( Y, NAME ) {

        const
            _ = require( 'lodash' ),
            util = require( 'util' ),
            async = require( 'async' ),
            moment = require( 'moment' ),
            {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
            i18n = Y.doccirrus.i18n,
            toPrice = Y.doccirrus.schemas.activity.toPrice,
            controlCharsRegExp = Y.doccirrus.regexp.controlChars,
            replaceControlChars = Y.doccirrus.commonutils.replaceControlChars,
            MedDataItemDataTypes = Y.doccirrus.schemas.v_meddata.medDataItemDataTypes,
            isEdmp = Y.doccirrus.schemas.activity.isEdmp,
            isEdoc = Y.doccirrus.schemas.activity.isEdoc,
            DCError = Y.doccirrus.commonerrors.DCError,
            TagSchema = Y.doccirrus.schemas.tag.TagSchema,
            noop = () => {
            };

        // set moment to use specific lang
        moment.locale( Y.doccirrus.i18n.language );

        /**
         * Set a Tonometry read date if not given for sections with values
         *
         *  @param  {Object}    user
         *  @param  {Object}    activity
         *  @param  {Function}  callback
         */

        function setTonometryRead( user, activity, callback ) {
            var
                moment,
                tonometrySections,
                nowISO;

            if( 'OPHTHALMOLOGY_TONOMETRY' === activity.actType ) {

                moment = require( 'moment' );
                tonometrySections = Y.doccirrus.schemas.activity.utilsOphthalmology.getOphthalmologyTonometrySections();
                nowISO = moment().toISOString();

                if( !activity.otNRead && tonometrySections.nct.some( function( name ) {
                    return Boolean( activity[name] );
                } ) ) {
                    activity.otNRead = nowISO;
                }
                if( !activity.otPRead && tonometrySections.pascal.some( function( name ) {
                    return Boolean( activity[name] );
                } ) ) {
                    activity.otPRead = nowISO;
                }
                if( !activity.otGRead && tonometrySections.goldmann.some( function( name ) {
                    return Boolean( activity[name] );
                } ) ) {
                    activity.otGRead = nowISO;
                }
                if( !activity.otIRead && tonometrySections.icare.some( function( name ) {
                    return Boolean( activity[name] );
                } ) ) {
                    activity.otIRead = nowISO;
                }

                if( Array.isArray( activity.otAppliedSet ) && activity.otAppliedSet.length ) {
                    activity.otAppliedSet.forEach( function( otApplied ) {

                        if( !otApplied.otAppliedAtL && otApplied.otAppliedContentL ) {
                            otApplied.otAppliedAtL = nowISO;
                        }
                        if( !otApplied.otAppliedAtR && otApplied.otAppliedContentR ) {
                            otApplied.otAppliedAtR = nowISO;
                        }
                    } );
                }

            }

            return callback( null, activity );
        }

        /**
         *  Update the attachedMedia property, and ensure that attachments have activityId set correctly
         *
         *  The attachedMedia are used to show links to files in attached documents the activity tables: [PDF], [JPEG] etc
         *
         *  @param  {Object}    user
         *  @param  {Object}    activity
         *  @param  {Function}  callback
         */

        function updateAttachedMedia( user, activity, callback ) {
            let context = this && this.context || {};
            if( context.activeActiveWrite ) {
                // media and documents can be delivered bit later therefor keep attachedMedia content from sent activity
                Y.log( 'Write by activeActive, updating attachedMedia skipped', 'info', NAME );
                return callback( null, activity );
            }
            Y.doccirrus.api.activity.addAttachmentLinks( user, activity, callback );
        }

        /**
         *  Generate the content finally for this entry.
         *
         *      1. Set activity content according to activity type, as defined in the activity schema
         *      2. Include values from a form document into templates defined in activity.userContent
         *
         *  @param  {Object}    user        REST user or equivalent
         *  @param  {Object}    activity    See activity-schema.common.js
         *  @param  {Function}  callback    Of the form fn( err )
         *  @see Y.doccirrus.api.activity.generateContent
         */
        async function generateContent( user, activity, callback ) {
            let context = this && this.context || {};
            if( context.keepOriginalContent ) {
                Y.log( 'GenerateContent skipped due to keepOriginalContent context option', 'info', NAME );
                return callback( null, activity );
            }

            const actType = activity && activity.actType;
            if (actType === 'INVOICEREFPVS') {
                let [err, invoiceConfiguration] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.invoiceconfiguration.get( {
                        user,
                        callback( err, result ) {
                            if( err ) {
                                return reject( err );
                            } else {
                                return resolve( result );
                            }
                        }
                    } );
                } ) );

                if( err ) {
                    Y.log( `generateContent error getting invoiceConfiguration ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }

                let aisInvoice;
                if (invoiceConfiguration && invoiceConfiguration.length > 0) {
                    if (invoiceConfiguration[0].padxSettings && invoiceConfiguration[0].padxSettings.length > 0) {
                        const settings = invoiceConfiguration[0].padxSettings;
                        aisInvoice = settings[0].AISInvoiceNumber ? true : false;
                    } else {
                        aisInvoice = false;
                    }
                } else {
                    aisInvoice = false;
                }

                if (activity.invoiceentryId) {
                    const prefix = ', Rg.-Nr. ';
                    let invoiceId = `${activity.invoiceentryId}`;
                    invoiceId = invoiceId.substr(1, 8) + invoiceId.substr(18);

                    const pvsInvoiceId = (invoiceId && aisInvoice) ? prefix + invoiceId : '';

                    activity.content = activity.content + pvsInvoiceId;
                }
            }

            Y.doccirrus.api.activity.generateContent( {
                user,
                data: {
                    activity,
                    _activitiesObj: this && this.context && this.context._activitiesObj
                },
                callback
            } );
        }
        /**
         *  Medications from instock don't have its ingredients, need to add them
         *
         *  @param  {Object}    user        REST user or equivalent
         *  @param  {Object}    activity    See activity-schema.common.js
         *  @param  {Function}  callback    Of the form fn( err )
         */
        async function setMedicationIngredients( user, activity, callback ) {
            const
                isSwiss = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();
            let loadedActivity = activity.toObject ? activity.toObject() : activity;
            if( !( isSwiss && 'MEDICATION' === activity.actType ) ) {
                Y.log( 'setMedicationIngredients not Swiss medication, ignore', 'info', NAME );
                return callback( null, activity );
            }

            let [error, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    'action': 'get',
                    'model': 'medicationscatalog',
                    'user': user,
                    'query': {'phPZN': loadedActivity.phPZN},
                    options: {
                        select: {
                            phIngr: 1,
                            phAtc: 1,
                            phForm: 1
                        }
                    }
                } )
            );

            if( error ) {
                Y.log( `setMedicationIngredients error getting medicationscatalog item ${error.stack || error}`, 'error', NAME );
                return callback( error );
            }

            let ingredients = result && result[0] && result[0].phIngr,
                atc = result && result[0] && result[0].phAtc,
                form = result && result[0] && result[0].phForm;

            if( ingredients && ingredients.length ) {
                activity.phIngr = ingredients;
            }

            if( atc ) {
                activity.phAtc = [atc];
            }

            if( form ) {
                activity.phForm = form;
            }

            callback( null, activity );
        }

        /**
         * Adds the fullname of the person who is editing this activity.
         *
         * Minor: Potentially optimise this when identity and auth are homogenised,
         * because identity has the firstname and lastname...
         *
         * @param   {Object}    user
         * @param   {Object}    activity
         * @param   {Function}  callback
         * @see Y.doccirrus.api.activity.updateEditor
         */
        function updateEditor( user, activity, callback ) {
            Y.doccirrus.api.activity.updateEditor( {
                user,
                data: activity,
                context: this && this.context,
                callback
            } );
        }

        /**
         *  Delete attached documents after the activity is deleted
         *
         *  @param  {Object}    user
         *  @param  {Object}    activity
         *  @param  {Function}  callback
         */
        function deleteAttachments( user, activity, callback ) {
            /*jshint validthis:true */
            Y.log( 'entering deleteAttachments', 'debug', NAME );

            // finally delete all media that belong to the activity
            function deleteMedia( err ) {
                if( err ) {
                    Y.log( `problem in deleting documents: ${err}`, 'error', NAME );
                    callback( err );
                    return;
                }
                Y.doccirrus.mongodb.runDb( {
                    'migrate': true,
                    action: 'delete',
                    model: 'media',
                    user: user,
                    query: {ownerId: activity._id},
                    callback: callback
                } );
            }

            //  delete a single document
            async function forHangingDocument( doc, _cb ) {
                Y.log( `deleteAttachments (forHangingDocument): Deleting hanging document: ${doc._id}`, 'info', NAME );

                let
                    error;

                [error] = await formatPromiseResult(
                    Y.doccirrus.api.document.delete( {
                        user,
                        query: {_id: doc._id.toString()},
                        shouldUpdateActivity: false,
                        deleteFromPractice: true
                    } )
                );

                if( error ) {
                    if( error.code === '116002' ) {
                        // Means document not found. In this case we still want the code to continue
                        return _cb();
                    } else {
                        Y.log( `deleteAttachments: Error in 'api.document.delete' for documentId: ${doc._id.toString()}. Error: ${error.stack || JSON.stringify( error )}. ErrorMessage: ${Y.doccirrus.errorTable.getMessage( {
                            ...error,
                            locale: '-en'
                        } )}`, "error", NAME );
                        return _cb( error );
                    }
                }

                _cb();
            }

            //  delete every remaining document in the database linked to this activity._id
            function deleteHangingDocuments( err, result ) {
                if( err ) {
                    Y.log( `Error querying documents:${JSON.stringify( err )}`, 'error', NAME );
                    callback( err );
                    return;
                }
                result = (result) ? result : [];
                require( 'async' ).each( result, forHangingDocument, deleteMedia );
            }

            //  get any attachments belonging to this activity which may have become unlinked
            function getHangingDocuments( err ) {
                if( err ) {
                    Y.log( 'error in deleting attachments', 'error', NAME );
                    callback( err );
                    return;
                }

                Y.doccirrus.mongodb.runDb( {
                    'migrate': true,
                    'action': 'get',
                    'model': 'document',
                    'user': user,
                    'query': {'activityId': activity._id.toString()},
                    'callback': deleteHangingDocuments
                } );
            }

            // delete every file related to this media
            function forMedia( media, _cb ) {
                Y.doccirrus.media.cacheRemove( media, _cb );
            }

            function deleteFiles( err, result ) {
                if( err ) {
                    Y.log( `Error querying media collection: ${err}`, 'error', NAME );
                    callback( err );
                    return;
                }
                result = (result) ? result : [];
                require( 'async' ).each( result, forMedia, getHangingDocuments );
            }

            // get all media that belong to the activity
            function getMediaList( err ) {
                if( err ) {
                    Y.log( 'error in deleting attachments', 'error', NAME );
                    callback( err );
                    return;
                }

                Y.doccirrus.mongodb.runDb( {
                    'migrate': true,
                    'action': 'get',
                    'model': 'media',
                    'user': user,
                    'query': {'ownerId': activity._id.toString()},
                    'callback': deleteFiles
                } );
            }

            //  delete all attachments linked by the activity
            async function forAttachment( docId, _cb ) {

                if( null === docId ) {
                    callback( null, [] );
                    return;
                }

                if( 'string' !== typeof docId && docId._id ) {
                    docId = docId._id;
                }

                //  sometimes caused by a noew-resolved knockout error, checking in case of legacy data
                if( '[object object]' === docId.toLowerCase() ) {
                    callback( null, [] );
                    return;
                }

                Y.log( `Deleting document: ${docId}`, 'info', NAME );

                let
                    error;

                /**
                 * If deviceLog has reference to attachment then unclaim the devicelog, unclaim the document and media from the current activity
                 * Else if deviceLog does not have reference to attachment then DELETES the attachment from the database
                 */
                [error] = await formatPromiseResult(
                    Y.doccirrus.api.document.delete( {
                        user,
                        query: {_id: docId},
                        shouldUpdateActivity: false,
                        deleteFromPractice: true
                    } )
                );

                if( error ) {
                    if( error.code === '116002' ) {
                        // Means document not found. In this case we still want the code to continue
                        return _cb();
                    } else {
                        Y.log( `deleteAttachments: Error in 'api.document.delete' for documentId: ${docId}. Error: ${error.stack || JSON.stringify( error )}. ErrorMessage: ${Y.doccirrus.errorTable.getMessage( {
                            ...error,
                            locale: '-en'
                        } )}`, "error", NAME );
                        return _cb( error );
                    }
                }

                _cb();
            }

            var attachments = activity.attachments || [];

            require( 'async' ).each( attachments, forAttachment, getMediaList );
        }

        /**
         * create inserted icdObjs as DIAGNOSES
         *
         * triggered by non-schema field "newIcds". Mongoose keeps all fields even in post process.
         *
         *  @param  {Object}    user
         *  @param  {Object}    activity
         *  @param  {Function}  callback
         *  @returns {*}        nothing
         */
        function createIcds( user, activity, callback ) {
            var
                originalData = activity.originalData_,
                //  hasErr = false,
                done = 0,
                cnt,
                arr,
                i;

            if( Array.isArray( activity ) ) {
                activity = activity[0];
            }
            arr = (activity && activity._icdsObj) || (originalData && originalData._icdsObj);

            function join( err ) {
                if( err && // we have an error
                    err.toString() &&
                    // and the error is not a mongo duplicate E11000
                    (-1 === err.toString().indexOf( 'E11000' )) ) {
                    //  hasErr = true;
                    Y.log( `Error: Pre-processing new ICDs failed: ${JSON.stringify( err )}  /  ${err.toString()}`, 'warn', NAME );
                    Y.log( 'Cancelling write process of activity. ', 'info', NAME );
                    return callback( err );
                }
                done++;
                if( done === cnt ) {
                    return callback( null, activity );
                }
            }

            if( !user ) {
                Y.log( 'ERROR:  IGNORING:  createIcds called without user: ', 'info', NAME );
                return callback( null, activity );
            }

            if( !Array.isArray( arr ) ) {
                Y.log( 'IGNORING:  createIcds called without icds: ', 'info', NAME );
                return callback( null, activity );
            }

            if( activity.newIcds || (originalData && originalData.newIcds) ) {

                i = arr.length;
                cnt = i;
                Y.log( `WRITING:  createIcds icds: ${cnt}`, 'info', NAME );

                while( i ) {
                    i--;
                    // icdsObj not setting the employeeId causes failure
                    arr[i].employeeId = arr[i].employeeId || activity.employeeId;
                    arr[i].timestamp = arr[i].timestamp || (new Date()).toISOString();
                    arr[i].caseFolderId = activity.caseFolderId;
                    arr[i].status = 'VALID';
                    arr[i].diagnosisTreatmentRelevance = 'TREATMENT_RELEVANT';
                    arr[i].userContent = arr[i].content;
                    arr[i].catalogShort = 'ICD-10';
                    arr[i].catalog = true;
                    arr[i].patientId = activity.patientId;
                    arr[i].locationId = activity.locationId;
                    arr[i].skipcheck_ = true;

                    Y.doccirrus.mongodb.runDb(
                        {
                            'migrate': true,
                            user: user,
                            action: 'post',
                            model: 'activity',
                            data: arr[i]
                        },
                        join );
                }

            } else {
                return callback( null, activity );
            }
        }

        /**
         * check extensible flag of current catalog
         *
         * allow/deny saving activity
         *
         * @param   {Object}    user
         * @param   {Object}    activity
         * @param   {Function}  callback
         * @returns {*}         nothing
         */
        function checkCatalog( user, activity, callback ) {
            // TODO: migration
            const isAdmin = Y.doccirrus.auth.isAdminUser( user );
            let inCaseConfig,
                allowCustomCodesApplies = Y.doccirrus.schemas.incaseconfiguration.types.AllowCustomCodeFor_E.list
                    .map( el => el.val )
                    .includes( activity.actType ),
                allowCustomValueApplies = Y.doccirrus.schemas.incaseconfiguration.types.AllowCustomValueFor_E.list
                    .map( el => el.val )
                    .includes( activity.actType ),
                async = require( 'async' );

            if( isAdmin || !(activity.catalogShort || activity.actType === 'MEDDATA') ) {
                // is admin or not using a catalog so short-circuit.
                return callback( null, activity );
            }

            Y.log( `checkCatalog: catalogShort=${activity.catalogShort}`, 'debug', NAME );

            if( 'HMV-GHD' === activity.catalogShort && 'MEDICATION' === activity.actType ) {
                Y.log( `checkCatalog: GHD is always allowed`, 'debug', NAME );
                // this is a GHD override, by agreement, EXTMOJ-443
                return callback( null, activity );
            }

            async.series( [
                function( done ) {
                    Y.doccirrus.api.incaseconfiguration.readConfig( {
                        user,
                        callback: ( err, config ) => {
                            if( err ) {
                                Y.log( `could not get incase config to check allowCustomCodeFor setting ${err}`, 'error', NAME );
                                return done( err );
                            }
                            inCaseConfig = config;
                            done();
                        }
                    } );
                },
                async function( done ) {
                    const customCodeAllowed = (inCaseConfig.allowCustomCodeFor && inCaseConfig.allowCustomCodeFor.includes( activity.actType )),
                        customValueAllowed = (inCaseConfig.allowCustomValueFor && inCaseConfig.allowCustomValueFor.includes( activity.actType ));
                    // There is no fast way to check if medication was created from catalog and we do not want slow MMI lookup.
                    // UI does not allow creation, too.
                    const fromCatalog = activity.catalog || ('MEDICATION' === activity.actType && activity.phPZN);

                    if( fromCatalog || customCodeAllowed || customValueAllowed ) {
                        Y.log( `checkCatalog: activity passed test: fromCatalog=${fromCatalog} OR customCodeAllowed=${customCodeAllowed} OR customValueAllowed=${customValueAllowed} for activity.actType=${activity.actType}`, 'debug', NAME );
                        return done();
                    }

                    const catalog = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                        actType: activity.actType,
                        short: activity.catalogShort
                    } );

                    let err;
                    if( catalog && !(allowCustomCodesApplies || allowCustomValueApplies) ) {
                        if( true === catalog.extensible ) {
                            Y.log( `checkCatalog: activity passed test: catalogDescriptor=${JSON.stringify( catalog )} AND allowCustomCodesApplies is not set for activity.actType=${activity.actType}`, 'debug', NAME );
                            return done();
                        }
                        Y.log( `checkCatalog: activity test failed: catalog.extensible=false`, 'debug', NAME );
                        return done( Y.doccirrus.errors.rest( 5000, '', true ) );
                    }

                    if( catalog ) {
                        let count;
                        [err, count] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'catalogusage',
                                action: 'count',
                                query: {
                                    locationId: activity.locationId,
                                    seq: activity.code
                                },
                                options: {
                                    limit: 1
                                }
                            } )
                        );
                        if( err ) {
                            Y.log( `checkCatalog: error geting catalogusages: ${err.stack || err}`, 'error', NAME );
                            return done( err );
                        }

                        if( count ) {
                            Y.log( `checkCatalog: activity passed test: activity.code=${activity.code}/activity.locationId=${activity.locationId} combination found ${count} times in catalogusage`, 'debug', NAME );
                            return done();
                        }
                        Y.log( `checkCatalog: activity test failed: activity.code=${activity.code}/activity.locationId=${activity.locationId} combination not found in catalogusage`, 'debug', NAME );
                        return done( Y.doccirrus.errors.rest( 5000, '', true ) );
                    }

                    if( activity.status !== 'LOCKED' && activity.actType === 'MEDDATA' && 'PREPARED' !== activity.status ) {
                        //check if meddata type already known
                        if( activity.medData && activity.medData.length ) {
                            const
                                getAllMeddataTypes = promisifyArgsCallback( Y.doccirrus.api.meddata.getAllMeddataTypes ),
                                activityMedTypes = activity.medData.map( el => el.type );

                            let medDataTypes;
                            [err, medDataTypes] = await formatPromiseResult(
                                getAllMeddataTypes( {user} )
                            );
                            if( err ) {
                                Y.log( `checkCatalog: error geting all Meddata Types: ${err.stack || err}`, 'error', NAME );
                                return done( err );
                            }

                            medDataTypes = Object.keys( medDataTypes || {} );

                            let newTypes = _.difference( activityMedTypes, medDataTypes );
                            if( newTypes && newTypes.length === 0 ) {
                                //all provided in MEDDATA types are already known
                                return done();
                            }
                        }

                        Y.log( `checkCatalog: activity test failed: You can not create new types of medications.`, 'debug', NAME );
                        return done( Y.doccirrus.errors.rest( 5003, '', true ) );
                    }

                    if( activity.status !== 'LOCKED' ) {
                        Y.log( `checkCatalog: activity test failed: catalogDescriptor not found`, 'debug', NAME );
                        return done( Y.doccirrus.errors.rest( 5001, '', true ) );
                    }

                    done();
                }
            ], function( err ) {
                if( err ) {
                    Y.log( `could not check catalog of activity ${err}`, 'error', NAME );
                    return callback( err );
                }
                callback( err, activity );
            } );
        }

        /**
         * Recalculate record in 'catalogusage' collection for current activity
         *
         *  if deleteEntryHomeCat is true, remove appropriate record from 'catalogusage'
         *  if deleteEntryHomeCat is false, decrease usage of appropriate record in 'catalogusage'
         *
         * This does not change the activity, will call back immeediately so as not to hold up the user, EXTMOJ-2050
         *
         * @method recalculateCatalogUsage
         * @param {Object} user
         * @param {Object} activity
         * @param {Function} callback
         */

        async function recalculateCatalogUsage( user, activity, callback ) {
            const
                getModelP = util.promisify( Y.doccirrus.mongodb.getModel ),
                query = Y.doccirrus.api.catalogusage.getQueryForActivity( activity.toObject ? activity.toObject() : activity );

            let
                err, catalogUsageModel,
                inc = ('CANCELLED' === activity.status) ? -1 : 1;

            //  user does not need to wait for this, call back immediately
            callback( null, activity );     //  eslint-disable-line callback-return

            [err, catalogUsageModel] = await formatPromiseResult( getModelP( user, 'catalogusage', true ) );

            if( err ) {
                //  should never happen
                Y.log( `Could not create catalog usage model: ${err.stack || err}`, 'error', NAME );
                return;
            }

            //  Update the catalog usage model

            [err] = await formatPromiseResult(
                catalogUsageModel.mongoose.findOneAndUpdate( query, {$inc: {count: inc}}, {} ).exec()
            );

            if( err ) {
                Y.log( `Problem updating catalog usage view mongoose: ${err.stack || err}` );
            }

            // Update record in 'catalogusage' collection
            // Was previously aggregateSeq step

            if( !activity.code || 'VALID' !== activity.status ) {
                return;
            }

            // TODO: review this, seems like it can be optimized

            Y.doccirrus.api.incaseconfiguration.readConfig( {
                user,
                callback: ( err, result ) => {
                    if( err ) {
                        Y.log( `aggregateSeq: could not get incase config to check ${err}`, 'warn', NAME );
                    }

                    const restrictSaveInHouseCatalog = result && true === result.restrictSaveInHouseCatalog;
                    const isAdmin = Y.doccirrus.auth.isAdminUser( user );

                    if( restrictSaveInHouseCatalog && !isAdmin ) {
                        Y.log( `creating catalogusage entries is restricted for users not in admin group`, 'debug', NAME );
                        return;
                    }

                    Y.doccirrus.api.catalogusage.calculateUsageIndexSeq( {
                        user: user,
                        data: {
                            activity: activity.toObject ? activity.toObject() : activity
                        },
                        callback: function( err ) {
                            if( err ) {
                                // note error in the log, doe snot block save of activity
                                Y.log( `Problem updating catalogUsageIndexSeq for activity ${activity._id}: ${err.stack || err}` );
                            }
                        }
                    } );
                }
            } );
        }

        /**
         * Recalculate record in 'catalogusage' collection for current activity
         * @method recalculateCatalogUsageOnDelete
         * @param {Object} user
         * @param {Object} activity
         * @param {Function} callback
         */
        function recalculateCatalogUsageOnDelete( user, activity, callback ) {
            const
                async = require( 'async' );
            let
                inc = -1;
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'catalogusage', true, next );
                },
                function( catalogUsageModel, next ) {
                    catalogUsageModel.mongoose.findOneAndUpdate( Y.doccirrus.api.catalogusage.getQueryForActivity( activity.toObject() ), {$inc: {count: inc}}, {}, next );
                }
            ], ( err ) => callback( err, activity ) );
        }

        /**
         * Checks and executes weak queue if ti is present
         * @param   {Object}    user
         * @param   {Object}    activity
         * @param   {Function}  callback
         * @returns {*}
         */
        function checkWeakQueue( user, activity, callback ) {
            var
                context = this.context;
            if( !context || !context.isLastInBatch || !context.weakQueueKey ) {
                return setImmediate( callback );
            } else {
                const
                    queue = Y.doccirrus.weakQueue.getQueue( context.weakQueueKey ),
                    async = require( 'async' ),
                    keys = Array.from( queue.keys() );
                async.eachSeries( keys, ( key, next ) => {
                    const
                        fn = queue.get( key );
                    fn( next );
                }, callback );
            }
        }

        /**
         * Updates Bewilligte Leistung counter for related Schein(s)
         * This is main entry point for BL counting
         *
         * Every changes of treatment amount in the casefolder (treatment created, deleted, cancelled)
         *  triggers complete casefolder recalculation.
         *
         * @method updateBLCount
         * @param {Object} user
         * @param {Object} activity
         * @param {Function} callback
         */

        //  indirection to call back immediately, recalculate Bewilligte Leistung as usual but do not keep process chain waiting

        function updateBLCountNoWait( user, activity, callback ) {
            updateBLCount( user, activity, onBLCountComplete );

            function onBLCountComplete( err ) {
                if( err ) {
                    Y.log( `Problem recalculating Bewilligte Leistung in casefolder for activity ${activity._id}: ${err.stack || err}`, 'error', NAME );
                }
            }

            callback( null, activity );
        }

        function updateBLCount( user, activity, callback ) {
            var
                context = this.context,
                async = require( 'async' ),
                previousActivityCode = activity.originalData_ && activity.originalData_.code,
                previousCaseFolder = activity.originalData_ && activity.originalData_.caseFolderId,
                isBLActivity = 'TREATMENT' === activity.actType || Y.doccirrus.schemas.activity.isScheinActType( activity.actType ),
                allowedStatuses = ['DELETED', 'VALID', 'CANCELLED', 'CREATED'],
                isAllowedStatus = (-1 !== allowedStatuses.indexOf( activity.status )),
                openedStatuses = ['VALID', 'APPROVED'];

            //  only applies to scheine and treatments?
            if( !isAllowedStatus || !isBLActivity ) {
                return callback( null, activity );
            }

            updateBL();

            function updateBL() {

                //  when in a batch operation, only run the BL recalculation after whole batch is complete
                if( context && 'undefined' !== typeof context.weakQueueKey ) {
                    let
                        queue = Y.doccirrus.weakQueue.getQueue( context.weakQueueKey );
                    queue.set( updateBLCount, function( callback ) {
                        updateBLCount.call( {}, user, activity, callback );
                    } );
                    return setImmediate( callback );
                }

                //  if moving activities between casefolders then the BL calculation must be run on both
                async.parallel( [
                    function( done ) {
                        updateBLInCaseFolder( activity.caseFolderId, true, done );
                    },
                    function( done ) {
                        if( previousCaseFolder && previousCaseFolder !== activity.caseFolderId && !activity.wasNew ) {
                            updateBLInCaseFolder( previousCaseFolder, false, done );
                        } else {
                            done(); // eslint-disable-line callback-return
                        }
                    }
                ], function( err ) {
                    callback( err, activity );
                } );
            }

            function updateBLInCaseFolder( caseFolderId, updateTable, callback ) {
                async.waterfall( [
                    function( next ) {
                        Y.doccirrus.api.location.getLocationSet( {
                            user,
                            query: {
                                _id: activity.locationId
                            },
                            options: {
                                select: {
                                    _id: 1
                                },
                                lean: true
                            },
                            callback( err, locations ) {
                                if( err ) {
                                    return next( err );
                                }
                                next( null, locations.map( location => location._id.toString() ) );
                            }
                        } );
                    },
                    function( validLocations, next ) {
                        if( Y.doccirrus.schemas.activity.isScheinActType( activity.actType ) ) {
                            setImmediate( next, null, activity.fk4235Set && activity.fk4235Set.length );
                        } else {
                            let
                                _query = {
                                    patientId: activity.patientId,
                                    caseFolderId: caseFolderId,
                                    locationId: activity.locationId,
                                    status: {$in: openedStatuses},
                                    $or: [
                                        {'fk4235Set.fk4244Set.fk4244': {$in: [activity.code, previousActivityCode]}},
                                        {'fk4235Set.fk4256Set.fk4244': {$in: [activity.code, previousActivityCode]}}
                                    ]
                                };
                            if( validLocations.length ) {
                                _query.locationId = {
                                    $in: validLocations
                                };
                            }
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                action: 'count',
                                model: 'activity',
                                query: _query
                            }, next );
                        }
                    }
                ], function( err, results ) {
                    if( err ) {
                        return callback( err );
                    }
                    if( results ) {
                        Y.doccirrus.api.activity.recalcBLInCaseFolder( {
                            user: user,
                            query: {
                                patientId: activity.patientId,
                                caseFolderId: caseFolderId
                            },
                            callback: function( err ) {
                                if( updateTable ) {
                                    Y.doccirrus.communication.emitEventForUser( {
                                        targetId: user.identityId,
                                        event: 'system.UPDATE_ACTIVITIES_TABLES',
                                        msg: {
                                            data: caseFolderId
                                        }
                                    } );
                                }
                                callback( err );
                            }
                        } );
                    } else {
                        callback( null ); // eslint-disable-line callback-return
                    }
                } );
            }
        }

        /**
         * Removes relations between child and parent Schein.
         *  If current activity is last child, removes mark parent Schein as parent.
         * @method removeScheinRelations
         * @param {Object} user
         * @param {Object} activity
         * @param {Function} callback
         * @returns {*}
         */
        function removeScheinRelations( user, activity, callback ) {
            var async = require( 'async' );

            function removeRelation( relation, done ) {
                if( relation._id.toString() === activity._id.toString() ) {
                    return done();
                }
                var updateData = {
                    activities: relation.activities.filter( function( item ) {
                        return item !== activity._id.toString();
                    } )
                };
                if( 1 === updateData.activities.length && relation._id.toString() === updateData.activities[0] ) {
                    updateData.activities = [];
                }
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'update',
                    migrate: true,
                    query: {
                        _id: relation._id
                    },
                    data: updateData
                }, done );
            }

            if( ('SCHEIN' === activity.actType || 'PKVSCHEIN' === activity.actType || 'BGSCHEIN' === activity.actType) && 0 < activity.activities.length ) {
                async.waterfall( [
                    function( next ) {
                        Y.doccirrus.mongodb.runDb( {
                            'migrate': true,
                            user: user,
                            model: 'activity',
                            action: 'get',
                            query: {
                                activities: activity._id
                            }
                        }, next );
                    },
                    function( relations, next ) {
                        if( 0 < relations.length ) {
                            async.each( relations, removeRelation, next );
                        } else {
                            return next();
                        }
                    }
                ], function( err ) {
                    if( err ) {
                        return callback( err );
                    }
                    return callback( err, activity );
                } );

            } else {
                return callback( null, activity );
            }
        }

        /**
         * Adds relations between child and parent Schein.
         *  If current activity is first child, marks parent Schein as parent(adds link for itself to parent Schein)
         *  Parent Schein is Schein which has more than 1 relations.
         *  Removes relations if status is CANCELLED
         *
         *  @method addScheinRelations
         *  @param  {Object}    user
         *  @param  {Object}    activity
         *  @param  {Function}  callback
         *  @returns {*}
         */
        function addScheinRelations( user, activity, callback ) {
            var async = require( 'async' );
            if(
                ('SCHEIN' === activity.actType || 'PKVSCHEIN' === activity.actType || 'BGSCHEIN' === activity.actType) &&
                activity.activities &&
                (1 === activity.activities.length)
            ) {
                if( 'CANCELLED' === activity.status ) {
                    removeScheinRelations( user, activity, callback );
                } else {
                    async.waterfall( [
                        function( next ) {
                            Y.doccirrus.mongodb.runDb( {
                                'migrate': true,
                                user: user,
                                model: 'activity',
                                action: 'get',
                                query: {
                                    _id: activity.activities[0]
                                }
                            }, next );
                        },
                        function( relations, next ) {
                            var alreadyHas = relations[0] && relations[0].activities.some( function( item ) {
                                    return item === activity._id.toString();
                                } ),
                                dataToSave = {},
                                markedAsParent = false;

                            if( alreadyHas ) {
                                return next();
                            }

                            dataToSave.activities = relations[0].activities.map( function( item ) {
                                if( !markedAsParent ) {
                                    markedAsParent = relations[0]._id.toString() === item.toString();
                                }
                                return item.toString();
                            } );

                            dataToSave.activities.push( activity._id.toString() );

                            if( !markedAsParent ) {
                                dataToSave.activities.push( relations[0]._id.toString() );
                            }
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'activity',
                                action: 'update',
                                migrate: true,
                                query: {
                                    _id: relations[0]._id
                                },
                                data: dataToSave
                            }, next );

                        }
                    ], function( err ) {
                        if( err ) {
                            return callback( err );
                        }
                        return callback( err, activity );
                    } );

                }

            } else {
                return callback( null, activity );
            }
        }

        /**
         * Adds/removes attached content on patient object
         *
         * Sets from this activity:
         *
         *      patient.attachedActivity
         *      patient.attachedContent
         *      patient.attachedSeverity
         *
         * Depending on status: if activity is DELETED or CANCELLED these fields are removed from the patient object
         *
         * Since this does not change the activity, we do not need to wait for it in the activity post-process, and
         * will call back immediately - EXTMOJ-2050
         *
         * TODO: This also causes activity.content to be recalculated (with backmappings. etc).  That seems inefficient,
         * and should be refactored when possible
         *
         * @method changeAttachedPatientContent
         * @param {Object} user
         * @param {Object} activity
         * @param {Function} callback
         */
        function changeAttachedPatientContent( user, activity, callback ) {

            Y.doccirrus.api.patient.updateAttachedContent( {
                user: user,
                context: this && this.context,
                data: {activity: activity},
                callback: onUpdatePatientContent
            } );

            function onUpdatePatientContent( err ) {
                if( err ) {
                    Y.log( `Problem updating patient content with activity ${activity._id}: ${err.stack || err}`, 'warn', NAME );
                }
            }

            callback( null, activity );
        }

        /**
         *  Set the apkState variable of other activities in the same casefolder (from today) to match the apkState
         *  of the passed activity.  Except in the case of invoices (MOJ-7558)
         *
         *  apkState is a string which may be 'IN_PROGRESS' or 'DOCUMENTED' or 'VALIDATED'
         *
         *  @param  user
         *  @param  activity
         *  @param  callback
         */

        function setApkState( user, activity, callback ) {
            Y.doccirrus.utils.setApkState( user, activity, callback );
        }

        /**
         * Removes attached content from activity
         * @method removeAttachedContent
         * @param {Object} user
         * @param {Object} activity
         * @param {Function} callback
         */
        function removeAttachedContent( user, activity, callback ) {
            const
                async = require( 'async' ),
                context = this && this.context;
            let
                isAttachedActivity = false;

            async.waterfall( [
                function( next ) {
                    let
                        cachedPatient = getCollectionCache( {
                            context,
                            collection: 'patient',
                            key: activity.patientId
                        } );
                    if( cachedPatient ) {
                        return setImmediate( next, null, cachedPatient );
                    }
                    Y.doccirrus.mongodb.runDb( {
                        'migrate': true,
                        user: user,
                        model: 'patient',
                        action: 'get',
                        query: {
                            _id: activity.patientId
                        }
                    }, ( err, results ) => {
                        if( err ) {
                            return next( err );
                        }
                        setCollectionCache( {
                            context,
                            collection: 'patient',
                            key: activity.patientId,
                            data: results[0]
                        } );
                        next( null, results[0] );
                    } );
                },
                function( patient, next ) {
                    if( patient && patient.attachedActivity === activity._id.toString() ) {
                        isAttachedActivity = true;
                        Y.doccirrus.api.patient.detachActivity( {
                            user: user,
                            query: {
                                patientId: patient._id
                            },
                            callback: next
                        } );
                    } else {
                        return next();
                    }
                }
            ], function( err ) {
                if( err ) {
                    return callback( err );
                }
                callback( err, activity );          //  eslint-disable-line callback-return
                if( isAttachedActivity ) {
                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: user.identityId,
                        event: 'system.NEW_PATIENT_ATTACHED_CONTENT',
                        msg: {
                            data: {
                                content: '',
                                severity: ''
                            }
                        }
                    } );
                }
            } );

        }

        /**
         * Checks if current Shein can be saved - if there are no treatments/diagnoses without Shein in quarter.
         *  start point is always beginning of quarter
         *  end point could be:
         *      closest Schein to start point
         *      next Shein after current (upward = true)
         *
         * @method checkForConnectedActivity
         * @param {Object} config
         * @param {Object} config.user
         * @param {Object} config.activity activity date
         * @param {Boolean} [config.isCaseFolderChanged=false]
         * @param {Boolean} [config.isLocationModified=false]
         * @param {Boolean} [config.isQuarterDependent=false] if true, function will use quarter border(current activity timestamp defines quarter),
         *  if not, will check whole history of casefolder
         * @param {Boolean} [config.upward=false] If true, function will check next Schein after current ( current Schein date < next Schein date)
         * @param {Function} config.callback
         * @private
         */
        function checkForConnectedActivity( config ) {
            var
                async = require( 'async' ),
                moment = require( 'moment' ),
                user = config.user,
                activity = config.activity,
                callback = config.callback,
                isLocationModified = config.isLocationModified,
                upward = config.upward || isLocationModified,
                isQuarterDependent = config.isQuarterDependent,
                isCaseFolderChanged = config.isCaseFolderChanged,
                currentDate = moment( activity.timestamp ).toISOString(),
                endQuarter = moment( currentDate ).endOf( 'quarter' ).toISOString(),
                startDate = moment( currentDate ).startOf( 'quarter' ).toISOString(),
                endDate = currentDate,
                forbiddenStatuses = ['BILLED', 'CANCELLED'];

            function countDiagnosesAndTreatments( callback ) {

                // checks for treatments/diagnoses without Schein, in provided range.
                Y.log( `Checking if there are treatments or diagnoses in range: ${startDate.toString()} - ${endDate.toString()}`, 'debug', NAME );

                var query,
                    timestamp = {
                        $lt: new Date( endDate )
                    };
                if( isQuarterDependent ) {
                    timestamp.$gt = new Date( startDate );
                }
                query = {
                    locationId: activity.locationId,
                    patientId: activity.patientId,
                    caseFolderId: activity.caseFolderId,
                    timestamp: timestamp
                };
                async.series( {
                    diagnosesCount( next ) {
                        let
                            diagnosesQuery = Object.assign( {
                                actType: 'DIAGNOSIS',
                                status: {
                                    $nin: ['APPROVED', 'CANCELLED']
                                }
                            }, query );
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            action: 'count',
                            model: 'activity',
                            query: diagnosesQuery
                        }, next );
                    },
                    treatmentsCount( next ) {
                        let
                            treatmentsQuery = Object.assign( {
                                actType: 'TREATMENT',
                                status: {
                                    $nin: ['BILLED', 'CANCELLED']
                                }
                            }, query );
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            action: 'count',
                            model: 'activity',
                            query: treatmentsQuery
                        }, next );
                    }
                }, function( err, result ) {
                    if( err ) {
                        return callback( err );
                    }
                    callback( null, (result.diagnosesCount || 0) + (result.treatmentsCount || 0) );
                } );
            }

            async.series( [
                function( next ) {
                    var timestamp = {
                            $lt: new Date( currentDate )
                        },
                        _query = {
                            timestamp: timestamp,
                            actType: activity.actType,
                            patientId: activity.patientId,
                            caseFolderId: activity.caseFolderId,
                            locationId: activity.locationId,
                            status: {
                                $nin: forbiddenStatuses
                            },
                            _id: {
                                $ne: activity._id.toString()
                            }
                        };
                    if( isQuarterDependent ) {
                        timestamp.$gt = new Date( startDate );
                    }
                    // looking for schein which is closest to beginning of the quarter

                    Y.doccirrus.mongodb.runDb( {
                            user: user,
                            action: 'get',
                            model: 'activity',
                            query: _query,
                            options: {
                                limit: 1,
                                select: {
                                    timestamp: 1
                                },
                                lean: true,
                                sort: {
                                    timestamp: 1
                                }
                            }
                        },
                        function( err, results ) {
                            if( err ) {
                                return next( err );
                            }
                            if( results && results[0] ) {
                                // if there is Schein with older( < then date of current Schein ) date,
                                // don't need to go upward of current Schein, because of the older Schein will cover treatments/diagnoses.
                                upward = false;
                                endDate = moment( results[0].timestamp ).toISOString();
                            }
                            next();
                        }
                    );

                },
                function( next ) {
                    var timestamp = {};
                    /**
                     *  1. upward - if need to check in larger range, looking for Schein which goes after current Schein.
                     *      Can happen only for GKV Schein in case of moving Schein from beginning of quarter to another quarter.
                     *  2. If Schein moved to another case folder. Need to check till next Schein/(current date or end of quarter).
                     */
                    if( upward && (isQuarterDependent || isCaseFolderChanged || isLocationModified) ) {
                        let
                            _query;
                        if( isQuarterDependent ) {
                            endDate = endQuarter;
                        } else {
                            endDate = moment().toISOString();
                        }
                        timestamp = {
                            $gt: new Date( currentDate ),
                            $lt: new Date( endDate )
                        };
                        _query = {
                            timestamp: timestamp,
                            actType: activity.actType,
                            patientId: activity.patientId,
                            caseFolderId: activity.caseFolderId,
                            locationId: activity.locationId,
                            status: {
                                $nin: forbiddenStatuses
                            },
                            _id: {
                                $ne: activity._id.toString()
                            }
                        };

                        Y.doccirrus.mongodb.runDb( {
                                user: user,
                                action: 'get',
                                model: 'activity',
                                query: _query,
                                options: {
                                    limit: 1,
                                    select: {
                                        timestamp: 1
                                    },
                                    lean: true,
                                    sort: {
                                        timestamp: 1
                                    }
                                }
                            },
                            function( err, results ) {
                                if( err ) {
                                    return next( err );
                                }
                                if( results && results[0] ) {
                                    endDate = moment( results[0].timestamp ).toISOString();
                                }
                                next();
                            }
                        );

                    } else {
                        return next();
                    }
                },
                function( next ) {
                    countDiagnosesAndTreatments( next );
                }
            ], function( err, results ) {
                if( results && results[2] ) {
                    Y.log( `There are treatments/diagnoses which are no longer connected to a valid Schein. Time range: ${startDate} - ${endDate}`, 'warn', NAME );
                    if( isLocationModified ) {
                        return callback( new Y.doccirrus.commonerrors.DCError( 18021 ) );
                    }
                    return callback( Y.doccirrus.errors.rest( 18001, '', true ) );
                }
                callback( err );
            } );
        }

        /**
         * Checks:
         *  if current Schein is child and timestamp is less(earlier) than timestamp of parent Schein, throws an error.
         *  All Treatments/diagnoses should be connected to a valid Schein in current/previous quarter(computed with current/previous Schein timestamp)
         * @method checkTimestamp
         * @param {Object} user
         * @param {Object} activity
         * @param {Function} callback
         * @returns {*}
         */
        async function checkTimestamp( user, activity, callback ) {
            var async = require( 'async' ),
                moment = require( 'moment' ),
                skipCaseFolderCheck = activity.skipCaseFolderCheck || (activity.originalData_ && activity.originalData_.skipCaseFolderCheck),
                context = this && this.context,
                forceScheinCheck = context && context.forceScheinCheck;

            /**
             * logic:
             *  1. Define insurance type of activity
             *      If Public(GKV) - start point is beginning of current activity quarter
             *      if not - no start point
             *  2. check if there is 'opened'(not cancelled/billed) Schein.
             */
            function checkTreatmentDiagnosisTimestamp() {
                var currentDate = moment( activity.timestamp ).toISOString(),
                    startPoint = moment( currentDate ).startOf( 'quarter' ).toISOString(),
                    scheinTypes = ['SCHEIN', 'PKVSCHEIN', 'BGSCHEIN', 'AMTSSCHEIN'],
                    forbiddenStatuses = ['BILLED', 'CANCELLED'],
                    skipCheck = false,
                    locationId = activity.locationId.toString(),
                    locationQuery = {$in: [locationId]},
                    timestamp = {
                        $lt: new Date( currentDate )
                    };

                async.series( {
                    getCaseFolder( next ) {
                        if( Y.doccirrus.schemas.casefolder.getPreparedCaseFolderId() === activity.caseFolderId ) {
                            skipCheck = true;
                            return next();
                        }
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'casefolder',
                            action: 'get',
                            migrate: true,
                            query: {
                                _id: activity.caseFolderId
                            }
                        }, function( err, results ) {
                            if( err ) {
                                return next( err );
                            }
                            if( results[0] ) {
                                switch( results[0].type ) {
                                    // MOJ-14319: [OK] [CASEFOLDER]
                                    case 'PUBLIC':
                                    case 'PUBLIC_A':
                                        timestamp.$gt = new Date( startPoint );
                                }
                                switch( results[0].additionalType ) {
                                    case Y.doccirrus.schemas.casefolder.additionalTypes.ERROR:
                                    case Y.doccirrus.schemas.casefolder.additionalTypes.QUOTATION:
                                    case Y.doccirrus.schemas.casefolder.additionalTypes.CARDIO:
                                    case Y.doccirrus.schemas.casefolder.additionalTypes.DOQUVIDE:
                                    case Y.doccirrus.schemas.casefolder.additionalTypes.DQS:
                                    case Y.doccirrus.schemas.casefolder.additionalTypes.CARDIACFAILURE:
                                    case Y.doccirrus.schemas.casefolder.additionalTypes.STROKE:
                                    case Y.doccirrus.schemas.casefolder.additionalTypes.AMTS:
                                        skipCheck = true;
                                        break;
                                }
                            }
                            next();
                        } );
                    },
                    /*
                     * check for sub location
                     */
                    getLocationQuery( next ) {
                        Y.doccirrus.api.location.getLocationSet( {
                            user,
                            query: {
                                _id: locationId
                            },
                            options: {
                                select: {
                                    _id: 1
                                },
                                lean: true
                            },
                            callback( err, locations ) {
                                if( err ) {
                                    return next( err );
                                }
                                if( locations.length ) {
                                    locationQuery.$in = locations.map( location => location._id.toString() );
                                }
                                next();
                            }
                        } );
                    },
                    countSchein( next ) {
                        let
                            _query = {
                                patientId: activity.patientId,
                                caseFolderId: activity.caseFolderId,
                                actType: {
                                    $in: scheinTypes
                                },
                                timestamp: timestamp,
                                status: {
                                    $nin: forbiddenStatuses
                                }
                            };

                        if( skipCheck ) {
                            return setImmediate( next );
                        }
                        _query.locationId = locationQuery;

                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'activity',
                            action: 'count',
                            migrate: true,
                            query: _query
                        }, next );
                    }
                }, function( err, result ) {
                    if( err ) {
                        return callback( err, activity );
                    }
                    if( !skipCheck && !result.countSchein ) {
                        Y.log( `There is no Schein for current treatment. Time range: ${startPoint} - ${currentDate}`, 'warn', NAME );
                        return callback( Y.doccirrus.errors.rest( 18002, Y.doccirrus.errorTable.getMessages( {code: 18002} ), true ) );
                    }
                    callback( null, activity );
                } );
            }

            if( skipCaseFolderCheck ) {
                return callback( null, activity );
            }
            if( 'CANCELLED' === activity.status ) {
                return callback( null, activity );
            }
            Y.log( `Checking ${activity.actType} timestamp, id:${activity._id}` && activity._id.toString(), 'debug', NAME );

            let scheinTypes = [];
            if( true === forceScheinCheck ) {
                let settingsId = Y.doccirrus.schemas.activitysettings.getId(),
                    [err, activitySettings] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'activitysettings',
                            action: 'get',
                            query: {_id: settingsId}
                        } )
                    );
                if( err ) {
                    Y.log( `checkTimestamp: Error getting activitysettings: ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }
                scheinTypes = (activitySettings && activitySettings[0] && activitySettings[0].settings || []).filter( el => el.schein ).map( el => el.actType );
            }
            let hasInvoiceLicense;
            let isTreatment;
            switch( activity.actType ) {
                case 'SCHEIN':
                    checkSheinTimestamp( {user, activity, isQuarterDependent: true}, callback );
                    break;
                case 'PKVSCHEIN':
                case 'BGSCHEIN':
                    checkSheinTimestamp( {user, activity}, callback );
                    break;
                case 'TREATMENT':
                case 'DIAGNOSIS':
                    if( 'DELETED' === activity.status ) {
                        return callback( null, activity );
                    }
                    hasInvoiceLicense = Y.doccirrus.licmgr.hasBaseServices( user.tenantId, Y.doccirrus.schemas.settings.baseServices.INVOICE );
                    isTreatment = activity.actType === 'TREATMENT';
                    if( isTreatment || hasInvoiceLicense ) {
                        checkTreatmentDiagnosisTimestamp();
                        break;
                    }
                default:
                    if( true === forceScheinCheck && scheinTypes.includes( activity.actType ) ) {
                        checkTreatmentDiagnosisTimestamp();
                    } else {
                        return callback( null, activity );
                    }
            }
        }

        /**
         * check "Schein" timestamp and all connected activities(Treatment, Diagnosis)
         * @param {Object} params
         * @param {Object} params.user
         * @param {Object} params.activity
         * @param {Boolean} [params.isQuarterDependent]
         * @param {Function} callback
         */
        function checkSheinTimestamp( params, callback ) {
            const
                moment = require( 'moment' ),
                {isQuarterDependent = false, activity, user} = params;
            let
                isTimestampChanged = !activity.isNew && activity.isModified( 'timestamp' ),
                isCaseFolderChanged = !activity.isNew && activity.isModified( 'caseFolderId' ),
                isLocationModified = !activity.isNew && activity.isModified( 'locationId' );

            function doCheck() {
                async.parallel( [
                    function( done ) {
                        //if current Schein is child and timestamp is less(earlier) than timestamp of parent Schein, throws an error.
                        if( 1 === activity.activities.length ) {
                            Y.doccirrus.mongodb.runDb( {
                                'migrate': true,
                                user: user,
                                model: 'activity',
                                action: 'get',
                                query: {
                                    _id: activity.activities[0]
                                }
                            }, function( err, results ) {
                                if( err ) {
                                    return callback( err );
                                }
                                if( results && results[0] ) {
                                    if( activity.timestamp < results[0].timestamp ) {
                                        return done( Y.doccirrus.errors.rest( 5002, '', true ) );
                                    }
                                }
                                done( err, activity );
                            } );
                            return;
                        }
                        done( null, activity );
                    },
                    function( done ) {

                        if( !isTimestampChanged && !isCaseFolderChanged ) {
                            return done();
                        }
                        // check for current quarter

                        checkForConnectedActivity( {
                            user: user,
                            activity: activity,
                            callback: done,
                            isQuarterDependent: isQuarterDependent
                        } );

                    },
                    function( done ) {
                        let
                            isDateChanged = !activity.isNew && activity.originalData_ && moment( activity.timestamp ).format( 'QYYYY' ) !== moment( activity.originalData_.timestamp ).format( 'QYYYY' );
                        if( isLocationModified || (isDateChanged || isCaseFolderChanged) && isQuarterDependent ) {
                            Y.log( 'Schein was moved from one quarter to another or case folder was changed. Checking for illegal treatments/diagnoses in previous quarter', 'debug', NAME );
                            // check if quarter or case folder of the shein was changed.
                            checkForConnectedActivity( {
                                user: user,
                                activity: activity.originalData_,
                                callback: done,
                                isCaseFolderChanged: isCaseFolderChanged,
                                upward: true,
                                isQuarterDependent: isQuarterDependent,
                                isLocationModified: isLocationModified
                            } );
                            return;
                        }
                        done();
                    }
                ], function( err ) {
                    callback( err, activity );
                } );
            }

            doCheck();
        }

        /**
         * Checks:
         *  if current Schein is child and timestamp is less(earlier) than timestamp of parent Schein, throws an error.
         *  All Treatments/diagnoses should be connected to a valid Schein in current/previous quarter(computed with current/previous Schein timestamp)
         * @method checkTimestampOnDelete
         * @param {Object} user
         * @param {Object} activity
         * @param {Function} callback
         * @returns {*}
         */
        function checkTimestampOnDelete( user, activity, callback ) {
            Y.log( `checkTimestampOnDelete. Checking ${activity.actType} timestamp, id:${activity._id}` && activity._id.toString(), 'debug', NAME );
            switch( activity.actType ) {
                case 'SCHEIN':
                    checkSheinTimestamp( {user, activity, isQuarterDependent: true}, callback );
                    break;
                case 'PKVSCHEIN':
                case 'BGSCHEIN':
                    checkSheinTimestamp( {user, activity}, callback );
                    break;
                default:
                    return callback( null, activity );
            }
        }

        /**
         *  Check if there is no vat on this entry and then set to 0 --
         *  the default code which means that there is no vat on this.
         *
         *  @param  {Object}    user
         *  @param  {Object}    activity
         *  @param  {Function}  callback
         */
        function removeNonVat( user, activity, callback ) {
            if( !activity.hasVat ) {
                activity.vat = 0;
            }
            callback( null, activity );
        }

        /**
         *  Tests whether an FSM transition is allowed for the given activity
         *
         *  @param  {Object}    user
         *  @param  {Object}    activity
         *  @param  {Function}  callback
         *  @see Y.doccirrus.api.activity.checkTransition
         */
        function checkTransition( user, activity, callback ) {
            if( 'PREPARED' === activity.status ) {
                return callback( null, activity );
            }
            Y.doccirrus.api.activity.checkTransition( {
                data: activity,
                callback
            } );
        }

        /**
         * don't let teleConsultNote to be overwritten if already has a value
         * @param   {Object}    user
         * @param   {Object}    activity
         * @param   {Function}  callback
         */
        function handleTeleConsult( user, activity, callback ) {
            var
                currentData = activity.originalData_,
                previousAttachments = (currentData && currentData.attachments) || [],
                attachments;
            if( 'TELECONSULT' === activity.actType && (currentData && currentData.teleConsultNote) !== activity.teleConsultNote ) {
                activity.userContent = '';
            }
            if( currentData && currentData.teleConsultNote && !activity.teleConsultNote ) {
                activity.teleConsultNote = currentData.teleConsultNote;
            }

            if( 'TELECONSULT' === activity.actType && !activity.isNew ) {

                attachments = previousAttachments.slice( 0 );
                if( activity.attachments ) {
                    activity.attachments.forEach( function( attachment ) {
                        if( -1 === previousAttachments.indexOf( attachment ) ) {
                            attachments.push( attachment );
                        }
                    } );
                }
                activity.attachments = attachments;

                if( currentData && 'CREATED' !== activity.status && currentData.participants && currentData.participants.length ) {
                    Y.log( 'prevented overwriting participants field', 'debug', NAME );
                    activity.participants = currentData.participants;
                }
            }

            callback( null, activity );
        }

        /**
         * Checks Schein with 'Bewilligte Leistungen':
         *  1. can be created in the same case folder if has same BL
         *  2. new Schein with same BL codes can only be created if there is no 'opened' Schein
         * @param {Object} user
         * @param {Object} activity
         * @param {Function} callback
         * @returns {*}
         */
        function checkBLSchein( user, activity, callback ) {
            var async = require( 'async' );
            if( !activity.isNew ) {
                return callback( null, activity );
            }

            function collectCodesFromFk4244Set( schein, collection ) {
                schein.fk4235Set.forEach( function( fk4235 ) {
                    fk4235.fk4244Set.forEach( function( fk4244 ) {
                        collection.push( fk4244.fk4244 );
                    } );
                } );
            }

            function collectCodesFromFk4256Set( schein, collection ) {
                schein.fk4235Set.forEach( function( fk4235 ) {
                    fk4235.fk4256Set.forEach( function( fk4244 ) {
                        collection.push( fk4244.fk4244 );
                    } );
                } );
            }

            function createCaseFolder( callback ) {
                async.waterfall( [
                    function( next ) {
                        //get current case folder
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'casefolder',
                            action: 'get',
                            query: {
                                _id: activity.caseFolderId
                            },
                            options: {
                                lean: true
                            }
                        }, function( err, results ) {
                            if( err ) {
                                return next( err );
                            }
                            next( err, results[0] );
                        } );
                    },
                    function( caseFolder, next ) {
                        if( !caseFolder ) {
                            return next();
                        }
                        // create new case folder with the same type as current case folder
                        Y.doccirrus.api.casefolder.post( {
                            user: user,
                            data: Y.doccirrus.filters.cleanDbObject( {
                                type: caseFolder.type,
                                patientId: caseFolder.patientId,
                                start: Date.now()
                            } ),
                            options: {
                                entireRec: false
                            },
                            callback: next
                        } );
                    }
                ], callback );
            }

            function checkForOpenSchein( callback ) {
                if( 1 === activity.activities.length ) {
                    return callback( null, activity );
                }
                Y.doccirrus.api.activity.getOpenSchein( {
                    user: user,
                    query: {
                        actType: activity.actType,
                        patientId: activity.patientId,
                        locationId: activity.locationId,
                        caseFolderId: activity.caseFolderId,
                        timestamp: activity.timestamp
                    },
                    callback: function( err, results ) {
                        if( err ) {
                            return callback( err );
                        }
                        if( results && results.length ) {
                            return callback( Y.doccirrus.errors.rest( 18003, '', true ) );
                        }
                        callback( null, activity );
                    }
                } );
            }

            function checkBL() {
                var codeList = [];

                collectCodesFromFk4244Set( activity, codeList );
                collectCodesFromFk4256Set( activity, codeList );

                if( codeList.length ) {
                    Y.doccirrus.api.activity.isLegalBLForCaseFolder( {
                        user: user,
                        query: {
                            actType: activity.actType,
                            caseFolderId: activity.caseFolderId,
                            patientId: activity.patientId,
                            _id: activity._id
                        },
                        data: {
                            codes: codeList
                        },
                        callback: function( err, result ) {
                            if( err ) {
                                return callback( err );
                            }
                            var legal = result[0];
                            if( !legal ) {
                                // checking 1 case
                                createCaseFolder( function( err, results ) {
                                    if( err ) {
                                        return callback( err );
                                    }
                                    if( results[0] ) {
                                        activity.caseFolderId = results[0].toString();
                                        activity.activities = [];
                                    }
                                    callback( err, activity );
                                } );
                            } else {
                                //checking 2 case
                                checkForOpenSchein( callback );
                            }
                        }
                    } );
                } else {
                    return callback( null, activity );
                }
            }

            switch( activity.actType ) {
                case 'SCHEIN':
                case 'PKVSCHEIN':
                case 'BGSCHEIN':
                    checkBL();
                    break;
                default:
                    return callback( null, activity );
            }
        }

        /**
         * required for billing generation
         * @param   {Object}    user
         * @param   {Object}    activity
         * @param   {Function}  callback
         * @returns {*}
         */
        function updateSyncFolder( user, activity, callback ) {
            const
                context = this && this.context;
            if( !Y.doccirrus.auth.isMVPRC() ) {
                callback( null, activity );
                return;
            }
            if( (!Y.doccirrus.api.contract.isTypeContract( activity.actType ) && -1 === ['MEDICATION', 'TREATMENT'].indexOf( activity.actType )) || !activity.caseFolderId ) {
                callback( null, activity );
                return;
            }
            if( context && 'undefined' !== typeof context.weakQueueKey ) {
                let
                    queue = Y.doccirrus.weakQueue.getQueue( context.weakQueueKey );
                queue.set( updateSyncFolder, function( callback ) {
                    updateSyncFolder.call( {}, user, activity, callback );
                } );
                return setImmediate( callback );
            }

            Y.doccirrus.api.invoiceconfiguration.get( {
                user: user,
                callback: function( err, result ) {
                    if( err || !result || !result[0] || !result[0].isMedneoCustomer ) {
                        // always return activity, might not be an error
                        callback( err, activity );
                        return;
                    }
                    Y.log( `writing to syncFolder: ${activity.caseFolderId}`, 'debug', NAME );
                    Y.doccirrus.mongodb.runDb( {
                        'migrate': true,
                        action: 'upsert',
                        user: user,
                        model: 'syncfolder',
                        data: {_id: activity.caseFolderId, skipcheck_: true}
                    }, function( err1 ) {
                        callback( err1, activity );
                    } );
                }
            } );
        }

        /**
         *  Set uvGoaeType and recalulate price in treatments belonging to the updated BGSCHEIN.
         *
         *  @param  {Object}    user
         *  @param  {Object}    activity
         *  @param  {Function}  callback
         *  @returns {*}
         */
        function recalculateBgTreatments( user, activity, callback ) {
            // we only update treatments in "schein range"

            function scheinCb( err, scheins ) {
                var schein, treatmentQuery;

                function finalCb( err ) {
                    if( err ) {
                        return callback( err );
                    }
                    callback( null, activity );
                }

                function updateTreatment( treatment, cb ) {
                    treatment.uvGoaeType = activity.uvGoaeType;
                    if( treatment.u_extra && treatment.u_extra.tarifvertrag && treatment.u_extra.tarifvertrag[treatment.uvGoaeType] ) {
                        treatment.unit = treatment.actualUnit = 'Euro';
                        treatment.price = treatment.actualPrice = toPrice( treatment.u_extra.tarifvertrag[treatment.uvGoaeType] );
                    }
                    //mongooselean.save_fix
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        action: 'put',
                        query: {
                            _id: treatment._id
                        },
                        fields: Object.keys( treatment ),
                        data: Y.doccirrus.filters.cleanDbObject( treatment )
                    }, cb );
                }

                function treatmentsCb( err, treatments ) {
                    if( err ) {
                        return callback( err );
                    }

                    require( 'async' ).each( treatments, updateTreatment, finalCb );
                }

                if( err ) {
                    return callback( err );
                }

                schein = scheins[0];

                treatmentQuery = {
                    actType: 'TREATMENT',
                    caseFolderId: activity.caseFolderId,
                    patientId: activity.patientId,
                    timestamp: {
                        $gt: activity.timestamp
                    },
                    uvGoaeType: {
                        $ne: activity.uvGoaeType
                    }
                };

                if( schein ) {
                    treatmentQuery.timestamp.$lt = schein.timestamp;
                }

                // get all treatments that have a different uvGoaeType
                Y.doccirrus.mongodb.runDb( {
                    model: 'activity',
                    user: user,
                    migrate: true,
                    query: treatmentQuery,
                    callback: treatmentsCb
                } );

            }

            if( 'BGSCHEIN' !== activity.actType || !activity.uvGoaeType ) {
                return callback( null, activity );
            }

            Y.doccirrus.api.patient.getNextSchein( {
                user: user,
                originalParams: {
                    patientId: activity.patientId,
                    timestamp: activity.timestamp,
                    caseFolderId: activity.caseFolderId
                },
                callback: scheinCb
            } );

        }

        /**
         * Update an activity object "in place", mutating it to include fields from schein.
         * @param   {Object}    activity
         * @param   {Object}    schein
         */
        function updateTreatmentFromSchein( activity, schein ) {
            if( schein && activity ) {
                activity.debtCollection = schein.debtCollection;
                activity.scheinOrder = schein.scheinOrder;
                activity.scheinDiagnosis = schein.scheinDiagnosis;
                //
                //console.log( 'rrrrrrrrr', schein.treatmentType,  Y.doccirrus.schemas.activity.types.TreatmentType_E.list.filter( function(item) { return item.val === schein.treatmentType; } ).length )
                if( Y.doccirrus.schemas &&
                    Y.doccirrus.schemas.activity &&
                    Y.doccirrus.schemas.activity.types.TreatmentType_E.list.filter( function( item ) {
                        return item.val === schein.treatmentType;
                    } ).length ) {
                    activity.treatmentType = schein.treatmentType;
                }
                activity.includesBSK = schein.includesBSK;
                activity.isChiefPhysician = schein.isChiefPhysician;
            }
        }

        async function calcInvoicesAndTreatments( user, activity, callback ) {

            Y.log( 'calcInvoicesAndTreatments', 'info', NAME );

            const reCalculate = ['CREATED', 'VALID'].includes( activity.status ),
                getLastScheinP = promisifyArgsCallback( Y.doccirrus.api.patient.lastSchein );
            let error, scheins;

            [error, scheins] = await formatPromiseResult( getLastScheinP( {
                user: user,
                query: {
                    patientId: activity.patientId,
                    locationId: activity.locationId,
                    timestamp: activity.timestamp,
                    caseFolderId: activity.caseFolderId
                }
            } ) );
            if( error ) {
                Y.log( `Error trying to get last schein for invoice. ${error.stack || error}`, 'error', NAME );
                return callback( error );
            }

            const schein = scheins && scheins[0];
            // for private treatments we need to modify the price depending on
            // the SCHEIN MOJ-6978
            if( 'TREATMENT' === activity.actType && reCalculate ) {
                updateTreatmentFromSchein( activity, schein );
                // TODO MOJ-6978  use Schein info in this calculation, and remove it from the INVOICE part below
                Y.doccirrus.invoiceutils.calcTreatment( activity );
                return callback( null, activity );
            } else if( ('INVOICE' === activity.actType || 'INVOICEREF' === activity.actType) && reCalculate ) {
                let linkedActivities;
                [error, linkedActivities] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    migrate: true,
                    query: {
                        _id: {$in: activity.activities}
                    }
                } ) );

                if( error ) {
                    Y.log( `Error trying to get linked activities for invoice. ${error.stack || error}`, 'error', NAME );
                    return callback( error, activity );
                }

                Y.doccirrus.invoiceutils.calcInvoice( activity, {
                    treatmentType: schein && schein.treatmentType,
                    includesBSK: schein && schein.includesBSK,
                    isChiefPhysician: schein && schein.isChiefPhysician
                }, linkedActivities );

                activity.debtCollection = schein && schein.debtCollection;

                return callback( null, activity );
            }

            callback( null, activity );
        }

        function checkSubGop( user, activity, callback ) {

            function setActDataCb( err, result ) {
                var newData = result && result.newData;
                if( err ) {
                    callback( err );
                    return;
                }
                const excludedPaths = ['explanations'];
                if( newData ) {
                    Object.keys( newData )
                        .filter( key => !excludedPaths.includes( key ) )
                        .forEach( key => {
                            activity[key] = newData[key];
                        } );
                }
                callback( null, activity );
            }

            Y.doccirrus.api.activity.checkSubGop( {
                user: user,
                originalParams: {
                    activityData: {
                        _id: activity._id,
                        code: activity.code,
                        actType: activity.actType,
                        patientId: activity.patientId,
                        employeeId: activity.employeeId,
                        locationId: activity.locationId,
                        catalogShort: activity.catalogShort,
                        u_extra: activity.u_extra,
                        billingFactorValue: activity.billingFactorValue,
                        timestamp: activity.timestamp,
                        price: activity.price,
                        taxPoints: activity.taxPoints,
                        medicalTaxPoints: activity.medicalTaxPoints,
                        technicalTaxPoints: activity.technicalTaxPoints,
                        assistanceTaxPoints: activity.assistanceTaxPoints,
                        medicalScalingFactor: activity.medicalScalingFactor,
                        technicalScalingFactor: activity.technicalScalingFactor
                    }
                },
                callback: setActDataCb
            } );
        }

        function generateLabRequestId( user, activity, callback ) {
            //  skip this step if not LABREQUEST or REFERRAL
            if( 'LABREQUEST' !== activity.actType && 'REFERRAL' !== activity.actType ) {
                return callback( null, activity );
            }
            //  skip this step if activity is DELETED
            if( 'DELETED' === activity.status ) {
                return callback( null, activity );
            }

            async.series( [checkForm, checkLabRequestId, checkForDuplicates], onAllDone );

            function checkForm( itcb ) {
                //  MOJ-8199 Check that newly created LABREQUEST activities have their form
                if( 'LABREQUEST' !== activity.actType ) {
                    return itcb( null );
                }
                if( activity.formId && '' !== `${activity.formId}` ) {
                    return itcb( null );
                }

                Y.doccirrus.formsconfig.getConfig( user, onConfigLoaded );

                function onConfigLoaded( err, formsConfig ) {
                    if( err ) {
                        return itcb( err );
                    }

                    var formRole = 'casefile-labrequest';

                    if( activity.labRequestType ) {
                        //  different kinds of LABREQUEST activities carry different forms
                        switch( activity.labRequestType ) {
                            case 'LABREQUESTTYPE':
                                formRole = 'casefile-labrequest';
                                break;
                            case 'LABREQUESTTYPE_L':
                                formRole = 'casefile-labrequest-l';
                                break;
                            case 'LABREQUESTTYPE_A':
                                formRole = 'casefile-labrequest-a';
                                break;
                        }
                    }

                    Y.log( `Assigning form to LABREQUEST by role: ${formRole}`, 'debug', NAME );

                    if( !formsConfig[formRole] || '' === formsConfig[formRole] ) {
                        Y.log( `This tenant does not have a form assigned for LABREQUEST activities: ${formRole}`, 'warn', NAME );
                        return itcb( null );
                    }

                    activity.formId = formsConfig[formRole];
                    itcb( null );
                }
            }

            function checkLabRequestId( itcb ) {
                if( !activity.labRequestId ) {
                    activity.labRequestId = Y.doccirrus.utils.generateLabRequestId();
                }
                itcb( null );
            }

            function checkForDuplicates( itcb ) {
                //  should not happen
                if( !activity.labRequestId ) {
                    return itcb( null );
                }

                Y.doccirrus.mongodb.runDb( {
                    migrate: true,
                    user: user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        labRequestId: activity.labRequestId,
                        _id: {$not: {$eq: activity._id}},
                        status: {$ne: 'DELETED'}
                    },
                    options: {
                        lean: 1,
                        limit: 1
                    },
                    callback: onLoadDuplicates
                } );

                function onLoadDuplicates( err ) {
                    if( err ) {
                        return itcb( err );
                    }
                    itcb( null );
                }
            }

            function onAllDone( err ) {
                if( err ) {
                    return callback( err );
                }
                callback( null, activity );
            }

        }

        /**
         * Sets employee name to activity
         * @param {Object} user
         * @param {Object} activity
         * @param {Function} callback
         * @see Y.doccirrus.api.activity.setEmployeeName
         */
        function setEmployeeName( user, activity, callback ) {
            Y.doccirrus.api.activity.setEmployeeName( {
                user,
                context: this && this.context,
                data: activity,
                callback
            } );
        }

        /**
         * Sets patient name to activity
         * @param {Object} user
         * @param {Object} activity
         * @param {Function} callback
         * @see Y.doccirrus.api.activity.setPatientName
         */
        function setPatientName( user, activity, callback ) {
            Y.doccirrus.api.activity.setPatientName( {
                user,
                context: this && this.context,
                data: activity,
                callback
            } );
        }

        /**
         *  Sets timestamp of a Schein to the earliest on a day
         *  @param  {Object}    user
         *  @param  {Object}    activity
         *  @param  {Function}  callback
         *  @returns    {*}
         */
        function setScheinDate( user, activity, callback ) {
            var
                moment = require( 'moment' );
            if( 'SCHEIN' === activity.actType || 'PKVSCHEIN' === activity.actType || 'BGSCHEIN' === activity.actType ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        timestamp: {
                            $gt: new Date( moment( activity.timestamp ).startOf( 'day' ).toISOString() ),
                            $lt: new Date( moment( activity.timestamp ).endOf( 'day' ).toISOString() )
                        },
                        actType: activity.actType,
                        caseFolderId: activity.caseFolderId,
                        patientId: activity.patientId
                    }
                }, function( err, results ) {
                    var
                        newDate;
                    if( err ) {
                        return callback( err );
                    }
                    if( !results.length ) {
                        newDate = moment( activity.timestamp );
                        activity.timestamp = newDate.startOf( 'day' ).milliseconds( 1 ).toISOString();
                        //also modify originalData_ for new activity to not track difference in post functions
                        if( activity.isNew && activity.originalData_ && activity.originalData_.timestamp ){
                            activity.originalData_.timestamp = activity.timestamp;
                        }
                    }
                    callback( null, activity );
                } );
            } else {
                return callback( null, activity );
            }
        }

        /**
         * Checks if a cost estimate activity was created in wrong casefolder(not with additional type QUOTATION),
         *  process would move the activity to correct casefolder
         *
         *  @param  {Object}    user
         *  @param  {Object}    activity
         *  @param  {Function}  callback
         *  @returns    {*}
         */
        function checkCostEstimate( user, activity, callback ) {
            if( activity.isNew && 'QUOTATION' === activity.actType ) {
                const _modifiedQuotationTreatments = activity._modifiedQuotationTreatments;
                delete activity._modifiedQuotationTreatments;
                let
                    async = require( 'async' );
                async.waterfall( [
                    function( next ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'casefolder',
                            action: 'get',
                            query: {
                                patientId: activity.patientId,
                                additionalType: Y.doccirrus.schemas.casefolder.additionalTypes.QUOTATION
                            },
                            options: {
                                lean: true,
                                limit: 1
                            }
                        }, function( err, results ) {
                            if( err ) {
                                return next( err );
                            }
                            next( err, results[0] );
                        } );
                    },
                    function( caseFolder, next ) {
                        if( caseFolder && caseFolder._id ) {
                            return setImmediate( next, null, caseFolder._id.toString() );
                        } else {
                            let
                                caseFolderData = {
                                    additionalType: Y.doccirrus.schemas.casefolder.additionalTypes.QUOTATION,
                                    patientId: activity.patientId,
                                    title: Y.doccirrus.i18n( 'casefolder-schema.Additional_E.QUOTATION.i18n' )
                                };

                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'casefolder',
                                action: 'post',
                                data: Y.doccirrus.filters.cleanDbObject( caseFolderData )
                            }, function( err, result ) {
                                if( err ) {
                                    return next( err );
                                }
                                next( null, result[0] );
                            } );
                        }
                    },
                    function( targetCaseFolderId, next ) {
                        if( activity.caseFolderId !== targetCaseFolderId ) {
                            activity.caseFolderId = targetCaseFolderId;
                        }
                        if( activity.activities && activity.activities.length ) {
                            Y.doccirrus.api.casefolder.copyActivitiesToCaseFolder( {
                                user,
                                query: {
                                    caseFolderId: targetCaseFolderId,
                                    activityIds: activity.activities
                                },
                                options: {
                                    transform: ( copiedActivity ) => {
                                        const modifiedQuotationTreatment = (_modifiedQuotationTreatments || []).find( treatment => {
                                            return treatment._id.toString() === copiedActivity._id.toString();
                                        } );

                                        if( modifiedQuotationTreatment ) {
                                            copiedActivity.price = modifiedQuotationTreatment.price;
                                            copiedActivity.actualPrice = modifiedQuotationTreatment.actualPrice;
                                            copiedActivity.unit = modifiedQuotationTreatment.unit;
                                            copiedActivity.billingFactorValue = modifiedQuotationTreatment.billingFactorValue;
                                        }
                                    }
                                },
                                callback( err, result ) {
                                    if( err ) {
                                        return next( err );
                                    }
                                    activity.activities = result;
                                    next();
                                }
                            } );
                        } else {
                            setImmediate( next );
                        }
                    }
                ], function( err ) {
                    if( err ) {
                        return callback( err );
                    }
                    callback( null, activity );
                } );
            } else {
                return callback( null, activity );
            }
        }

        function setTreatmentDiagnosesBillable( user, activity, callback ) {
            function setData( caseFolder ) {
                if( caseFolder && Y.doccirrus.schemas.casefolder.additionalTypes.QUOTATION === caseFolder.additionalType ) {
                    activity.areTreatmentDiagnosesBillable = '0';
                }
                callback();
            }

            if( 'TREATMENT' === activity.actType && activity.caseFolderId ) {
                let
                    context = this && this.context,
                    cachedCaseFolder = getCollectionCache( {
                        context,
                        collection: 'casefolder',
                        key: activity.caseFolderId
                    } );
                if( cachedCaseFolder ) {
                    return setData( cachedCaseFolder );
                }
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'get',
                    model: 'casefolder',
                    query: {
                        _id: activity.caseFolderId
                    },
                    migrate: true,
                    options: {
                        limit: 1,
                        lean: true
                    }
                }, function( err, results ) {
                    if( err ) {
                        return callback( err );
                    }
                    setCollectionCache( {
                        context,
                        collection: 'casefolder',
                        key: activity.caseFolderId,
                        data: results[0]
                    } );
                    setData( results[0] );
                } );
            } else {
                return callback( null, activity );
            }
        }

        function setTreatmentTariff( user, activity, callback ) {
            if( 'TREATMENT' === activity.actType ) {
                if( !activity.catalog && 'TARMED' === activity.catalogShort ) {
                    activity.tariffType = '999';
                } else {
                    if( activity.tariffType ) {
                        activity.tariffType = '';
                    }
                }
            }
            return callback( null, activity );
        }

        function setDiagnosisContinous( user, activity, callback ) {
            if( 'DIAGNOSIS' === activity.actType ) {
                if( 'TESS-KAT' === activity.catalogShort ) {
                    if( '04' === activity.diagnosisPeriod ) {
                        activity.diagnosisType = 'CONTINUOUS';
                    } else {
                        activity.diagnosisType = 'ACUTE';
                    }
                }
            }
            return callback( null, activity );
        }

        /**
         * 1)   The diagnosis is set to "INVALIDATING", or such a diagnosis is modified or deleted,
         *      then ALL diagnoses of the same type lying BEFORE this diagnosis
         *      have to be flagged with the diagnosisInvalidationDate that points to this diagnosis.
         *
         *      Edge cases to consider:
         *          1) If an INVALIDATING diagnosis gets moved backwards in time.
         *          2) If an INVALIDATING diagnosis gets moved forwards in time.
         *          3) The whole history has to be trimmed. So the end of the chain, and the beginning of the chain have to be cleaned up.
         * @param {object} user
         * @param {object} activity
         * @param {boolean} changeIsDelete
         * @returns {Promise<*>}
         */
        async function onInvalidatingDiagnosisChanged( user, activity, changeIsDelete ) {
            // update function for the diagnosis invalidation date
            const updateDiagnosisInvalidationDate = Y.doccirrus.api.activity.updateDiagnosisInvalidationDate;

            // set the diagnosisInvalidationDate to the timestamp of the invalidating activity, or to null, if the activity is deleted
            let diagnosisInvalidationDate = (changeIsDelete === true) ? null : activity.timestamp;

            // execute the query, update activities ...
            let [err, result] = await formatPromiseResult(
                updateDiagnosisInvalidationDate(
                    {
                        user,
                        activity,
                        diagnosisInvalidationDate,
                        query: {
                            timestamp: {$lte: activity.timestamp}, // ... before or at the time of this one ...
                            $or: [
                                // ... without diagnosisInvalidationDate, or ...
                                {diagnosisInvalidationDate: {$exists: false}},
                                {diagnosisInvalidationDate: null},
                                // ... with diagnosisInvalidationDate later (or equal, if deleted) than the one to be set.
                                {diagnosisInvalidationDate: (changeIsDelete === true) ? {$gte: activity.timestamp} : {$gt: activity.timestamp}}
                            ]
                        }
                    }
                )
            );

            if( err ) {
                Y.log( `(POST) failed set diagnosisInvalidationDate: ${err.stack || err}`, 'error', NAME );
                return Promise.reject( err );
            }

            /**
             * Edge case 1)
             * If an INVALIDATING diagnosis gets moved backwards in time.
             *      1a) Invalidated diagnoses may become valid again, if there is no follow-up invalidation.
             *      1b) Old pointers to this one have to be updated. (This is actually covered already above.)
             */

            let edgeCaseQuery = {
                _id: {$ne: activity._id},                           // exclude this activity
                actType: 'DIAGNOSIS',                               // just take a look at diagnoses
                diagnosisTreatmentRelevance: 'INVALIDATING',        // just an "INVALIDATING" diagnosis
                status: {$ne: 'CANCELLED'},                         // not a cancelled one
                timestamp: {$gte: activity.timestamp},              // we are just interested in diagnoses AFTER this one
                patientId: activity.patientId,                      // for the same patient
                code: activity.code                                 // for the same code
            };

            // for case 1a): Invalidated diagnoses may become valid again, if there is no follow-up invalidation.
            // get the next INVALIDATING diagnose
            Y.log( `(POST) trying to find another follow-up invalidating diagnose to adapt diagnoses in between`, 'debug', NAME );
            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'get',
                    model: 'activity',
                    query: edgeCaseQuery,
                    options: {
                        limit: 1,
                        fields: {timestamp: 1}, // we just need the timestamp
                        sort: {timestamp: 1}    // sort ASC, to get the first invalidating diagnosis
                    }
                } )
            );
            if( err ) {
                Y.log( `(POST) failed to get another invalidating diagnoses: ${err.stack || err}`, 'error', NAME );
                return Promise.reject( err );
            } else {
                if( result && result[0] ) {
                    Y.log( `(POST) another invalidating diagnosis has been found, adapting diagnosisInvalidationDate of later diagnoses`, 'debug', NAME );
                    diagnosisInvalidationDate = result[0].timestamp;
                } else {
                    Y.log( `(POST) no other follow-up invalidating diagnose has been found, adapting diagnosisInvalidationDate of later diagnoses`, 'debug', NAME );
                    diagnosisInvalidationDate = null;
                }

                // execute the query, update activities ...
                [err, result] = await formatPromiseResult(
                    updateDiagnosisInvalidationDate(
                        {
                            user,
                            activity,
                            diagnosisInvalidationDate,
                            query: {
                                timestamp: {$gt: activity.timestamp}, // ... lying now after this activity ...
                                $and: [
                                    // ... with diagnosisInvalidationDate AFTER this diagnosis time ...
                                    {diagnosisInvalidationDate: {$exists: true}},
                                    {diagnosisInvalidationDate: {$ne: null}},
                                    {diagnosisInvalidationDate: {$gt: activity.timestamp}},
                                    // ... but BEFORE the follow-up diagnosisInvalidationDate (if found) ...
                                    {diagnosisInvalidationDate: (diagnosisInvalidationDate) ? {$lt: diagnosisInvalidationDate} : {$exists: true}}
                                ]
                            }
                        }
                    )
                );
            }

            /**
             * HISTORY TRIMMING
             * Trim the invalidation chain starting from the FIRST occurrence of the CONTINUOUS DIAGNOSIS
             * and ending at the LATEST occurrence of the CONTINUOUS DIAGNOSIS, which are not catched in the cases before.
             * Remove the timestamp and _id limit.
             */
            delete edgeCaseQuery.timestamp;
            delete edgeCaseQuery._id;

            /**
             * Trim the end of the chain. So check, if there are invalidated diagnoses
             * after the last invalidating diagnose. May occur after moving invalidating diagnoses around.
             */
            Y.log( `(POST) trimming the invalidation chain at the end (latest in time)`, 'debug', NAME );
            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'get',
                    model: 'activity',
                    query: edgeCaseQuery,
                    options: {
                        limit: 1,
                        fields: {timestamp: 1}, // we just need the timestamp
                        sort: {timestamp: -1}    // sort DESC, to get the LAST invalidating diagnosis
                    }
                } )
            );
            if( err ) {
                Y.log( `(POST) failed to get LAST invalidating diagnosis: ${err.stack || err}`, 'error', NAME );
                return Promise.reject( err );
            } else {
                if( result && result[0] ) {
                    Y.log( `(POST) the LAST invalidating diagnosis has been found, adapting diagnosisInvalidationDate of later diagnoses`, 'debug', NAME );

                    // reset the date of those
                    diagnosisInvalidationDate = null;

                    // execute the query, update activities ...
                    [err, result] = await formatPromiseResult(
                        updateDiagnosisInvalidationDate(
                            {
                                user,
                                activity,
                                diagnosisInvalidationDate,
                                query: {
                                    timestamp: {$gt: result[0].timestamp}, // ... lying after the last invalidating diagnosis ...
                                    $and: [
                                        // ... with diagnosisInvalidationDate AFTER the last invalidating diagnosis ...
                                        {diagnosisInvalidationDate: {$exists: true}},
                                        {diagnosisInvalidationDate: {$ne: null}},
                                        {diagnosisInvalidationDate: {$gt: result[0].timestamp}}
                                    ]
                                }
                            }
                        )
                    );
                    if( err ) {
                        Y.log( `(POST) failed to trim the end of the chain: ${err.stack || err}`, 'error', NAME );
                        return Promise.reject( err );
                    }
                } else {
                    Y.log( `(POST) there is no later invalidating diagnosis -> nothing to do`, 'debug', NAME );
                }
            }

            /**
             * Trim the beginning of the chain. So check, if there are invalidated diagnoses
             * before the first invalidating diagnosis, but not pointing to it.
             * May occur after moving invalidating diagnoses around.
             */
            Y.log( `(POST) trimming the invalidation chain at the beginning (earliest in time)`, 'debug', NAME );
            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'get',
                    model: 'activity',
                    query: edgeCaseQuery,
                    options: {
                        limit: 1,
                        fields: {timestamp: 1}, // we just need the timestamp
                        sort: {timestamp: 1}    // sort ASC, to get the FIRST invalidating diagnosis
                    }
                } )
            );
            if( err ) {
                Y.log( `(POST) failed to get the FIRST invalidating diagnosis: ${err.stack || err}`, 'error', NAME );
                return Promise.reject( err );
            } else {
                if( result && result[0] ) {
                    Y.log( `(POST) an earlier invalidating diagnosis has been found: adapting the diagnosisInvalidationDate of earlier diagnoses`, 'debug', NAME );

                    // set the date to the invalidating diagnosis
                    diagnosisInvalidationDate = result[0].timestamp;

                    // execute the query, update activities ...
                    [err, result] = await formatPromiseResult(
                        updateDiagnosisInvalidationDate(
                            {
                                user,
                                activity,
                                diagnosisInvalidationDate,
                                query: {
                                    timestamp: {$lt: result[0].timestamp}, // ... lying before the last invalidating diagnosis ...
                                    diagnosisInvalidationDate: {$ne: result[0].timestamp}
                                }
                            }
                        )
                    );
                    if( err ) {
                        Y.log( `(POST) failed to trim the beginning of the chain: ${err.stack || err}`, 'error', NAME );
                        return Promise.reject( err );
                    }
                } else {
                    Y.log( `(POST) there is no earlier invalidating diagnosis -> nothing to do`, 'debug', NAME );
                }
            }
        }

        /**
         * [MOJ-11762] invalidate continuous diagnoses (PRE-process)
         * If a continuous diagnosis gets invalidated by setting its diagnosisTreatmentRelevance to "INVALIDATING",
         * we have to ensure that some conditions match, which are required for further processing.
         *
         * 1) An INVALIDATING diagnosis should NOT have a diagnosisInvalidationDate.
         * 2) Cover an edge case, where multiple invalidating diagnoses exist at EXACTLY the same time.
         * 3a) If an invalidated diagnosis gets moved from BEFORE an existing invalidating diagnosis to AFTER.
         * 3b) If a valid diagnosis gets moved from AFTER an existing invalidating diagnosis to BEFORE.
         *
         * @param {object} user
         * @param {object} activity
         * @param {function} callback
         * @returns {*}
         */
        async function updateDiagnosesOnInvalidationPre( user, activity, callback ) {
            let err = null,
                result;

            /**
             * Just handle DIAGNOSES which are TREATMENT_RELEVANT or INVALIDATING.
             */
            if( activity.actType === 'DIAGNOSIS' ) {

                switch( true ) {
                    case activity.diagnosisTreatmentRelevance === 'INVALIDATING':
                        /**
                         * Case 1) An INVALIDATING diagnosis should NOT have a diagnosisInvalidationDate.
                         */
                        Y.log( `(PRE) ensuring an invalidated diagnosis has no diagnosisInvalidationDate`, 'debug', NAME );
                        activity.diagnosisInvalidationDate = null;
                        break;
                    default:
                        /**
                         * Case 2)
                         * Two INVALIDATING diagnoses exist. One is changed, one remains.
                         * If there are multiple invalidating diagnoses at EXACTLY the same time
                         * (which may be the case due to copying diagnoses forth and back),
                         * we may not validate the prior diagnoses again. An invalidating diagnosis
                         * is ALWAYS dominating a valid one.
                         * --> query.timestamp === activity.timestamp
                         *
                         * Case 3a)
                         * A invalidated diagnosis gets moved from BEFORE an existing invalidating diagnosis to AFTER.
                         * Procedure:
                         *      - reset the invalidation, if no other invalidating diagnosis has been found afterwards
                         *      - if another invalidating diagnosis is found, update the diagnosisInvalidationDate to this timestamp
                         *
                         * Case 3b)
                         * A valid diagnosis gets moved from AFTER an existing invalidating diagnosis to BEFORE.
                         * --> query.timestamp >= activity.timestamp
                         * Procedure:
                         *      - check, if there is an invalidating diagnosis after the target time
                         *      - if so, update the diagnosisInvalidationDate
                         */
                        Y.log( `(PRE) creating (or moving) a diagnosis before an invalidating one`, 'debug', NAME );
                        [err, result] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                action: 'get',
                                model: 'activity',
                                query: {
                                    _id: {$ne: activity._id},                           // exclude this activity
                                    actType: 'DIAGNOSIS',                               // just take a look at diagnoses
                                    diagnosisTreatmentRelevance: 'INVALIDATING',         // just an "INVALIDATING" diagnosis
                                    status: {$ne: 'CANCELLED'},                         // not a cancelled one
                                    timestamp: {$gte: activity.timestamp},              // we are just interested in diagnoses AFTER this one,
                                    patientId: activity.patientId,                      // for the same patient
                                    code: activity.code                                 // for the same code
                                },
                                options: {
                                    limit: 1,
                                    fields: {timestamp: 1}, // we just need the timestamp
                                    sort: {timestamp: 1}    // sort ASC, to get the first invalidating diagnosis
                                }
                            } )
                        );
                        if( err ) {
                            Y.log( `(PRE) failed to get invalidating diagnoses: ${err.stack || err}`, 'error', NAME );
                        } else {
                            if( result && result[0] ) {
                                Y.log( `(PRE) an invalidating diagnosis has been found after the diagnosis: adapting diagnosisInvalidationDate`, 'debug', NAME );
                                activity.diagnosisInvalidationDate = result[0].timestamp;
                            } else {
                                Y.log( `(PRE) no invalidating diagnosis has been found after the diagnosis: resetting diagnosisInvalidationDate`, 'debug', NAME );
                                activity.diagnosisInvalidationDate = null;
                            }
                        }
                        break;

                }
            }

            return callback( err, activity );
        }

        /**
         * [MOJ-11762] invalidate continuous diagnoses (POST-process)
         * If a continuous diagnosis gets invalidated by setting its diagnosisTreatmentRelevance to "INVALIDATING",
         * we have to add a tag (diagnosisInvalidationDate) to ALL continuous diagnoses of the same type
         * lying before the invalidated one.
         *
         * If an invalidated diagnosis gets deleted or moved, or if an invalidated diagnosis gets changed to be valid,
         * we have to remove the diagnosisInvalidationDate from all preceding diagnoses again.
         *
         * @param {object} user
         * @param {object} activity
         * @param {function} callback
         * @returns {*}
         */
        async function updateDiagnosesOnInvalidationPostWrite( user, activity, callback ) {
            let err = null,
                updateDiagnosisInvalidationDate = Y.doccirrus.api.activity.updateDiagnosisInvalidationDate;

            /**
             * Just handle DIAGNOSES, which are TREATMENT_RELEVANT or INVALIDATING.
             */
            if( activity.actType === 'DIAGNOSIS' ) {
                Y.log( `(POST) updating diagnosisInvalidationDate for continuous diagnoses`, 'debug', NAME );

                if( activity.diagnosisTreatmentRelevance === 'INVALIDATING' ) {
                    /**
                     * 1)   The diagnosis is set to "INVALIDATING", or such a diagnosis is modified,
                     *      then ALL diagnoses of the same type lying BEFORE this diagnosis
                     *      have to be flagged with the diagnosisInvalidationDate that points to this diagnosis.
                     *
                     *      Edge cases to consider:
                     *          1) If an INVALIDATING diagnosis gets moved backwards in time.
                     *          2) If an INVALIDATING diagnosis gets moved forwards in time.
                     *          3) The whole history has to be trimmed. So the end of the chain, and the beginning of the chain have to be cleaned up.
                     */
                    [err] = await formatPromiseResult( onInvalidatingDiagnosisChanged(
                        user,
                        activity,
                        (activity.status === "CANCELLED") // invalidating is the same as deleting
                    ) );
                } else if( !activity.diagnosisInvalidationDate ) {
                    /**
                     * 2)   The diagnosis is set to something !== "INVALIDATING",
                     *      AND the diagnosis itself has NO diagnosisInvalidationDate.
                     *      The later is required, because it means that the diagnosis itself is not invalidated
                     *      by another (later-in-time) diagnosis.
                     *      This means that this diagnosis is valid. Hence, we have to
                     *      validate all other diagnoses that lie at the same time, or before this diagnosis.
                     *      We strip off the their diagnosisInvalidationDate, if it exists.
                     *      Be aware, that there is the edge case that multiple INVALIDATING diagnoses may exist
                     *      at exactly the same time. This should be caught in the pre-processing stage.
                     *      (@see updateDiagnosesOnInvalidationPre).
                     */
                    [err] = await formatPromiseResult( onNonInvalidatedDiagnosisChanged() );
                }

                if( err ) {
                    Y.log( `(POST) failed update diagnosisInvalidationDate: ${err.stack || err}`, 'error', NAME );
                }

                // inform the client that something has changed with the activity's case folder
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    event: 'system.UPDATE_ACTIVITIES_TABLES',
                    msg: {
                        data: activity.caseFolderId
                    }
                } );
            }

            return callback( err, activity );

            // ---------------------------- FUNCTION DEFINITIONS (case 2) ---------------------------------

            /**
             * Case 2) (see above)
             * @returns {Promise<void>}
             */
            async function onNonInvalidatedDiagnosisChanged() {
                // set the diagnosisInvalidationDate to NULL, which validates the diagnoses again
                let diagnosisInvalidationDate = null;

                // execute the query, update activities ...
                return await updateDiagnosisInvalidationDate(
                    {
                        user,
                        activity,
                        diagnosisInvalidationDate,
                        query: {
                            timestamp: {$lte: activity.timestamp}, // ... before or at the time of this one ...
                            $and: [
                                // ... with diagnosisInvalidationDate AFTER or AT this diagnosis time.
                                {diagnosisInvalidationDate: {$exists: true}},
                                {diagnosisInvalidationDate: {$ne: null}},
                                {diagnosisInvalidationDate: {$gte: activity.timestamp}}
                            ]
                        }
                    }
                );
            }
        }

        /**
         * [MOJ-11762] invalidate continuous diagnoses (POST DELETE-process)
         * If an INVALIDATING continuous diagnosis gets deleted. Reactivate all invalidated diagnoses,
         * or relink them to a later invalidating diagnosis.
         *
         * @param {object} user
         * @param {object} activity
         * @param {function} callback
         * @returns {*}
         */
        async function updateDiagnosesOnInvalidationPostDelete( user, activity, callback ) {
            let err = null;

            /**
             * Just handle DIAGNOSES, which are TREATMENT_RELEVANT or INVALIDATING.
             */
            if( activity.actType === 'DIAGNOSIS' &&
                activity.diagnosisTreatmentRelevance === 'INVALIDATING' ) {
                Y.log( `(POST) updating diagnosisInvalidationDate for continuous diagnoses`, 'debug', NAME );

                // update all invalidated diagnoses pointing to this diagnosis to the one later in time
                [err] = await formatPromiseResult( onInvalidatingDiagnosisChanged( user, activity, true ) );
                if( err ) {
                    Y.log( `(POST) failed update diagnosisInvalidationDate: ${err.stack || err}`, 'error', NAME );
                }

                // inform the client that something has changed with the activity's case folder
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    event: 'system.UPDATE_ACTIVITIES_TABLES',
                    msg: {
                        data: activity.caseFolderId
                    }
                } );
            }

            return callback( err, activity );
        }

        /**
         * updates status for continues medication
         *
         * @param {object} user
         * @param {object} activity
         * @param {function} callback
         * @returns {*}
         */
        async function updateMedicationsOnInvalidationPostWrite( user, activity, callback ) {
            const loadedActivity = activity.toObject ? activity.toObject() : activity;
            if( loadedActivity.actType !== "MEDICATION" ) {
                return callback( null, activity );
            }

            if( activity.originalData_ && activity.originalData_.noLongerValid  === loadedActivity.noLongerValid ) {
                return callback( null, activity );
            }

            let [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                action: 'update',
                migrate: true,
                query: {
                    actType: 'MEDICATION',
                    code: loadedActivity.code,
                    patientId: loadedActivity.patientId,
                    status: {$nin: ['CANCELLED', 'PREPARED']},
                    phContinuousMed: loadedActivity.phContinuousMed,
                    timestamp: {$lte: moment( loadedActivity.timestamp ).toISOString()}

                },
                data: {
                    $set: {noLongerValid: loadedActivity.noLongerValid}
                },
                options: {
                    multi: true
                }
            } ) );

            Y.doccirrus.communication.emitEventForUser( {
                targetId: user.identityId,
                event: 'system.UPDATE_ACTIVITIES_TABLES',
                msg: {
                    data: loadedActivity.caseFolderId
                }
            } );

            return callback( err, activity );
        }

        function checkFromPatient( user, activity, callback ) {
            if( ('FROMPATIENTMEDIA' === activity.actType || 'FROMPATIENT' === activity.actType) && 'VALID' === activity.status ) {
                let
                    async = require( 'async' ),
                    moment = require( 'moment' );
                async.waterfall( [
                    function( next ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'casefolder',
                            action: 'get',
                            query: {
                                additionalType: Y.doccirrus.schemas.casefolder.additionalTypes.FROM_PATIENT,
                                patientId: activity.patientId
                            },
                            options: {
                                lean: true,
                                limit: 1
                            }
                        }, function( err, results ) {
                            if( err ) {
                                return next( err );
                            }
                            next( err, results[0] && results[0]._id.toString() );
                        } );
                    },
                    function( caseFolderId, next ) {
                        if( !caseFolderId ) {
                            let
                                caseFolderData = {
                                    title: Y.doccirrus.i18n( 'activity-api.createJawboneActivity.FROM_PATIENT' ),
                                    patientId: activity.patientId,
                                    start: moment().toISOString(),
                                    additionalType: Y.doccirrus.schemas.casefolder.additionalTypes.FROM_PATIENT
                                };
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                action: 'post',
                                model: 'casefolder',
                                data: Y.doccirrus.filters.cleanDbObject( caseFolderData )
                            }, function( err, results ) {
                                next( err, results && results[0] );
                            } );
                        } else {
                            setImmediate( next, null, caseFolderId );
                        }
                    }
                ], function( err, caseFolderId ) {
                    if( err ) {
                        return callback( err );
                    }
                    activity.caseFolderId = caseFolderId;
                    callback( err, activity );
                } );
            } else {
                return callback( null, activity );
            }
        }

        async function triggerRuleEngine( user, activity, callback ) {
            // return early, user should not wait for rule engine to complete
            // skip rule triggering if PREPARED activity
            if( 'PREPARED' === activity.status ) {
                return callback( null, activity );
            }
            callback( null, activity );         //  eslint-disable-line callback-return

            let context = this && this.context || {};
            if( context._skipTriggerRules ) {
                // TODO maybe allow triggering but prevent new activity creation

                //  the caller may specify that rule should not be run, for performance reasons.
                //  the should be run manually by the caller, after other changes are complete
                Y.log( `Skipping rules in this context, _skipTriggerRules: ${activity.actType}`, 'debug', NAME );
                return;
            }

            //  set of activity types which never have rules - to be expanded, considered, EXTMOJ-870
            const EXEMPT_FROM_RULES = ['AU'];

            if( -1 !== EXEMPT_FROM_RULES.indexOf( `${activity.actType}` ) ) {
                Y.log( `Skipping rules for activity type: ${activity.actType}`, 'debug', NAME );
                return;
            }

            if( Y.doccirrus.auth.isMocha() ) { //do not run rule engine during mocha tests
                return;
            }

            let
                activityObj = JSON.parse( JSON.stringify( activity ) ),
                processingType = activity.processingType || (activity.originalData_ && activity.originalData_.processingType);

            // 1. not trigger rule engine for imported entries
            // 2. bypass default-fsm DELETE update, will be processed in post Delete
            // 3. skip for api2 tests
            // 4. skip for activities generated by rules
            if( activityObj.importId || 'DELETED' === activityObj.status || "API2TestingActivity" === activityObj.comment ||
                'rulegenerated' === processingType ) {
                Y.log( "Skip rule engine on generated activity from rule", 'info', NAME );
                return;
            }

            let
                CARDIO_PARTNER_ID = Y.doccirrus.schemas.patient.PartnerIdsPartnerId.CARDIO;

            if( activity.vendorId && ((-1 !== activity.vendorId.indexOf( "RULEENGINE" )) ||
                                      (-1 !== activity.vendorId.indexOf( CARDIO_PARTNER_ID ))) ) {
                Y.log( "Skip rule engine on auto generated activity", 'info', NAME );
                return;
            }

            if( ['batch', 'sequence'].indexOf( processingType ) !== -1 ) {
                Y.log( `Skip rule engine on ${processingType} batch`, 'info', NAME );
                return;
            }

            //check if code/location/casefolder changed in activity
            if( activity.originalData_ && ( ( activity.originalData_.code && activity.originalData_.code !== activity.code ) ||
                ( activity.originalData_.locationId && activity.originalData_.locationId.toString() !== activity.locationId.toString() ) ||
                ( activity.originalData_.caseFolderId && activity.originalData_.caseFolderId !== activity.caseFolderId ) ||
                ( activity.originalData_.timestamp && new Date(activity.originalData_.timestamp).getTime() !== new Date(activity.timestamp).getTime() )
            ) ) {
                triggerRuleEngineOnDelete( user, activity.originalData_, () => {
                } );
                //wait some time before continue with normal triggering for new code/location/casefolder
                await (( ms ) => new Promise( resolve => setTimeout( resolve, ms ) ))( 100 );
            }

            Y.doccirrus.api.rule.triggerIpcQueue( {
                user,
                tenantId: user.tenantId,
                caseFolderId: activity.caseFolderId,
                locationId: activity.locationId.toString(),
                patientId: activity.patientId,
                type: 'activity',
                onDelete: false,
                activeActive: context.activeActiveWrite,
                data: JSON.parse( JSON.stringify( activity ) )
            } );
        }

        async function getSumexPdf( user, activityId ) {
            let [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'media',
                action: 'get',
                query: {
                    ownerId: activityId
                }
            } ) );

            if( err ) {
                Y.log( `Error in getting media owned by ${activityId}: ${err.stack || err}`, 'error', 'activity-process.server' );
                throw err;
            }
            return result.find( media => media.docType === 'SUMEXPDF' );
        }

        async function sendWarningsToMediport( user, activity, callback ) {
            const isSwiss = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland(),
                isReminderOrWarning = ['REMINDER', 'WARNING1', 'WARNING2'].includes( activity.actType );

            if( !isSwiss || !isReminderOrWarning || activity.sentToMediport ) {
                return callback( null, activity );
            }

            let err, result, sumexPdf;
            [err, sumexPdf] = await formatPromiseResult( getSumexPdf( user, activity._id ) );

            if( err ) {
                Y.log( `Error in getting SUMEXPDF owned by ${activity._id}: ${err.stack || err}`, 'error', 'activity-process.server' );
                return callback( err, activity );
            }

            if( sumexPdf ) {
                return callback( null, activity );
            }

            const generateWarningPdf = promisifyArgsCallback( Y.doccirrus.api.warning.generateSumexDocuments );

            if( !activity.referencedBy || !activity.referencedBy.length ) {
                return callback( null, activity );
            }

            [err, result] = await formatPromiseResult( generateWarningPdf( {
                originalParams: {warning: activity},
                user
            } ) );

            if( err ) {
                Y.log( `Error trying to generate xml for activity ${activity._id}: ${err.stack || err}`, 'error', 'activity-process.server' );
                return callback( err, activity );
            }

            if( result.errors && result.errors.length ) {
                //think here how to shoe error message from activity post process
                return callback( result.errors, activity );
            }

            const xmlFileName = result.xmlFileName;
            callback( null, activity );             /* eslint-disable-line callback-return */

            if( xmlFileName ) {
                const getFlows = promisifyArgsCallback( Y.doccirrus.api.flow.getFlows );

                getFlows( {
                    user,
                    query: {
                        flowType: 'KVG'
                    }
                } ).then( response => {
                    if( !Array.isArray( response ) || !response.length ) {
                        Y.log( `sendWarningsToMediport: No flows found with flowType: 'KVG'. Noting to do...`, "debug", NAME );
                        return;
                    }

                    Y.doccirrus.api.flow.execute( {
                        user,
                        query: {
                            _id: response[0]._id
                        },
                        data: {
                            sourceQuery: {invoiceXMLs: [xmlFileName]}
                        },
                        callback: ( err ) => {
                            if( err ) {
                                return;
                            }
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                action: 'update',
                                model: 'activity',
                                query: {
                                    _id: activity._id
                                },
                                data: {
                                    sentToMediport: true
                                }
                            } );
                        }
                    } );
                } );
            }
        }

        async function syncActivityWithDispatcher( user, activity, callback ) {
            callback( null, activity );         //  eslint-disable-line callback-return
            Y.doccirrus.api.dispatch.syncObjectWithDispatcher( user, 'reference', {
                addedFrom: `activity_${activity._id.toString()}`,
                syncActivityId: activity._id.toString()
            }, () => {
            } );

            let context = this && this.context || {};
            if( context.activeActiveWrite ) {
                Y.log( 'Write by activeActive, immediate sync skipped', 'info', NAME );
                return;
            }
            //for first time pass casefolder along
            if( activity.caseFolderId ) {
                let [err, casefolders] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'get',
                        model: 'casefolder',
                        query: {_id: activity.caseFolderId}
                    } )
                );
                if( err ) {
                    Y.log( `syncActivityWithDispatcher: Error on getting casefolder for activity dispatch ${err.stack || err}`, 'error', NAME );
                }
                Y.doccirrus.api.dispatch.syncObjectWithDispatcher( user, 'activeReference', {
                    addedFrom: `activity_${activity._id.toString()}`,
                    entityName: 'casefolder',
                    entryId: activity.caseFolderId,
                    lastChanged: casefolders && casefolders[0] && casefolders[0].lastChanged || new Date(),
                    onDelete: false
                }, () => {
                } );
            }

            let activityNow = {_id: activity._id.toString(), lastChanged: activity.lastChanged};
            setTimeout( () => { // to pass casefolder first
                Y.doccirrus.api.dispatch.syncObjectWithDispatcher( user, 'activeReference', {
                    addedFrom: `activity_${activityNow._id.toString()}`,
                    entityName: 'activity',
                    entryId: activityNow._id.toString(),
                    lastChanged: activityNow.lastChanged,
                    onDelete: false
                }, () => {
                } );
            }, 1000 );
        }

        function syncActivityDeletedWithDispatcher( user, activity, callback ) {
            callback( null, activity );         //  eslint-disable-line callback-return
            Y.doccirrus.api.dispatch.syncObjectWithDispatcher( user, 'activityDeleted', activity, () => {
            } );

            let context = this && this.context || {};
            if( context.activeActiveWrite ) {
                Y.log( 'Write by activeActive, immediate sync skipped', 'info', NAME );
                return;
            }
            Y.doccirrus.api.dispatch.syncObjectWithDispatcher( user, 'activeReference', {
                addedFrom: `activity_${activity._id.toString()}`,
                entityName: 'activity',
                entryId: activity._id.toString(),
                lastChanged: activity.lastChanged,
                onDelete: true
            }, () => {
            } );
        }

        async function triggerRuleEngineOnDelete( user, activity, callback ) {

            callback( null, activity );         //  eslint-disable-line callback-return

            const removeEntriesAndUpdateCaseFolderStatsP = promisifyArgsCallback( Y.doccirrus.api.rulelog.removeEntriesAndUpdateCaseFolderStats );

            let err;

            if( Y.doccirrus.auth.isMocha() ) { //do not run rule engine during mocha tests
                return;
            }

            let activityObj = JSON.parse( JSON.stringify( activity ) );
            if( activityObj.importId || "API2TestingActivity" === activityObj.comment ) { // not trigger rule engine for imported or api2 tests entries
                return;
            }

            let
                CARDIO_PARTNER_ID = Y.doccirrus.schemas.patient.PartnerIdsPartnerId.CARDIO,
                context = this && this.context || {};

            if( activity.vendorId && ((-1 !== activity.vendorId.indexOf( "RULEENGINE" )) ||
                                      (-1 !== activity.vendorId.indexOf( CARDIO_PARTNER_ID ))) ) {
                Y.log( "Skip rule engine on auto generated activity", 'info', NAME );
                return;
            }

            // remove all "ENTRY" reference area rule logs
            [err] = await formatPromiseResult(
                removeEntriesAndUpdateCaseFolderStatsP( {  // this update caseFolders is not necessary, because later apk trigger will update anyway
                    user: user,
                    originalParams: {
                        referenceArea: 'ENTRY',
                        patientId: activity.patientId,
                        caseFolderId: activity.caseFolderId,
                        factId: activity._id
                    }
                } )
            );

            if( err ) {
                Y.log( `could not remove ENTRY reference area rule logs ${err}`, 'error', NAME );
            }

            Y.doccirrus.api.rule.triggerIpcQueue( {
                user,
                tenantId: user.tenantId,
                caseFolderId: activity.caseFolderId,
                locationId: activity.locationId.toString(),
                patientId: activity.patientId,
                type: 'activity',
                onDelete: true,
                activeActive: context.activeActiveWrite,
                data: JSON.parse( JSON.stringify( activity ) )
            } );
        }

        function checkScheinIcds( user, activity, callback ) {
            var
                actType = activity.actType,
                _additionalTransitionData = activity._additionalTransitionData || (activity.originalData_ && activity.originalData_._additionalTransitionData),
                newIcds = _additionalTransitionData && _additionalTransitionData.newIcds;

            function createIcds( catalogData, callback ) {
                var
                    idToReplace = catalogData._id;
                catalogData.employeeId = catalogData.employeeId || activity.employeeId;
                catalogData.timestamp = catalogData.timestamp || (new Date()).toISOString();
                catalogData.caseFolderId = activity.caseFolderId;
                catalogData.status = 'VALID';
                catalogData.diagnosisTreatmentRelevance = 'TREATMENT_RELEVANT';
                catalogData.userContent = catalogData.content;
                catalogData.catalogShort = 'ICD-10';
                catalogData.catalog = true;
                catalogData.patientId = activity.patientId;
                catalogData.locationId = activity.locationId;
                catalogData.skipcheck_ = true;
                catalogData.skipCaseFolderCheck = true;
                delete catalogData._id;
                Y.doccirrus.mongodb.runDb(
                    {
                        'migrate': true,
                        user: user,
                        action: 'post',
                        model: 'activity',
                        data: catalogData
                    }, function( err, result ) {
                        if( err ) {
                            return callback( err );
                        }
                        activity.icds = activity.icds.filter( function( icd ) {
                            return icd !== idToReplace;
                        } );
                        activity.icds.push( result[0] );
                        callback();

                    } );
            }

            if( Y.doccirrus.schemas.activity.isScheinActType( actType ) && newIcds && newIcds.length ) {
                let
                    async = require( 'async' );
                if( activity.continuousIcds && activity.continuousIcds.length ) {
                    activity.continuousIcds = activity.continuousIcds.filter( id => id );
                }
                async.eachSeries( newIcds, createIcds, function( err ) {
                    callback( err, activity );
                } );
            } else {
                return callback( null, activity );
            }
        }

        function checkPresassistive( user, activity, callback ) {

            var
                dbSetup = {
                    'migrate': true,
                    user: user,
                    action: 'get',
                    model: 'activity'
                };

            if( "PRESASSISTIVE" === activity.actType && "DISPATCHED" !== activity.status ) {
                async.waterfall( [checkAssistive, checkDiagnosis], onChecksComplete );
            } else {
                return callback( null, activity );
            }

            function checkDiagnosis( assistives, itcb ) {
                //  Rezept H / PRESASSISTIVE must have exactly one diagnosis (only GHD!) - removed
                let
                    skipDiagnosisCheck = assistives.every( assistive => !Boolean( assistive.assId ) );
                dbSetup.query = {_id: {$in: activity.icds}, actType: 'DIAGNOSIS'};

                function onCheckDiagnosis( err, result ) {
                    if( err ) {
                        return itcb( err );
                    }
                    if( result.length === 0 ) {
                        return itcb( Y.doccirrus.errors.rest( 18009, '', true ) );
                    }

                    itcb( null );
                }

                if( skipDiagnosisCheck ) {
                    return setImmediate( itcb );
                }

                Y.doccirrus.mongodb.runDb( dbSetup, onCheckDiagnosis );
            }

            function checkAssistive( itcb ) {
                //  Rezept H / PRESASSISTIVE must have 1-3 ASSISTIVE linked activities
                let
                    _dbSetup = Object.assign( {
                        options: {
                            select: {
                                assId: 1
                            }
                        }
                    }, dbSetup );
                _dbSetup.query = {_id: {$in: activity.activities}, actType: 'ASSISTIVE'};

                function onCheckAssistive( err, result ) {
                    if( err ) {
                        return itcb( err );
                    }
                    if( result.length === 0 ) {
                        return itcb( Y.doccirrus.errors.rest( 18010, '', true ) );
                    }

                    return itcb( null, result );
                }

                Y.doccirrus.mongodb.runDb( _dbSetup, onCheckAssistive );
            }

            function onChecksComplete( err ) {
                callback( err, activity );
            }
        }

        /**
         *  Recreate reporting entry for this activity
         *
         *  Will also recreate reportings for LABDATA included in this activity, and any documents it owns
         *
         *  @param  {Object}    user
         *  @param  {Object}    activity
         *  @param  {Function}  callback
         */

        function updateReporting( user, activity, callback ) {
            var
                activityId = activity._id && activity._id.toString();

            if( !activityId ) { //activityId is not defined yet, TODO: WHY?
                return callback( null, activity );
            }

            //skip reporting for activePasive transferring
            if( activity.mirrorActivityId ) {
                Y.log( `Reporting generation for transfered activity ${activityId} is skipped..`, 'debug', NAME );
                return callback( null, activity );
            }

            getCasefolderForActivity( {
                'user': user,
                'activity': activity,
                'context': this && this.context
            }, onCaseFolderLoaded );

            function onCaseFolderLoaded( err, caseFolder ) {
                if( err ) {
                    Y.log( `Problem loading casefolder: ${err.stack || err}`, 'error', NAME );
                    //  continue despite error, in rare cases activities have no casefolder
                    caseFolder = caseFolder || {}; //to preveent error on accesing object attributes
                }

                let
                    isQuotationFolder = (caseFolder.additionalType === Y.doccirrus.schemas.casefolder.additionalTypes.QUOTATION),
                    isDeleted = ('DELETED' === activity.status);

                if( isQuotationFolder || isDeleted ) {
                    //  if moved to a quotation casefolder, or cancelled, or deleted, then reporting should be cleaned up
                    Y.doccirrus.insight2.utils.removeReporting( user.tenantId, 'ACTIVITY', activityId );
                } else {
                    //  if updated (including changes to documents), then reporting should be recreated
                    Y.log( `Invoking syncReportingManager for activity: ${activityId}`, 'debug', NAME );
                    Y.doccirrus.insight2.utils.requestReporting( user, 'ACTIVITY', activityId );
                }

                callback( null, activity );
            }
        }

        function handleEdmpActivityUpdatePostProcess( user, activity, callback ) {
            callback( null, activity );     //  eslint-disable-line callback-return

            if( 'APPROVED' === activity.status ||
                !isEdmp( activity.actType ) ||
                true === activity.caseFolderDisabled || !Y.doccirrus.licmgr.hasSpecialModule( user.tenantId, Y.doccirrus.schemas.settings.specialModuleKinds.EDMP ) ) {
                return;
            }

            Y.doccirrus.api.upcomingedmpdoc.invalidatePatient( {
                user: user,
                originalParams: {
                    patientId: activity.patientId
                },
                callback: () => {
                    Y.doccirrus.api.edmp.syncConcurrentIndicationForPatient( {
                        user: user,
                        originalParams: {
                            activity: activity
                        },
                        callback: () => {
                        }
                    } );
                }
            } );

            Y.doccirrus.api.incaseconfiguration.readConfig( {
                user: user,
                callback: function( err, result ) {
                    if( err ) {
                        Y.log( `could not get incaseconfiguration ${err}`, 'error', NAME );
                        return;
                    }
                    if( result && result.medDataEdmpDataTransfer ) {
                        Y.doccirrus.api.edmp.createMedData( {
                            user: user,
                            originalParams: {
                                activity: activity
                            },
                            callback: () => {
                            }
                        } );
                    }
                }
            } );
        }

        function handleEdmpActivitiesOnDelete( user, activity, callback ) {
            callback( null, activity );         //  eslint-disable-line callback-return
            if( !isEdoc( activity.actType ) ) {
                return;
            }

            Y.doccirrus.api.edoc.deleteFile( {
                user: user,
                activity: activity.toObject ? activity.toObject() : activity,
                callback: () => {
                    if( !isEdmp( activity.actType ) ) {
                        return;
                    }

                    Y.doccirrus.api.upcomingedmpdoc.invalidatePatient( {
                        user: user,
                        originalParams: {
                            patientId: activity.patientId
                        },
                        callback: () => {
                        }
                    } );
                }
            } );
        }

        //function removeReporting(user, activity, callback) {
        //    syncReportingManager.removeReport(user, activity._id);
        //    callback(null, activity);
        //}
        function checkAsvCasefolder( activity, caseFolder ) {
            if( 'ASV' === caseFolder.additionalType ) {
                activity.asvTeamnumber = caseFolder.identity;
            } else {
                activity.asvTeamnumber = null;
            }
        }

        function checkCasefolder( user, activity, callback ) {

            if( Y.doccirrus.schemas.casefolder.getPreparedCaseFolderId() === activity.caseFolderId ) {
                // not need to check if PREPARED
                return callback( null, activity );
            }

            function check( caseFolder ) {
                if( caseFolder.imported ) {
                    return callback( new Y.doccirrus.commonerrors.DCError( 18022 ) );
                }
                if( 'TREATMENT' === activity.actType ) {
                    checkAsvCasefolder( activity, caseFolder );
                }

                callback( null, activity );
            }

            // if no valid caseFolderId was provided, allow this and do not check
            // check has bad side-effects for null/undefined caseFolderId as it sets to a random one.
            if( !activity.caseFolderId ) {
                return callback( null, activity );
            }

            getCasefolderForActivity( {user, activity, context: this && this.context}, function( err, caseFolder ) {
                if( err ) {
                    return callback( err );
                }
                check( caseFolder );
            } );
        }

        function getCasefolderForActivity( params, callback ) {
            const
                {user, activity, context} = params;

            if( Y.doccirrus.schemas.casefolder.getPreparedCaseFolderId() === activity.caseFolderId ) {
                // not need to check if PREPARED
                return callback( null, {} );
            }

            let
                cachedCaseFolder = getCollectionCache( {
                    context,
                    collection: 'casefolder',
                    key: activity.caseFolderId
                } );

            if( cachedCaseFolder ) {
                return callback( null, cachedCaseFolder );
            }
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'casefolder',
                query: {
                    _id: activity.caseFolderId
                }
            }, function( err, caseFolders ) {
                if( err ) {
                    return callback( err );
                }
                if( !caseFolders[0] ) {
                    return callback( new Y.doccirrus.commonerrors.DCError( 400, {message: 'Case folder not found'} ) );
                }
                setCollectionCache( {
                    context,
                    collection: 'casefolder',
                    key: activity.caseFolderId,
                    data: caseFolders[0]
                } );
                callback( null, caseFolders[0] );
            } );
        }

        function removeReporting( user, activity, callback ) {
            let
                activityId = activity._id.toString();

            Y.doccirrus.insight2.utils.removeReporting( user.tenantId, 'ACTIVITY', activityId );

            callback( null, activity );
        }

        /**
         * @method Called from DELETE post process
         * @see KUN-276
         *
         * Deleting a schein leaves a faulty reference to the deleted schein in the reporting entries of activities
         * that generate lastSchein context (currently DIAGNOSIS, TREATMENT, DOCLETTER, INVOICE).
         *
         * This function determines the activities that were possibly refering to the deleted schein and
         * orders the regeneration of their reporting entries.
         *
         * @param {object} user
         * @param {object} activity
         * @param {function} callback
         * @returns {Promise} Always resolves to success as the calling function will get result via callback
         */
        async function updateReportingForActivitiesWithScheinContext( user, activity, callback ) {
            if( !Y.doccirrus.schemas.activity.isScheinActType( activity.actType ) ) {
                return callback( null, activity );
            }

            let activitiesToRegenerate, nextSchein, err;
            const
                getNextSchein = promisifyArgsCallback( Y.doccirrus.api.patient.getNextSchein ),
                actTypesWithScheinContext = Y.doccirrus.schemas.activity.actTypesWithScheinContext;

            // Get subsequent schein of the deleted one; with same casefolder, patient and location
            [err, nextSchein] = await formatPromiseResult( getNextSchein( {
                user: user,
                originalParams: {
                    caseFolderId: activity.caseFolderId,
                    patientId: activity.patientId,
                    timestamp: activity.timestamp,
                    locationId: activity.locationId,
                    statuses: ['CANCELLED'],
                    invertStatusQuery: true,
                    nonGreedy: true
                }
            } ) );

            // No critical error, can resume with current date
            if( err ) {
                Y.log( `updateReportingForActivitiesWithScheinContext: Error while getting subsequent schein: ${err.stack || err}`, 'error', NAME );
            }

            // Get IDs of activities that need to be regenerated (timeframe between timestamps of deleted schein and nextSchein)
            [err, activitiesToRegenerate] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'activity',
                query: {
                    caseFolderId: activity.caseFolderId,
                    patientId: activity.patientId,
                    timestamp: {$gt: activity.timestamp, $lt: (nextSchein && nextSchein.timestamp || new Date())},
                    locationId: activity.locationId,
                    actType: {$in: actTypesWithScheinContext}
                },
                options: {
                    select: {
                        _id: 1
                    }
                }
            } ) );

            if( err ) {
                Y.log( `updateReportingForActivitiesWithScheinContext: Error while getting activities for which reporting needs to be updated ${err.stack || err}.`, 'error', NAME );
                return callback( null, activity );
            }

            if( !activitiesToRegenerate || !Array.isArray( activitiesToRegenerate ) || !activitiesToRegenerate.length ) {
                Y.log( 'updateReportingForActivitiesWithScheinContext: Found no activities for which reporting needs to be updated.', 'debug', NAME );
                return callback( null, activity );
            }

            activitiesToRegenerate.forEach( activity => {
                Y.doccirrus.insight2.utils.requestReporting( user, 'ACTIVITY', activity._id );
            } );

            callback( null, activity );
        }

        /**
         * Changes a query to find all activity which can be accessed by current user
         * @param {Object} user
         * @param {mongoose.Query} query
         * @param {Function} callback
         * @returns {*}
         */
        function filterByEmployee( user, query, callback ) {
            let
                isPartner = user.groups && user.groups.some( item => Y.doccirrus.schemas.employee.userGroups.PARTNER === item.group ),
                isReducedUser = user.groups && user.groups.some( item => Y.doccirrus.schemas.employee.userGroups.REDUCED_USER === item.group );
            if( user.superuser ) {
                return callback();
            }
            if( isReducedUser ) {
                let
                    conditions = {};
                if( query._conditions.actType ) {
                    query._conditions.$and = query._conditions.$and || [];
                    query._conditions.$and.push( {
                        actType: query._conditions.actType
                    }, conditions );
                    delete query._conditions.actType;
                } else {
                    conditions = query._conditions;
                }
                conditions.actType = {$nin: Y.doccirrus.schemas.activity.getForbiddenActTypeForGroup( Y.doccirrus.schemas.employee.userGroups.REDUCED_USER )};
                return callback();
            } else if( (query._conditions.caseFolderId || query._conditions.patientId) && isPartner ) {
                Y.doccirrus.api.casefolder.getAllowedCaseFolderForEmployee( {
                    user: user,
                    query: {
                        _id: query._conditions.caseFolderId,
                        patientId: query._conditions.patientId
                    },
                    options: {
                        select: {
                            _id: 1
                        }
                    },
                    callback: function( err, caseFolders ) {
                        let
                            caseFoldersId;
                        if( err ) {
                            return callback( err );
                        }
                        caseFoldersId = caseFolders.map( caseFolder => caseFolder._id.toString() );
                        if( query._conditions && query._conditions.caseFolderId ) {
                            query.and( [
                                {caseFolderId: query._conditions.caseFolderId},
                                {caseFolderId: {$in: caseFoldersId}}

                            ] );
                            delete query._conditions.caseFolderId;
                        } else {
                            query.where( 'caseFolderId' ).in( caseFoldersId );
                        }
                        callback();
                    }
                } );
            } else {
                return callback();
            }
        }

        /**
         * When any *SCHEIN is updated, the treatments linked to it may have to be updated.
         *
         * @param   {Object}    user
         * @param   {Object}    activity
         * @param   {Function}  callback
         * @returns {*}
         */
        function updateScheinTreatments( user, activity, callback ) {
            var
                prevdebtCollection,
                prevscheinOrder,
                prevscheinDiagnosis,
                prevtreatmentType,
                previncludesBSK,
                previsChiefPhysician;
            if( ('VALID' !== activity.status && 'CREATED' !== activity.status || !Y.doccirrus.schemas.activity.isScheinActType( activity.actType )) ) {
                return callback( null, activity );
            }
            if( activity.originalData_ ) {
                prevdebtCollection = activity.originalData_.debtCollection;
                prevscheinOrder = activity.originalData_.scheinOrder;
                prevscheinDiagnosis = activity.originalData_.scheinDiagnosis;
                prevtreatmentType = activity.originalData_.treatmentType;
                previncludesBSK = activity.originalData_.includesBSK;
                previsChiefPhysician = activity.originalData_.isChiefPhysician;

                let running = Boolean(
                    activity.debtCollection !== prevdebtCollection ||
                    activity.scheinOrder !== prevscheinOrder ||
                    activity.scheinDiagnosis !== prevscheinDiagnosis ||
                    activity.treatmentType !== prevtreatmentType ||
                    activity.includesBSK !== previncludesBSK ||
                    activity.isChiefPhysician !== previsChiefPhysician );

                //console.log( 'rrrrrrrrr', activity.treatmentType,  Y.doccirrus.schemas.activity.types.TreatmentType_E.list.filter( function(item) { return item.val === activity.treatmentType; } ).length )
                let treatmentType = (Y.doccirrus.schemas.activity.types.TreatmentType_E.list.filter( function( item ) {
                    return item.val === activity.treatmentType;
                } ).length ?
                    activity.treatmentType : undefined);

                Y.log( `Running updateScheinTreatments: ${running}`, 'info', NAME );
                // only run the following if running is true?
                Y.doccirrus.mongodb.runDb(
                    {
                        user: user,
                        model: 'activity',
                        query: {
                            caseFolderId: activity.caseFolderId,
                            actType: 'TREATMENT',
                            status: 'VALID',
                            timestamp: {$gt: activity.timestamp}
                        },
                        callback: function( err, activities ) {
                            if( err || !activities ) {
                                Y.log( 'Failed to update schein treatments ', 'warn', NAME );
                                return callback( null, activity );
                            }
                            let ids = activities.map( function( item ) {
                                return item._id;
                            } );

                            if( ids ) {
                                let
                                    _data = {
                                        debtCollection: activity.debtCollection,
                                        scheinOrder: activity.scheinOrder,
                                        scheinDiagnosis: activity.scheinDiagnosis,
                                        includesBSK: activity.includesBSK,
                                        isChiefPhysician: activity.isChiefPhysician
                                    };
                                if( treatmentType ) {
                                    _data.treatmentType = treatmentType;
                                }
                                Y.doccirrus.mongodb.runDb( {
                                    user,
                                    action: 'update',
                                    model: 'activity',
                                    query: {
                                        _id: {$in: ids}
                                    },
                                    data: _data,
                                    options: {
                                        multi: true
                                    }
                                }, err => callback( err, activity ) );
                            } else {
                                return callback( null, activity );
                            }
                        }
                    }
                );
                return;
            }
            return callback( null, activity );

        }

        /**
         *  When a receipt is saved it may link to an invoice, in this case the invoice must be updated
         *  with a forward link and remaining balance recalculated
         *
         *  @param  user
         *  @param  activity
         *  @param  callback
         */

        function updateReceiptLinks( user, activity, callback ) {
            //  This only applied to RECEIPT types
            if( !Y.doccirrus.schemas.activity.isInvoiceCommunicationActType( activity.actType ) ) {
                return callback( null, activity );
            }

            Y.doccirrus.api.receipt.updateLinkedInvoice( user, activity, function( err ) {
                callback( err, activity );
            } );
        }

        /**
         *  If user set subType trough description update and set for subType field too
         * @param   {Object}    user
         * @param   {Object}    activity
         * @param   {Function}  callback
         */
        function checkSubType( user, activity, callback ) {
            if( !activity.subType && activity.userContent && 0 < activity.userContent.indexOf( '::' ) ) {
                let
                    content = activity.userContent,
                    words = content
                        .replace( new RegExp( '\n', 'g' ), ' ' )    //  eslint-disable-line no-control-regex
                        .replace( new RegExp( '\r', 'g' ), ' ' )    //  eslint-disable-line no-control-regex
                        .split( ' ' );

                words.forEach( function( word ) {
                    if( 0 < word.indexOf( '::' ) && !activity.subType ) {
                        activity.subType = word.replace( '::', '' );
                    }
                } );
            }

            callback( null, activity );
        }

        /**
         *  Check using certificate type NONE depending on case folder type
         * @param   {Object}    user
         * @param   {Object}    activity
         * @param   {Function}  callback
         * @returns {*}
         */
        async function checkDiagnosisCert( user, activity, callback ) {
            function isOfficialCaseFolder() {
                return Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'casefolder',
                    action: 'get',
                    migrate: true,
                    query: {
                        _id: activity.caseFolderId
                    }
                    // MOJ-14319: [OK]
                } ).then( results => results && results[0] &&
                                     (Y.doccirrus.schemas.patient.isPublicInsurance( {type: results[0].type} ) ||
                                      'BG' === results[0].type) );
            }

            if( 'DIAGNOSIS' === activity.actType && 'UUU' === activity.code && !Y.doccirrus.commonutils.isDateBeforeQ12020( activity.timestamp ) ) {
                // do not allow UUU
                let [err, isOfficial] = await formatPromiseResult( isOfficialCaseFolder() );
                if( err ) {
                    Y.log( `Error on getting casefolder for UUU check ${err.stack || err}`, 'warn', NAME );
                }

                if( isOfficial === true ) {
                    return callback( new Y.doccirrus.commonerrors.DCError( 18045 ) );
                }

            }

            if( 'DIAGNOSIS' === activity.actType && 'UUU' !== activity.code &&
                ('NONE' === activity.diagnosisCert || !activity.diagnosisCert) ) {

                let [err, isOfficial] = await formatPromiseResult( isOfficialCaseFolder() );

                if( err ) {
                    Y.log( `Error on getting casefolder for diagnosisCert check ${err.stack || err}`, 'warn', NAME );
                }

                if( isOfficial === true ) {
                    return callback( new Y.doccirrus.commonerrors.DCError( 18025 ) );
                }
            }

            return callback( null, activity );
        }

        /**
         *
         * Update tags for this activity's subType field
         *
         * @param   {Object}    user
         * @param   {Object}    activity
         * @param   {Function}  callback
         */
        function updateSubTypeTags( user, activity, callback ) {

            let
                oldTags = activity.originalData_ && activity.originalData_.subType || [],
                currentTags = activity.subType || [];

            if( !activity._id ) { //activity._id is not defined yet, reproduced with complexprescription TODO: WHY
                return callback( null, activity );
            }

            if( activity.wasNew ) {
                oldTags = [];
            }

            if( !Array.isArray( oldTags ) ) {
                oldTags = [oldTags];
            }

            if( !Array.isArray( currentTags ) ) {
                currentTags = [currentTags];
            }

            Y.doccirrus.api.tag.updateTags( {
                user,
                data: {
                    type: Y.doccirrus.schemas.tag.tagTypes.SUBTYPE,
                    oldTags,
                    documentId: activity._id.toString(),
                    currentTags
                },
                callback: function( err ) {
                    callback( err, activity );
                }
            } );
        }

        /**
         *
         * Update tags for this activity's dosis field
         *
         * @param   {Object}    user
         * @param   {Object}    activity
         * @param   {Function}  callback
         */
        function updateDoseTags( user, activity, callback ) {
            let
                oldTags = activity.originalData_ && activity.originalData_.dosis || [],
                currentTags = activity.dosis || [];

            if( 'MEDICATION' !== activity.actType ) {
                return callback( null, activity );
            }

            if( !activity._id ) { //activity._id is not defined yet, reproduced with complexprescription TODO: WHY
                return callback( null, activity );
            }

            if( activity.wasNew ) {
                oldTags = [];
            }

            if( !Array.isArray( oldTags ) ) {
                oldTags = [oldTags];
            }

            if( !Array.isArray( currentTags ) ) {
                currentTags = [currentTags];
            }

            Y.doccirrus.api.tag.updateTags( {
                user,
                data: {
                    type: Y.doccirrus.schemas.tag.tagTypes.DOSE,
                    oldTags,
                    documentId: activity._id.toString(),
                    currentTags
                },
                callback: function( err ) {
                    callback( err, activity );
                }
            } );
        }

        /**
         *
         * Update tags for this activity's phNote field
         *
         * @param   {Object}    user
         * @param   {Object}    activity
         * @param   {Function}  callback
         */
        function updatePhNoteTags( user, activity, callback ) {
            let
                oldTags = activity.originalData_ && activity.originalData_.phNote || [],
                currentTags = activity.phNote || [];

            if( 'MEDICATION' !== activity.actType ) {
                return callback( null, activity );
            }

            if( !activity._id ) { //activity._id is not defined yet, reproduced with complexprescription TODO: WHY
                return callback( null, activity );
            }

            if( activity.wasNew ) {
                oldTags = [];
            }

            if( !Array.isArray( oldTags ) ) {
                oldTags = [oldTags];
            }

            if( !Array.isArray( currentTags ) ) {
                currentTags = [currentTags];
            }

            Y.doccirrus.api.tag.updateTags( {
                user,
                data: {
                    type: Y.doccirrus.schemas.tag.tagTypes.PHNOTE,
                    oldTags,
                    documentId: activity._id.toString(),
                    currentTags
                },
                callback: function( err ) {
                    callback( err, activity );
                }
            } );
        }

        /**
         *
         * Update tags for this activity's phReason field
         *
         * @param   {Object}    user
         * @param   {Object}    activity
         * @param   {Function}  callback
         */
        function updatePhReasonTags( user, activity, callback ) {
            let
                oldTags = activity.originalData_ && activity.originalData_.phReason || [],
                currentTags = activity.phReason || [];

            if( 'MEDICATION' !== activity.actType ) {
                return callback( null, activity );
            }

            if( !activity._id ) { //activity._id is not defined yet, reproduced with complexprescription TODO: WHY
                return callback( null, activity );
            }

            if( activity.wasNew ) {
                oldTags = [];
            }

            if( !Array.isArray( oldTags ) ) {
                oldTags = [oldTags];
            }

            if( !Array.isArray( currentTags ) ) {
                currentTags = [currentTags];
            }

            Y.doccirrus.api.tag.updateTags( {
                user,
                data: {
                    type: Y.doccirrus.schemas.tag.tagTypes.PHREASON,
                    oldTags,
                    documentId: activity._id.toString(),
                    currentTags
                },
                callback: function( err ) {
                    callback( err, activity );
                }
            } );
        }

        /**
         *
         * Update cancelReason field
         *
         * @param   {Object}    user
         * @param   {Object}    activity
         * @param   {Function}  callback
         * @returns {*}
         */
        function updateCancelReason( user, activity, callback ) {

            if( !activity.cancelReason ) {
                return callback( null, activity );
            }

            Y.doccirrus.api.tag.updateTags( {
                user,
                data: {
                    type: Y.doccirrus.schemas.tag.tagTypes.CANCELREASON,
                    oldTags: [],
                    documentId: activity._id.toString(),
                    currentTags: [activity.cancelReason]
                },
                callback: function( err ) {
                    callback( err, activity );
                }
            } );
        }

        /**
         * Check if there is "BL Schein" with same code as treatment.
         * If there is no "BL Schein" with same location but there is with different one,
         * System will sent notification for user.
         *
         * @param   {Object}    user
         * @param   {Object}    activity
         * @param   {Function}  callback
         * @returns {*}
         */
        function checkBLCodeLocation( user, activity, callback ) {
            if( 'TREATMENT' === activity.actType && activity.isNew ) {
                let
                    query = {
                        actType: {$in: ['SCHEIN', 'PKVSCHEIN', 'BGSCHEIN']},
                        caseFolderId: activity.caseFolderId,
                        patientId: activity.patientId,
                        status: {$nin: ['DELETED', 'CANCELLED']},
                        $or: [
                            {'fk4235Set.fk4244Set.fk4244': activity.code},
                            {'fk4235Set.fk4256Set.fk4244': activity.code}
                        ]
                    },
                    async = require( 'async' );
                async.waterfall( [
                    function( next ) {
                        Y.doccirrus.api.location.getLocationSet( {
                            user,
                            query: {
                                _id: activity.locationId.toString()
                            },
                            options: {
                                select: {
                                    _id: 1
                                },
                                lean: true
                            },
                            callback( err, locations ) {
                                if( err ) {
                                    return next( err );
                                }
                                next( null, locations.map( location => location._id.toString() ) );
                            }
                        } );
                    },
                    function( validLocationList, next ) {
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'activity',
                            action: 'get',
                            query: query,
                            options: {
                                lean: true,
                                select: {
                                    locationId: 1,
                                    fk4235Set: 1
                                }
                            }
                        }, function( err, scheins ) {
                            let
                                hasBLScheinForLocation,
                                hasBLSchein = false;
                            if( err ) {
                                return next( err );
                            }
                            hasBLScheinForLocation = scheins.some( schein => {

                                if( schein.fk4235Set && !hasBLSchein ) {
                                    hasBLSchein = schein.fk4235Set.some( function( item ) {
                                        const sumTreatments = ( sum, entry ) => sum + Number( entry.fk4246 || 0 );
                                        const maxTreatmentsOfInsuredPerson = item.fk4252;
                                        const maxTreatmentsOfCareGiver = item.fk4255;
                                        const sumTreatmentsOfInsuredPerson = (item.fk4244Set || []).reduce( sumTreatments, 0 );
                                        const sumTreatmentsOfCareGiver = (item.fk4256Set || []).reduce( sumTreatments, 0 );

                                        return (!maxTreatmentsOfInsuredPerson || sumTreatmentsOfInsuredPerson < maxTreatmentsOfInsuredPerson) ||
                                               (!maxTreatmentsOfCareGiver || sumTreatmentsOfCareGiver < maxTreatmentsOfCareGiver);
                                    } );
                                }

                                return validLocationList.includes( schein.locationId.toString() );
                            } );
                            if( hasBLSchein && !hasBLScheinForLocation ) {
                                let
                                    i18n = Y.doccirrus.i18n;
                                Y.doccirrus.communication.emitEventForUser( {
                                    targetId: user.identityId,
                                    event: 'message',
                                    msg: {
                                        data: i18n( 'activity-process.text.BL_TREATMENT_WARN' )
                                    }
                                } );
                            }
                            next( null, activity );
                        } );
                    }
                ], ( err ) => {
                    callback( err, activity );
                } );
            } else {
                return callback( null, activity );
            }

        }

        function checkRepeatedKbvUtilities( user, activity, callback ) {
            if( 'KBVUTILITY' !== activity.actType || !activity.parentPrescriptionId ) {
                callback( null, activity );
                return;
            }
            const
                moment = require( 'moment' ),
                Promise = require( 'bluebird' ),
                runDb = Promise.promisify( Y.doccirrus.mongodb.runDb );

            runDb( {
                user: user,
                model: 'activity',
                query: {
                    _id: activity.parentPrescriptionId
                },
                options: {
                    lean: true,
                    select: {
                        timestamp: 1
                    }
                }
            } ).get( 0 ).then( parent => {
                if( !parent ) {
                    return;
                }
                if( moment( activity.timestamp ).isBefore( moment( parent.timestamp ) ) ) {
                    throw new Y.doccirrus.commonerrors.DCError( 30101 );
                }
            } ).then( () => {
                callback( null, activity );
            } ).catch( err => {
                callback( err );
            } );
        }

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        /**
         * updates/creates medication plan. When new plan is saved, emits event to update activity table.
         * @param {Object} user
         * @param {Object} activity
         * @param {Function} callback
         */
        function updateMedicationPlanPdf( user, activity, callback ) {
            let
                context = this && this.context || {};

            //  if not a VALID MEDICATIONPLAN then we can skip this step
            if( 'MEDICATIONPLAN' !== activity.actType || 'VALID' !== activity.status ) {
                return setImmediate( callback, null, activity );
            }

            //  only call out to MMI to get the medicationplan PDF if activity was modified or flag was set
            if( !activity.activitiesWasModified && !context.regenerateMedicationPlanPDF ) {
                return setImmediate( callback, null, activity );
            }

            Y.doccirrus.api.activity.generateMedicationPlan( {
                'user': user,
                'data': activity,
                'callback': onGeneratePdfFromMMI
            } );

            function onGeneratePdfFromMMI( err, data ) {
                if( 'function' === typeof context.onPdfCreated ) {
                    context.onPdfCreated( err, data );
                }
                if( err ) {
                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: user.identityId,
                        event: 'message',
                        msg: {
                            data: err.toString()
                        },
                        meta: {
                            level: 'ERROR'
                        }
                    } );
                    return callback();
                }
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    event: 'system.UPDATE_ACTIVITIES_TABLES',
                    msg: {
                        data: activity.caseFolderId
                    }
                } );
                callback( null, activity );
            }
        }

        /**
         * updates/creates medication plan. When new plan is saved, emits event to update activity table.
         * @param {Object} user
         * @param {Object} activity
         * @param {Function} callback
         */
        function updateKBVMedicationPlanPdf( user, activity, callback ) {
            let
                context = this && this.context || {};

            if( 'KBVMEDICATIONPLAN' !== activity.actType || 'VALID' !== activity.status || context.regenerateMedicationPlanPDF === false ) {
                return setImmediate( callback, null, activity );
            }

            Y.doccirrus.api.activity.updateKBVMedicationPlanPdf( {
                user,
                data: activity,
                callback: onGeneratePdfFromMMI
            } );

            function onGeneratePdfFromMMI( err, media ) {
                if( 'function' === typeof context.onPdfCreated ) {
                    context.onPdfCreated( err, media );
                }
                if( err ) {
                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: user.identityId,
                        event: 'message',
                        msg: {
                            data: err.toString()
                        },
                        meta: {
                            level: 'ERROR'
                        }
                    } );
                    return callback( null, activity );
                }
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    event: 'system.UPDATE_ACTIVITIES_TABLES',
                    msg: {
                        data: activity.caseFolderId
                    }
                } );
                callback( null, activity );
            }
        }

        /**
         *  When a medication is saved any medicationplan(s) it belongs to may need to be updated with a new PDF from MMI
         *
         *  Should run after updates to linked activities.
         *
         *  @param user
         *  @param activity
         *  @param callback
         *  @return {number}
         */

        async function checkMedicationForMedicationplan( user, activity, callback ) {

            if( 'MEDICATION' !== activity.actType || !activity.referencedBy || 0 === activity.referencedBy.length ) {
                return setImmediate( callback, null, activity );
            }

            let context = this && this.context || {};

            if( context.skipRegenerateMMIPDF ) {
                Y.log( 'Skip regenerate MMI PDF, fonr context option.', 'info', NAME );
                return setImmediate( callback, null, activity );
            }

            let err, result, parentActivity;

            //  load all MEDICATONPLAN activities which link to this MEDICATION

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    query: {
                        actType: 'MEDICATIONPLAN',
                        _id: {$in: activity.referencedBy}
                    }
                } )
            );

            if( err ) {
                //  should never happen
                return callback( err );
            }

            for( parentActivity of result ) {
                //  we don't need to wait for the callback
                parentActivity.activitiesWasModified = true;
                updateMedicationPlanPdf( user, parentActivity, function onMedicationplanPdf( err ) {
                    if( err ) {
                        Y.log( `Problem updating MEDICATIONPLAN PDF from MMI ${err.stack || err}`, 'error', NAME );
                    }
                } );
            }

            callback( null );
        }

        /**
         *  When a medication is saved any kbvmedicationplan(s) it belongs to may need to be updated with a new PDF from MMI
         *
         *  Should run after updates to linked activities.
         *
         *  @param user
         *  @param activity
         *  @param callback
         *  @return {number}
         */

        async function checkMedicationForKBVMedicationPlan( user, activity, callback ) {
            if( 'MEDICATION' !== activity.actType || !activity.referencedBy || 0 === activity.referencedBy.length ) {
                return setImmediate( callback, null, activity );
            }
            const medicationFields = Object.keys( Y.doccirrus.schemas.activity.types.Medication_T ).concat( ['timestamp', 'code'] );

            let context = this && this.context || {};

            if( context.skipRegenerateMMIPDF ) {
                Y.log( 'Skip regenerate KBVMedicationPlan MMI PDF, fonr context option.', 'info', NAME );
                return setImmediate( callback, null, activity );
            }

            let err, result, parentActivity;

            //  load all MEDICATONPLAN activities which link to this MEDICATION

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    query: {
                        actType: 'KBVMEDICATIONPLAN',
                        _id: {$in: activity.referencedBy}
                    }
                } )
            );

            if( err ) {
                Y.log( `checkMedicationForKBVMedicationPlan: could not get possible KBVMedicationPlan for Medication ${activity._id}`, 'warn', NAME );
                return callback( err );
            }

            for( parentActivity of result ) {

                const matchingMedicationPlanEntry = parentActivity.medicationPlanEntries.find( medicationPlanEntry => medicationPlanEntry.medicationRef === activity._id.toString() );

                if( !matchingMedicationPlanEntry ) {
                    Y.log( `checkMedicationForKBVMedicationPlan: no matching medicationPlanEntry found for Medication ${activity._id}`, 'debug', NAME );
                    continue;
                }
                Object.assign( matchingMedicationPlanEntry, _.pick( activity.toObject(), medicationFields ) );

                const parentActivityId = parentActivity._id;
                delete parentActivity._id;

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'put',
                    query: {
                        _id: parentActivityId
                    },
                    fields: ['medicationPlanEntries'],
                    data: Y.doccirrus.filters.cleanDbObject( parentActivity ),
                    context: {
                        noMedicationCheck: true
                    }
                } ).catch( err => Y.log( `could not save KBVMedicationPlan ${parentActivityId} after Medication ${activity._id} has changed: ${err.stack || err}`, 'warn', NAME ) );
            }

            callback( null, activity );
        }

        // workaround @MOJ-6625
        function setIsModified( user, activity, callback ) {
            activity.wasNew = activity.isNew;
            activity.activitiesWasModified = activity.isModified( 'activities' );
            activity.locationIdWasModified = activity.isModified( 'locationId' );
            activity.kimStateWasModified = activity.isModified( 'kimState' );
            activity.pathsModifiedBefore = activity.modifiedPaths();
            let context = this && this.context || {};
            if( context.activeActiveWrite ) {
                activity.lastChanged = activity.lastChanged || new Date();
            } else {
                activity.lastChanged = new Date();
            }
            callback( null, activity );
        }

        /**
         * Replaces control characters in medication fields ( dosis, phNote, phUnit, phReason ) if some are present
         * @param {Object} user
         * @param {Object} activity
         * @param {Function} callback
         */
        function replaceControlCharactersInMedicationFields( user, activity, callback ) {
            let
                dosis = activity.dosis,
                phUnit = activity.phUnit,
                phReason = activity.phReason,
                phNote = activity.phNote;
            if( 'MEDICATION' !== activity.actType ) {
                callback( null, activity );
                return;
            }
            if( controlCharsRegExp.test( dosis ) ) {
                dosis = replaceControlChars( dosis );
                activity.dosis = dosis;
            }
            if( controlCharsRegExp.test( phUnit ) ) {
                phUnit = replaceControlChars( phUnit );
                activity.phUnit = phUnit;
            }
            if( controlCharsRegExp.test( phReason ) ) {
                phReason = replaceControlChars( phReason );
                activity.phReason = phReason;
            }
            if( controlCharsRegExp.test( phNote ) ) {
                phNote = replaceControlChars( phNote );
                activity.phNote = phNote;
            }
            callback( null, activity );
        }

        /**
         * Check that invoice has receipts, totalReceipts, totalReceiptsOutstanding
         * @param {Object} user
         * @param {Object} activity
         * @param {Function} callback
         */
        function setTotalReceiptsOutstanding( user, activity, callback ) {
            if( 'INVOICE' !== activity.actType && 'INVOICEREF' !== activity.actType ) {
                callback( null );
                return;
            }
            Y.doccirrus.api.linkedactivities.updateInvoiceLinkedData( user, activity, callback );
        }

        /**
         * Calculates material costs
         * @param {Object} user
         * @param {Object} activity
         * @param {Function} callback
         */
        function setMaterialCosts( user, activity, callback ) {
            if( 'TREATMENT' === activity.actType ) {
                if( 'EBM' === activity.catalogShort ) {
                    activity.materialCosts = 0;
                    activity.fk5012Set.forEach( item => {
                        activity.materialCosts += Number( item.fk5012 );
                    } );
                    activity.materialCosts = activity.materialCosts / 100;
                } else {
                    let
                        generalCosts = Number( activity.generalCosts ) || 0,
                        specialCosts = Number( activity.specialCosts ) || 0;
                    activity.materialCosts = generalCosts + specialCosts;
                }
            }
            setImmediate( callback, null, activity );

        }

        function setMedicationCode( user, activity, callback ) {
            if( 'MEDICATION' === activity.actType && !activity.code && activity.phPZN ) {
                activity.code = activity.phPZN;
            }
            callback( null, activity );

        }

        function cleanContinousMedicationDate( user, activity, callback ) {
            if( 'MEDICATION' === activity.actType && !activity.phContinuousMed && activity.phContinuousMedDate ) {
                activity.phContinuousMedDate = null;
            }
            callback( null, activity );

        }

        function checkAuVon( user, activity, callback ) {
            const
                moment = require( 'moment' );
            let
                isValid;
            if( 'AU' !== activity.actType || true === activity.folgeBesc ) {
                return setImmediate( callback );
            }
            isValid = moment( activity.timestamp ).startOf( 'day' ).subtract( 3, 'days' ).isBefore( activity.auVon );
            if( !isValid ) {
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    event: 'message',
                    msg: {
                        data: Y.doccirrus.i18n( 'validations.kbv.message.AU_3_DAYS_RULE' )
                    }
                } );
            }
            setImmediate( callback );
        }

        /**
         * Updates tag collection
         * @param   {Object}    user
         * @param   {Object}    activity
         * @param   {Function}  callback
         * @returns {*}
         */
        function updateLabTests( user, activity, callback ) {
            let
                oldLabTests,
                currentLabTests = activity.l_extra && activity.l_extra.testId || [],
                isUserGenerated = !activity.labText;

            if( ('LABDATA' !== activity.actType && 'LABREQUEST' !== activity.actType) || 'PREPARED' === activity.status ) {
                return setImmediate( callback, null, activity );
            }
            if( activity.wasNew ) {
                oldLabTests = [];
            } else {
                oldLabTests = activity.originalData_ && activity.originalData_.l_extra && activity.originalData_.l_extra.testId || [];
            }

            Y.doccirrus.api.labtest.updateLabTests( {
                user,
                data: {
                    isUserGenerated,
                    documentId: activity._id.toString(),
                    oldLabTests,
                    currentLabTests
                },
                callback: function( err ) {
                    callback( err, activity );
                }
            } );
        }

        /**
         * Updates tag collection
         * @param {Object} user
         * @param {Object} activity
         * @param {Function} callback
         */
        function updateLabTestsOnDelete( user, activity, callback ) {
            let
                oldLabTests = activity.l_extra && activity.l_extra.testId || [],
                currentLabTests = [],
                isUserGenerated = !activity.labText;

            Y.doccirrus.api.labtest.updateLabTests( {
                user,
                data: {
                    isUserGenerated,
                    documentId: activity._id.toString(),
                    oldLabTests,
                    currentLabTests
                },
                callback: function( err ) {
                    callback( err, activity );
                }
            } );
        }

        function setLabData( user, activity, callback ) {
            if( 'PREPARED' !== activity.status && 'LABDATA' === activity.actType && 'VALID' === activity.status && activity.l_extra && !activity.labText ) {
                activity.l_extra.reportDate = new Date( activity.timestamp );
                activity.l_extra.labReqReceived = new Date( activity.timestamp );
                setImmediate( callback, null, activity );
            } else {
                setImmediate( callback, null, activity );
            }
        }

        /**
         * Updates tag collection (tags of type MEDDATA), whenever a MEDDATA activity is updated.
         * Scans the contained MedDataItems and creates new tags, if necessary.
         * @param {Object} user
         * @param {Object} activity
         * @param {Function} callback
         */
        function updateMedDataTags( user, activity, callback ) {
            if( Y.doccirrus.schemas.activity.medDataActTypes.includes( activity.actType ) && 'PREPARED' !== activity.status ) {
                let
                    oldTags = [],
                    currentTags = [];

                // normalize the old tags stored before within the activity
                if( activity.originalData_ && Array.isArray( activity.originalData_.medData ) ) {
                    oldTags = activity.originalData_.medData
                        // filter static types (these are not created as tags)
                        .filter( ( medDataItem ) => {
                            return !Y.doccirrus.schemas.tag.isStaticTag( medDataItem.type, {
                                type: Y.doccirrus.schemas.tag.tagTypes.MEDDATA
                            } );
                        } )
                        // map the MedDataItemSchema objects into TagSchema objects to normalize their input
                        .map( ( medDataItem ) => TagSchema.byMedDataItem( medDataItem ).toObject() );
                } else if( activity.wasNew ) {
                    oldTags = [];
                }

                // normalize the new tags currently stored within the activity
                if( Array.isArray( activity.medData ) ) {
                    currentTags = activity.medData
                        // filter static types (these are not created as tags)
                        .filter( ( medDataItem ) => {
                            return (
                                // item configured for tag creation
                                !medDataItem.noTagCreation &&
                                // and item is dynamic, not statically defined type
                                !Y.doccirrus.schemas.tag.isStaticTag( medDataItem.type, {
                                    type: Y.doccirrus.schemas.tag.tagTypes.MEDDATA
                                } )
                            );
                        } )
                        // map the MedDataItemSchema objects into TagSchema objects to normalize their input
                        .map( ( medDataItem ) => TagSchema.byMedDataItem( medDataItem ).toObject() );
                }

                // update the tags with the new data
                Y.doccirrus.api.tag.updateTags( {
                    user,
                    data: {
                        type: Y.doccirrus.schemas.tag.tagTypes.MEDDATA,
                        oldTags: oldTags,
                        documentId: activity._id.toString(),
                        currentTags: currentTags,
                        comparisonKeys: ['title', 'category', 'additionalData', 'sampleNormalValueText'],
                        tagTitleKey: 'title',
                        updateKeys: ['unit', ['category'], {'additionalData': 1}, 'sampleNormalValueText']
                    },
                    callback: function( err ) {
                        callback( err, activity );
                    }
                } );
            } else {
                setImmediate( callback, null, activity );
            }
        }

        /**
         * Pre-write process for MEDDATA activities.
         * Validates all medDataItems within an activity with the MedDataItemConfiguration valid for that item.
         * @param {object} user
         * @param {MedDataSchema} activity
         * @param {function(err, activity)} callback
         */
        async function validateMedDataItems( user, activity, callback ) {
            // extract activity parameters
            const
                /**
                 * @type {Date}
                 */
                timestampOfActivity = activity.timestamp,
                /**
                 * @type {MedDataItemSchema[]}
                 */
                medDataItems = activity.medData;

            let err, medDataItemTemplateCollection, validationResults, patientResults;

            // should the activity be validated at all? If not, return immediately.
            switch( true ) {

                // not a MEDDATA actType?
                case !Y.doccirrus.schemas.activity.medDataActTypes.includes( activity.actType ):
                // PREPARED or CREATED?
                case ['PREPARED', 'CREATED'].includes( activity.status ):
                // no medDataItems?
                case !Array.isArray( medDataItems ):
                case medDataItems.length === 0:
                    return setImmediate( callback, null, activity );

            }

            // continue with the validation

            // get all relevant medDataItemTypes, to speed up the database query
            const medDataItemTypes = medDataItems.map( medDataItem => medDataItem.type );

            // load the full med data item template collection from the database
            [err, medDataItemTemplateCollection] = await formatPromiseResult(
                Y.doccirrus.api.meddata.getMedDataItemTemplateCollection( {
                    user,
                    title: medDataItemTypes
                } )
            );

            if( err ) {
                Y.log( `validateMedDataItems: error loading MedDataItemTemplateCollection: ${err.stack || err.message || err}`, 'error', NAME );
            }

            [err, patientResults] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                model: 'patient',
                action: 'get',
                query: { _id: activity.patientId },
                user: user,
                options: {
                    lean: true
                }
            } ) );

            if ( err ) {
                Y.log( `validateMedDataItems: Error occurred while querying patient ${activity.patientId}, Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if (patientResults.length === 0) {
                let patientNoFoundMessage = `validateMedDataItems: Error occurred while querying patient ${activity.patientId}`;
                Y.log( patientNoFoundMessage, "error", NAME );

                return callback( new DCError( 404, { message: patientNoFoundMessage } ) );
            }


            // go through all medDataItems and check if they are valid, collect any error messages
            const
                errorMessages = [],
                errorMessageDictionary = {},
                validationPromises = medDataItems.map( ( medDataItem ) => {
                    // each valid medDataItem needs a type => check again for that to avoid TypeErrors
                    if( medDataItem.type ) {
                        const
                            // get corresponding medDataItemConfig from MedDataItemTemplateCollection
                            medDataItemConfig = medDataItemTemplateCollection.getMedDataItemConfigSchemaForMedDataItem( {
                                // in the UI, the item is passed as KoViewModel
                                medDataItem: medDataItem,
                                timestamp: timestampOfActivity
                            } );

                        // prepare an array to store eventual error messages
                        errorMessageDictionary[medDataItem.type] = [];

                        if( medDataItemConfig ) {

                            if ( isNaN( parseFloat( medDataItem.value ) ) && medDataItemConfig.dataType === MedDataItemDataTypes.NUMBER_FORMULA ) {
                                medDataItem.value = medDataItemConfig.getValueFormulaExpressionValue( patientResults[0], errorMessageDictionary[medDataItem.type], { extendedMedData: medDataItems.toObject() } );
                            }

                            // validate the item, and return an error in case any item is invalid
                            return medDataItemConfig.isMedDataItemValid( medDataItem, errorMessageDictionary[medDataItem.type] );
                        }
                        return Promise.resolve( true );
                    }
                } );

            // wait for all validations to finish
            [err, validationResults] = await formatPromiseResult( Promise.all( validationPromises ) );

            if( err ) {
                Y.log( `validateMedDataItems: error executing validation functions: ${err.stack || err.message || err}`, 'error', NAME );
            }

            if( !validationResults.every( result => result === true ) ) {
                Object
                    .keys( errorMessageDictionary )
                    .forEach( ( medDataItemType ) => {
                        Array.prototype.push.apply(
                            errorMessages,
                            errorMessageDictionary[medDataItemType]
                                .map( messageObj =>
                                    `${medDataItemType}: ${i18n( `validations.message.${messageObj.message}`, messageObj.options )}`
                                )
                        );
                    } );

                if( errorMessageDictionary.length === 0 ) {
                    errorMessages.push( 'MedDataItem validation failed. No error message provided.' );
                }
                return callback( new DCError( 400, { message: errorMessages.join( ", " ) } ), activity );
            }

            setImmediate( callback, null, activity );
        }

        /**
         *  When a GRAVIDOGRAMMPROCESS / Untersuchung activity is saved, check that it is linked from any
         *  GRAVIDOGRAMM in its casefolder
         *
         *  @param user
         *  @param activity
         *  @param callback
         */

        function linkGravidogrammProcess( user, activity, callback ) {
            if( 'GRAVIDOGRAMMPROCESS' !== activity.actType ) {
                return callback( null, activity );
            }
            Y.doccirrus.api.linkedactivities.linkGravidogrammProcess( user, activity, callback );
        }

        /**
         *  When a MEDDATA activity is deleted, values in patient.latestMedData must be rebuilt
         *  Also emits event for PatientGadgetLatestMedData to refetch it's data
         *  @param  user        {Object}
         *  @param  activity    {Object}
         *  @param  callback    {Function}
         */

        function checkPatientMedData( user, activity, callback ) {
            //  if not a MEDDATA activity then we can skip this step
            if( !Y.doccirrus.schemas.activity.medDataActTypes.includes(activity.actType) || 'PREPARED' === `${activity.status}` ) {
                return callback( null, activity );
            }

            //  start the regeneration
            Y.doccirrus.api.patient.setLatestMedData( user, `${activity.patientId}`, activity, false, true, onFixMedData );

            function onFixMedData( err ) {
                if( err ) {
                    Y.log( 'Error updating patient latestMedData after deleting activity.' );
                }
                Y.doccirrus.communication.emitNamespaceEvent( {
                    nsp: 'default',
                    event: `activity.latestMedDataRefresh`,
                    tenantId: user && user.tenantId,
                    msg: {
                        data: activity.patientId && activity.patientId.toString()
                    }
                } );
            }

            //  call back immediately, we don't need to wait for this
            callback( null, activity );
        }

        /**
         * @method Called from DELETE post process
         *
         * For activity type 'FINDING', this method just calls unClaimGdtLogEntry to unclaim any claimed gdt logs
         * by this deleted activity. If any GDT log record is unclaimed from the database then a 'system.UPDATE_GDT_LOG_TABLE' event
         * is sent to the UI via websocket so that UI can take necessary action. (in this case probably reload UI to fecth latest gdt logs)
         *
         * @param {object} user
         * @param {object} activity
         * @param {function} callback
         * @returns {Promise} Always resolves to success as the calling function will get result via callback
         */
        async function unclaimAnyClaimedGdtLog( user, activity, callback ) {
            if( activity.actType !== "FINDING" ) {
                // We can also check for activity.subType ===  "GDT" to be more sure but just in case to cover unknown scenario
                // not place that check as not placing so has no side-effects
                return callback( null, activity );
            }

            let
                err,
                result;

            [err, result] = await formatPromiseResult(
                Y.doccirrus.api.gdtlog.unClaimGdtLogEntry( {
                    user,
                    data: {
                        activityId: activity._id.toString()
                    }
                } )
            );

            if( err ) {
                Y.log( `unclaimAnyClaimedGdtLog (DELETE post process): Error unclaiming any gdtlog for activityId: ${activity._id.toString()}. Error: ${err.stack || err}`, "error", NAME );
            }

            if( result === "SUCCESSFUL" ) {
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    event: 'system.UPDATE_GDT_LOG_TABLE',
                    msg: {
                        data: {}
                    }
                } );
            }

            callback( null, activity );
        }

        /**
         * @method Called from DELETE post process
         *
         * For activity type 'FINDING', this method just calls unClaimGdtExportLogEntry to unclaim any claimed gdt export logs
         * from this deleted activity. If any GDT export log record is unclaimed from the database then a 'system.UPDATE_GDT_EXPORT_LOG_TABLE' event
         * is sent to the UI via websocket so that UI can take necessary action. (in this case probably reload UI to fetch latest gdt export logs)
         *
         * @param {object} user
         * @param {object} activity
         * @param {function} callback
         * @returns {Promise} Always resolves to success as the calling function will get result via callback
         */
        async function unclaimAnyClaimedGdtExportLog( user, activity, callback ) {
            if( activity.actType !== "FINDING" ) {
                // We can also check for activity.subType ===  "GDT" to be more sure but just in case to cover unknown scenario
                // not place that check as not placing so has no side-effects
                return callback( null, activity );
            }

            let
                err,
                result;

            [err, result] = await formatPromiseResult(
                Y.doccirrus.api.gdtexportlog.unClaimGdtExportLogEntry( {
                    user,
                    data: {
                        activityId: activity._id.toString()
                    }
                } )
            );

            if( err ) {
                Y.log( `unclaimAnyClaimedGdtExportLog (DELETE post process): Error unclaiming any gdtExportLog for activityId: ${activity._id.toString()}. Error: ${err.stack || err}`, "error", NAME );
            }

            if( result === "SUCCESSFUL" ) {
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    event: 'system.UPDATE_GDT_EXPORT_LOG_TABLE',
                    msg: {
                        data: {}
                    }
                } );
            }

            callback( null, activity );
        }

        function unclaimAnyClaimedInPacsLog( user, activity, callback ) {
            //If not FINDING then skip this step
            if( activity.actType !== "FINDING" ) {
                return callback( null, activity );
            }

            Y.doccirrus.api.inpacslog.unclaimInpacsLogEntry( {
                user,
                data: {activityId: activity._id.toString()},
                callback: ( err, result ) => {
                    if( err ) {
                        Y.log( `unclaimAnyClaimedInPacsLog (DELETE post process): Error unclaiming inpacsLog in activity delete post process`, 'error', NAME );
                    }

                    if( result !== "NOT_FOUND" ) {
                        Y.doccirrus.communication.emitEventForUser( {
                            targetId: user.identityId,
                            event: 'system.UPDATE_INPACS_LOG_TABLE',
                            msg: {
                                data: {
                                    error: err ? "ERROR_REVERTING" : null
                                }
                            }
                        } );
                    }
                    callback( null, activity );
                }
            } );
        }

        /**
         *  When a MEDDATA activity is saved we must update the latestMedData property of the patient
         *  Also emits event for PatientGadgetLatestMedData to refetch it's data
         *
         *  @param  {Object}    user
         *  @param  {Object}    activity
         *  @param  {Function}  callback
         *  @returns {*}        nothing
         */
        function updatePatientMedData( user, activity, callback ) {
            if( !Y.doccirrus.schemas.activity.medDataActTypes.includes(activity.actType) || 'PREPARED' === `${activity.status}` ) {
                return callback( null, activity );
            }

            //  pass to patient API to do the check/update update
            Y.doccirrus.api.patient.setLatestMedData( user, `${activity.patientId}`, activity, false, false, onPatientUpdated );

            function onPatientUpdated( err ) {
                if( err ) {
                    Y.log( `Problem updating latestMedData on patient: ${JSON.stringify( err )}`, 'warn', NAME );
                }
                Y.doccirrus.communication.emitNamespaceEvent( {
                    nsp: 'default',
                    event: `activity.latestMedDataRefresh`,
                    tenantId: user && user.tenantId,
                    msg: {
                        data: activity.patientId && activity.patientId.toString()
                    }
                } );
            }

            //  we don't need to wait for this, call back immediately
            callback( null, activity );
        }

        /**
         *  When a LABDATA activity is saved we must update the latestLabData property of the patient
         *  Also emits event for PatientGadgetLatestLabData to refetch it's data
         *
         *  @param  {Object}    user
         *  @param  {Object}    activity
         *  @param  {Function}  callback
         *  @returns {*}        nothing
         */
        function updatePatientLabData( user, activity, callback ) {
            //  only needed for MEDDATA activities
            if( 'LABDATA' !== activity.actType || 'PREPARED' === activity.status ) {
                return callback( null, activity );
            }

            //  pass to patient API to do the check/update update
            Y.doccirrus.api.patient.setLatestLabData( user, `${activity.patientId}`, activity, false, false, onPatientUpdated );

            function onPatientUpdated( err ) {
                if( err ) {
                    Y.log( `Problem updating latestLabData on patient: ${JSON.stringify( err )}`, 'warn', NAME );
                }
                Y.doccirrus.communication.emitNamespaceEvent( {
                    nsp: 'default',
                    event: `activity.latestLabDataRefresh`,
                    tenantId: user && user.tenantId,
                    msg: {
                        data: activity.patientId && activity.patientId.toString()
                    }
                } );
            }

            //  we don't need to wait for this, call back immediately
            callback( null, activity );
        }

        /**
         * Updates tag collection (MEDDATA tags).
         * Tries to delete all MEDDATA tags which were used in the activity,
         * and were not used elsewhere.
         * @param {Object} user
         * @param {Object} activity
         * @param {Function} callback
         */
        function updateMedDataTagsOnDelete( user, activity, callback ) {
            if( Y.doccirrus.schemas.activity.medDataActTypes.includes( activity.actType ) && 'PREPARED' !== activity.status ) {
                let
                    oldTags = [],
                    currentTags = [];

                if( activity.medData && Array.isArray( activity.medData ) ) {
                    oldTags = activity.medData
                        // filter static types (these are not created as tags)
                        .filter( ( medDataItem ) => {
                            return !Y.doccirrus.schemas.tag.isStaticTag( medDataItem.type, {
                                type: Y.doccirrus.schemas.tag.tagTypes.MEDDATA
                            } );
                        } )
                        // map the MedDataItemSchema objects into TagSchema objects to normalize their input
                        .map( ( medDataItem ) => TagSchema.byMedDataItem( medDataItem ).toObject() );
                }

                Y.doccirrus.api.tag.updateTags( {
                    user,
                    data: {
                        type: Y.doccirrus.schemas.tag.tagTypes.MEDDATA,
                        oldTags: oldTags,
                        documentId: activity._id.toString(),
                        currentTags: currentTags
                    },
                    callback: function( err ) {
                        callback( err, activity );
                    }
                } );
            } else {
                setImmediate( callback, null, activity );
            }
        }

        /**
         *  Record latest _ids on on patient after change to Schein, MOJ-9099
         *
         *  @param  {Object}    user
         *  @param  {Object}    activity
         *  @param  {Function}  callback
         *  @return {*}
         */

        function updatePatientEmployeeIds( user, activity, callback ) {
            //  we don't need to wait for this, call back immediately
            callback( null, activity );                                 //  eslint-disable-line callback-return

            if( -1 === Y.doccirrus.schemas.activity.scheinActTypes.indexOf( `${activity.actType}` ) ) {
                //  if not a schein act type then we can skip this
                return;
            }

            Y.doccirrus.api.patient.updateScheinEmployees( user, activity.patientId, false, onScheinEmployeesUpdated );

            function onScheinEmployeesUpdated( err ) {
                if( err ) {
                    Y.log( `Problem updating schein employeeIds on patient: ${JSON.stringify( err )}`, 'warn', NAME );
                }
            }
        }

        async function getLastScheinFromCache( params ) {
            const {user, context, activity} = params;

            const valueFromCurrentCache = getCollectionCache( {
                context,
                collection: 'lastSchein',
                key: activity._id.toString()
            } );

            if( valueFromCurrentCache ) {
                return valueFromCurrentCache;
            }

            let [err, lastSchein] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.patient.lastSchein( {
                    user: user,
                    query: {
                        patientId: activity.patientId,
                        timestamp: activity.timestamp,
                        locationId: activity.locationId,
                        caseFolderId: activity.caseFolderId
                    },
                    callback: ( err, _lastSchein ) => {
                        if( err ) {
                            reject( err );
                        } else {
                            resolve( _lastSchein && _lastSchein[0] );
                        }
                    }
                } );
            } ) );

            if( err ) {
                Y.log( `could not get last schein: ${err.stack || err}`, 'warn', NAME );
                throw err;
            }
            if( lastSchein ) {
                setCollectionCache( {context, collection: 'lastSchein', key: activity._id.toString(), data: lastSchein} );
            }

            return lastSchein;
        }

        function setCollectionCache( params ) {
            const
                {context, collection, key, data} = params;
            if( !context ) {
                return;
            }
            context.cache = context.cache || {};
            context.cache[collection] = context.cache[collection] || {};
            context.cache[collection][key] = data;
        }

        function getCollectionCache( params ) {
            const
                {context, collection, key} = params;
            if( !context ) {
                return context;
            }
            context.cache = context.cache || {};
            return context.cache && context.cache[collection] && context.cache[collection][key];
        }

        function checkUserGroup( user, activity, callback ) {
            let
                isReducedUser = user.groups && user.groups.some( item => Y.doccirrus.schemas.employee.userGroups.REDUCED_USER === item.group ),
                actTypeList = Y.doccirrus.schemas.activity.getForbiddenActTypeForGroup( Y.doccirrus.schemas.employee.userGroups.REDUCED_USER );
            if( !user.superuser && isReducedUser && actTypeList.includes( activity.actType ) ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 401 ) );
            }
            setImmediate( callback );
        }

        /**
         *  Post-process to handle case of receipts being linked to invoices
         *
         *  When creating a receipt in inCase, the receipt has no _id, and so cannot be linked from the
         *  invoice (updating invoice balances) until after first save.
         *
         *  @param  {Object}    user
         *  @param  {Object}    activity    Post-process
         *  @param  {Function}  callback    Of the form fn( err, activity )
         */

        function correctReceiptInvoiceLinkDirection( user, activity, callback ) {
            let hasLinkedActivity = (activity.activities && activity.activities[0]);

            //  only applies to RECEIPTs, may be extended to CREDITNOTE, etc
            if( !Y.doccirrus.schemas.activity.isInvoiceCommunicationActType( activity.actType ) ) {
                return callback( null, activity );
            }

            //  only applies if RECEIPT refers to activity in activities
            if( !hasLinkedActivity ) {
                return callback( null, activity );
            }

            Y.doccirrus.api.receipt.assignToInvoice( {
                'user': user,
                'originalParams': {
                    'receiptId': activity._id,
                    'invoiceId': activity.activities[0]
                },
                'callback': onInvoiceUpdated
            } );

            function onInvoiceUpdated( err /*, result */ ) {
                if( err ) {
                    return callback( err );
                }
                //  move invoice _id to referencedBy (receipt belongs to invoice, invoice is parent)
                activity.referencedBy = [_.assign( {}, activity.activities[0] )];
                activity.activities = [];

                callback( null, activity );
            }
        }

        /**
         *  Receipts belong to invoices, relationship may be broken from the receipt side due to UI requirements in
         *  MOJ-9777.  An exception must be made to the general pattern, so if a receipt is saved without in invoice
         *  in referencedBy, we must check for and remove any invoice which claims it.
         *
         *  @param  {Object}    user
         *  @param  {Object}    activity
         *  @param  {Function}  callback
         *  @return {*}
         */

        function checkUnlinkOfInvoiceFromReceipt( user, activity, callback ) {
            //  only applies to RECEIPTs, may be extended to CREDITNOTE, etc
            if( !Y.doccirrus.schemas.activity.isInvoiceCommunicationActType( activity.actType ) ) {
                return callback( null, activity );
            }

            let
                hasLinkedActivity = (activity.activities && activity.activities[0]),
                hasReferencedBy = (activity.referencedBy && activity.referencedBy[0]);

            if( hasLinkedActivity || hasReferencedBy ) {
                return callback( null, activity );
            }

            Y.log( `Confirming unlink of receipt ${activity._id} from any invoices.`, 'debug', NAME );

            Y.doccirrus.api.receipt.checkReceiptUnlinked( user, activity._id.toString(), onInboundLinksCleared );

            function onInboundLinksCleared( err ) {
                if( err ) {
                    return callback( err );
                }
                Y.log( `Unlinked any invoices counting receipt ${activity._id}`, 'debug', NAME );
                callback( null, activity );
            }
        }

        /**
         *  Add and update reciprocal links from linked activities
         *
         *  This is used to track which activities use a child activity, eg, which medications have been added to
         *  a prescription (MOJ-8400)
         *
         *  Additional rules are planned for future versions, and may include metadata describing the direction
         *  and kind of relationship, as when treatments are linked to other, supplementary treatments.
         *
         *  Resolving these links may slow transitions, so they do not block transitions and call back immediately.
         *
         *  Changes to reciprocal links may also cause updates to other properties, such as outstanding balance of an
         *  invoice, or the prescription status of activities.
         *
         *  @param  {Object}    user
         *  @param  {Object}    activity        Post-process
         *  @param  {Function}  callback        Of the form fn( err, callback )
         */

        function updateReciprocalLinks( user, activity, callback ) {
            Y.doccirrus.api.linkedactivities.updateBacklinks( user, activity, callback );
        }

        /**
         *  When an activity is deleted, activities which link it must be updated to prevent dangling references
         *
         *  State may also be changed on the referenced activity, isPrescribed on medications, outstanding balance
         *  on invoices, etc.
         *
         *  @param  {Object}    user
         *  @param  {Object}    activity        Post-process
         *  @param  {Function}  callback        Of the form fn( err, callback )
         */

        function clearReciprocalLinks( user, activity, callback ) {
            let
                context = this.context || {},
                ignoreActivities = (context.activitiesInBatch ? context.activitiesInBatch : []);

            Y.doccirrus.api.linkedactivities.clearBacklinks( user, activity, ignoreActivities, callback );
        }

        function checkConsistencyOfLinkedInvoiceActivities( user, activity, callback ) {
            if( 'INVOICE' !== activity.actType ) {
                callback( null, activity );
                return;
            }
            Y.doccirrus.api.invoiceprocess.checkInvoiceReferences( user, activity._id.toString(), activity.activities || [], activity.invoiceLogId )
                .then( () => callback( null, activity ) ).catch( err => callback( err ) );
        }

        /**
         *  Add or update simplified labdata in simplified format for reporting, forms, tables, etc.
         *
         *  @param  {module:authSchema.auth}    user
         *  @param  {module:activitySchema.activity}    activity
         *  @param  {Function}  callback
         */

        async function updateLabEntries( user, activity, callback ) {
            const ObjectId = require( 'mongoose' ).Types.ObjectId;

            //  TODO: handle MEDDATA types here as well
            if( 'LABDATA' !== activity.actType || 'PREPARED' === activity.status ) {
                return callback( null, activity );
            }

            Y.log( `Updating labEntries for LABDATA activity: ${activity._id}`, 'debug', NAME );

            let [err, patient] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'get',
                    model: 'patient',
                    query: {
                        _id: ObjectId( activity.patientId )
                    },
                    options: {
                        lean: true
                    }
                } )
            );
            if( err ) {
                Y.log( `updateLabEntries: error finding patient with id: ${activity.patientId}, err: ${err.stack || err}`, 'warn', NAME );
                return callback( err, activity );
            }
            if( !patient || !Array.isArray( patient ) || !patient.length ) {
                Y.log( `updateLabEntries: could not find patient with id: ${activity.patientId}, err: ${err.stack || err}`, 'warn', NAME );
            } else {
                patient = patient[0];
            }
            activity.labEntries = Y.doccirrus.api.lab.getLabEntries( activity, patient );
            callback( null, activity );
        }

        /**
         *  When changing or deleting an activity may cause inconsitencies with an activity which refers to it, we will
         *  need to mark that activity as invalid and notify the user, MOJ-10071
         *
         *  For example, when a treatment is deleted or changed, if it is part of an invoice, the invocie may no
         *  longer be valid, and its total must be recalculated or form tables remapped to show updated content.
         *
         *  @param  {Object}    user
         *  @param  {Object}    activity
         *  @param  {Function}  callback
         */

        function invalidateParentActivities( user, activity, callback ) {
            const context = this && this.context;
            //  if no other activities refer to this one then we can skip this step
            if( !activity.referencedBy || 0 === activity.referencedBy.length ) {
                return callback( null, activity );
            }

            if( context && context.skipInvalidateParentActivities ) {
                return callback( null, activity );
            }
            // MOJ-11393: write pre-process chain is not run on upsert action
            const pathsModifiedBefore = activity.pathsModifiedBefore || [];
            // MOJ-10158: do not invalidate parent if only apk state changed
            const safePaths = ['apkState'];
            // these paths seem to be modified all the time for treatments
            const ignorePaths = ['false', 'fk5020Set', 'fk5042Set', 'true', 'editor'];
            let modifiedPaths = pathsModifiedBefore.filter( path => !ignorePaths.includes( path ) );

            // MOJ-10158: do not invalidate if only timestamp changed and timestamp is still on same day
            const moment = require( 'moment' );
            if( !activity.wasNew && modifiedPaths.includes( 'timestamp' ) && moment( this.rawData.timestamp ).isSame( moment( this.dbData.timestamp ), 'day' ) ) {
                safePaths.push( 'timestamp' );
            }

            // MOJ-10158: do not invalidate on cancel transition
            if( !activity.wasNew && modifiedPaths.includes( 'status' ) && this.rawData.status !== 'CANCELLED' ) {
                safePaths.push( 'status' );
            }

            const onlySafePathsModified = modifiedPaths.every( path => safePaths.includes( path ) );

            //  note that on deletion the modifiedPaths is empty, MOJ-10509
            if( onlySafePathsModified && modifiedPaths.length > 0 ) {
                return callback( null, activity );
            }

            Y.doccirrus.api.linkedactivities.invalidateParentActivities( user, activity, modifiedPaths, callback );
        }

        function checkGoaeLabAllowance( user, activity, callback ) {
            let someTreatment,
                relatedTreatmentQuery;
            const
                Promise = require( 'bluebird' ),
                moment = require( 'moment' ),
                lastChanged = new Date(),
                runDb = Promise.promisify( Y.doccirrus.mongodb.runDb ),
                codeTypeMap = {
                    H1: '3541H',
                    H2: '3630H',
                    H3: '3631H',
                    H4: '3633H'
                },
                setTreatmentsToZero = () => {
                    return runDb( {
                        user,
                        action: 'update',
                        model: 'activity',
                        query: relatedTreatmentQuery,
                        data: {$set: {price: 0}},
                        options: {
                            multi: true
                        }
                    } ).then( results => {
                        Y.log( `set price of treatments substituted with allowance to zero: ${results}`, 'debug', NAME );
                        return runDb( {
                            user,
                            model: 'activity',
                            query: relatedTreatmentQuery,
                            options: {
                                select: {_id: 1}
                            }
                        } ).map( treatment => {
                            //  request regeneration of reporting for each treatment
                            Y.doccirrus.insight2.utils.requestReporting( user, 'ACTIVITY', treatment._id.toString() );
                        } );
                    } );
                },
                getSubstituteTreatment = ( substituteCode ) => {
                    const
                        catalogDesc = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                            actType: 'TREATMENT',
                            short: 'GOÄ'
                        } ),
                        initData = {
                            actType: 'TREATMENT',
                            areTreatmentDiagnosesBillable: '1',
                            catalogShort: 'GOÄ',
                            billingFactorValue: someTreatment.billingFactorValue,
                            billingFactorType: someTreatment.billingFactorType,
                            locationId: someTreatment.locationId
                        };

                    return runDb( {
                        user: Y.doccirrus.auth.getSUForLocal(),
                        model: 'catalog',
                        query: {seq: substituteCode, catalog: catalogDesc.filename}
                    } ).get( 0 ).then( entry => {
                        return new Promise( ( resolve, reject ) => {
                            Y.doccirrus.schemas.activity._setActivityData( {
                                initData: initData,
                                entry: entry || {},
                                user: user
                            }, ( err, treatment ) => {
                                if( err ) {
                                    reject( err );
                                } else {
                                    Object.assign( treatment, {
                                        __t: 'TREATMENT', // MOJ-9861: needed to be savable later, otherwise doc is not found in dc-core put
                                        uvGoaeType: 'bg_ahb', // MOJ-9861: default value not needed for GOÄ but null otherwise and not savable
                                        status: 'VALID',
                                        caseFolderId: activity.caseFolderId,
                                        areTreatmentDiagnosesBillable: '1',
                                        editor: someTreatment.editor,
                                        lastChanged,
                                        employeeName: someTreatment.employeeName,
                                        employeeInitials: someTreatment.employeeInitials,
                                        locationName: someTreatment.locationName,
                                        content: treatment.userContent,
                                        timestamp: moment( someTreatment.timestamp ).add( 1, 'minute' ).toDate(),
                                        labRequestRef: activity.labRequestRef,
                                        patientId: activity.patientId,
                                        employeeId: someTreatment.employeeId,
                                        locationId: someTreatment.locationId ? require( 'mongoose' ).Types.ObjectId( someTreatment.locationId ) : null
                                    } );
                                    resolve( treatment );
                                }
                            } );
                        } );
                    } );
                },
                sumTreatments = () => {
                    return runDb( {
                        user,
                        model: 'activity',
                        query: relatedTreatmentQuery,
                        options: {
                            select: {
                                price: 1,
                                billingFactorValue: 1,
                                billingFactorType: 1,
                                timestamp: 1,
                                employeeId: 1,
                                locationId: 1,
                                editor: 1,
                                employeeName: 1,
                                employeeInitials: 1,
                                locationName: 1
                            },
                            sort: {
                                timestamp: -1
                            }
                        }
                    } ).reduce( ( total, treatment ) => {
                        if( !someTreatment ) {
                            someTreatment = treatment;
                        }
                        return total + treatment.price;
                    }, 0 );
                },
                postSubstituteTreatment = ( substituteTreatment ) => {
                    return runDb( {
                        user,
                        action: 'mongoUpdate',
                        model: 'activity',
                        query: {code: substituteTreatment.code, labRequestRef: substituteTreatment.labRequestRef},
                        data: {$set: substituteTreatment},
                        options: {
                            upsert: true
                        }
                    } ).then( results => {

                        Y.log( `upserted substitute treatment as allowance ${JSON.stringify( results )}`, 'debug', NAME );
                        const
                            newTreatmentId = results && results.result && results.result.upserted && results.result.upserted[0] && results.result.upserted[0]._id;

                        if( !newTreatmentId ) {
                            return false;
                        }

                        Y.doccirrus.api.dispatch.syncObjectWithDispatcher( user, 'activeReference', {
                            addedFrom: `activity_${newTreatmentId.toString()}`,
                            entityName: 'activity',
                            entryId: newTreatmentId.toString(),
                            lastChanged: new Date(),
                            onDelete: false
                        }, ( err ) => {
                            if( err ) {
                                Y.log( `could not trigger sync object with dispatcher: ${err.stack || err}`, 'warn', NAME );
                            }
                        } );

                        Y.doccirrus.insight2.utils.requestReporting( user, 'ACTIVITY', newTreatmentId.toString() );

                    } ).catch( err => {
                        Y.log( `an error occurred while posting substitute treatment as allowance ${err && err.stack || err}`, 'error', NAME );
                        throw err;
                    } );
                },
                notifyAboutAllowanceCreation = ( allowance ) => {
                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: user.identityId,
                        event: 'message',
                        msg: {
                            data: Y.doccirrus.i18n( 'activity-process.text.LAB_TREATMENT_ALLOWANCE_ADDED', {data: {allowance}} )
                        },
                        meta: {
                            level: 'INFO'
                        }
                    } );

                };

            if( 'TREATMENT' !== activity.actType || !activity.code || 'GOÄ' !== activity.catalogShort || !activity.labRequestRef ||
                '1' !== activity.areTreatmentDiagnosesBillable || !['CREATED', 'VALID', 'APPROVED'].includes( activity.status ) ) {
                callback( null, activity );
                return;
            }

            const match = activity.code.match( Y.doccirrus.regexp.goaeLabCodeH );

            if( !match ) {
                callback( null, activity );
                return;
            }

            const
                codeType = match[0],
                substituteCode = codeTypeMap[codeType];

            if( !substituteCode ) {
                Y.log( `checkGoaeLabAllowance: could not find substituteCode for codeType ${codeType}`, 'warn', NAME );
                callback( null, activity );
                return;
            }

            relatedTreatmentQuery = {
                actType: 'TREATMENT',
                code: new RegExp( `${codeType}$` ),
                labRequestRef: activity.labRequestRef,
                areTreatmentDiagnosesBillable: '1',
                status: {$in: ['CREATED', 'VALID', 'APPROVED']}
            };

            Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                query: {
                    actType: 'TREATMENT',
                    code: substituteCode,
                    labRequestRef: activity.labRequestRef,
                    status: {$in: ['CREATED', 'VALID', 'APPROVED']}
                }
            } ).then( result => {
                if( result && result[0] ) {
                    Y.log( `already created substitute treatment as allowance for lab req : ${activity.labRequestRef}`, 'debug', NAME );
                    // if we already added an allowance just make sure all related treatments have price of zero and return
                    return setTreatmentsToZero( codeType );
                }
                return sumTreatments( codeType ).then( total => {

                    return getSubstituteTreatment( substituteCode ).then( substituteTreatment => {

                        if( substituteTreatment.price < total ) {
                            return setTreatmentsToZero( codeType )
                                .then( () => postSubstituteTreatment( substituteTreatment ) )
                                .then( ( notify ) => {
                                    if( false === notify ) {
                                        return;
                                    }
                                    return notifyAboutAllowanceCreation( substituteCode );
                                } );
                        }
                    } );

                } );

            } ).then( () => callback() ).catch( err => {
                Y.log( `could not check goae lab allowance ${err && err.stack || err}`, 'error', NAME );
                callback( err );
            } );

        }

        /**
         *  Update the employees array on the patient object
         *
         *  Since this applies to a differen object, we do not need to wait for it and can call back immediately
         *
         *  @param user
         *  @param activity
         *  @param callback
         */

        async function updatePatientEmployees( user, activity, callback ) {
            const
                getModelP = util.promisify( Y.doccirrus.mongodb.getModel );

            let
                err, patientModel,

                query = {_id: activity.patientId},
                update = {$addToSet: {employees: activity.employeeId}};

            //  user does not need to wait for this, call back immediately, EXTMOJ-2050
            callback( null, activity );     //  eslint-disable-line callback-return

            [err, patientModel] = await formatPromiseResult( getModelP( user, 'patient', true ) );

            if( err ) {
                //  should never happen
                Y.log( `Could not create patient model: ${err.stack || err}`, 'warn', NAME );
                return;
            }

            [err] = await formatPromiseResult( patientModel.mongoose.update( query, update, {} ).exec() );

            if( err ) {
                Y.log( `Could not update patient employees from activity: ${activity._id}: ${err.stack || err}`, 'warn', NAME );
            }
        }

        async function checkTreatmentsOfSurgery( user, activity, callback ) {
            if( activity.actType !== 'SURGERY' ) {
                return callback( null, activity );
            }

            const linkedTreatments = activity.linkedTreatments || [];

            let
                err, result,
                singleLinkedTreatments = []; // This array may be updated and saved back to the SURGERY activity.

            // Linked Treatments can be set up several at a time on the front end. On saving, we transform them into single entries.
            linkedTreatments.forEach( linkedTreatment => {
                let {quantity} = linkedTreatment;
                while( quantity > 0 ) {
                    singleLinkedTreatments.push( {...linkedTreatment.toObject(), quantity: 1} );
                    quantity--;
                }
            } );

            const
                activities = activity.activities || [],
                originalData = activity.originalData_ || {},
                originalActivities = originalData.activities || [],
                originalLinkedTreatments = originalData.linkedTreatments || [],
                createdLinkedTreatments = singleLinkedTreatments.filter( linkedTreatment => !linkedTreatment.activityId ),
                updatedLinkedTreatments = activity.wasNew ? [] : getUpdatedLinkedTreatments( originalLinkedTreatments, singleLinkedTreatments ),
                deletedLinkedTreatmentIds = getDeletedLinkedTreatmentIds( originalLinkedTreatments, singleLinkedTreatments ),
                unlinkedLinkedTreatmentIds = getUnlinkedLinkedTreatmentIds( originalActivities, activities ),
                updateOfSurgeryRequired = createdLinkedTreatments.length || deletedLinkedTreatmentIds.length || unlinkedLinkedTreatmentIds.length; // A created linkedTreatment needs to get added its activitiId and reference. | A deleted or unlinked linkedTreatment needs to get its reference deleted.

            Y.log( `checkTreatmentsOfSurgery: ${createdLinkedTreatments.length} created linked treatments: ${JSON.stringify( createdLinkedTreatments )}`, 'info', NAME );
            Y.log( `checkTreatmentsOfSurgery: ${updatedLinkedTreatments.length} updated linked treatments: ${JSON.stringify( updatedLinkedTreatments )}`, 'info', NAME );
            Y.log( `checkTreatmentsOfSurgery: ${deletedLinkedTreatmentIds.length} deleted linked treatments: ${JSON.stringify( deletedLinkedTreatmentIds )}`, 'info', NAME );
            Y.log( `checkTreatmentsOfSurgery: ${unlinkedLinkedTreatmentIds.length} unlinked linked treatments: ${JSON.stringify( unlinkedLinkedTreatmentIds )}`, 'info', NAME );

            // ---------------------------------------------------- CREATE TREATMENTS -----------------------------------------------------
            for( let linkedTreatment of singleLinkedTreatments ) { // eslint-disable-line
                if( !linkedTreatment.activityId ) {
                    [err, result] = await formatPromiseResult( createLinkedTreatment( linkedTreatment ) );
                    if( err ) {
                        Y.log( `checkTreatmentsOfSurgery: Error in getting activityId of new TREATMENT activity. ${err.message}`, 'error', NAME );
                    } else if( result ) {
                        linkedTreatment.activityId = result; // Add the activityId to the linkedTreatment
                        activity.activities.push( result ); // Linking the SURGERY activity to the TREATMENT activity.
                    }
                }
            }
            // ---------------------------------------------------- UPDATE TREATMENTS -----------------------------------------------------
            for( let updatedLinkedTreatment of updatedLinkedTreatments ) {  // eslint-disable-line
                await updateLinkedTreatment( updatedLinkedTreatment );
            }
            // ---------------------------------------------------- DELETE TREATMENTS -----------------------------------------------------
            for( let deletedLinkedTreatmentId of deletedLinkedTreatmentIds ) {  // eslint-disable-line
                await unlinkAndDeleteTreatmentById( deletedLinkedTreatmentId, activity._id );
            }
            activity.activities.filter( activityId => { // Remove reference
                deletedLinkedTreatmentIds.includes( activityId );
            } );
            // ------------------------------------------------ REMOVE UNLINKED TREATMENTS ------------------------------------------------
            singleLinkedTreatments = singleLinkedTreatments.filter( linkedTreatment => { // This only serves if the linked TREATMENT activity was unlinked from somewhere else than then the SURGERY editor, in which case it is already removed from the linkedTreatments array.
                return !unlinkedLinkedTreatmentIds.includes( linkedTreatment.activityId );
            } );

            // ------------------------------------------------- UPDATE SURGERY ACTIVITY --------------------------------------------------
            if( updateOfSurgeryRequired ) {

                activity.linkedTreatments = singleLinkedTreatments;

                [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'update', // update does not trigger a post process
                    fields: ['activities', 'linkedTreatments'],
                    query: {_id: activity._id},
                    data: {
                        $set: {
                            activities: activity.activities,
                            linkedTreatments: activity.linkedTreatments
                        }
                    }
                } ) );

                if( err ) {
                    Y.log( `checkTreatmentsOfSurgery: Error in updating SURGERY activity. ${err.message}`, 'error', NAME );
                }

            }

            if( createdLinkedTreatments.length ) {
                // This event is to trigger a reloading of the linkedTreatmentsTable on the front end.
                Y.doccirrus.communication.emitEventForSession( {
                    sessionId: user.sessionId,
                    event: 'linkedTreatmentsCreated',
                    msg: {data: singleLinkedTreatments}
                } );
            }

            return callback( null, activity );

            // ----------------------------------------------------- HELPER FUNCTIONS -----------------------------------------------------
            function getUpdatedLinkedTreatments( originalLinkedTreatments, linkedTreatments ) {
                return linkedTreatments.filter( linkedTreatment => {
                    return originalLinkedTreatments.some( originalLinkedTreatment => {
                        return originalLinkedTreatment.activityId === linkedTreatment.activityId && !_.isEqual( originalLinkedTreatment, linkedTreatment );
                    } );
                } );
            }

            function getDeletedLinkedTreatmentIds( originalLinkedTreatments, singleLinkedTreatments ) {
                return originalLinkedTreatments.filter( originalLinkedTreatment => {
                    return singleLinkedTreatments.every( linkedTreatment => {
                        return linkedTreatment.activityId !== originalLinkedTreatment.activityId;
                    } );
                } ).map( deletedLinkedTreatment => deletedLinkedTreatment.activityId );
            }

            function getUnlinkedLinkedTreatmentIds( originalActivities, activities ) {
                return originalActivities.filter( originalActivity => {
                    return !activities.includes( originalActivity );
                } );
            }

            async function createLinkedTreatment( treatment ) {
                const {code, userContent, explanations, catalogRef} = treatment;

                let err, result;

                [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user: Y.doccirrus.auth.getSUForLocal(),
                    model: 'catalog',
                    query: {
                        seq: code,
                        catalog: catalogRef
                    }
                } ) );

                if( err ) {
                    Y.log( `createLinkedTreatment: Error in looking for corresponding catalog entry. ${err.message}`, 'error', NAME );
                    throw err;
                }

                let entry = result && result[0] || {};

                [err, result] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.invoiceconfiguration.invoicefactor( {
                        user,
                        data: {timestamp: activity.timestamp},
                        callback( err, result ) {
                            if( err ) {
                                return reject( err );
                            } else {
                                return resolve( result );
                            }
                        }
                    } );
                } ) );

                if( err ) {
                    Y.log( `createLinkedTreatment: Error in looking for corresponding billingFactorValue. ${err.message}`, 'error', NAME );
                    throw err;
                }

                let billingFactorValue = result.factor || '1';

                [err, result] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                    Y.doccirrus.schemas.activity._setActivityData( {
                            user, entry,
                            initData: {
                                actType: "TREATMENT",
                                catalogShort: "EBM",
                                locationId: activity.locationId,
                                billingFactorValue
                            }
                        }, ( err, result ) => {
                            if( err ) {
                                return reject( err );
                            } else {
                                return resolve( result );
                            }
                        }
                    );
                } ) );

                if( err ) {
                    Y.log( `createLinkedTreatment: Error in creating TREATMENT activity. ${err.message}`, 'error', NAME );
                    throw err;
                }

                let fullTreatmentActivity = Object.assign(
                    _.omit( activity.toObject(), ["_id", "actType", "status", "activities", "referencedBy", "linkedTreatments", "__t"] ),
                    result,
                    {
                        status: "CREATED",
                        referencedBy: [activity._id.toString()],
                        fk5035Set: activity.toObject().fk5035Set.filter( fk5035Entry => {
                            return treatment.opsCodes.includes( fk5035Entry.fk5035 );
                        } ),
                        userContent, explanations, catalogRef,
                        catalog: true
                    }
                );

                // NB: There are some slight differences, that shouldn't matter, between a TREATMENT created over this
                // way and a TREATMENT created the usual way over the UI:
                // - The fk5020Set and fk5042Set are missing a default entry
                // - The fk5036Set is missing (it should be an empty array)
                // - The gnrAdditionalInfo array is not empty (it has one entry "NONE")

                [err, result] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.activity.createActivitySafe( {
                        user,
                        data: fullTreatmentActivity,
                        callback: ( err, result ) => {
                            if( err ) {
                                return reject( err );
                            } else {
                                return resolve( result );
                            }
                        }
                    } );
                } ) );

                if( err ) {
                    Y.log( `createLinkedTreatment: Error in safely saving TREATMENT activity. ${err.message}`, 'error', NAME );
                    throw err;
                }

                return result && result.toString();
            }

            async function updateLinkedTreatment( treatment ) {
                const {userContent, explanations} = treatment;

                [err, result] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.activity.generateContent( {
                        user,
                        data: {
                            activity: {...activity.toObject(), userContent, explanations}
                        },
                        callback( err, result ) {
                            if( err ) {
                                return reject( err );
                            } else {
                                return resolve( result );
                            }
                        }
                    } );
                } ) );

                if( err ) {
                    Y.log( `updateLinkedTreatment: Error in generating content. ${err.message}`, 'error', NAME );
                }

                let treatmentActivityData = {
                    ..._.omit( result, ["_id", "actType", "status", "activities", "referencedBy", "linkedTreatments", "__t"] ),
                    fk5035Set: activity.toObject().fk5035Set.filter( fk5035Entry => {
                        return treatment.opsCodes.includes( fk5035Entry.fk5035 );
                    } )
                };

                [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'update', // update does not trigger a post process
                    fields: Object.keys( treatmentActivityData ),
                    query: {_id: treatment.activityId},
                    data: treatmentActivityData
                } ) );

                if( err ) {
                    Y.log( `updateLinkedTreatment: Error in updating linked treatment. ${err.message}`, 'error', NAME );
                }
            }

            async function unlinkAndDeleteTreatmentById( treatmentId, surgeryId ) {
                // NB: Deleting the treatment would trigger an unlinking process (which can interfere with the current one). This is prevented by unlinking the TREATMENT before deleting it.
                [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'update', // update does not to trigger a post process
                    query: {
                        _id: surgeryId
                    },
                    data: {
                        $pull: {activities: treatmentId}
                    }
                } ) );

                if( err ) {
                    Y.log( `unlinkAndDeleteTreatmentById: Error in unlinking treatment before deletion. ${err.message}`, 'error', NAME );
                }

                [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'delete',
                    query: {_id: treatmentId}
                } ) );

                if( err ) {
                    Y.log( `unlinkAndDeleteTreatmentById: Error in deleting treatment. ${err.message}`, 'error', NAME );
                }

            }
        }

        async function checkSurgeryOfTreatment( user, activity, callback ) {
            const
                originalData = activity.originalData_,
                referencedBy = activity.referencedBy || [],
                originalReferencedBy = originalData && originalData.referencedBy || [],
                unlinkedParentActivities = getUnlinkedParentActivities( originalReferencedBy, referencedBy ),
                updateOfSurgeryRequired = originalData && (activity.userContent !== originalData.userContent || activity.explanations !== originalData.userContent); // 'userContent' and 'explanations' are the only TREATMENT fields to be updated on the SURGERY activity.

            // Note: the unlinking of the TREATMENT activity from the SURGERY happens when surgery-relevant fields are changed on the TREATMENT activity.

            if( activity.actType !== 'TREATMENT' || !originalReferencedBy.length || activity.wasNew ) { // If the TREATMENT is a new one, the linked SURGERY is already up to date | a TREATMENT can only be unlinked (not linked) to a SURGERY from the TREATMENT editor, it is thus sufficient to check for originalReferencedby.
                return callback( null, activity );
            }

            let err;

            Y.log( `checkSurgeryOfTreatment: Unlinked parent activities: ${JSON.stringify( unlinkedParentActivities )}`, 'info', NAME );
            Y.log( `checkSurgeryOfTreatment: Update of SURGERY required: ${updateOfSurgeryRequired}`, 'info', NAME );

            // ---------------------------------------------- REMOVE REFERENCE FROM SURGERY -----------------------------------------------
            if( unlinkedParentActivities.length ) {
                [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'update', // update does not to trigger a post process
                    query: {
                        _id: {$in: unlinkedParentActivities},
                        actType: "SURGERY" // Only affects unlinked SURGERY activities
                    },
                    data: {
                        $pull: {
                            activities: activity._id.toString(),
                            linkedTreatments: {activityId: activity._id.toString()}
                        }
                    }
                } ) );

                if( err ) {
                    Y.log( `updateSurgeryOfTreatment: Error in unlinking TREATMENT from SURGERY activity. ${err.message}`, 'error', NAME );
                }
            }

            // ------------------------------------------------------ UPDATE SURGERY ------------------------------------------------------
            if( updateOfSurgeryRequired ) {
                [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'update', // update does not to trigger a post process
                    query: {
                        _id: {$in: referencedBy}, // Note: if the TREATMENT was already unlinked, the query will not find the previously linked SURGERY.
                        actType: "SURGERY",
                        "linkedTreatments.activityId": activity._id
                    },
                    data: {
                        $set: {
                            "linkedTreatments.$.userContent": activity.userContent,
                            "linkedTreatments.$.explanations": activity.explanations
                        }
                    }
                } ) );

                if( err ) {
                    Y.log( `updateSurgeryOfTreatment: Error in updating SURGERY activity. ${err.message}`, 'error', NAME );
                }
            }

            return callback( null, activity );

            // ---------------------------------------------------- HELPER FUNCTIONS ----------------------------------------------------
            function getUnlinkedParentActivities( originalReferencedBy, referencedBy ) {
                return originalReferencedBy.filter( originalReference => {
                    return !referencedBy.includes( originalReference );
                } );
            }
        }

        // TODO: check conICDS
        async function getContinuousIcdsOnScheinAutoCreation( user, activity, callback ) {
            if( Y.doccirrus.schemas.activity.isScheinActType( activity.actType ) && this.context && this.context.autoCreation ) {
                let
                    continuousIcds,
                    err, result;

                // ------------------------------------------ GET CONTINUOUS DIAGNOSIS FUNCTIONALITY ----------------------------------------

                [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'get',
                    model: 'invoiceconfiguration',
                    options: {
                        lean: true
                    }
                } ) );

                if( err ) {
                    Y.log( `getContinuousIcdsForScheinAutoCreation: Error in getting invoice configurations. ${err.message}`, 'error', NAME );
                }

                // ---------------------------------------------- POPULATE CONTINUOUS-ICDS ARRAy --------------------------------------------
                if( result[0] && result[0].kbvFocusFunctionalityContinuousDiagnosis ) {

                    [err, result] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                        Y.doccirrus.api.activity.getContinuousDiagnosis( {
                            user: user,
                            query: {
                                to: activity.timestamp,
                                patientId: activity.patientId,
                                timestamp: activity.timestamp,
                                locationId: activity.locationId
                            },
                            callback( err, result ) {
                                if( err ) {
                                    return reject( err );
                                } else {
                                    return resolve( result );
                                }
                            }
                        } );
                    } ) );

                    if( err ) {
                        Y.log( `getContinuousIcdsForScheinAutoCreation: Error in getting continuous diagnoses. ${err.message}`, 'error', NAME );
                    }

                    if( result && Array.isArray( result ) ) {
                        continuousIcds = result.map( icdObj => {
                            return icdObj._id;
                        } );
                    }

                    activity.continuousIcds = continuousIcds || [];
                }
            }

            callback( null, activity );
        }

        async function updateLocationIdOfAttachments( user, activity, callback ) {
            if( activity.locationIdWasModified && activity.attachments && activity.attachments.length ) {
                Y.log( `Updating locationId of ${activity.attachments.length} attachments`, 'debug', NAME );
                let [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'put',
                    model: 'document',
                    data: {
                        locationId: activity.locationId,
                        skipcheck_: true
                    },
                    fields: ['locationId'],
                    query: {
                        _id: {$in: activity.attachments},
                        locationId: {$ne: activity.locationId.toString()}
                    }
                } ) );

                if( err ) {
                    Y.log( `could not update locationId of attachments: ${err.stack || err}`, 'error', NAME );
                }
            }

            callback( null, activity );
        }

        /**
         *  Update continuousIcds/dauserdiagnosen from schein when creating/saving an invoice
         *
         *  @param user
         *  @param activity
         *  @param callback
         */

        function updateContinuousIcdsonInvoiceTypes( user, activity, callback ) {
            //  only applies to invoice type activities
            if( !Y.doccirrus.schemas.activity.isInvoiceActType( activity.actType ) ) {
                return callback( null, activity );
            }

            // MOJ-11050: do not override continuousDiagnoses for auto-generated invoices from cashlog
            if( this.context && this.context.autoCreation === true ) {
                return callback( null, activity );
            }

            //  only when activity is being created or saved, not during or after approval
            if( 'VALID' !== activity.status && 'CREATED' !== activity.status ) {
                return callback( null, activity );
            }

            Y.doccirrus.api.patient.lastSchein( {
                user: user,
                query: {
                    patientId: activity.patientId,
                    timestamp: activity.timestamp,
                    locationId: activity.locationId,
                    caseFolderId: activity.caseFolderId
                },
                callback: onScheinLoaded
            } );

            //  set continuousIcds to those of the current schein
            function onScheinLoaded( err, scheins ) {
                if( err ) {
                    //  should never happen
                    Y.log( `Could not load schein: ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }

                if( !scheins || !scheins[0] ) {
                    //  no schein, not ideal, but not an error
                    return callback( null, activity );
                }

                activity.continuousIcds = scheins[0].continuousIcds;
                callback( null, activity );
            }
        }

        /**
         * @method removeFromTransferCache
         * @private
         *
         * remove cache entry for current activity on POST write and delete
         *
         * @param {Object} user
         * @param {Object} activity
         * @param {String} callback
         *
         * @returns {Function} callback
         */
        async function removeFromTransferCache( user, activity, callback ) {
            let [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'delete',
                    model: 'transfercache',
                    query: {
                        activityId: activity._id
                    },
                    options: {
                        override: true
                    }
                } )
            );
            if( err ) {
                Y.log( `removeFromTransferCache: could not remove for activity: ${err.stack || err}`, 'error', NAME );
            }
            callback( null, activity );
        }

        async function createAssignedContinuousDiagnosisPre( user, activity, callback ) {
            const isScheinActType = Y.doccirrus.schemas.activity.scheinActTypes.includes( activity.actType );
            if( isScheinActType ) {
                activity.createContinuousDiagnosisOnSaveWasChecked = activity.createContinuousDiagnosisOnSave;
                activity.createContinuousDiagnosisOnSave = false;
                activity.createContinuousMedicationsOnSaveWasChecked = activity.createContinuousMedicationsOnSave;
                activity.createContinuousMedicationsOnSave = false;
            }
            callback( null, activity );
        }

        async function checkKbvMedicationPlanMedications( user, activity, callback ) {
            const context = this && this.context || {};

            if( activity.actType !== 'KBVMEDICATIONPLAN' || activity.status !== 'VALID' || context.noMedicationCheck ) {
                return callback( null, activity );
            }

            const _ = require( 'lodash' );
            const medicationFields = Object.keys( Y.doccirrus.schemas.activity.types.Medication_T ).concat( ['timestamp', 'code'] );
            const updateActivitySafe = promisifyArgsCallback( Y.doccirrus.api.activity.updateActivitySafe );

            let validationError = false;
            let err, newMedicationId, hadValidationError;

            const createActivity = ( data ) => {
                return new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.activity.createActivitySafe( {
                        user,
                        data,
                        callback: ( err, activityId, hadValidationError ) => {
                            if( err ) {
                                reject( err );
                            } else {
                                validationError = validationError || hadValidationError;
                                resolve( activityId );
                            }
                        }
                    } );
                } );
            };

            for( let medicationPlanEntry of activity.medicationPlanEntries ) {  // eslint-disable-line
                if( medicationPlanEntry.type !== 'MEDICATION' ||
                    (!medicationPlanEntry.isModified() && !medicationPlanEntry.medicationRef) ) {
                    continue;
                }

                const phNLabel = medicationPlanEntry.phNLabel ||
                                 medicationPlanEntry.phIngr.map( phIngr => [phIngr.name, phIngr.strength].filter( Boolean ).join( ' ' ) ).join( ', ' );

                const data = {
                    ..._.pick( activity, ['locationId', 'employeeId', 'caseFolderId', 'patientId'] ),
                    ...medicationPlanEntry.toObject(),
                    ...{
                        phNLabel,
                        content: phNLabel,
                        userContent: phNLabel,
                        actType: 'MEDICATION',
                        status: 'CREATED',
                        code: medicationPlanEntry.phPZN || '',
                        catalogShort: 'MMI',
                        sourceType: 'MEDICATIONPLAN',
                        // copy the source of the medication plan to the source field of the medication
                        source: activity.comment
                    }
                };
                delete data.type;
                if( !medicationPlanEntry.medicationRef ) {
                    delete data._id;

                    try {
                        newMedicationId = await createActivity( data );
                    } catch( err ) {
                        Y.log( `could not create medication activity: ${err.stack || err}`, 'warn', NAME );
                        validationError = true;
                        continue;
                    }

                    medicationPlanEntry.medicationRef = newMedicationId.toString();
                    activity.activities.push( newMedicationId.toString() );
                } else {
                    data._id = medicationPlanEntry.medicationRef;
                    [err, hadValidationError] = await formatPromiseResult( updateActivitySafe( {
                        user,
                        data: {
                            activity: data,
                            fields: Object.keys( medicationPlanEntry ).filter( key => medicationFields.includes( key ) )
                        },
                        context: {
                            skipRegenerateMMIPDF: true
                        }
                    } ) );

                    if( err ) {
                        Y.log( `could not update medication activity ${medicationPlanEntry.medicationRef}: ${err.stack || err}`, 'warn', NAME );
                        validationError = true;
                        continue;
                    }

                    validationError = validationError || hadValidationError;
                }

            }

            if( validationError ) {
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    event: 'message',
                    msg: {
                        data: i18n( 'activity-api.text.CAN_NOT_CREATE_VALID_MEDICATION' )
                    },
                    meta: {
                        level: 'ERROR'
                    }
                } );
            }

            callback( null, activity );
        }

        async function createAssignedContinuousDiagnosisPost( user, activity, callback ) {
            const copy = () => {
                const moment = require( 'moment' );
                return new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.casefolder.copyActivitiesToCaseFolder( {
                        user,
                        query: {
                            timestamp: moment( activity.timestamp ).add( 1, 's' ).toDate(),
                            employeeId: activity.employeeId,
                            locationId: activity.locationId,
                            caseFolderId: activity.caseFolderId,
                            activityIds: activity.continuousIcds
                        },
                        callback( err, result ) {
                            if( err ) {
                                return reject( err );
                            }
                            resolve( result );
                        }
                    } );
                } );
            };
            const isScheinActType = Y.doccirrus.schemas.activity.scheinActTypes.includes( activity.actType );
            if( activity.createContinuousDiagnosisOnSaveWasChecked && isScheinActType ) {
                let [err, result] = await formatPromiseResult( copy() );
                if( err ) {
                    Y.log( `could not copy continuous diagnosis to current case: ${err.stack || err}`, 'warn', NAME );
                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: user.identityId,
                        event: 'message',
                        msg: {
                            data: Y.doccirrus.i18n( 'activity-api.text.COULD_NOT_COPY_CONTINUOUS_DIAGNOSIS' )
                        }
                    } );
                } else if( result && result.length ) {
                    Y.log( `copied ${result.length} continuous diagnosis to current case`, 'debug', NAME );
                    Y.doccirrus.communication.emitEventForSession( {
                        sessionId: user.sessionId,
                        event: 'refreshCaseFolder',
                        msg: {
                            data: {
                                caseFolderId: activity.caseFolderId
                            }
                        }
                    } );
                }
            }

            callback( null, activity );
        }

        /**
         * Copy with shcein continuous medications
         * @param user
         * @param activity
         * @param callback
         */
        async function createAssignedContinuousMedicationsPost( user, activity, callback ) {
            const copy = () => {
                const moment = require( 'moment' );
                return new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.casefolder.copyActivitiesToCaseFolder( {
                        user,
                        query: {
                            timestamp: moment( activity.timestamp ).add( 1, 's' ).toDate(),
                            employeeId: activity.employeeId,
                            locationId: activity.locationId,
                            caseFolderId: activity.caseFolderId,
                            activityIds: activity.continuousMedications
                        },
                        callback( err, result ) {
                            if( err ) {
                                return reject( err );
                            }
                            resolve( result );
                        }
                    } );
                } );
            };
            const isScheinActType = Y.doccirrus.schemas.activity.scheinActTypes.includes( activity.actType );
            if( activity.createContinuousMedicationsOnSaveWasChecked && isScheinActType ) {
                let [err, result] = await formatPromiseResult( copy() );
                if( err ) {
                    Y.log( `could not copy continuous medications to current case: ${err.stack || err}`, 'warn', NAME );
                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: user.identityId,
                        event: 'message',
                        msg: {
                            data: Y.doccirrus.i18n( 'activity-api.text.COULD_NOT_COPY_CONTINUOUS_MEDICATIONS' )
                        }
                    } );
                } else if( result && result.length ) {
                    Y.log( `copied ${result.length} continuous medications to current case`, 'debug', NAME );
                    Y.doccirrus.communication.emitEventForSession( {
                        sessionId: user.sessionId,
                        event: 'refreshCaseFolder',
                        msg: {
                            data: {
                                caseFolderId: activity.caseFolderId
                            }
                        }
                    } );
                }
            }
            callback( null, activity );
        }

        /**
         * Check if related invoice logs must be re-validated by the user because activity was modified.
         * @param user
         * @param activity
         * @param callback
         */
        async function checkInvoiceLogs( user, activity, callback ) {
            let [err] = await formatPromiseResult( Y.doccirrus.api.invoicelog.server.checkInvoiceLogs( {
                user,
                activity,
                context: this.context,
                getLastScheinFromCache
            } ) );
            if( err ) {
                Y.log( `error occurred while checking invoice logs${activity._id}: ${err.stack | err}`, 'warn', NAME );
            }
            callback( null, activity );
        }

        /**
         *  Run post-processes which update external objects but do not change the activity
         *
         *  These were previously in the POST array at the bottom of this file, but were holding up the process
         *  unnecessarily.  Note that in case of error these will now make a message in the logs, rather than
         *  block the operation.
         *
         *  We do not need to wait for these, operations re-ordered to call back more quickly
         *
         *      updateLocationIdOfAttachments,              //  updates attached documents, can be sync
         *      removeFromTransferCache,                    //  delete operation, can be sync
         *      checkGoaeLabAllowance,                      //  looks like it can be sync
         *      updateSubTypeTags,                          //  updates tags, can be sync
         *      updateDoseTags,                             //  updates tags, can be sync
         *      updateCancelReason,                         //  updates tags, can be sync
         *      updatePatientMedData,                       //  updates patient, can be sync
         *      updatePatientEmployees                      //  updates patient employees, can be sync
         *      updatePatientEmployeeIds                    //  updates patient employees on change to schein
         *      changeAttachedPatientContent                //  updates patient attachedContent, attachedSeverity, etc
         *      updateBLCountNoWait                         //  recalculate Bewilligte Leistung
         *      recalculateCatalogUsage                     //  update catalog usages
         *      increaseStockItemAfterCancelationDispense   //  update parent activity, record stock dispensed
         *      updateReporting                             //  trigger reporting (re)generation
         *
         *  @param {Object}     user
         *  @param {Object}     activity
         *  @param {Function}   callback    Called immediately
         */

        function callUpdateExternalObjects( user, activity, callback ) {
            const async = require( 'async' );

            let
                self = this,
                context = self && self.context || {};

            if( context._skipTriggerSecondary ) {
                Y.log( `Skipping activity post-processes to update other objects.`, 'debug', NAME );
                return callback( null, activity );
            }

            async.series( [
                function( itcb ) {
                    updateKBVMedicationPlanPdf.call( self, user, activity, itcb );
                },
                function( itcb ) {
                    updateMedicationPlanPdf.call( self, user, activity, itcb );
                },
                function( itcb ) {
                    checkMedicationForMedicationplan.call( self, user, activity, itcb );
                },
                function( itcb ) {
                    checkMedicationForKBVMedicationPlan.call( self, user, activity, itcb );
                },
                function( itcb ) {
                    updateLocationIdOfAttachments.call( self, user, activity, itcb );
                },
                function( itcb ) {
                    removeFromTransferCache.call( self, user, activity, itcb );
                },
                function( itcb ) {
                    checkGoaeLabAllowance.call( self, user, activity, itcb );
                },
                function( itcb ) {
                    updateSubTypeTags.call( self, user, activity, itcb );
                },
                function( itcb ) {
                    updateDoseTags.call( self, user, activity, itcb );
                },
                function( itcb ) {
                    updatePhReasonTags.call( self, user, activity, itcb );
                },
                function( itcb ) {
                    updatePhNoteTags.call( self, user, activity, itcb );
                },
                function( itcb ) {
                    updateCancelReason.call( self, user, activity, itcb );
                },
                function( itcb ) {
                    updatePatientMedData.call( self, user, activity, itcb );
                },
                function( itcb ) {
                    updatePatientLabData.call( self, user, activity, itcb );
                },
                function( itcb ) {
                    updatePatientEmployees.call( self, user, activity, itcb );
                },
                function( itcb ) {
                    updatePatientEmployeeIds.call( self, user, activity, itcb );
                },
                function( itcb ) {
                    changeAttachedPatientContent.call( self, user, activity, itcb );
                },
                function( itcb ) {
                    updateBLCountNoWait.call( self, user, activity, itcb );
                },
                function( itcb ) {
                    recalculateCatalogUsage.call( self, user, activity, itcb );
                },
                //function( itcb ) { increaseStockItemAfterCancelationDispense.call( self, user, activity, itcb ); },
                function( itcb ) {
                    updateReporting.call( self, user, activity, itcb );
                }

                //  TODO: document from here

            ], onAllExternalUpdated );

            function onAllExternalUpdated( err ) {
                if( err ) {
                    Y.log( `Problem running post-process in callUpdateExternalObjects: ${err.stack || err}`, 'error', NAME );
                }
                Y.log( `Completed activity post-process updates of other objects.`, 'debug', NAME );
            }

            callback( null, activity );
        }

        /* async function  increaseStockItemAfterCancelationDispense(  user, activity, callback ) {
            const  reduceWaresCount = promisifyArgsCallback(Y.doccirrus.api.instockrequest.reduceWaresCount);
            let err;

            if (activity.actType !== 'STOCKDISPENSE' || activity.status !== "CANCELLED") {
                return callback(null, activity);
            }

            [err] = await  formatPromiseResult(reduceWaresCount({
               user,
               data: {
                   _id: activity.stockItemId,
                   reduce: -1,
                   notes: `${Y.doccirrus.i18n('activity-schema.StockDispense.canceling')} ${activity.comment}`
               }
            }));

            if (err) {
               Y.log( `Problem running post-process in reduceWaresCount: ${err.stack || err}`, 'error', NAME );
            }

            if (!activity.referencedBy.length) {
               return  callback(null, activity);
            }

            [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
               action: 'update',
               model: 'activity',
               query: {_id: activity.referencedBy[0]},
               fields: ['isDispensed'],
               user,
               data: {'isDispensed': false}
            } ) );

            if (err) {
               Y.log( `Failed to set isDispensed property for activity: ${err.stack || err}`, 'error', NAME );
            }

            return  callback(null, activity);
        } */

        /**
         *  pre-process for activities created in PREPARED caseFolder
         *
         * It set PREPARED status and timestamp
         *
         *
         * @param user
         * @param activity
         * @param callback
         * @returns {Promise<void>}
         */
        async function setPreparedData( user, activity, callback ) {
            let caseFolderType = Y.doccirrus.schemas.casefolder.getPreparedCaseFolderId() === activity.caseFolderId,
                remapInNewContextP = util.promisify( Y.doccirrus.forms.mappinghelper.remapInNewContext );

            if( caseFolderType ) {
                activity.status = 'PREPARED';
                activity.timestamp = moment( new Date() ).add( 100, 'years' );
                activity.referencedBy = [];
                activity.activities = [];
                if( activity.receipts && activity.receipts.length ) {
                    activity.receipts = [];
                }
                if( activity.icds && activity.icds.length ) {
                    activity.icds = [];
                }
                if( activity.icdsExtra && activity.icdsExtra.length ) {
                    activity.icdsExtra = [];
                }
                if( activity.time ) {
                    activity.time = '';
                }

                if( activity.formId && !activity.isNew ) {
                    let [err] = await formatPromiseResult( remapInNewContextP( user, activity._id, false ) );

                    if( err ) {
                        //  should never happen
                        Y.log( `Could not update activity form: ${err.stack || err}`, 'warn', NAME );
                        return callback( err, activity );
                    }
                }
            }

            if( 'PREPARED' === activity.status && !caseFolderType ) {
                activity.status = 'VALID';
                activity.timestamp = moment( new Date() );
                activity.referencedBy = [];
                activity.activities = [];
                if( activity.receipts && activity.receipts.length ) {
                    activity.receipts = [];
                }
                if( activity.icds && activity.icds.length ) {
                    activity.icds = [];
                }
                if( activity.icdsExtra && activity.icdsExtra.length ) {
                    activity.icdsExtra = [];
                }
                if( activity.time ) {
                    activity.time = '';
                }
            }

            callback( null, activity );
        }

        /**
         *  pre-process for unlink TREATMENT activities
         *
         *
         * @param user
         * @param activity
         * @param callback
         * @returns {Promise<void>}
         */
        async function checkAndUnlink( user, activity, callback ) {
            //allowed for Treatments and tarmed catalog
            if( 'TREATMENT' !== activity.actType ) {
                return callback( null, activity );
            }

            if( -1 === Y.doccirrus.schemas.activity.TARMED_CATALOGS_MAP.indexOf( activity.catalogShort ) ) {
                return callback( null, activity );
            }

            if( !(activity.hierarchyRules && activity.hierarchyRules.length) ) {
                return callback( null, activity );
            }

            if( !(activity.activities && activity.activities.length) && !(activity.referencedBy && activity.referencedBy.length) ) {
                //don't need to check if no one linked
                return callback( null, activity );
            }

            let
                processingType = activity.processingType || (activity.originalData_ && activity.originalData_.processingType);
            if( ['sequence'].indexOf( processingType ) !== -1 ) {
                return callback( null, activity );
            }

            return Y.doccirrus.api.linkedactivities.checkAndUnlink( user, activity, callback );
        }

        /**
         *  pre-process for unlink TREATMENT activities if was deleted
         *
         *
         * @param user
         * @param activity
         * @param callback
         * @returns {Promise<void>}
         */
        async function deleteAndUnlink( user, activity, callback ) {
            // need lean object
            const
                leanActivity = activity.toJSON ? activity.toJSON() : JSON.parse( JSON.stringify( activity ) );
            //allowed for Treatments and tarmed catalog
            if( 'TREATMENT' !== leanActivity.actType && -1 === Y.doccirrus.schemas.activity.TARMED_CATALOGS_MAP.indexOf( leanActivity.catalogShort ) ) {
                return callback( null, activity );
            }

            if( !(leanActivity.hierarchyRules && leanActivity.hierarchyRules.length) ) {
                return callback( null, activity );
            }

            if( !(leanActivity.activities && leanActivity.activities.length) && !(leanActivity.referencedBy && leanActivity.referencedBy.length) ) {
                //don't need to check if no one linked
                return callback( null, activity );
            }

            let
                processingType = activity.processingType || (activity.originalData_ && activity.originalData_.processingType);
            if( ['sequence'].indexOf( processingType ) !== -1 ) {
                return callback( null, activity );
            }

            return Y.doccirrus.api.linkedactivities.deleteAndUnlink( user, activity, callback );
        }

        /**
         *  pre-process for link TREATMENT activities if exists
         *
         *
         * @param user
         * @param activity
         * @param callback
         * @returns {Promise<void>}
         */
        async function checkAndLinkIfExists( user, activity, callback ) {
            //allowed for Treatments and tarmed catalog
            if( 'TREATMENT' !== activity.actType ) {
                return callback( null, activity );
            }

            if( -1 === Y.doccirrus.schemas.activity.TARMED_CATALOGS_MAP.indexOf( activity.catalogShort ) ) {
                return callback( null, activity );
            }

            if( !(activity.hierarchyRules && activity.hierarchyRules.length) ) {
                return callback( null, activity );
            }

            if( activity.daySeparation ) {
                return callback( null, activity );
            }

            let
                processingType = activity.processingType || (activity.originalData_ && activity.originalData_.processingType);
            if( ['sequence'].indexOf( processingType ) !== -1 ) {
                return callback( null, activity );
            }

            return Y.doccirrus.api.linkedactivities.checkAndLinkIfExists( user, activity, callback );
        }

        async function calculateTaxPointValue( user, activity, callback ) {
            const swissCatalogsShort = Y.doccirrus.commonutilsCh.getSwissCatalogsShort();
            if( activity.actType !== 'TREATMENT' || !swissCatalogsShort.includes( activity.catalogShort ) ) {
                return callback( null, activity );
            }
            let err, tarmedScalingFactors, tarmedTaxPointValues, result, caseFolder, location;

            [err, tarmedScalingFactors] = await formatPromiseResult(
                Y.doccirrus.api.invoiceconfiguration.getScalingFactorsForTarmedPrices( user )
            );

            if( err ) {
                Y.log( `Failed to get tarmedTaxPointValues from invoiceconfiguration ${err.stack || err}`, 'error', NAME );
                return callback( err, activity );
            }
            tarmedTaxPointValues = tarmedScalingFactors.taxPointValues;

            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'casefolder',
                action: 'get',
                query: {
                    _id: activity.caseFolderId
                }
            } ) );

            if( err || !Array.isArray( result ) || !result.length ) {
                Y.log( `Failed to get caseFolder from activity.caseFolderId ${activity.caseFolderId}`, 'error', NAME );
                return callback( err, activity );
            }

            caseFolder = result[0];

            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'location',
                action: 'get',
                query: {
                    _id: activity.locationId
                }
            } ) );

            if( err || !Array.isArray( result ) || !result.length ) {
                Y.log( `Failed to get location from activity.locationId ${activity.locationId}`, 'error', NAME );
                return callback( err, activity );
            }

            location = result[0];

            const relevantTaxPointEntry = Y.doccirrus.commonutilsCh.getRelevantTarmedTaxPointEntry( {
                cantonCode: location.cantonCode,
                caseFolderType: caseFolder.type,
                tarmedTaxPointValues,
                date: activity.timestamp || moment( new Date() )
            } );

            if( !relevantTaxPointEntry || !relevantTaxPointEntry.value ) {
                Y.log( `Failed to get TaxPointEntry from activity locationId ${activity.locationId} and caseFolder`, 'error', NAME );
                return callback( null, activity );
            }

            activity.taxPointValue = relevantTaxPointEntry.value * 0.01;
            return callback( null, activity );

        }

        /**
         *  pre-process for act type SCHEIN
         *
         * It prevents the creation of SCHEIN if the PUBLIC ( GKV ) insurance is from imported data ( isFromImpoted: true ),
         * so that the user can check & correct the insurance details.
         * Upon saving patient 'isFromImported' flag is removed and then the SCHEIN can be created
         *
         *
         * @param user
         * @param activity
         * @param callback
         * @returns {Promise<void>}
         */
        async function checkForImportedInsurance( user, activity, callback ) {
            if( activity && activity.actType === 'SCHEIN' ) {

                let
                    err,
                    result,
                    isInsuranceFromImport;

                [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    model: 'patient',
                    action: 'get',
                    query: {_id: activity.patientId},
                    user: user,
                    options: {
                        select: {
                            insuranceStatus: 1
                        }
                    }
                } ) );

                if( err ) {
                    Y.log( `checkForImportedInsurance: Error occurred while querying patients.Error: ${err.stack || err}`, "error", NAME );
                    return callback( new DCError( 500, {message: `checkForImportedInsurance: Error occurred while querying patients.Error: ${err.message || err}`} ) );
                }

                if( result && Array.isArray( result ) && result.length ) {

                    isInsuranceFromImport = result[0].insuranceStatus.some( ( {type, isFromImport} ) => {
                        return type === 'PUBLIC' && isFromImport;
                    } );

                    if( isInsuranceFromImport ) {
                        Y.log( `activity-process: ${i18n( 'activity-process.text.CHECK_IMPORTED_INSURANCE_MSG' )}`, "error", NAME );

                        return callback( new DCError( 18039 ) );
                    }
                }
            }
            callback( null, activity );
        }

        /**
         * post-process for PUBLIC invoice act type
         *
         * Remove manually set 'Invoice without card' state from patient on invoicing
         *
         * @param user
         * @param activity
         * @param callback
         * @returns {Promise<void>}
         */
        async function dropInsuranceWOCardState( user, activity, callback ) {
            //applicable only for invoices
            if( !['INVOICE', 'INVOICEREFGKV', 'INVOICEREF'].includes( activity.actType ) ) {
                return callback( null, activity );
            }

            let [err, casefolders] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'casefolder',
                    action: 'get',
                    migrate: true,
                    query: {
                        _id: activity.caseFolderId
                    }
                } )
            );
            if( err ) {
                Y.log( `dropInsuranceWOCardState: error getting casefolder _id:${activity.caseFolderId}: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }
            //applicable only for PUBLIC invoices
            if( !casefolders || !casefolders.length || casefolders[0].type !== 'PUBLIC' ) { // MOJ-14319: [OK] [CARDREAD]
                callback( null, activity );
            }

            //applicable only for processed statuses
            if( ['DELETED', 'VALID', 'CANCELLED', 'CREATED', 'INVALID'].includes( activity.actType ) ) {
                callback( null, activity );
            }

            let result;
            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'patient',
                    action: 'update',
                    migrate: true,
                    query: {
                        _id: activity.patientId,
                        insuranceWOCard: {$exists: true, $ne: null}
                    },
                    data: {
                        $unset: {insuranceWOCard: 1}
                    }
                } )
            );
            if( err ) {
                Y.log( `dropInsuranceWOCardState: error droping InsuranceWOCard on patient _id:${activity.patientId}: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            if( result && result.nModified === 1 && result.ok === 1 ) {
                Y.log( `dropInsuranceWOCardState: status dropped InsuranceWOCard on patient _id:${activity.patientId}`, 'info', NAME );
            }

            callback( null, activity );
        }

        /**
         * creates new treatments and link to current
         *
         * @param user
         * @param activity
         * @param callback
         * @returns {Promise<void>}
         */
        async function createAndLinkTarmedTreatments( user, activity, callback ) {
            //allowed for Treatments and tarmed catalog
            if( 'TREATMENT' !== activity.actType ) {
                return callback( null, activity );
            }

            if( -1 === Y.doccirrus.schemas.activity.TARMED_CATALOGS_MAP.indexOf( activity.catalogShort ) ) {
                return callback( null, activity );
            }

            if( !(activity.hierarchyRules && activity.hierarchyRules.length) ) {
                return callback( null, activity );
            }

            let
                processingType = activity.processingType || (activity.originalData_ && activity.originalData_.processingType);
            if( ['sequence'].indexOf( processingType ) !== -1 ) {
                return callback( null, activity );
            }

            return Y.doccirrus.api.linkedactivities.createAndLinkTarmedTreatments( user, activity, false, callback );

        }

        /**
         * changes related treatments side if changed
         *
         * @param {object} user
         * @param {object} activity
         * @param {function} callback
         * @returns {Promise<void>}
         */
        async function checkAndReplaceSide( user, activity, callback ) {
            //allowed for Treatments and tarmed catalog
            if( 'TREATMENT' !== activity.actType ) {
                return callback( null, activity );
            }

            if( -1 === Y.doccirrus.schemas.activity.TARMED_CATALOGS_MAP.indexOf( activity.catalogShort ) ) {
                return callback( null, activity );
            }

            if( !(activity.hierarchyRules && activity.hierarchyRules.length) ) {
                return callback( null, activity );
            }

            // if side not mandatory then it cannot be changed
            if( activity.isNew || !activity.sideMandatory ) {
                return callback( null, activity );
            }

            // if side did't change, everything ok
            if( activity.originalData_ && activity.side === activity.originalData_.side ) {
                return callback( null, activity );
            }

            return Y.doccirrus.api.linkedactivities.checkAndReplaceSide( user, activity, callback );

        }

        /**
         * removes value if catalog was changed
         *
         * @param user
         * @param activity
         * @param callback
         * @returns {Promise<void>}
         */
        async function clearIfCatalogChanged( user, activity, callback ) {
            //allowed for DIAGNOSIS and not ICD-10 catalog
            if( 'DIAGNOSIS' !== activity.actType ) {
                return callback( null, activity );
            }

            if( 'ICD-10' === activity.catalogShort ) {
                return callback( null, activity );
            }

            if( !(activity.relatedCodes && activity.relatedCodes.length) ) {
                return callback( null, activity );
            }

            // clear field if catalog was changed
            activity.relatedCodes = [];
            callback( null, activity );

        }

        /**
         * creates new diagnosis
         *
         * @param user
         * @param activity
         * @param callback
         * @returns {Promise<void>}
         */
        async function createRelatedDiagnosis( user, activity, callback ) {
            //allowed for Diagnosis and ICD-10
            if( 'DIAGNOSIS' !== activity.actType ) {
                return callback( null, activity );
            }

            if( 'ICD-10' !== activity.catalogShort ) {
                return callback( null, activity );
            }

            if( !(activity.relatedCodes && activity.relatedCodes.length) ) {
                return callback( null, activity );
            }

            if( !activity.isNew ) {
                return callback( null, activity );
            }

            let
                processingType = activity.processingType || (activity.originalData_ && activity.originalData_.processingType);
            if( ['sequence'].indexOf( processingType ) !== -1 ) {
                return callback( null, activity );
            }

            return Y.doccirrus.api.linkedactivities.createRelatedDiagnosis( user, activity, callback );
        }

        /**
         * in UVG casefolder not allowed to approve invoice
         * function updates invoice after value in schein set
         *
         * @param user
         * @param activity
         * @param callback
         * @returns {Promise<void>}
         */
        async function updateUVGScheinInvoice( user, activity, callback ) {
            if( 'PKVSCHEIN' !== activity.actType ) {
                return callback( null, activity );
            }
            let
                err, result, caseFolder;

            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'casefolder',
                action: 'get',
                query: {
                    _id: activity.caseFolderId.toString()
                }
            } ) );

            if( err || !Array.isArray( result ) || !result.length ) {
                Y.log( `Failed to get caseFolder from activity.caseFolderId ${activity.caseFolderId}`, 'error', NAME );
                return callback( err, activity );
            }

            caseFolder = result[0];

            if( 'PRIVATE_CH_UVG' !== caseFolder.type ) {
                return callback( null, activity );
            }

            const reg = /^\s*$/g;
            let match = reg.exec( activity.caseNumber ),
                caseNumber = false;

            if( !activity.caseNumber || match ) {
                caseNumber = true;
            }

            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                action: 'get',
                query: {
                    scheinId: activity._id.toString(),
                    actType: 'INVOICE',
                    blockApprove: !caseNumber
                }
            } ) );

            if( err ) {
                Y.log( `Failed to get activities from activity._id as scheinId ${activity._id}`, 'err', NAME );
                return callback( err, activity );
            }

            if( result && result.length ) {
                for( let invoice of result ) {    // eslint-disable-line
                    [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        action: 'put',
                        query: {
                            _id: invoice._id.toString()
                        },
                        data: {
                            blockApprove: caseNumber,
                            skipcheck_: true
                        },
                        fields: ['blockApprove']
                    } ) );

                    if( err ) {
                        Y.log( `Failed to update INVOICE ${result._id}`, 'err', NAME );
                        return callback( err, activity );
                    }

                    // notify to update casefolder
                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: user.identityId,
                        event: 'UPDATE_INVOICE',
                        msg: {
                            data: {id: invoice._id.toString(), blockApprove: caseNumber}
                        }
                    } );
                }

                // notify to update cashbook
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    nsp: 'default',
                    event: 'linkedActivityUpdate',
                    msg: {data: []}
                } );

                // notify to update casefolder
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    event: 'system.UPDATE_ACTIVITIES_TABLES',
                    msg: {
                        data: activity.caseFolderId
                    }
                } );
            }

            return callback( null, activity );
        }

        /**
         * unlinks activities if was changed catalog
         *
         * @param user
         * @param activity
         * @param callback
         * @returns {Promise<void>}
         */
        async function unlinkIfCatalogChanged( user, activity, callback ) {
            //allowed for Treatments and not tarmed catalog
            if( 'TREATMENT' !== activity.actType ) {
                return callback( null, activity );
            }

            if( -1 !== Y.doccirrus.schemas.activity.TARMED_CATALOGS_MAP.indexOf( activity.catalogShort ) ) {
                return callback( null, activity );
            }

            if( !(activity.hierarchyRules && activity.hierarchyRules.length) ) {
                return callback( null, activity );
            }

            let
                processingType = activity.processingType || (activity.originalData_ && activity.originalData_.processingType);
            if( ['sequence'].indexOf( processingType ) !== -1 ) {
                return callback( null, activity );
            }

            return Y.doccirrus.api.linkedactivities.unlinkIfCatalogChanged( user, activity.toObject ? activity.toObject() : activity, callback );

        }

        async function checkEDocLetterFlatFeeTreatment( user, activity, callback ) {
            if( activity.actType !== 'DOCLETTER' || !activity.kimStateWasModified || activity.kimState !== 'RECEIVED_AND_READ' ) {
                callback( null, activity );
                return;
            }

            let [err, result] = await formatPromiseResult( Y.doccirrus.api.edocletter.createTreatmentForReceivedDocLetter( {
                user,
                docletter: activity
            } ) );

            if( err ) {
                Y.log( `checkEDocLetterFlatFeeTreatment: could not create flat fee treatment for received edocletter: ${err.stack || err}`, 'warn', NAME );
            } else {
                Y.log( `checkEDocLetterFlatFeeTreatment: for docletter ${activity._id} returns ${result}`, 'info', NAME );
            }

            callback( null, activity );
        }

        async function resetKimFlatFeeTreatmentRef( user, activity, callback ) {
            if( activity.actType === 'TREATMENT' ) {
                let [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'mongoUpdate',
                    model: 'activity',
                    query: {
                        flatFeeTreatmentId: activity._id.toString()
                    },
                    data: {
                        $unset: {
                            flatFeeTreatmentId: 1
                        }
                    }
                } ) );

                if( err ) {
                    Y.log( `resetKimFlatFeeTreatmentRef: could not try to reset flatFeeTreatmentId (${activity._id.toString()}) on docletter: ${err.stack || err}`, 'warn', NAME );
                } else {
                    Y.log( `resetKimFlatFeeTreatmentRef: try to reset flatFeeTreatmentId on docletter (${activity._id.toString()}): ${JSON.stringify( result.result )}`, 'warn', NAME );
                }
            }

            callback( null, activity );
        }

        /**
         * post-process AU activity to decrease repetiotion number
         *
         * When repeated activity is deleted decrease repetiotion number on master activity
         *
         * @param user
         * @param activity
         * @param callback
         * @returns {Promise<void>}
         */
        async function decreasenoOfRepetitions( user, activity, callback ) {
            //applicable only for repeated AU
            if( !activity.parentPrescriptionId || 'AU' !== activity.actType ) {
                return callback( null, activity );
            }

            let [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'update',
                    migrate: true,
                    query: {
                        _id: activity.parentPrescriptionId,
                        noOfRepetitions: {$gt: 0}
                    },
                    data: {$inc: {noOfRepetitions: -1}}
                } )
            );
            if( err ) {
                Y.log( `decreasenoOfRepetitions: error updating activity: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            callback( null, activity );
        }

        async function checkRezidivProphylaxeCodes( user, activity, callback ) {
            let [err] = await formatPromiseResult( Y.doccirrus.api.activity.checkRezidivProphylaxeCodes( {
                user,
                data: {
                    activity: activity.toObject()
                }
            } ) );

            if( err ) {
                return callback( err );
            }

            callback( null, activity );
        }

        async function cancelMedication( user, activity, callback ) {
            let medicationActivities;
            let context = this && this.context || {};

            if( (activity.actType !== 'MEDICATION' && activity.isDispensed !== true) && activity.actType !== 'STOCKDISPENSE' ) {
                return callback( null, activity );
            }

            // If type is Stockdispense
            if( activity.actType === 'STOCKDISPENSE' && activity.status === 'CANCELLED' && context.referencedByWas ) {
                let medicationsIds = context.referencedByWas;

                let [err] = await formatPromiseResult( new Promise( function( resolve, reject ) {
                    Y.doccirrus.activityapi.doTransitionBatch( user, {}, medicationsIds, 'cancel',
                        noop, ( err, result ) => {
                            if( err ) {

                                return reject( err );
                            }

                            resolve( result );
                        } );
                } ) );

                if( err ) {
                    Y.log( `cancelMedication: failed to cancel medications ${err.stack || err}`, 'error', NAME );
                    return callback( err, activity );
                }

                [err, medicationActivities] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'get',
                    query: {_id: {$in: medicationsIds}}
                } ) );

                if( err ) {
                    Y.log( `cancelMedication: failed to get medications ${err.stack || err}`, 'error', NAME );
                    return callback( err, activity );
                }

                const waresToReduce = medicationActivities.map( medication => {
                    if( !medication.s_extra || !medication.s_extra.stockLocationId ) {
                        Y.log( 'cancelMedication: stock location is missing in medication', 'warn', NAME );
                    }
                    return {
                        phPZN: medication.phPZN,
                        stockLocationId: (medication.s_extra || {}).stockLocationId,
                        reduce: -1, //Reduce negative value to increase ware count
                        reduceAsTp: medication.isDivisible
                    };
                } );

                if( waresToReduce.length ) {
                    [err] = await formatPromiseResult(
                        Y.doccirrus.api.instockrequest.reduceWaresCount( {
                            user,
                            data: {
                                waresToReduce,
                                locationId: activity.locationId
                            }
                        } )
                    );

                    if( err ) {
                        Y.log( `cancelMedication: failed to increase ware count after medication cancelation ${err.stack || err}`, 'error', NAME );
                        return callback( err, activity );
                    }
                }
            }

            // If type is Medication
            if( activity.actType === 'MEDICATION' && activity.status === 'CANCELLED' && activity.isDispensed === true ) {
                let err, abgabeActivity, otherMedications;

                [err, abgabeActivity] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        $and: [
                            {
                                _id: {$in: activity.activities}
                            },
                            {actType: "STOCKDISPENSE"},
                            {status: {$ne: "CANCELLED"}}
                        ]
                    }
                } ) );

                if( err ) {
                    Y.log( `cancelMedication: failed to find dispensing activiyy ${err.stack || err}`, 'error', NAME );
                    return callback( err, activity );
                }

                abgabeActivity = abgabeActivity.result ? abgabeActivity.result : abgabeActivity;
                if( abgabeActivity.length ) {
                    abgabeActivity = abgabeActivity[0];
                } else {
                    return callback( null, activity );
                }

                [err, otherMedications] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        $and: [
                            {_id: {$in: abgabeActivity.referencedBy}},
                            {actType: 'MEDICATION'}, {status: {$ne: 'CANCELLED'}}]
                    }
                } ) );

                if( err ) {
                    Y.log( `cancelMedication: failed to find linked  ${err.stack || err}`, 'error', NAME );
                    return callback( err, activity );
                }

                otherMedications = otherMedications.result ? otherMedications.result : otherMedications;
                //No other medications are linked to STOCKDISPENSE activity, STOCKDISPENSE should be cancelled as well

                if( !otherMedications.length ) {
                    let [err] = await  formatPromiseResult( new Promise( function( resolve, reject ) {
                        Y.doccirrus.activityapi.doTransitionBatch( user, {}, [abgabeActivity._id], 'cancel',
                            noop, ( err, result ) => {
                                if( err ) {
                                    return reject( err );
                                }

                                resolve( result );
                            } );
                    } ) );

                    if( err ) {
                        Y.log( `cancelMedication: failed to cancel medications ${err.stack || err}`, 'error', NAME );
                        return callback( err, activity );
                    }
                }

                //increase stock count

                [err] = await formatPromiseResult(
                    Y.doccirrus.api.instockrequest.reduceWaresCount( {
                        user,
                        data: {
                            waresToReduce: [
                                {
                                    phPZN: activity.phPZN,
                                    stockLocationId: (activity.s_extra || {}).stockLocationId,
                                    reduce: -1, //Reduce negative value to increase ware count
                                    reduceAsTp: activity.isDivisible
                                }],
                            locationId: activity.locationId
                        }

                    } )
                );

                if( err ) {
                    Y.log( `cancelMedication: failed to increase ware count after medication cancelation ${err.stack || err}`, 'error', NAME );
                    return callback( err, activity );
                }

            }

            // notify client
            Y.doccirrus.communication.emitEventForUser( {
                targetId: user.identityId,
                event: 'system.UPDATE_ACTIVITIES_TABLES',
                msg: {
                    data: activity.caseFolderId
                }
            } );

            callback( null, activity );
        }

        async function cleanBlScheinPseudoGnrMarks( user, activity, callback ) {
            let [err] = await formatPromiseResult( Y.doccirrus.api.activity.cleanBlScheinPseudoGnrMarks( {
                user,
                data: {
                    activity: activity.toObject()
                }
            } ) );

            if( err ) {
                return callback( err );
            }

            callback( null, activity );
        }

        async function markBlScheinIfPseudoGnrIsAdded( user, activity, callback ) {
            let [err] = await formatPromiseResult( Y.doccirrus.api.activity.markBlScheinIfPseudoGnrIsAdded( {
                user,
                data: {
                    activity: activity.toObject()
                }
            } ) );

            if( err ) {
                return callback( err );
            }

            callback( null, activity );
        }

        /**
         * pre-process BADDEBT or RECEIPT
         *
         * set incashNo if not defined yet for CASH type of processing
         *
         * @param user
         * @param activity
         * @param callback
         * @returns {Function<Object>}
         */
        async function setIncashNo( user, activity, callback ) {
            if( activity.incashNo || !['BADDEBT', 'RECEIPT'].includes( activity.actType ) || activity.paymentMethod !== 'CASH' ||
                !Y.doccirrus.licmgr.hasAdditionalService( user.tenantId, 'inCash' ) ) {
                return callback( null, activity );
            }
            let [err, nextNo] = await formatPromiseResult(
                Y.doccirrus.api.incash.getNextIncashNo( user, activity.locationId.toString(), activity.cashbookId.toString() )
            );
            if( err ) {
                Y.log( `setIncashNo: Error getting next number ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }
            activity.incashNo = nextNo;

            callback( null, activity );
        }

        /**
         *
         * v.0. presents an array of pre process functions &
         *      an array of post-process functions.
         *
         * @class ActivityProcess
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                {
                    run: [
                        filterByEmployee
                    ], forAction: 'find'
                },
                {
                    run: [
                        Y.doccirrus.filtering.models.activity.resultFilters[0],
                        setIsModified,
                        checkTimestampOnDelete,
                        deleteAndUnlink
                    ],
                    forAction: 'delete'
                },
                {
                    run: [
                        checkForImportedInsurance,
                        getContinuousIcdsOnScheinAutoCreation,
                        replaceControlCharactersInMedicationFields,
                        checkUserGroup,
                        setIsModified,
                        setMaterialCosts,
                        setLabData,
                        setTonometryRead,
                        Y.doccirrus.filtering.models.activity.resultFilters[0],
                        checkTransition, //api
                        checkSubGop,
                        setScheinDate,
                        setEmployeeName, //api
                        setPatientName, //api
                        setMedicationCode,
                        cleanContinousMedicationDate,
                        setTreatmentDiagnosesBillable,
                        setTreatmentTariff,
                        setDiagnosisContinous,
                        updateDiagnosesOnInvalidationPre,
                        checkCatalog,
                        updateEditor, //api
                        updateAttachedMedia, //api
                        checkFromPatient,
                        checkCostEstimate,
                        checkTimestamp,
                        removeNonVat,
                        handleTeleConsult,
                        checkBLSchein,
                        calcInvoicesAndTreatments,
                        //  setObservationFields
                        generateLabRequestId,
                        checkScheinIcds,
                        checkPresassistive,
                        checkCasefolder,
                        checkBLCodeLocation,
                        checkSubType,
                        checkRepeatedKbvUtilities,
                        updateReciprocalLinks,
                        setTotalReceiptsOutstanding,
                        checkDiagnosisCert,
                        checkConsistencyOfLinkedInvoiceActivities,
                        //handleEdmpActivityUpdatePreProcess,
                        updateContinuousIcdsonInvoiceTypes,
                        updateLabEntries,
                        createAssignedContinuousDiagnosisPre,
                        checkKbvMedicationPlanMedications,
                        setPreparedData,
                        calculateTaxPointValue,
                        checkAndUnlink,
                        checkAndLinkIfExists,
                        clearIfCatalogChanged,
                        createRelatedDiagnosis,
                        updateUVGScheinInvoice,
                        setIncashNo,
                        validateMedDataItems,
                        generateContent, //api
                        setMedicationIngredients,
                        checkAndReplaceSide
                    ], forAction: 'write'
                }
            ],

            post: [
                // TODO: MOJ-9159 { run: [Y.doccirrus.filtering.models.activity.resultFilters[0]], forAction: 'read' },
                // { run: [Y.doccirrus.filtering.models.activity.resultFilters[0]], forAction: 'read' },
                {
                    run: [
                        checkInvoiceLogs,
                        checkAuVon,
                        updateLabTests,
                        updateMedDataTags,
                        createIcds,
                        addScheinRelations,
                        setApkState,
                        updateSyncFolder,
                        recalculateBgTreatments,
                        syncActivityWithDispatcher,             //  IMPORTANT, do not re-order, must be 10th process
                        handleEdmpActivityUpdatePostProcess,
                        updateScheinTreatments,
                        updateReceiptLinks,
                        checkWeakQueue,
                        linkGravidogrammProcess,
                        checkUnlinkOfInvoiceFromReceipt,
                        correctReceiptInvoiceLinkDirection,
                        updateReciprocalLinks,
                        invalidateParentActivities,
                        checkTreatmentsOfSurgery,
                        checkSurgeryOfTreatment,

                        createAssignedContinuousDiagnosisPost,
                        updateDiagnosesOnInvalidationPostWrite,
                        createAssignedContinuousMedicationsPost,

                        //  user does not need to wait for these post-processes, they call back immediately, EXTMOJ-2050
                        triggerRuleEngine,

                        /* Steps moved to callUpdateExternalObjects, for performance reasons can be run after callback
                         *
                         *      updateLocationIdOfAttachments,              //  updates attached documents, can be sync
                         *      removeFromTransferCache,                    //  delete operation, can be sync
                         *      checkGoaeLabAllowance,                      //  looks like it can be sync
                         *      updateSubTypeTags,                          //  updates tags, can be sync
                         *      updateCancelReason,                         //  updates tags, can be sync
                         *      updatePatientMedData,                       //  updates patient, can be sync
                         *      updatePatientEmployees                      //  updates patient employees, can be sync
                         *      updatePatientEmployeeIds                    //  updates patient employees on change to schein
                         *      changeAttachedPatientContent                //  updates patient attachedContent, attachedSeverity, etc
                         *      updateBLCountNoWait                         //  recalculate Bewilligte Leistung
                         *      recalculateCatalogUsage                     //  update catalog usages
                         *      increaseStockItemAfterCancelationDispense   //  update parent activity, record stock dispensed
                         *      updateReporting                             //  trigger reporting (re)generation
                         */
                        callUpdateExternalObjects,
                        sendWarningsToMediport,
                        dropInsuranceWOCardState,
                        checkAndReplaceSide,
                        createAndLinkTarmedTreatments,
                        markBlScheinIfPseudoGnrIsAdded,
                        checkRezidivProphylaxeCodes,
                        cancelMedication,
                        updateMedicationsOnInvalidationPostWrite,
                        unlinkIfCatalogChanged,
                        checkEDocLetterFlatFeeTreatment
                    ], forAction: 'write'
                },
                {
                    run: [
                        checkInvoiceLogs,
                        recalculateCatalogUsageOnDelete,
                        updateBLCount,
                        updateLabTestsOnDelete,
                        updateMedDataTagsOnDelete,
                        removeScheinRelations,
                        removeAttachedContent,
                        syncActivityDeletedWithDispatcher,
                        triggerRuleEngineOnDelete,
                        removeReporting,
                        updateReportingForActivitiesWithScheinContext,
                        handleEdmpActivitiesOnDelete,
                        checkPatientMedData,
                        checkWeakQueue,
                        unclaimAnyClaimedInPacsLog,
                        unclaimAnyClaimedGdtLog,
                        unclaimAnyClaimedGdtExportLog,
                        updatePatientEmployeeIds,
                        updatePatientLabData,
                        clearReciprocalLinks,
                        invalidateParentActivities,
                        updateDiagnosesOnInvalidationPostDelete,
                        removeFromTransferCache,         //  can be sync
                        decreasenoOfRepetitions,
                        updateSyncFolder,
                        cleanBlScheinPseudoGnrMarks,
                        resetKimFlatFeeTreatmentRef
                    ], forAction: 'delete'
                }

            ],

            //            post: [
            //                {run: deleteAttachments, forAction: 'delete'}
            //            ],

            deleteAttachments: deleteAttachments,   // hack until MOJ-805 done.
            updateEditor: updateEditor,
            setEmployeeName: setEmployeeName,

            audit: {
                // audit: {}  switches on auditing.  for no auditing, do not include the "audit" parameter

                /**
                 * optional:  true = in addition to regular auditing note down actions
                 * on this model that were attempted as well as ones that failed.
                 * Descr. in this case will always be "Versuch".
                 *
                 * false = note down only things that actually took place,
                 * not attempts that failed
                 */
                noteAttempt: false,

                /**
                 * optional: here we can override what is shown in the audit log description
                 * only used when the action succeeds (see noteAttempt)
                 *
                 * @param   {Object}    data
                 * @returns {*|string|string}
                 */
                descrFn: function( data ) {
                    function getFieldFromContent( content, field ) {
                        const searchField = `\n${field}: `,
                            statusIndex = content.indexOf( searchField ),
                            secondHalf = content.substring( statusIndex + searchField.length, content.length );

                        return secondHalf.substring( 0, secondHalf.indexOf( ';' ) );
                    }

                    var
                        content,
                        patientFullName,
                        res = '';
                    if( data.actType ) {
                        res = Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', data.actType, '-de', '' );
                    }
                    if( data.code ) {
                        res += (res ? `,  ${data.code}` : data.code);
                    }
                    if( data.patientName ) {
                        res = (res ? `${data.patientName},  ` : data.patientName) + res;
                    } else if( data.patientLastName || data.patientFirstName ) {
                        patientFullName = Y.doccirrus.schemas.person.personDisplay( {
                            firstname: data.patientFirstName,
                            lastname: data.patientLastName
                        } );
                        res = (res ? `${patientFullName},  ` : `${patientFullName} `) + res;
                    }
                    if( data.subType === 'Mediport' ) {
                        const INVOICE_NO_i18n = i18n( 'InvoiceMojit.cashbookJS.title.INVOICENO' ),
                            status = getFieldFromContent( data.userContent, 'Status' ),
                            invoiceNo = getFieldFromContent( data.userContent, INVOICE_NO_i18n );

                        res = `Mediport (${status}); ${INVOICE_NO_i18n}: ${invoiceNo}`;
                        return res;
                    }

                    content = data.content || ' kein Inhalt';  // already generated in pre-process
                    return res + (res ? `,  ${content}` : content) || 'Eintrag ohne Titel';
                }
            },

            //  called individually by FSM when doing mongoose update re: MOJ-5570

            standalone: {
                triggerRuleEngine,
                triggerRuleEngineOnDelete,
                callUpdateExternalObjects
            },

            setCollectionCache,
            getCollectionCache,

            processQuery: Y.doccirrus.filtering.models.activity.processQuery,
            processAggregation: Y.doccirrus.filtering.models.activity.processAggregation,

            name: NAME
        };

    },
    '0.0.1',
    {
        requires: [
            'activity-schema',
            'incaseconfiguration-schema',
            'dccommunication',
            'dcinvoiceutils',
            'catalog-schema',
            'dcutils',
            'dccommonutils',
            'dccommonutils-ch',
            'dcdatafilter',
            'person-schema',
            'casefolder-schema',
            'rule-api',
            'kbv-api',
            'invoiceprocess-api',
            'dcmedia-store',
            'dispatch-api',
            'syncReportingManager',
            'edmp-api',
            'dclicmgr',
            'dckbvutils',
            'upcomingedmpdoc-api',
            'receipt-api',
            'tag-schema',
            'v_meddata-schema',
            'dccommonerrors',
            'linkedactivities-api',
            'dcregexp',
            'i18n-factory',
            'warning-api',
            'edocletter-api'
        ]
    }
);
