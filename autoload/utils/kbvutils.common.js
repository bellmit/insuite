/*global YUI, $, ko */
YUI.add( 'dckbvutils', function( Y, NAME ) {
        'use strict';

        var
            myUtils,
            vknrSerialNoToKvMap = {
                '601': '72',
                '602': '02',
                '603': '17',
                '605': '02',
                '606': '02',
                '607': '03'
            },
            i18n = Y.doccirrus.i18n;

        /**
         * Constructor for the module class.
         *
         * @class DCKBVCommonUtils
         * @private
         */
        function DCKBVCommonUtils() {
            // purely static object at the moment, nothing in the instances.
        }

        DCKBVCommonUtils.prototype.init = function() {
            Y.log( 'Initializing kbv common utils ', 'info', NAME );
        };

        /**
         * Returns serial no. of vknr (last 3 digits).
         *
         * @param vknr
         */
        DCKBVCommonUtils.prototype.getVknrSerialNo = function( vknr ) {
            if( 'string' !== typeof vknr && '' !== vknr ) {
                throw Error( 'insufficient arguments' );
            }
            var vknrLen = vknr.length;
            return vknr.substring( vknrLen - 3, vknrLen );
        };
        /**
         * Returns kv determined by vknr serial no.
         * CAUTION: This works only for "Ersatzkassen"
         *
         * @param vknr
         */
        DCKBVCommonUtils.prototype.mapVknrToKv = function( vknr ) {
            return vknrSerialNoToKvMap[this.getVknrSerialNo( vknr )];
        };
        /**
         * (P2-411) don't regionalize KTs with 607 serialNo
         *
         * @param vknr
         * @returns {boolean}
         */
        DCKBVCommonUtils.prototype.checkSerialNo = function( vknr ) {
            var serialNo;
            serialNo = this.getVknrSerialNo( vknr );
            return '607' === serialNo;
        };

        /**
         * Maps DC diagnosisCert to valid KBV values
         * @param val
         * @returns {string}
         */
        DCKBVCommonUtils.prototype.mapDiagnosisCert = function( val ) {
            switch( val ) {
                case 'CONFIRM'     :
                    return 'G';
                case 'TENTATIVE'   :
                    return 'V';
                case 'ASYMPTOMATIC'   :
                    return 'Z';
                case 'EXCLUDE'   :
                    return 'A';
                default:
                    return '';
            }
        };

        DCKBVCommonUtils.prototype.patientPreSaveValidation = function( currentPatient, locations ) {

            var
                valid,
                peek = ko.utils.peekObservable,
                deferred = $.Deferred(),// Y.Promise not before 3.9
                stack = new Y.Parallel(),
                insuranceStatus = currentPatient.insuranceStatus();

            if( currentPatient ) {
                valid = true;
                // validate each insurance
                Y.Array.each( insuranceStatus, function( insurance ) {
                    var insuranceKind = insurance.insuranceKind() || '',
                        locationId = insurance.locationId() || '',
                        locationList = locations || (insurance._locationList && insurance._locationList()) || [],
                        costCarrierBillingSection = insurance.costCarrierBillingSection() || '',
                        costCarrierBillingGroup = insurance.costCarrierBillingGroup() || '',
                        messageId = (peek( insurance._id ) || insurance._cid || insurance.clientId),
                        messageIdT9407 = 'T9407-' + messageId,
                        messageIdPublicHasCommercialNo = 'PublicHasCommercialNo-' + messageId;

                    // validate T9407
                    if( insuranceKind && 'PUBLIC' === insurance.type() ) {
                        Y.doccirrus.jsonrpc.api.kbv.versichertenarten( {
                            patientId: peek( currentPatient._id ) || '',
                            locationId: locationId,
                            costCarrierBillingSection: costCarrierBillingSection,
                            costCarrierBillingGroup: costCarrierBillingGroup
                        } ).done( stack.add( function( response ) {
                            var rejected,
                                data = response.data;
                            if( data[0] && data[0].kvValue ) {
                                data = data[0].kvValue;
                            }
                            if( data.length ) {
                                rejected = Y.Array.some( data, function( item ) {
                                    return insuranceKind === item.key;
                                } );
                                if( rejected ) {
                                    Y.doccirrus.DCSystemMessages.addMessage( {
                                        messageId: messageIdT9407,
                                        content: i18n( 'InCaseMojit.KbvUtils_commonjs.messages.VALUE_NOT_ALLOWED' ),
                                        level: 'WARNING'
                                    } );
                                    valid = false;
                                    // set the field manually invalid
                                    if( insurance.insuranceKind.hasFeedback && insurance.insuranceKind.hasFeedback.length ) {
                                        Y.Array.each( insurance.insuranceKind.hasFeedback, function( element ) {
                                            ko.bindingHandlers.css.update( element, function() {
                                                return {'has-error': true};
                                            } );
                                        } );
                                    }
                                } else {
                                    Y.doccirrus.DCSystemMessages.removeMessage( messageIdT9407 );
                                }
                            }
                        } ) );
                    }

                    // [MOJ-1701] validate that insured public provides for locationId a bsnr
                    if( locationId && 'PUBLIC' === insurance.type() ) {
                        stack.add( function() {
                            if( Y.Array.find( locationList, function( locationListItem ) {
                                    return Boolean( locationId === peek( locationListItem._id ) && ( peek( locationListItem.commercialNo ) || peek( locationListItem.institutionCode )) );
                                } ) ) {
                                Y.doccirrus.DCSystemMessages.removeMessage( messageIdPublicHasCommercialNo );
                            } else {
                                Y.doccirrus.DCSystemMessages.addMessage( {
                                    messageId: messageIdPublicHasCommercialNo,
                                    content: i18n( 'InCaseMojit.KbvUtils_commonjs.messages.GKV' ),
                                    level: 'WARNING'
                                } );
                                valid = false;
                                // set the field manually invalid
                                if( insurance.locationId.hasFeedback && insurance.locationId.hasFeedback.length ) {
                                    Y.Array.each( insurance.locationId.hasFeedback, function( element ) {
                                        ko.bindingHandlers.css.update( element, function() {
                                            return {'has-error': true};
                                        } );
                                    } );
                                }
                            }
                        } )();
                    }
                } );
                // if all request done set deferred fail/success
                stack.done( function() {
                    if( valid ) {
                        deferred.resolve();
                    } else {
                        deferred.reject( {code: -999} );
                    }
                } );
            } else {
                deferred.resolve();
            }

            return deferred;

        };

        DCKBVCommonUtils.prototype.getCostCarrierBillingSectionByPersGroup = function( persGroup ) {
            if( '6' === persGroup ) {
                return '02';
            }
            if( '7' === persGroup || '8' === persGroup ) {
                return '01';
            }
            return '00';
        };

        DCKBVCommonUtils.prototype.isSameQuarter = function( a, b ) {
            var mom = Y.doccirrus.commonutils.getMoment();
            if( !a || !b ) {
                return false;
            }

            return mom( a ).isSame( b, 'quarter' );
        };

        DCKBVCommonUtils.prototype.readNewerCardTypeGenerationBefore = function( lastInsuranceStatus, currentInsuranceStatus ) {
            // check if data is set properly
            if( !lastInsuranceStatus || !currentInsuranceStatus ||
                !lastInsuranceStatus.cardSwipe || !currentInsuranceStatus.cardSwipe ||
                !this.isSameQuarter( lastInsuranceStatus.cardSwipe, currentInsuranceStatus.cardSwipe ) ||
                !lastInsuranceStatus.insuranceGrpId || !currentInsuranceStatus.insuranceGrpId ||
                !lastInsuranceStatus.cdmVersion || !currentInsuranceStatus.cdmVersion ||
                lastInsuranceStatus.insuranceGrpId !== currentInsuranceStatus.insuranceGrpId) {
                return false;
            }

            // if version are equal -> OK
            if( lastInsuranceStatus.cdmVersion === currentInsuranceStatus.cdmVersion ) {
                return false;
            }

            // if version are not equal simply check if current card is not the newest version
            return '5.2.0' !== currentInsuranceStatus.cdmVersion;
        };

        /**
         * Returns true if patient (dob) is 18 or turns 18 in current quarter.
         *
         * @param dob
         */
        DCKBVCommonUtils.prototype.isMax18InCurrentQuarter = function( dob ) {
            var mom = Y.doccirrus.commonutils.getMoment(),
                before18Years = mom().endOf( 'day' ).endOf( 'quarter' ).subtract( 18, 'years' );
            if( !dob ) {
                return false;
            }
            dob = mom( dob );
            if( dob && dob.isValid && dob.isValid() ) {
                return before18Years.unix() < dob.unix();
            }
            return false;
        };

        DCKBVCommonUtils.prototype.mapGender = function ( data ) {

            var _data = "U";

            switch( data ) {
                case 'MALE'     :
                    _data = 'M';
                    break;
                case 'FEMALE'   :
                    _data = 'W';
                    break;
                case 'VARIOUS':
                    _data = 'D';
                case 'UNDEFINED':
                    _data = 'X';
                    break;
            }

            return _data;
        };

        function mapToKVDT( val ) {
            if(!val || val.length > 2){
                return '00';
            }
            if( 2 === val.length){
                return val;
            }

            return '0' + val;
        }

        function mapToDC( val ) {
            if( !val || val.length > 2 ) {
                return '';
            }

            if( 1 === val.length ) {
                return val;
            }

            return val[1];
        }

        DCKBVCommonUtils.prototype.mapPersGroupToKVDT = function( val ) {
            return mapToKVDT( val );
        };

        DCKBVCommonUtils.prototype.mapPersGroupFromKVDT = function( val ) {
            return mapToDC( val );
        };

        DCKBVCommonUtils.prototype.mapDmpToKVDT = function( val ) {
            return mapToKVDT( val );
        };

        DCKBVCommonUtils.prototype.mapDmpFromKVDT = function( val ) {
            return mapToDC( val );
        };

        myUtils = new DCKBVCommonUtils();
        myUtils.init();

        Y.namespace( 'doccirrus' ).kbvcommonutils = myUtils;

    },
    '0.0.1', {requires: ['parallel', 'dccommonutils']}
);
