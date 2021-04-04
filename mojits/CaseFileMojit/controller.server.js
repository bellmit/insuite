/*jslint anon:true, sloppy:true, nomen:true, latedef:false */

/*global YUI */

YUI.add( 'CaseFileMojit', function( Y, NAME ) {
    

    /*
     * module wide variables and constants
     * @module CaseFileMojit
     */

    var $regexLikeUmlaut = Y.doccirrus.commonutils.$regexLikeUmlaut;

    Y.namespace( 'mojito.controllers' )[NAME] = {

        /*
         ========================  REST ============================
         */

        /**
         * patientDetail delivers a populate patient object
         *
         * populated details are so far:
         * - activities
         *
         * to filter on special details there are the following filter attributes:
         *
         * - patientId (required)
         * - from, to (optional, history will start from the lastet entry
         *
         * @param {Object}  ac
         */
        patientdetail: function( ac ) {
            var
                callback = this._getCallback( ac ),
                query = Y.doccirrus.activityapi.queryBuilder( ac.rest.originalparams );

            Y.doccirrus.activityapi.loadActivities(
                ac.rest.user,
                query,
                callback
            );
        },

        patientdocument: function( ac ) {
            var
                _final = this._getCallback( ac ),
                params = ac.rest.originalparams;

            // if the 'pid' field is set then filter documents to those which can be accessed by this patient
            // (the pid field is set by the PatientPortal proxy)

            Y.log( 'params passed to patientdocument: ' + JSON.stringify( params ), 'debug', NAME );

            Y.doccirrus.api.document.patientDocument({
                user: ac.rest.user,
                query: params,
                options: ac.rest.options,
                callback: _final
            });
        },

        getModelName: function() {
            return 'activity';
        },

        'fullactivity': function( ac ) {
            var
                populateParams,
                params = ac.rest.originalparams,
                callback = this._getCallback( ac );

            populateParams = params && params.objPopulate && params.objPopulate.toLowerCase && params.objPopulate.toLowerCase();
            if( 'true' === populateParams || true === populateParams ) {
                if( ac.rest.options ) {
                    ac.rest.options.objPopulate = true;
                }
                else {
                    ac.rest.options = { objPopulate: true };
                }
            }

            Y.log( 'calling getActivitiesPopulated.' );

            Y.doccirrus.api.activity.getActivitiesPopulated( {
                user: ac.rest.user,
                query: ac.rest.query,
                options: ac.rest.options,
                callback: callback
            } );

        },

        diagnosesForCurrentQuarter: function( ac ) {
            var
                params = ac.rest.originalparams,
                user = ac.rest.user,
                callback = this._getCallback( ac );

            if( !params.patientId ) {
                callback( new Error( 'No PatiendId passed' ) );
                return;
            }

            Y.doccirrus.api.patient.activitiesInCurrentQuarter( user, {
                patientId: params.patientId,
                actType: 'DIAGNOSIS'
            }, callback );
        },

        /**
         * Attempt transition in activity state machine
         *
         * This will either return the new state (and the updated activity!),
         * or error out with a reference to the transition dictionary for
         * an error message.
         *
         * The format for the returned object is:
         *
         * {
         *   state:  TransitionString
         *   data:   ActivityObject
         * }
         * @param ac
         */

        'transition': function( ac ) {
            var
                _final = this._getCallback( ac ),
                params = ac.rest.originalparams,
                activity = params.hasOwnProperty( 'activity' ) ? params.activity : {},
                transition = params.hasOwnProperty( 'transition' ) ? params.transition : null,
                actType = activity.hasOwnProperty( 'actType' ) ? activity.actType : null,
                currState = activity.hasOwnProperty( 'status' ) ? activity.status : null,
                tempId = params.hasOwnProperty( 'tempid' ) ? params.tempid : null,
                fsmOptions = {},
                fsmName;

            Y.log( 'received activity: ' + JSON.stringify( activity, undefined, 2 ), 'info', NAME );
            Y.log( 'received transition: ' + transition, 'info', NAME );

            //  check paramaters

            if( (null === transition) || (null === actType) || (null === currState) ) {
                _final( Y.doccirrus.errors.http( 409, 'Eintragstyp nicht gesetzt' ) );
                return;
            }

            if( !Y.doccirrus.schemas.activity.hasTransition( activity.actType, activity.status, transition ) ) {
                _final( Y.doccirrus.errors.http( 409, 'Statuswechsel nicht verfügbar: ' + transition ) );
                return;
            }

            fsmName = Y.doccirrus.schemas.activity.getFSMName( activity.actType );

            if( !Y.doccirrus.fsm[fsmName].hasOwnProperty( transition ) ) {
                Y.log( 'Unimplemented state transition ' + transition + ' on ' + fsmName, 'error', NAME );
                return _final( Y.doccirrus.errors.http( 409, 'Statuswechsel nicht implementiert' ) );
            }

            params._isTest = 'false' !== params._isTest;
            Y.doccirrus.activityapi.doTransition( ac.rest.user, fsmOptions, activity, transition, params._isTest, onAfterTransition );

            //  After a successful first save we we may need to reassociate attached documents with the new activity
            //  Attachments will previously have been liked to a temporary identifier generated on the client

            function onAfterTransition( err, result ) {

                if( !err && tempId ) {
                    Y.doccirrus.api.document.claimForActivityId(
                        ac.rest.user,
                        tempId,
                        result[0].data._id,
                        function onAfterDocumentsClaimed( err2 ) {
                            _final( err2, result );
                        } );
                } else {
                    return _final( err, result );
                }
            }

        },

        'testExternalData': function( ac ) {
            var
                callback = this._getCallback( ac );

            Y.mojito.controllers.KVConnectMojit.JSON2KBV( ac, callback );
        },

        /**
         * tries to update the given patient
         * result: list of patients (if length is 1 -> patient has been updated)
         *
         * @param {Object}      ac
         * @return {*} callback
         */
        'updateFromCard': function( ac ) {
            var
                _cb = this._getCallback( ac ),
                _cardData = Y.mix( ac.rest.originalparams || {}, {_rest: null, action: null}, true ),
                _query,
                _find = function( callback ) {
                    Y.doccirrus.api.patient.patientsPopulated( ac.rest.user, _query, ac.rest.options, callback );
                };

            if( !Object.keys( _cardData ).some( function( it ) {
                return !!_cardData[it];
            } ) ) {
                return _cb( 'insufficient arguments' );
            }
            if( !_cardData.insuranceStatus || !_cardData.insuranceStatus.length ) {
                return _cb( 'insurance data missing' );
            }
            _query = {
                'insuranceStatus.insuranceId': _cardData.insuranceStatus[0].insuranceId,
                'insuranceStatus.insuranceNo': _cardData.insuranceStatus[0].insuranceNo
            };
            _find( function( err, data ) {
                if( err ) {
                    return _cb( 'unable to ask for patients: ' + err );
                }
                if( !data || !data.length || (data.length > 1) ) {
                    if( !data || !data.length ) {
                        _query = {
                            lastname: $regexLikeUmlaut( _cardData.lastname ),
                            firstname: $regexLikeUmlaut( _cardData.firstname ),
                            kbvDob: _cardData.kbvDob
                        };

                        _find( function( err, data ) {
                            if( err ) {
                                return _cb( 'unable to ask for patients: ' + err );
                            }
                            data = data || [];
                            _cb( null, data );
                        } );
                    } else {
                       return  _cb( null, data );
                    }
                } else {
                   return _cb( null, data );
                }
            } );
        },

        copyactivity: function( ac ) {
            var
                callback = this._getCallback( ac ),
                params = ac.rest.originalparams,
                activityId = params.activityId;

            function returnActivity( err, activity ) {
                if( err ) {
                    Y.log( err, 'error', NAME );
                    Y.doccirrus.utils.reportErrorJSON( ac, 500, 'error in copyactivity: ' + err );
                    return;
                }
                callback( null, {activity: activity} );
            }

            Y.doccirrus.activityapi.copyActivity( ac.rest.user, activityId, { currentDate: false }, returnActivity );
        },

        patienthistory: function( ac ) {
            var meta = {http: {}};
            ac.done( {}, meta );
        }

    };

}, '0.0.1', {requires: [
    'mojito',
    'mojito-http-addon',
    'mojito-assets-addon',
    'mojito-params-addon',
    'mojito-intl-addon',
    'mojito-models-addon',
    'mojito-data-addon',
    'activity-api',
    'dccommonutils',
    'dcvat',
    'settings-api'
]} );
