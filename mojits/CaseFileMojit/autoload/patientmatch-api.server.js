/*global YUI */
/*jslint latedef:false */


YUI.add('patientmatch-api', function (Y, NAME) {
        let
            $regexLikeUmlaut = Y.doccirrus.commonutils.$regexLikeUmlaut;

        Y.namespace( 'doccirrus.api' ).patientmatch = {

            /**
             * tries to update the given patient
             * result: list of patients (if length is 1 -> patient has been updated)
             *
             * @param {Object}          ac
             * @return {Function}        callbak
             */
            'matchPatient': function( ac ) {
                Y.log('Entering Y.doccirrus.api.patientmatch.matchPatient', 'info', NAME);
                if (ac.callback) {
                    ac.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(ac.callback, 'Exiting Y.doccirrus.api.patientmatch.matchPatient');
                }
                var
                    _cb = ac.callback,
                    _cardData = ac.data,
                    _query,
                    _find = function( callback ) {
                        Y.doccirrus.api.patient.patientsPopulated( ac.user, _query, ac.options, callback );
                    },
                    _findByName = function( _cb ){
                        _query = {
                            lastname: $regexLikeUmlaut( _cardData.lastname ),
                            firstname: $regexLikeUmlaut( _cardData.firstname ),
                            kbvDob: _cardData.kbvDob
                        };
                        if( _cardData.pseudonym ){
                            _query.pseudonym = _cardData.pseudonym;
                        }
                        _find( function( err, data ) {
                            if( err ) {
                                return _cb( 'unable to ask for patients: ' + err );
                            }
                            data = data || [];
                            _cb( null, data );
                        } );
                    };


                if( !Object.keys( _cardData ).some( function( it ) {
                        return !!_cardData[it];
                    } ) ) {
                    return _cb( 'insufficient arguments' );
                }

                _query = { $or: [
                    {'mirrorPatientId': _cardData._id},
                    {'additionalMirrorPatientIds': _cardData._id}
                ] };
                _find( function( err, data ) {
                    if( err ) {
                       return _cb( 'unable to ask for patients: ' + err );
                    }
                    if( data && (Array.isArray( data ) && data.length) || (!Array.isArray( data ) && data.count !== 0 ) ){
                        return _cb( null, data );
                    }

                    if( _cardData.insuranceStatus && _cardData.insuranceStatus.length ) {
                        // Both should be present and only them match is considered correct
                        _query = {
                            'insuranceStatus.insuranceId': _cardData.insuranceStatus[0].insuranceId,
                            'insuranceStatus.insuranceNo': _cardData.insuranceStatus[0].insuranceNo || '-1'
                        };
                        _find( function( err, data ) {
                            if( err ) {
                                return _cb( 'unable to ask for patients: ' + err );
                            }

                            if( data && (Array.isArray( data ) && data.length) || (!Array.isArray( data ) && data.count !== 0 ) ){
                                return _cb( null, data );
                            }
                            _findByName( _cb );
                        } );
                    } else {
                        _findByName( _cb );
                    }
                } );

            }

        };
    },
    '0.0.1', {
        requires: [
            'activity-api',
            'dccommonutils',
            'dcvat',
            'settings-api'
        ]
    }
)
;