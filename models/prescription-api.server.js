/*global YUI */

YUI.add( 'prescription-api', function( Y, NAME ) {

        'use strict';

        const
            moment = require( 'moment' ),
            async = require( 'async' ),
            i18n = Y.doccirrus.i18n,
            {formatPromiseResult, promisifyArgsCallback, handleResult} = require( 'dc-core' ).utils,
            util = require( 'util' );

        /**
         * Creates medications and prescriptions according a prescriptionGroups.
         *
         * @method prescribeMedications
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         *
         * @param {Object} args.data.prescriptionGroups
         *  has following structure:
         *  'prescriptionGroups': {
         *          'PUBPRESCR': {
         *              '1': [ med1, med2 ]
         *          },
         *          'PRIVPRESCR': {
         *              '2': [ med3 ]
         *          },
         *          'PRESCRBTM': {},
         *          'PRESCRG': {},
         *          'PRESCRT': {},
         *          'PRESASSISTIVE': {}
         *      },
         *
         * @param {Object} args.data.locationId
         * @param {Object} args.data.employeeId
         * @param {Object} args.data.patientId
         * @param {Object} args.data.caseFolderId
         * @param {Object} args.data.timestamp
         *
         * @param {Boolean} args.data.print             If true then new prescriptions willbe printed
         * @param {String}  args.data.printerName       Printer to use
         * @param {Number}  args.data.numCopies         Number of copies to make ('COPY' mask over pages)
         *
         * @param {Boolean} args.noTriggerSlowPostProcesses     Performance related
         *
         * @param {Function} args.callback
         */
        async function prescribeMedications( args ) {
            Y.log('Entering Y.doccirrus.api.prescription.prescribeMedications', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.prescription.prescribeMedications');
            }
            const
                { user, data: { prescriptionGroups, locationId, employeeId, patientId, caseFolderId, caseFolderType, timestamp, prescriptionData = {}, print, taskData, showDialog, printActivities, quickPrintPrescription } = {}, callback, _callback } = args,
                prescriptions = {},
                createdMedications = [],
                contextsToComplete = [],
                now = moment(),
                startDate = moment( timestamp ).hours( now.hours() ).minutes( now.minutes() ).subtract( 3, 's' ),
                rCache = Y.doccirrus.insight2.reportingCache.createReportingCache(),
                isSwissCaseFolder = ( 'CH' === Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP[caseFolderType || 'ANY'] ),
                initializeFormForActivityP = util.promisify( Y.doccirrus.forms.mappinghelper.initializeFormForActivity ),
                doTransitionP = promisifyArgsCallback( Y.doccirrus.api.activity.doTransition );


            let
                mmiOffline = false,
                medicationQuery = {},
                err, formId = "",
                isPrintOptionCheckedForAnyPrescription = false,
                isPrintWithoutApproveForbidden = false,
                {waitCallback} = args;
                waitCallback = waitCallback || ( args.originalParams && args.originalParams.waitCallback );

            // TODO: timing code to be removed once performance testing on customer systems is complete, mid 2019
            let timing = [], randId = Y.doccirrus.comctl.getRandId();
            Y.dcforms.addTimingPoint( timing, randId + ' (start doTransitionPlus)' );

            //  instructs forms / AttachmentsModel to defer these post-process when updating activity
            rCache._skipTriggerRules = true;
            rCache._skipTriggerSecondary = true;

            if( !prescriptionGroups ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'bad data' } ) );
            }

            if ( isSwissCaseFolder  && caseFolderType ) {
                [err, formId] = await formatPromiseResult(
                    Y.doccirrus.formsconfig.getFormIdForActivityType( {
                        user,
                        data: {
                            actType: "MEDICATION",
                            caseFolderType
                        }
                    } )
                );

                if( err ) {
                    Y.log( 'prescribeMedications: Failed to get formId for medications', 'warn', NAME );
                    formId = "";
                }
            }

            function setCommonFields( obj ) {
                obj.employeeId = employeeId;
                obj.locationId = locationId;
                obj.patientId = patientId;
                obj.caseFolderId = caseFolderId;
                obj.status = 'CREATED';
                return obj;
            }

            function setMedicationFields( medication ) {
                medication.timestamp = startDate.add( 2, 'ms' ).toISOString();

                if( isSwissCaseFolder ) {
                    medication.formId = formId;
                }

                //  checkbox value for continuous medication / Dauermedikamente
                medication.phContinuousMed = medication.phContinuousMed || medication.phContinuousMedDate ? true : false;

                setCommonFields( medication );
            }

            function setPrescriptionsFields( params ) {
                const
                    { medicationIds, prescription } = params;
                prescription.activities = medicationIds.reverse();
                prescription.timestamp = startDate.add( 2, 'ms' ).toISOString();
                delete prescription.medications;
                setCommonFields( prescription );

            }

            function createMedication( medication, callback ) {
                setMedicationFields( medication );
                async.waterfall( [
                    function( done ) {
                        if( medication.phPZN && !mmiOffline && Y.doccirrus.commonutils.doesCountryModeIncludeGermany()) {
                            Y.doccirrus.api.activity.getActualMedicationData( {
                                user,
                                data: medication,
                                query: medicationQuery,
                                callback( err, result ) {
                                    if( result ) {
                                        medicationQuery = {
                                            patientAge: result.patientAge,
                                            commercialNo: result.commercialNo,
                                            officialNo: result.officialNo,
                                            iknr: result.iknr
                                        };
                                        if( result.medicationData ) {
                                            Object.keys( result.medicationData ).forEach( key => {
                                                if( undefined !== medication[ key ] ) {
                                                    medication[ key ] = result.medicationData[ key ];
                                                }
                                            } );
                                        }
                                    }
                                    if( err ) {
                                        mmiOffline = 9001 === err.code;
                                        Y.log( `saveMedicationPlan. Could not check medication data. Error: ${JSON.stringify( err )}`, 'warn', NAME );
                                    }
                                    done();
                                }
                            } );
                        } else {
                            setImmediate( done );
                        }
                    },
                    async function( done ) {
                        let newContext = {
                            forceScheinCheck: true,
                            _skipTriggerRules: true,
                            _skipTriggerSecondary: true
                        };

                        let [err, result] = await  formatPromiseResult( doTransitionP( {
                                data: {
                                    activity: Object.assign( {}, medication ),
                                    transition: 'validate',
                                    _isTest: 'false'
                                },
                                user,
                                options: {
                                    activityContext: newContext
                                }
                            } )
                        );

                        let
                            data, actId;
                        if( err ) {
                            return done( err );
                        }
                        data = result[ 0 ] && result[ 0 ].data;
                        actId = data && data._id.toString();
                        createdMedications.push( Object.assign( { _id: actId }, medication ) );

                        //  record the activity context from the transition, complete rules and secondary processes
                        //  after print
                        newContext.activity = data;
                        contextsToComplete.push( newContext );

                        //  keep it in reporting cache for reuse when initializing forms
                        rCache.store( 'activity', data._id.toString(), data );

                        if( formId && isSwissCaseFolder ) {
                            [err] = await formatPromiseResult( initializeFormForActivityP( user, actId, {}, null ) );

                            if( err ) {
                                Y.log( `handleMedications: Failed to initialize form fro activity ${actId}`, 'error', NAME );
                            }
                        }

                        done( null, {
                            _id: actId,
                            mapKey: (medication.phNLabel || medication.userContent),
                            exactMedication: medication.exactMedication
                        } );
                    }
                ], callback );
                
            }

            function createTask( prescriptions, callback ) {
                taskData.activities = prescriptions.map( item => {
                    return {
                        actType: item.activity.actType,
                        _id: item.activity._id.toString()
                    };
                } );
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'task',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( taskData )
                }, err => callback( err ) );

            }

            function createPrescription( index, callback ) {
                const
                    prescription = prescriptions[ index ];

                let newContext = {
                    forceScheinCheck: true,
                    _skipTriggerRules: true,
                    _skipTriggerSecondary: true
                };

                async.waterfall( [
                    function( next ) {
                        async.mapSeries( prescription.medications.reverse(), createMedication, next );
                    },
                    function( medications = [], next ) {
                        const mapToActivity = [
                            'nightTime',
                            'otherInsurance',
                            'utUnfall',
                            'workAccident',
                            'isPatientBVG',
                            'assistive',
                            'vaccination',
                            'practiceAssistive',
                            'dentist',
                            'employeeSpecialities',
                            'fk4202',
                            'correctUsage',
                            'patientInformed',
                            'inLabel',
                            'offLabel',
                            'substitutePrescription'
                        ];
                        setPrescriptionsFields( { prescription, medicationIds: medications.map( item => item._id ) } );

                        const mapKeys = {};
                        // filter duplicated medications which will be shown in form like (2x ...)
                        medications.filter( function( medication ) {
                            const mapKey = medication.mapKey;
                            if( mapKeys[mapKey] ) {
                                return false;
                            }
                            mapKeys[mapKey] = true;
                            return true;
                        } ).forEach( function( medication, index ) {
                            prescription[`exactMed${index + 1}`] = medication.exactMedication;
                        } );
                        mapToActivity.forEach( path => {
                            prescription[path] = Boolean( prescriptionData[prescription.actType] && prescriptionData[prescription.actType][path] );
                        } );

                        Y.doccirrus.api.activity.doTransition( {
                            data: {
                                activity: Object.assign( {}, prescription ),
                                transition: 'validate',
                                _isTest: 'false'
                            },
                            user,
                            options: {
                                activityContext: newContext
                            },
                            callback( err, result ) {
                                let
                                    data;
                                if( err ) {
                                    return next( err );
                                }
                                data = result[ 0 ] && result[ 0 ].data || {};

                                newContext.activity = data;
                                contextsToComplete.push( newContext );

                                //  keep for reuse when making forms
                                rCache.store( 'activity', data && data._id.toString(), data );

                                next( null, { prescriptionId: data && data._id.toString(), medications } );
                            }
                        } );
                    },
                    function( result, next ) {
                        const
                            prescriptionId = result.prescriptionId,
                            mapData = Object.assign( prescription.extraData, prescriptionData[ prescription.actType ] || {} );

                        prescription.printed = false;

                        Y.doccirrus.forms.mappinghelper.initializeFormForActivity(
                            user,
                            prescriptionId,
                            mapData,
                            rCache,
                            onFormCreated
                        );

                        function onFormCreated( err, act ) {
                            if ( err ) {
                                return next( err );
                            }
                            next( null, act );
                        }
                    },

                    //  if there is a custom userContent set for this activity type then we will need to set it and
                    //  revalidate the activity after mapping the form
                    function( activity, next ) {
                        Y.doccirrus.api.activitysettings.loadActivitySettings( {
                            'user': user,
                            'callback': onActivitySettingsLoaded
                        } );

                        function onActivitySettingsLoaded( err, actConfig ) {
                            //  on error continue as usual, custom userContent is optional
                            if( err ) {
                                return next( null, activity );
                            }

                            let
                                actSettings = actConfig.settings || [],
                                i,
                                prescriptionActivitySettings = actSettings.filter( function( setting ) {
                                    return Y.doccirrus.schemas.activity.PRESCRIPTION_ACT_TYPES.includes( setting.actType );
                                } ) || [];

                            isPrintOptionCheckedForAnyPrescription = prescriptionActivitySettings.some( setting => setting.quickPrintPrescription );
                            isPrintWithoutApproveForbidden = (actSettings.find( settings => settings.actType === activity.actType ) || {}).quickPrintInvoice;

                            for( i = 0; i < actSettings.length; i++ ) {
                                if(
                                    (actSettings[ i ].actType === prescription.actType) &&
                                    actSettings[ i ].userContent &&
                                    ('' !== actSettings[ i ].userContent)
                                ) {
                                    activity.userContent = actSettings[ i ].userContent;
                                }
                            }

                            //update user content anyway after updating form data
                            activity.status = 'CREATED';
                            Y.doccirrus.api.activity.doTransition( {
                                data: {
                                    activity: activity,
                                    transition: 'validate',
                                    _isTest: 'false'
                                },
                                user,
                                options: {
                                    activityContext: newContext
                                },
                                callback( err, result ) {
                                    let
                                        data;
                                    if( err ) {
                                        return next( err );
                                    }

                                    data = result[ 0 ] && result[ 0 ].data || {};

                                    newContext.activity = data;
                                    next( null, data );
                                }
                            } );
                        }

                    },
                    async function( activity, next ) {
                        // approve prescription
                        if( !quickPrintPrescription || !isPrintOptionCheckedForAnyPrescription ) {
                            // skip this step
                            return next( null, activity );
                        }

                        activity.status = 'VALID';
                        let [err, result] = await formatPromiseResult(
                            doTransitionP( {
                                data: {
                                    activity: activity,
                                    transition: 'approve',
                                    _isTest: 'false'
                                },
                                user,
                                options: {
                                    activityContext: newContext
                                }
                            } )
                        );

                        let
                            data;
                        if( err ) {
                            Y.log( `createPrescription. Error when approve prescription ${prescription._id}: ${err.stack || err}`, 'warn', NAME );
                            if( isPrintWithoutApproveForbidden ) {
                                return next( new Y.doccirrus.commonerrors.DCError( 50003 ) );
                            }
                        }

                        data = result[0] && result[0].data || {};

                        newContext.activity = data;
                        next( null, data );
                    },
                    function( activity, next ) {

                        prescription.printed = false;

                        if( !showDialog ) {
                            //  not printing new activities
                            return next( null, activity );
                        }

                        //  print it immediately
                        prepareDataForPrint({
                            user: user,
                            data: {
                                notPrintedActivities: [ activity ]
                            },
                            printActivities: printActivities,
                            callback: onPrintedActivities
                        });

                        function onPrintedActivities( err /*, printResult */ ) {
                            if ( err ) {
                                Y.log( `Could not print prescription activity: ${err.stack||err}`, 'warn', NAME );
                                //  do not block the batch, user can print their prescriptions later
                            } else {
                                prescription.printed = true;
                            }

                            next( null, activity );
                        }
                    },
                    function( activity, next ) {
                        setImmediate( next, null, { printed: prescription.printed, activity: activity, printerName: '' } );
                    }
                ], ( err, data = {} ) => {
                    callback( err, data );
                } );
            }

            Object.keys( prescriptionGroups ).forEach( prescriptionType => {
                Object.keys( prescriptionGroups[ prescriptionType ] ).forEach( group => {
                    const
                        medications = prescriptionGroups[ prescriptionType ][ group ] || [],
                        prescriptionMedications = [];
                    prescriptions[ group ] = {
                        actType: prescriptionType,
                        medications: prescriptionMedications,
                        extraData: medications.reduce( ( obj, item, index ) => {
                            obj[ `exactMed${index + 1}` ] = item.exactMedication;
                            return obj;
                        }, {} )
                    };
                    medications.forEach( medication => {
                        const
                            count = Number( medication.count );
                        if( count ) {
                            for( let i = 1; i <= count; i++ ) {
                                prescriptionMedications.push( Object.assign( {}, medication ) );
                            }
                        } else {
                            prescriptionMedications.push( medication );
                        }
                    } );

                } );
            } );

            // Expand PRESCRT so every medication gets its own prescription.
            let prescT;
            Object.keys( prescriptions ).some( prescriptionKey => {
                const prescription = prescriptions[prescriptionKey];
                if( prescription.actType === 'PRESCRT' ) {
                    prescT = prescription;
                    return true;
                }
            } );
            if( prescT ) {
                const additionalMeds = prescT.medications.splice( 1, prescT.medications.length );
                additionalMeds.forEach( ( additionalMed, idx ) => {
                    const additionalPrescriptionKey = `additionalMd-${idx}`;
                    prescriptions[additionalPrescriptionKey] = JSON.parse( JSON.stringify( prescT ) );
                    prescriptions[additionalPrescriptionKey].medications = [additionalMed];
                } );
            }

            async.waterfall( [
                function( next ) {
                    async.mapSeries( Object.keys( prescriptions ).sort(), createPrescription, next );
                },
                function( results, next ) {
                    if( !print && taskData ) {
                        return createTask( results, ( err ) => next( err, results ) );
                    } else {
                        return setImmediate( next, null, results );
                    }
                }
            ], ( err, results = [] ) => {
                const
                    notPrintedActivities = [],
                    printedActivities = [];
                let
                    response;

                //  trigger deferred slow processes despite error, other activities still need to be completed
                //  (reporting, rules, etc)
                if ( !args.noTriggerSlowPostProcesses ) {
                    triggerSlowPostProcesses( user, contextsToComplete );
                }

                if( err ) {
                    if( waitCallback ) {
                        return callback( err );
                    }

                    let message;
                    if( 18002 === err.code ){
                        message = Y.doccirrus.errorTable.getMessages( {code: 18002} );
                    } else {
                        message =  err.toString();
                    }

                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: user.identityId,
                        event: 'message',
                        msg: {
                            data: message
                        },
                        meta: {
                            level: 'ERROR'
                        }
                    } );
                    if( 'function' === typeof _callback ) {
                        _callback( err );
                    }
                    return;
                }
                results.forEach( item => {
                    if( !item.printed ) {
                        notPrintedActivities.push( item.activity );
                    } else {
                        printedActivities.push( item );
                    }
                } );

                response = {
                    createdMedications: createdMedications,
                    prescriptions: results.map( item => {
                        return item.activity;
                    } ),
                    lastTimestamp: startDate.toISOString(),
                    notPrintedActivities,
                    printedActivities: printedActivities.map( item => ({
                        actType: item.activity.actType,
                        printerName: item.printerName
                    }) )
                };

                if ( args.noTriggerSlowPostProcesses ) {
                    response.contextsToComplete = contextsToComplete;
                }

                if( waitCallback ) {
                    return callback( null, response );
                } else {
                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: user.identityId,
                        event: 'system.UPDATE_ACTIVITIES_TABLES',
                        msg: {
                            data: caseFolderId
                        }
                    } );
                }

                if( 'function' === typeof _callback ) {
                    _callback( null, response );
                }

            } );
            if( !waitCallback ) {
                return callback();
            }
        } // end prescribeMediacations

        /**
         *  Run rules and updates to secondary objects (patient, tags, catalog usages, etc) after printing, because
         *  they can be slow.
         */

        function triggerSlowPostProcesses( user, contextsToComplete ) {
            //  run these in series to avoid hammering the database too hard
            Y.log( `Running deferred post-processes for ${contextsToComplete.length} activities.`, 'info', NAME );
            async.eachSeries( contextsToComplete, completeSingleContext, onContextsComplete );

            function completeSingleContext( activityContext, itcb ) {
                activityContext._skipTriggerRules = false;
                activityContext._skipTriggerSecondary = false;

                Y.doccirrus.schemaprocess.activity.standalone.triggerRuleEngine.call( activityContext, user, activityContext.activity, onTriggerRules );

                function onTriggerRules( err ) {
                    if ( err ) {
                        Y.log( `Problem with rule engine for stored context: ${err.stack||err}`, 'error', NAME );
                        //  continue anyway, best effort
                    }
                    Y.doccirrus.schemaprocess.activity.standalone.callUpdateExternalObjects.call( activityContext, user, activityContext.activity, onUpdateSecondary );
                }

                function onUpdateSecondary( err ) {
                    if ( err ) {
                        Y.log( `Problem with post-processes for stored context: ${err.stack||err}`, 'error', NAME );
                        //  continue anyway, best effort
                    }
                    itcb( null );
                }
            }

            function onContextsComplete( err ) {
                if ( err ) {
                    //  should never happen
                    Y.log( `Problem post-processing activities for new perscription set: ${err.stack||err}`, 'error', NAME );
                }
            }
        }

        /**
         * Creates prescriptions and medication plan according a prescriptionGroups.
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Object} args.data.prescriptionGroups
         * @param {Object} args.data.locationId
         * @param {Object} args.data.employeeId
         * @param {Object} args.data.patientId
         * @param {Object} args.data.caseFolderId
         * @param {Object} args.data.timestamp
         * @param {Object} args.callback
         * @see Y.doccirrus.api.prescription.prescribeMedications
         * @see Y.doccirrus.api.activity.createMedicationPlanForMedications
         */
        function createPrescriptionsAndMedicationPlan( args ) {
            Y.log('Entering Y.doccirrus.api.prescription.createPrescriptionsAndMedicationPlan', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.prescription.createPrescriptionsAndMedicationPlan');
            }
            const
                {user, data: {prescriptionGroups, locationId, employeeId, patientId, caseFolderId, caseFolderType, timestamp, prescriptionData, kbvMedicationPlan, print, taskData, printerName, numCopies, showDialog, printActivities, isSwissAndSwissCaseFolder, swissMedPlanTemplate, quickPrintPrescription} = {}, callback, _callback} = args;

            let contextsToComplete,
                waitCallback = args.waitCallback || ( args.originalParams && args.originalParams.waitCallback );
            if( !prescriptionGroups ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'bad data' } ) );
            }

            function createTask( data, callback ) {
                if( data.medicationPlan ) {
                    taskData.activities = data.prescriptions.concat( data.medicationPlan );
                } else if( data.kbvMedicationPlan ) {
                    taskData.activities = data.prescriptions.concat( data.kbvMedicationPlan );
                } else {
                    taskData.activities = data.prescriptions;
                }
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'task',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( taskData )
                }, err => callback( err ) );

            }

            async.waterfall( [
                function( next ) {
                    Y.doccirrus.api.prescription.prescribeMedications( {
                        user,
                        data: {
                            prescriptionGroups,
                            locationId,
                            employeeId,
                            patientId,
                            caseFolderId,
                            caseFolderType,
                            timestamp,
                            prescriptionData,
                            print,
                            printerName,
                            numCopies,
                            quickPrintPrescription
                        },
                        noTriggerSlowPostProcesses: true,
                        waitCallback: true,
                        callback: next
                    } );
                },
                function( data, next ) {
                    const
                        lastMedicationTimestamp = data.lastTimestamp;

                    contextsToComplete = data.contextsToComplete;

                    if( isSwissAndSwissCaseFolder ) {
                        Y.doccirrus.api.activity.createMedicationPlanForMedications( {
                            user,
                            data: {
                                // TODO: MP create medication only once?
                                medications: data.createdMedications.sort( ( itemA, itemB ) => {
                                    if( itemA.medicationPlanOrder === itemB.medicationPlanOrder ) {
                                        return moment( itemA.timestamp ).isAfter( moment( itemA.timestamp ) ) ? -1 : 1;
                                    }
                                    return itemA.medicationPlanOrder > itemB.medicationPlanOrder ? 1 : -1;
                                } ),
                                employeeId,
                                locationId,
                                caseFolderId,
                                caseFolderType,
                                patientId,
                                timestamp: moment( lastMedicationTimestamp ).add( 3, 'ms' ).toISOString(),
                                print,
                                printerName,
                                swissMedPlanTemplate: swissMedPlanTemplate,
                                printActivities: [],
                                showDialog,
                                quickPrintPrescription
                            },
                            waitForPdf: swissMedPlanTemplate ? false : true,               //  wait for MMI to create PDF before calling back
                            medicationPlanOnly: true,       //  do no create medication activities
                            waitCallback: true,             //  do not call back immediately
                            callback( err, result ) {

                                const
                                    notPrintedActivities = (data.notPrintedActivities || []).concat( result && result.notPrintedActivities || [] ),
                                    printedActivities = (data.printedActivities || []).concat( result && result.printedActivities || [] );

                                // pass along any requests to print activities to next steps
                                data.printActivities = printActivities || [];

                                // return callback if error MMI has problem with medicationPlan, not print prescriptions
                                next( err, Object.assign( data, result, {notPrintedActivities, printedActivities} ) );
                            }
                        } );
                    } else {
                        Y.doccirrus.api.activity.createKbvMedicationPlanForMedications( {
                            user,
                            data: {
                                createdMedications: data.createdMedications,
                                kbvMedicationPlan,
                                employeeId,
                                locationId,
                                caseFolderId,
                                caseFolderType,
                                patientId,
                                timestamp: moment( lastMedicationTimestamp ).add( 3, 'ms' ).toISOString(),
                                print,
                                printerName,
                                //  this must be an empty array or medicationsplan will be printed twice
                                printActivities: [],
                                showDialog,
                                quickPrintPrescription
                            },
                            waitForPdf: true,               //  wait for MMI to create PDF before calling back
                            medicationPlanOnly: true,       //  do no create medication activities
                            waitCallback: true,             //  do not call back immediately
                            callback( err, result ) {
                                const
                                    notPrintedActivities = (data.notPrintedActivities || []).concat( result && result.notPrintedActivities || [] ),
                                    printedActivities = (data.printedActivities || []).concat( result && result.printedActivities || [] );
                                // return callback if error MMI has problem with medicationPlan, not print prescriptions
                                next( err, Object.assign( data, result, {notPrintedActivities, printedActivities} ) );
                            }
                        } );
                    }
                },
                function( data, next ) {
                    if( !print && taskData ) {
                        return createTask( data, err => next( err, data ) );
                    } else {
                        return setImmediate( next, null, data );
                    }
                }
            ], ( err, result ) => {
                if( waitCallback ) {
                    return callback( err, result );
                }
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    event: 'system.UPDATE_ACTIVITIES_TABLES',
                    msg: {
                        data: caseFolderId
                    }
                } );
                if( showDialog ) {
                    prepareDataForPrint({
                        user,
                        data: result || {},
                        printActivities: printActivities,
                        callback: onPrintComplete
                    });
                } else {
                    onPrintComplete();
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
                }
                if( 'function' === typeof _callback ) {
                    _callback( err, result );
                }

                function onPrintComplete() {
                    if ( contextsToComplete ) {
                        triggerSlowPostProcesses( user, contextsToComplete );
                    }
                }

            } );

            if( !waitCallback ) {
                return callback();
            }
        }

        function prepareDataForPrint( args ) {
            Y.log('Entering Y.doccirrus.api.prescription.prepareDataForPrint', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.prescription.prepareDataForPrint');
            }

            const {user, data: { prescriptions = [], notPrintedActivities = [] }, printActivities } = args;

            let listItems = [];

            function inListItems( item ) {
                let cmp;
                for ( cmp of listItems ) {
                    if ( cmp.activity._id === item._id ) {
                        //  is duplicate
                        return true;
                    }
                }
                return false;
            }

            if( prescriptions ) {
                prescriptions.forEach(function( item ) {
                    printActivities.forEach(function( i ) {
                        if ( ( i.activityType === item.actType ) && !inListItems( item ) ) {
                            listItems.push({
                                location: i.location,
                                copies: i.copies,
                                printerName: i.printerName,
                                activity: item
                            });
                        }
                    });
                });
            }

            if( notPrintedActivities ) {
                notPrintedActivities.forEach(function( item ) {
                    if( item ) {
                        printActivities.forEach(function( i ) {
                            if ( i.activityType === item.actType && !inListItems( item ) ) {
                                listItems.push({
                                    location: i.location,
                                    copies: i.copies,
                                    printerName: i.printerName,
                                    activity: item
                                });
                            }
                        });
                    }
                });
            }

            Y.log( `Printing ${listItems.length} items from VO mask.`, 'info', NAME );

            printPrescriptions({
                user,
                data: listItems,
                waitCallback: true,
                callback: function( err ) {
                    if( err ) {
                        Y.log( 'Problems with printing prescriptions', 'warn', NAME );
                    }
                    if ( args.callback ) {
                        args.callback( err );
                    }
                }
            });
        }

        /**
         *  Print a set of prescriptions and medication plans created from medications selected in the
         *  Verordnen/Prescribe modal
         *
         *  Entries in args.data should contain
         *
         *      printerName             {String}    Should be available to user at one of their locations
         *      copies                  {Number}    # of extra copies to print, ie, with 'KOPIE' mask overlaid
         *      activity                {Object}    Activity to print, should have:
         *
         *      activity._id            {String}    Activity to map into form
         *      activity.formId         {String}    Canonical _id of a form
         *      activity.formVersion    {String}    optional
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.data           Array of activities with print settings
         *  @param  {Boolean]   args.waitCallback   True to wait for callback, defaults to calling back immediately
         *  @param  {Object}    args.callback       Array of printed media _ids
         *  @return {*}
         */

        function printPrescriptions( args ) {
            Y.log('Entering Y.doccirrus.api.prescription.printPrescriptions', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.prescription.printPrescriptions');
            }

            const
                { user, data = [], callback } = args;
            let
                i, j,
                copies,
                dataWithDuplicates = [],
                printResults = [];

            //  multiply print jobs for medication plans if more than one copy requested
            for ( i = 0; i < data.length; i++ ) {
                if ( ['MEDICATIONPLAN', 'KBVMEDICATIONPLAN'].includes( data[i].activity.actType ) ) {
                    copies = data[i].copies + 1;
                    for( j = 0; j < copies; j++ ) {
                        dataWithDuplicates.push( data[i] );
                    }
                } else {
                    dataWithDuplicates.push( data[i] );
                }
            }

            if ( !args.waitCallback ) {
                //  calls back immediately, does not wait on forms/printing in normal use
                callback( null );       //  eslint-disable-line callback-return
            }

            //  execute each print job
            async.eachSeries( dataWithDuplicates, printSingleItem, onAllPrinted );

            function printSingleItem( item, itcb ) {

                if( ['MEDICATIONPLAN', 'KBVMEDICATIONPLAN'].includes( item.activity.actType ) ) {
                    printedMedicationPlan( item, onPrintDone );
                } else {
                    printPrescriptionWithCopies( item, onPrintDone );
                }

                function onPrintDone( err, mediaId, printResult ) {
                    if ( err ) {
                        Y.log( `Problem printing ${item.activity._id} to ${item.printerName}: ${err}`, 'warn', NAME );
                        //  ignore errors, best effort
                    }

                    //  checked by mocha tests, not generally returned to client
                    printResults.push( {
                        'mediaId': mediaId,
                        'result': printResult,
                        'err': err
                    } );

                    itcb( null );
                }
            }

            function printedMedicationPlan( params, itcb ) {
                if ( !params.activity || !params.activity._id ) {
                    return itcb( new Error( 'Missing Medikationsplan activity, cannot print.' ) );
                }

                let mediaId = null;

                if (
                    params.activity.attachedMedia &&
                    params.activity.attachedMedia[0] &&
                    params.activity.attachedMedia[0].mediaId
                ) {
                    mediaId = params.activity.attachedMedia[0].mediaId;
                }

                //  legacy, remove if refactoring
                if ( !mediaId && params.activity.media && params.activity.media._id ) {
                    mediaId = params.activity.media._id;
                }

                if ( !mediaId ) {
                    return itcb( Y.doccirrus.errors.rest( 500, 'missing media._id on medicatonplan' ) );
                }

                Y.doccirrus.api.media.print( {
                    'user': user,
                    'originalParams': {
                        'mediaId': mediaId,
                        'printerName': params.printerName
                    },
                    'callback': onPrintMedicationPlan
                } );

                function onPrintMedicationPlan( err, printResult ) {
                    if ( err ) {
                        Y.log( `Problem printing new medicationplan: ${JSON.stringify( err )}`, 'debug', NAME );
                        return itcb( err );
                    }

                    Y.doccirrus.api.activity.incrementPrintCount({
                        user,
                        originalParams: {
                            activityIds: [params.activity._id]
                        }
                    });

                    //  notify user of medicationplan print EXTMOJ-1758
                    printResult.copies = [];
                    printResult.printerName = params.printerName;
                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: user.identityId,
                        nsp: 'default',
                        event: 'asyncPDFPrinted',
                        msg: {
                            data: printResult
                        }
                    } );

                    Y.log( `Printed MEDICATIONPLAN PDF ${mediaId} to ${params.printerName}`, 'info', NAME );

                    itcb( null, mediaId, printResult );
                }
            }

            function printPrescriptionWithCopies( params, _cb ) {
                const
                    { copies, printerName, activity } = params;

                let pdfMediaId, printResult;

                Y.log( `Printing prescription PDF and copies: ${printerName} ${copies}`, 'info', NAME );

                async.series( [ regeneratePdf, printNewPdf, printCopies ], onAllDone );

                function regeneratePdf( itcb ) {
                    if( activity.formPdf && activity.formPdf !== '' ) {
                        // skip this step since pdf was already created
                        pdfMediaId = activity.formPdf;
                        return itcb( null );
                    }
                    Y.doccirrus.api.formtemplate.makepdf( {
                        user: user,
                        originalParams: {
                            mapObject: activity._id.toString(),
                            mapCollection: 'activity',
                            formId: activity.formId,
                            formVersionId: activity.formVersion
                        },
                        skipTriggerRules: true,
                        skipTriggerSecondary: true,
                        callback: onPdfGenerated
                    } );

                    function onPdfGenerated( err, result ) {
                        if( err ) { return itcb( err ); }
                        pdfMediaId = result.mediaId;
                        Y.log( `Generated new prescription PDF, pdfMediaId: ${pdfMediaId}`, 'info', NAME );
                        itcb( null );
                    }
                }

                function printNewPdf( itcb ) {
                    Y.log( `Printing new prescription PDF ${pdfMediaId} to: ${printerName}`, 'debug', NAME );

                    Y.doccirrus.api.media.print( {
                        'user': user,
                        'originalParams': {
                            'mediaId': pdfMediaId,
                            'printerName': printerName
                        },
                        'callback': onPdfPrinted
                    } );

                    function onPdfPrinted( err, result ) {
                        if ( err ) { return itcb( err ); }
                        printResult = result;
                        printResult.copies = [];
                        printResult.printerName = printerName;
                        Y.doccirrus.communication.emitEventForUser( {
                            targetId: user.identityId,
                            nsp: 'default',
                            event: 'asyncPDFPrinted',
                            msg: {
                                data: printResult
                            }
                        } );

                        Y.doccirrus.api.activity.incrementPrintCount({
                            user,
                            originalParams: {
                                activityIds: [activity._id]
                            }
                        });
                        itcb( null );
                    }
                }

                function printCopies( itcb ) {
                    if ( !copies || 0 === copies ) {
                        Y.log( 'No copies requested on print of prescription, skipping.', 'debug', NAME );
                        return itcb( null );
                    }

                    Y.log( `(re)generating PDF to print copies: ${copies}`, 'info', NAME );

                    Y.doccirrus.api.formtemplate.printpdfcopyws( {
                        'user': user,
                        'originalParams': {
                            'serialRender': 'true',
                            'formId': activity.formId,
                            'formVersionId': activity.formVersion,
                            'mapCollection': 'activity',
                            'mapObject': activity._id.toString(),
                            'saveTo': 'temp',
                            'printTo': printerName,
                            'printCopies': copies,
                            'waitCallback': true
                        },
                        'callback': onCopiesPrinted
                    } );

                    function onCopiesPrinted( err, printMsg ) {
                        if ( err ) { return itcb( err ); }
                        printResult.copies.push( printMsg );
                        Y.doccirrus.api.activity.incrementPrintCount({
                            user,
                            originalParams: {
                                activityIds: [activity._id],
                                numCopies: copies
                            }
                        });
                        itcb( null );
                    }
                }

                function onAllDone( err ) {

                    if ( err ) {
                        Y.log( `Problem printing new prescription with copies: ${JSON.stringify( err )}`, 'warn', NAME );
                    }

                    _cb( err, pdfMediaId, printResult );
                }

            }

            function onAllPrinted( err ) {
                if ( err ) {
                    Y.log( `Problem printing batch of prescriptions/medicationplans: ${err.stack||err}`, 'warn', NAME );
                }

                if ( args.waitCallback ) {
                    //  option used during testing to check result of print operations
                    args.callback( err, printResults );
                }
            }

        }

        async function prescriptionAddendum( args ) {
            const {user, data = {}, callback} = args;
            const {prescriptionId, medications, employeeId, locationId, timestamp, prescriptionData, showDialog, print, printActivities, taskData, quickPrintPrescription} = data;
            const initializeFormForActivity = util.promisify( Y.doccirrus.forms.mappinghelper.initializeFormForActivity );
            const updateActivitySafe = promisifyArgsCallback( Y.doccirrus.api.activity.updateActivitySafe );
            const prepareDataForPrintP = promisifyArgsCallback( prepareDataForPrint );
            const doTransitionP = promisifyArgsCallback( Y.doccirrus.api.activity.doTransition );
            const loadActivitySettingsP = promisifyArgsCallback( Y.doccirrus.api.activitysettings.loadActivitySettings );
            const makepdf = promisifyArgsCallback( Y.doccirrus.api.formtemplate.makepdf );
            const now = moment();
            const startDate = moment( timestamp ).hours( now.hours() ).minutes( now.minutes() ).subtract( 3, 's' );
            const createActivitySafe = ( data ) => {
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
            let validationError;

            let [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                query: {
                    _id: prescriptionId
                }
            } ) );

            if( err ) {
                Y.log( `prescriptionAddendum: error while fetching prescription ${prescriptionId}: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            let prescription = result && result[0];

            if( !prescription ) {
                err = Y.doccirrus.errors.rest( 404, `could not find prescription ${prescriptionId}`, true );
                Y.log( `prescriptionAddendum: ${err.message}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }
            prescription.exactMed1 = false;
            prescription.exactMed2 = false;
            prescription.exactMed3 = false;
            const mapKeys = {};
            // filter duplicated medications which will be shown in form like (2x ...)
            medications.filter( function( medication ) {
                const mapKey = (medication.phNLabel || medication.userContent);
                if( mapKeys[mapKey] ) {
                    return false;
                }
                mapKeys[mapKey] = true;
                return true;
            } ).forEach( function( medication, index ) {
                prescription[`exactMed${index + 1}`] = medication.exactMedication;
            } );

            const alreadyLinkedMedications = medications.filter( medication => Boolean( medication._id ) );
            const alreadyLinkedMedicationIds = alreadyLinkedMedications.map( medication => medication._id.toString() );
            const newMedications = medications.filter( medication => !medication._id );
            const newMedicationIds = [];
            const removedMedicationIds = prescription.activities.filter( prescriptionMedicationId => !alreadyLinkedMedicationIds.includes( prescriptionMedicationId ) );

            for( let alreadyLinkedMedication of alreadyLinkedMedications ) {
                alreadyLinkedMedication.locationId = prescription.locationId;
                alreadyLinkedMedication.employeeId = prescription.employeeId;
                alreadyLinkedMedication.caseFolderId = prescription.caseFolderId;
                alreadyLinkedMedication.patientId = prescription.patientId;
                alreadyLinkedMedication.timestamp = startDate.add( 2, 'ms' ).toISOString();

                let hasValidationError;
                [err, hasValidationError] = await formatPromiseResult( updateActivitySafe( {
                    user,
                    data: {activity: alreadyLinkedMedication},
                    context: {skipInvalidateParentActivities: true}
                } ) );

                if( err ) {
                    Y.log( `prescriptionAddendum: could not save new medication ${err.stack || err}`, 'warn', NAME );
                    return handleResult( err, undefined, callback );
                }
                validationError = validationError || hasValidationError;
            }

            Y.log( `prescriptionAddendum: create new medications ${newMedications} for prescription ${prescriptionId}`, 'debug', NAME );

            for( let newMedication of newMedications ) {
                newMedication.status = 'CREATED';
                newMedication.locationId = prescription.locationId;
                newMedication.employeeId = prescription.employeeId;
                newMedication.caseFolderId = prescription.caseFolderId;
                newMedication.patientId = prescription.patientId;
                newMedication.timestamp = startDate.add( 2, 'ms' ).toISOString();
                newMedication.referencedBy = [prescription._id.toString()];
                newMedication.catalogShort = 'MMI';

                [err, result] = await formatPromiseResult( createActivitySafe( newMedication ) );
                if( err ) {
                    Y.log( `prescriptionAddendum: could not save new medication ${err.stack || err}`, 'warn', NAME );
                    return handleResult( err, undefined, callback );
                }

                if( result ) {
                    newMedicationIds.push( result.toString() );
                }
            }

            let prescriptionUpdate = {
                ...prescription,
                employeeId,
                locationId,
                activities: alreadyLinkedMedicationIds.concat( newMedicationIds ),
                ...prescriptionData
            };

            prescriptionUpdate.timestamp = startDate.add( 2, 'ms' ).toISOString();

            let hasValidationError;
            [err, hasValidationError] = await formatPromiseResult( updateActivitySafe( {
                user,
                data: {activity: prescriptionUpdate},
                context: {skipInvalidateParentActivities: true}
            } ) );

            if( err ) {
                Y.log( `prescriptionAddendum: could not update prescription ${prescriptionId}: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }
            validationError = validationError || hasValidationError;

            // mark the current form contents as expired and needing remap, including linked activities

            [ err ] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                action: 'update',
                model: 'document',
                query: {
                    activityId: prescriptionId,
                    type: "FORM"
                },
                data: { $set: { formData: 'remaplinked' } }
            } ) );

            if( err ) {
                Y.log( `prescriptionAddendum: error while invalidating prescription form for ${prescriptionId}: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            // remap the form

            const rCache = Y.doccirrus.insight2.reportingCache.createReportingCache();
            [err, prescription] = await formatPromiseResult( initializeFormForActivity( user, prescriptionId, prescriptionUpdate, rCache ) );

            if( err ) {
                Y.log( `prescriptionAddendum: error while initializeFormForActivity for prescription ${prescriptionId}: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            // regenerate pdf if already generated

            if( prescription.formPdf ) {
                [err, result] = await formatPromiseResult( makepdf( {
                    user: user,
                    originalParams: {
                        mapObject: prescriptionId,
                        mapCollection: 'activity',
                        formId: prescription.formId,
                        formVersionId: prescription.formVersion
                    },
                    skipTriggerRules: true,
                    skipTriggerSecondary: true
                } ) );
                if( err ) {
                    Y.log( `prescriptionAddendum: error while making pdf for prescription ${prescriptionId}: ${err.stack || err}`, 'warn', NAME );
                }
            }

            if( quickPrintPrescription ) {
                [err] = await formatPromiseResult( doTransitionP( {
                    data: {
                        activity: prescription,
                        transition: 'approve',
                        _isTest: 'false'
                    },
                    user,
                    options: {
                        activityContext: {
                            activity: prescription,
                            forceScheinCheck: true,
                            _skipTriggerRules: true,
                            _skipTriggerSecondary: true
                        }
                    }
                } ) );
                if( err ) {
                    Y.log( `prescriptionAddendum: could not approve prescription: ${err.stack || err}`, 'warn', NAME );

                    // here we have to check activitysetting for prescription to find out if we can
                    // continue with print without successful approving
                    let [errActSettings, activitySettings] = await formatPromiseResult(
                        loadActivitySettingsP( {user} )
                    );
                    if( errActSettings ) {
                        Y.log( `prescriptionAddendum: could not get activity settings: ${err.stack || err}`, 'warn', NAME );
                        // here we will stop the process
                        return handleResult( errActSettings, undefined, callback );
                    }

                    if( activitySettings && activitySettings.settings ) {
                        let currentActivitySettings = (activitySettings.settings || []).find( settings => settings.actType === prescription.actType );
                        if( currentActivitySettings && currentActivitySettings.quickPrintInvoice ) {
                            // stop here since we cannot print non-approved activity
                            return handleResult( new Y.doccirrus.commonerrors.DCError( 50003 ), undefined, callback );
                        }
                    }
                }
            }

            // print prescription if user clicked print button

            if( showDialog ) {
                [err] = await formatPromiseResult( prepareDataForPrintP( {
                    user: user,
                    data: {
                        notPrintedActivities: [prescription]
                    },
                    printActivities: printActivities
                } ) );

                if( err ) {
                    Y.log( `prescriptionAddendum: could not print prescription ${prescriptionId}: ${err.stack || err}`, 'warn', NAME );
                }
            }

            // create task user clicked print task button

            if( !print && taskData ) {
                taskData.activities = [
                    {
                        actType: prescription.actType,
                        _id: prescriptionId
                    }
                ];
                [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'task',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( taskData )
                } ) );

                if( err ) {
                    Y.log( `prescriptionAddendum: could not create task for prescription ${prescriptionId}: ${err.stack || err}`, 'warn', NAME );
                }
            }

            //  do a dummy save to run post-processes (update activity content, etc)

            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                action: 'put',
                query: { _id: prescriptionId },
                fields: [ 'actType' ],
                data: Y.doccirrus.filters.cleanDbObject( { actType: prescription.actType } )
            } ) );

            if( err ) {
                Y.log( `prescriptionAddendum: error while fetching prescription ${prescriptionId}: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            //  notify the browser

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

            // must be the last step otherwise there is a post-process race condition while cleaning up linked activities
            if( removedMedicationIds.length ) {
                Y.log( `prescriptionAddendum: removing medications ${removedMedicationIds} from prescription ${prescriptionId}`, 'debug', NAME );

                [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'delete',
                    query: {
                        _id: {$in: removedMedicationIds}
                    },
                    context: {skipInvalidateParentActivities: true}
                } ) );

                if( err ) {
                    Y.log( `prescriptionAddendum: error while removing medications ${removedMedicationIds} for prescription ${prescriptionId}: ${err.stack || err}`, 'warn', NAME );
                    return handleResult( err, undefined, callback );
                }

                Y.log( `prescriptionAddendum: removed ${result.length} medications from prescription ${prescriptionId}`, 'debug', NAME );
            }

            Y.doccirrus.communication.emitEventForSession( {
                sessionId: user.sessionId,
                event: 'refreshCaseFolder',
                msg: {
                    data: {
                        caseFolderId: prescription.caseFolderId
                    }
                }
            } );

            return handleResult( null, {}, callback );
        }

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        /**
         * @class activity
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).prescription = {

            name: NAME,

            prescribeMedications,
            createPrescriptionsAndMedicationPlan,
            prepareDataForPrint,
            printPrescriptions,
            prescriptionAddendum
        };

    },
    '0.0.1', {
        requires: [
            'dccommonerrors',
            'dcforms-mappinghelper',
            'activity-api',
            'formtemplate-api',
            'media-api'
        ]
    }
);
