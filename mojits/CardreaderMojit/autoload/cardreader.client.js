/*jslint anon:true, nomen:true*/
/*global YUI, ko, jQuery, $, moment */
YUI.add( 'cardreader', function( Y, NAME ) {
    'use strict';
    /**
     * @modul cardreader
     */

    /**
     * @property cardreader
     * @for doccirrus
     * @type {doccirrus.cardreader}
     */
    /**
     * @class doccirrus.cardreader
     */
    Y.namespace( 'doccirrus.cardreader' );

    var
        i18n = Y.doccirrus.i18n,
        EVENT_UPDATED = i18n( 'InCaseMojit.cardreaderJS.messages.EVENT_UPDATED' ),
        PRIVATE_IKNR = '0000000',
        NS = Y.doccirrus.cardreader,
        getObject = Y.doccirrus.utils.getObject,
        CardReaderError = Y.doccirrus.commonerrors.DCError,
        getInsuranceByType = Y.doccirrus.schemas.patient.getInsuranceByType;

    function deleteCardData( callback ) {
        callback = callback || function() {};
        var
            readr = Y.doccirrus.cardreader.createInstance(),
            _crc = Y.doccirrus.uam.loadhelper.get( 'carddata_crc' ),
            _src = Y.doccirrus.uam.loadhelper.get( 'carddata_src' );

        if( _crc && _src ) {
            Y.doccirrus.uam.loadhelper.remove( 'carddata_crc' );
            Y.doccirrus.uam.loadhelper.remove( 'carddata_src' );
            readr.set( 'dataSource', _src );
            readr.loadData( '?crc=' + _crc, function( err ) {
                if( err ) {
                    Y.log( 'while finishing up ct transaction: ' + err, 'error', NAME );
                    return callback( err );
                } else {
                    return callback();
                }
            } );
        } else {
            return callback();
        }
    }

    function confirmCardDataDeletion( callback ) {
        callback = callback || function() {};
        var
            _crc = Y.doccirrus.uam.loadhelper.get( 'carddata_crc' ),
            _src = Y.doccirrus.uam.loadhelper.get( 'carddata_src' );

        if( !_crc || !_src ) {
            callback();
            return;
        }

        Y.doccirrus.DCWindow.confirm( {
            message: i18n( 'InCaseMojit.cardreaderJS.messages.CONFIRM_CARD_DATA_DELETION' ),
            callback: function( result ) {
                if( true === result.success ) {
                    deleteCardData();
                }
            }
        } );
    }

    function publicInsurance( patient ) {
        return Y.doccirrus.schemas.patient.getInsuranceByType( patient, 'PUBLIC' );
    }

    function getKbvDob( str ) {
        var
            parsed = /(\d\d\d\d)(\d\d)(\d\d)/.exec( str );

        if( null === parsed || 4 > parsed.length ) {
            return '';
        }
        return parsed[3] + '.' +
               parsed[2] + '.' +
               parsed[1];
    }

    function mapGenderUI( val, isKVK ) {
        if( isKVK ) {
            return null;
        }
        // relates to the EGKMappingService class in Card Reader
        switch( val ) {
            case '1':
                return 'MALE';
            case '2':
                return 'FEMALE';
            case '-1':
                return 'UNKNOWN';
            case 'M':
                return 'MALE';
            case 'F':
                return 'FEMALE';
            case 'W':
                return 'FEMALE';
            case 'X':
                return 'UNDEFINED';
            default:
                return 'UNKNOWN';
        }
    }

    function mapTalkUI( val ) {
        return (2 === +val || 'F' === val || 'W' === val) ? 'MS' : 'MR';
    }

    function correctShortNum( iknr ) {
        if( iknr && 7 === iknr.length && PRIVATE_IKNR !== iknr ) {
            return '10' + iknr;
        }
        return iknr;
    }

    function isPrivate( iknr ) {
        return PRIVATE_IKNR === iknr;
    }

    function mapStatusUpdate( statusUpdate, isKVK ) {
        var result = {},
            dmpMap = {
                'M': '1',
                'A': '2',
                'K': '3',
                'E': '4',
                'D': '5',
                'S': '6',
                'X': '1',
                'C': '2',
                'L': '3',
                'N': '4',
                'F': '5',
                'P': '6'
            };
        if( !isKVK ) {
            return result;
        } else if( -1 !== ['4', '6', '7', '8'].indexOf( statusUpdate ) ) {
            result.persGroup = statusUpdate;
        } else if( statusUpdate in dmpMap ) {
            result.dmp = dmpMap[statusUpdate];
        }
        return result;
    }

    /**
     * Cuts string to specified length.
     * @param {String} str
     * @param {Number} len
     * @returns {String}
     */
    function cutToLength( str, len ) {
        if( 'string' === typeof str ) {
            return str.substr( 0, len );
        }
        return '';
    }

    /**
     * Helper to build addresses Array from loaded card data
     * @param {Object} parameters
     * @param {Object} parameters.mapped
     * @param {Object} parameters.original
     * @return {Array} Array of address objects
     */
    function buildAddressesFromCardData( parameters ) {
        var
            mapped = parameters.mapped,
            original = parameters.original,
            isKVK = parameters.isKVK,
            lastIndexOfSpace,
            streetAndStreetNo,
            addresses = [],
            STREET_MAX_LENGTH = 46,
            HOUSENO_MAX_LENGTH = 9,
            ZIP_MAX_LENGTH = 10,
            CITY_MAX_LENGTH = 40,
            COUNTRYCODE_MAX_LENGTH = 3,
            ADDON_MAX_LENGTH = 40,
            POSTBOX_MAX_LENGTH = 8,
            OFFICIAL,
            POSTBOX;

        if( isKVK && mapped.insured.street ) {
            lastIndexOfSpace = mapped.insured.street.lastIndexOf( ' ' );
            if( -1 !== lastIndexOfSpace ) {
                streetAndStreetNo = mapped.insured.street;
                mapped.insured.street = streetAndStreetNo.substr( 0, lastIndexOfSpace );
                mapped.insured.streetNo = streetAndStreetNo.substr( lastIndexOfSpace + 1 );
            }
        }

        OFFICIAL = {
            kind: 'OFFICIAL',
            // MOJ-2141 postfach rules in 5.1
            street: cutToLength( mapped.insured.street, STREET_MAX_LENGTH ),
            houseno: cutToLength( mapped.insured.streetNo, HOUSENO_MAX_LENGTH ),
            zip: cutToLength( original.insured.zip, ZIP_MAX_LENGTH ),
            city: cutToLength( mapped.insured.location, CITY_MAX_LENGTH ),
            countryCode: cutToLength( mapped.insured.locale, COUNTRYCODE_MAX_LENGTH ),
            addon: cutToLength( original.insured.addressPlus, ADDON_MAX_LENGTH )
        };

        POSTBOX = {
            kind: 'POSTBOX',
            city: cutToLength( mapped.insured.pobLocation, CITY_MAX_LENGTH ),
            countryCode: cutToLength( mapped.insured.pobLocaleT, COUNTRYCODE_MAX_LENGTH ),
            postbox: cutToLength( mapped.insured.postbox, POSTBOX_MAX_LENGTH ),
            zip: cutToLength( mapped.insured.pobZip, ZIP_MAX_LENGTH )
        };

        function hasOfficialCredentials() {
            return Y.Array.some( [
                OFFICIAL.street,
                OFFICIAL.houseno,
                OFFICIAL.zip,
                OFFICIAL.city
            ], function( val ) {
                return Boolean( val );
            } );
        }

        function hasPostboxCredentials() {
            return Y.Array.some( [
                POSTBOX.city,
                POSTBOX.postbox,
                POSTBOX.zip
            ], function( val ) {
                return Boolean( val );
            } );
        }

        // "OFFICIAL" entry
        if( hasOfficialCredentials() ) {
            addresses.push( OFFICIAL );
        }

        // "POSTBOX" entry
        if( hasPostboxCredentials() ) {
            addresses.push( POSTBOX );
        }

        return addresses;
    }

    /**
     * MOJ-9127: PKV family injured members have same insuranceId and insuranceNo, which leads to wrong patient assignment.
     * So check if firstname or dob is different.
     * @param {Object} cardData
     * @param {Object} dbData
     * @returns {Boolean}
     */
    function pkvFamilyInjured( cardData, dbData ) {
        var cardDataInsurance = cardData.insuranceStatus[0],
            type = cardDataInsurance.type,
            dbDataInsurance;

        if( !type || 'PRIVATE' !== type || !dbData.insuranceStatus || !dbData.insuranceStatus.length ) {
            return false;
        }

        dbData.insuranceStatus.some( function( insurance ) {
            if( insurance.type === type ) {
                dbDataInsurance = insurance;
                return true;
            }
        } );

        if( !dbDataInsurance ) {
            return false;
        }

        if( !dbDataInsurance || ((cardDataInsurance.insuranceId !== dbDataInsurance.insuranceId && cardDataInsurance.insuranceNo !== dbDataInsurance.insuranceNo) ||
            (cardData.firstname === dbData.firstname || cardData.kbvDob === dbData.kbvDob)) ) {
            return false;
        }

        return true;
    }

    /**
     * Helper which modifies addresses of given arrays for the 'diffPatient' process,
     * to be able to visualize them in a senseful manner, but only for 'OFFICIAL' and 'POSTBOX'.
     * @param {Object} parameters
     * @param {Array} parameters.patientFromCard Addresses of 'patientFromCard'
     * @param {Array} parameters.patient Addresses of 'patient'
     */
    function handleAddressesFromDiff( parameters ) {
        var
            handledAddressKinds = ['OFFICIAL', 'POSTBOX'],
            patientFromCardAddressesRef = parameters.patientFromCard,
            patientFromCardAddresses = patientFromCardAddressesRef.splice( 0 ),
            patientAddressesRef = parameters.patient,
            patientAddresses = patientAddressesRef.splice( 0 );

        // as cardreader only knows about address kind 'OFFICIAL' & 'POSTBOX' there is no need for other kinds
        patientAddresses = Y.Array.filter( patientAddresses, function( address ) {
            return handledAddressKinds.indexOf( address.kind ) > -1;
        } );
        // sort entries and provide 'undefined' entries for not given data
        Y.each( handledAddressKinds, function( addressKind, addressIndex ) {
            var patientFromCardAddress = Y.Array.find( patientFromCardAddresses, function( address ) {
                return address.kind === addressKind;
            } ), patientAddress = Y.Array.find( patientAddresses, function( address ) {
                return address.kind === addressKind;
            } );
            if( patientFromCardAddress ) {
                patientFromCardAddressesRef[addressIndex] = patientFromCardAddress;
            } else {
                patientFromCardAddressesRef[addressIndex] = undefined;
            }
            if( patientAddress ) {
                patientAddressesRef[addressIndex] = patientAddress;
            } else {
                patientAddressesRef[addressIndex] = undefined;
            }
        } );
    }

    /**
     *
     * @param {Object} parameters
     * @param {Array} parameters.patientFromCard Addresses of 'patientFromCard'
     * @param {Array} parameters.patient Addresses of 'patient'
     * @return {Array} The merged addresses
     */
    function handleAddressesFromUpdate( parameters ) {
        var addressesMerged = [],
            handledAddressKinds = ['OFFICIAL', 'POSTBOX'],
            patientFromCardAddressesRef = Y.clone( parameters.patientFromCard, true ),
            patientAddressesRef = Y.clone( parameters.patient, true );

        // remove OFFICIAL and POSTBOX as they will be used from card
        patientAddressesRef = Y.Array.filter( patientAddressesRef, function( address ) {
            return handledAddressKinds.indexOf( address.kind ) === -1;
        } );
        // merge in addresses from card
        Y.each( handledAddressKinds, function( addressKind ) {
            var patientFromCardAddress = Y.Array.find( patientFromCardAddressesRef, function( address ) {
                return address.kind === addressKind;
            } );
            if( patientFromCardAddress ) {
                addressesMerged.push( patientFromCardAddress );
            }
        } );
        // push remaining patient addresses
        addressesMerged.push.apply( addressesMerged, patientAddressesRef );
        // done
        return addressesMerged;
    }

    /**
     * adds the corresponding 'country'-property for the supplied 'countryCode'-property
     * @param {Object} parameters Config
     * @param {Object} parameters.patient A Patient object with 'addresses'-property
     */
    function resolveAddressesCountry( parameters ) {
        var
            stack = new Y.Parallel(),
            sign,
            addresses = parameters.patient.addresses,
            callback = parameters.callback;

        Y.each( addresses, function( address ) {
            if( address.countryCode ) {
                sign = address.countryCode;
                jQuery.ajax( {
                    type: 'GET', dataType: 'json',
                    xhrFields: {withCredentials: true},
                    url: Y.doccirrus.infras.getPrivateURL( '/r/countries/' ),
                    data: {action: 'countries', sign: sign}
                } ).always( stack.add( function( data ) {
                    var result;
                    if( Y.Lang.isArray( data ) && data[0] ) {
                        result = data[0];
                        address.country = result.country;
                    }
                } ) );
            }
        } );

        stack.done( callback );
    }

    function fillPatientViewModel( data, options, callback, prevPatients ) {
        var
            NAME_MAX_LENGTH = 45,
            NAME_EXT_MAX_LENGTH = 20,
            INSURANCE_NAME_MAX_LENGTH = 45,
            errors = new Y.doccirrus.commonerrors.DCErrors(),
            iknr,
            insuranceName,
            isTestInsuranceCard = false,
            ends = null,
            starts = null,
            cardError,
            kbvDate,
            data_ori,
            alertType,
            defText,
            result = [],
            reqSrc = data && data.meta && data.meta.req,
            original, mapped, ctlg, ret, err;

        function checkExistence( result ) {
            // possibly open cardread transaction
            if( result[0].terminal === 'mobile' ) {
                Y.doccirrus.uam.loadhelper.set( 'carddata_crc', mapped.crc );
                Y.doccirrus.uam.loadhelper.set( 'carddata_src', reqSrc );
            }

            $.ajax( {
                type: 'POST',
                url: Y.doccirrus.infras.getPrivateURL( '/r/updateFromCard' ),
                xhrFields: {withCredentials: true},
                data: Y.mix( result[0], {action: 'updateFromCard'}, true ),
                error: function( xhr ) {
                    Y.log( 'updateFromCard issue: ' + xhr.responseText, 'error', NAME );
                },
                success: function( data ) {
                    data = Array.isArray( data ) ? data : [];
                    callback( null, {
                        result: result,
                        patientsMatching: data,
                        errors: errors
                    } );
                }
            } );
        }

        if( data.data && data.data.length ) {
            data_ori = data;
            data = data.data[0];

            result.push( {
                cardType: data.cardType,
                terminal: data.terminal
            } );

            if( data.mapped && data.mapped.length ) {
                mapped = data.mapped[0];
                original = data.original[0];
                if( data.Error ) {
                    Y.log( 'error getting card data: ' + data.Error, 'error', NAME );
                } else {

                    if( mapped.status && mapped.status.captured && moment( mapped.status.captured ).isAfter( moment().endOf( 'day' ) ) ) {
                        callback( new CardReaderError( '3023' ) );
                        return;
                    }

                    if( mapped.status && mapped.status.captured && moment( mapped.status.captured ).isBefore( moment().subtract( 2, 'quarters' ) ) ) {
                        errors.push( new CardReaderError( '3024', {
                            type: 'WARNING',
                            data: {$cardSwipe: moment( mapped.status.captured ).format( 'DD.MM.YYYY' )}
                        } ) );
                    }

                    if( mapped.status && (-1 !== ['G0', 'G1'].indexOf( mapped.status.generation )) ) {
                        callback( new CardReaderError( '3000' ) );
                        return;
                    }

                    if( mapped.insured ) {
                        result[0] = Y.mix( result[0], {
                            firstname: cutToLength( mapped.insured.firstName, NAME_MAX_LENGTH ),
                            lastname: cutToLength( mapped.insured.lastName, NAME_MAX_LENGTH ),
                            gender: mapGenderUI( original.insured.gender, result[0].cardType === 'KVK' ),
                            talk: mapTalkUI( original.insured.gender ),
                            kbvDob: getKbvDob( original.insured.birth ),  // cardreader is not handling dates cleanly, MOJ-1699
                            addresses: buildAddressesFromCardData( {
                                mapped: mapped,
                                original: original,
                                isKVK: result[0].cardType === 'KVK'
                            } ),
                            nameaffix: cutToLength( (result[0].cardType === 'KVK' ? (mapped.insured.prefix || original.insured.infix) : original.insured.prefix), NAME_EXT_MAX_LENGTH ),
                            fk3120: cutToLength( result[0].cardType === 'KVK' ? '' : original.insured.infix, NAME_EXT_MAX_LENGTH ),
                            title: cutToLength( mapped.insured.title, NAME_EXT_MAX_LENGTH )
                        }, true );
                    } else {
                        Y.log( 'no data for patient', 'warn', NAME );
                    }

                    // MOJ-3232 set the dob correctly as per PatientModel
                    kbvDate = new Y.doccirrus.KBVDateValidator( result[0].kbvDob );
                    result[0].dob = moment( kbvDate.getDate(), "DD.MM.YYYY" ).toJSON();

                    if( mapped.insurance ) {
                        ctlg = Y.doccirrus.catalogmap.getCatalogSDKT();
                        // use conKT ("abrechnungs_ik") if there is one
                        iknr = original.insurance.costUnit && (original.insurance.costUnit.conKT || original.insurance.costUnit.id) || '';
                        iknr = correctShortNum( iknr );

                        if( mapped.insurance.starts ) {
                            starts = moment( (result[0].cardType === 'KVK') ? ('20' + mapped.insurance.starts.substr( 2 ) + mapped.insurance.starts.substr( 0, 2 )) : original.insurance.starts, 'YYYYMMDD' );
                        }

                        if( mapped.insurance.ends ) {
                            ends = moment( (result[0].cardType === 'KVK') ? ('20' + mapped.insurance.ends.substr( 2 ) + mapped.insurance.ends.substr( 0, 2 )) : original.insurance.ends, 'YYYYMMDD' );

                            // P2-166 KVK -> eGK transformation
                            if( result[0].cardType === 'KVK' ) {
                                ends.endOf( 'month' );
                            }

                        }

                        insuranceName = mapped.insurance && mapped.insurance.costUnit && (mapped.insurance.costUnit.conKTName || mapped.insurance.costUnit.name);
                        if( 'gematik Musterkasse1GKV' === insuranceName ) {
                            isTestInsuranceCard = true;
                        }

                        cardError = Y.doccirrus.commonutils.checkCardValidityDate( starts, ends );
                        if( null !== cardError ) {
                            errors.push( cardError );
                        }

                        if( isPrivate( iknr ) ) {
                            Y.doccirrus.jsonrpc.api.catalog.getPKVKT( {
                                name: mapped.insurance.costUnit && mapped.insurance.costUnit.name || undefined
                            } ).done( function( response ) {
                                var insuranceData = response.data && response.data[0];
                                result[0] = Y.mix( result[0], {
                                    careDegree: 'NO',
                                    insuranceStatus: [
                                        {
                                            type: 'PRIVATE',
                                            cardType: result[0].cardType || undefined,
                                            cardTypeGeneration: (mapped.status && mapped.status.generation) || undefined,
                                            cdmVersion: (mapped.status && mapped.status.cdmVersion) || undefined,
                                            fk4108: (mapped.status && mapped.status.legalNo) || undefined,
                                            fk4133: (starts && starts.utc().toJSON()) || null,
                                            fk4110: (ends && ends.utc().toJSON()) || null,
                                            insuranceNo: mapped.insured && mapped.insured.id || undefined,
                                            insuranceName: mapped.insurance.costUnit && mapped.insurance.costUnit.name || undefined,
                                            insuranceId: iknr,
                                            insuranceCountry: mapped.insurance.costUnit && mapped.insurance.costUnit.locale || undefined,
                                            feeSchedule: '3',
                                            address1: Y.doccirrus.commonutils.buildInsuranceAddressPart( insuranceData, 1 ),
                                            address2: Y.doccirrus.commonutils.buildInsuranceAddressPart( insuranceData, 2 )
                                        }
                                    ]
                                }, true );

                                Y.doccirrus.DCSystemMessages.addMessage( {
                                    messageId: mapped.crc || '3012',
                                    content: Y.doccirrus.errorTable.getMessage( {code: '3012'} ),
                                    level: 'WARNING'
                                } );

                                checkExistence( result );
                            } ).fail( function() {
                                Y.log( new Error( 'Error verifiing PKV KT' ), 'error', NAME );
                            } );

                        } else if( ctlg ) {
                            Y.doccirrus.jsonrpc.api.catalog.verifyKT( {
                                ik: iknr,
                                ktab: '00',
                                catalog: ctlg.filename
                            } ).done( function( response ) {
                                var
                                    persGroup,
                                    data = response.data,
                                    cap,
                                    _data = data && data.data && data.data.length && data.data[0] || {},
                                    mappedStatusUpdate = mapStatusUpdate( mapped.insurance.statusUpdate, result[0].cardType === 'KVK' );

                                // KBV does not allow to take any data from closed kts
                                if( data && data.status && data.status.code && '3005' === data.status.code ) {
                                    callback( new CardReaderError( data.status.code, {type: (2 === data.code || 5 === data.code) ? 'WARNING' : 'ERROR'} ) ); //eslint-disable-line callback-return
                                    // just in case mobile card reader was used
                                    deleteCardData();
                                    return;
                                }

                                if( 1 !== data.code && data.status && data.status.code && !isTestInsuranceCard ) {
                                    errors.push( new CardReaderError( data.status.code, {type: (5 === data.code) ? 'WARNING' : 'ERROR'} ) );
                                }

                                if( (mapped.status && mapped.status.captured) ) {
                                    cap = moment( (mapped.status && mapped.status.captured) );
                                    cap = cap.utc().toJSON();
                                } else {
                                    cap = moment().utc().toJSON();
                                }

                                persGroup = mapped.insurance.persGroup || mappedStatusUpdate.persGroup;

                                result[0] = Y.mix( result[0], {
                                    careDegree: 'NO',
                                    insuranceStatus: [
                                        {
                                            type: 'PUBLIC',
                                            cardType: result[0].cardType || undefined,
                                            cardTypeGeneration: (mapped.status && mapped.status.generation) || undefined,
                                            cdmVersion: (mapped.status && mapped.status.cdmVersion) || undefined,
                                            fk4108: (mapped.status && mapped.status.legalNo) || '',
                                            fk4133: (starts && starts.utc().toJSON()) || null,
                                            fk4110: (ends && ends.utc().toJSON()) || null,
                                            insuranceNo: mapped.insured && mapped.insured.id || undefined,
                                            insuranceName: cutToLength( insuranceName, INSURANCE_NAME_MAX_LENGTH ),
                                            insurancePrintName: cutToLength( _data.abrechnungsbereich, INSURANCE_NAME_MAX_LENGTH ),
                                            kv: _data.kv || undefined,
                                            insuranceId: iknr,
                                            insuranceGrpId: isTestInsuranceCard ? '12345' : ((_data.vknr) || mapped.insurance.id || undefined),
                                            insuranceCountry: mapped.insurance.costUnit && mapped.insurance.costUnit.locale || undefined,
                                            cardSwipe: cap,
                                            insuranceKind: mapped.insurance.kind || (mapped.insurance.status && mapped.insurance.status[0]),
                                            persGroup: persGroup,
                                            dmp: mapped.insurance.dmp || mappedStatusUpdate.dmp,
                                            costCarrierBillingSection: Y.doccirrus.kbvcommonutils.getCostCarrierBillingSectionByPersGroup( persGroup ),
                                            costCarrierBillingGroup: (_data.kostentraegergruppeId) || '00',
                                            locationFeatures: mapped.insurance.wop,
                                            abrechnungsbereiche: _data.abrechnungsbereiche || {},
                                            feeSchedule: isTestInsuranceCard ? '1' : (_data.gebuehrenordnung || undefined),
                                            fused: _data.fused || false,
                                            address1: Y.doccirrus.commonutils.buildInsuranceAddressPart( _data, 1 ),
                                            address2: Y.doccirrus.commonutils.buildInsuranceAddressPart( _data, 2 )
                                        }
                                    ]
                                }, true );

                                if( result && result[0] && result[0].insuranceStatus && result[0].insuranceStatus[0] &&
                                    '9' === result[0].insuranceStatus[0].persGroup && options && options.incaseConfig && options.incaseConfig.showPersGroup9Info ) {
                                    Y.doccirrus.DCSystemMessages.addMessage( {
                                        content: i18n( 'InCaseMojit.insurance-modelJS.messages.NOTICE_ASYLBLG' ),
                                        level: 'INFO'
                                    } );
                                }

                                checkExistence( result );
                            } ).fail( function() {
                                Y.log( new Error( 'Error verifiing KT' ), 'error', NAME );
                            } );
                        } else {
                            Y.log( 'SDKT catalogue not found!', 'error', NAME );
                            return callback( new Error( 'SDKT Katalog nicht gefunden!' ) );
                        }

                    }
                }
            } else {
                if( Y.config.debug ) {
                    Y.log( 'no card data received: ' + JSON.stringify( data_ori ), 'error', NAME );
                }

                alertType = 'error';
                defText = i18n( 'CaseFileMojit.error.defText' );

                if( prevPatients ) {
                    defText = "<table class=\"table\"><thead><tr><th>" + i18n( 'CaseFileMojit.error.addTableHeaderAdd' ) + "</th><th>" + i18n( 'CaseFileMojit.error.addTableHeaderStatus' ) + "</th></tr></thead><tbody>" + prevPatients + "</tbody></table><br><br>";
                }

                //cardreader error translation needs to be modified here

                ret = "";
                err = data.Error.split( '.' );

                if( "!cmd" === err[0] ) {
                    ret = defText + i18n( 'CaseFileMojit.error.no_cmd' );
                } else if( "cmd" === err[0] ) {
                    if( "sw" === err[1] ) {
                        ret = defText + i18n( 'CaseFileMojit.error.no_bytes' );
                    } else if( "INS_READB" === err[1] || "INS_ERASE" === err[1] ) {
                        if( "0x62" === err[2] && "0x81" === err[3] ) {
                            ret = defText + i18n( 'CaseFileMojit.error.data_corruption' );
                        } else if( "0x62" === err[2] && "0x82" === err[3] ) {
                            ret = defText + i18n( 'CaseFileMojit.error.unex_eof' );
                        } else if( "0x65" === err[2] && "0x81" === err[3] ) {
                            ret = defText + i18n( 'CaseFileMojit.error.mem_fail' );
                        } else if( "0x69" === err[2] && "0x00" === err[3] ) {
                            ret = defText + i18n( 'CaseFileMojit.error.com_not_allowed' );
                        } else if( "0x69" === err[2] && "0x81" === err[3] ) {
                            ret = defText + i18n( 'CaseFileMojit.error.cmd_fail_file_struc' );
                        } else if( "0x69" === err[2] && "0x82" === err[3] ) {
                            ret = defText + i18n( 'CaseFileMojit.error.unsatisfied_sec_status' );
                        } else if( "0x69" === err[2] && "0x86" === err[3] ) {
                            ret = defText + i18n( 'CaseFileMojit.error.cmd_no_file' );
                        } else if( "0x6A" === err[2] && "0x81" === err[3] ) {
                            ret = defText + i18n( 'CaseFileMojit.error.unsupported_func' );
                        } else if( "0x6A" === err[2] && "0x82" === err[3] ) {
                            ret = defText + i18n( 'CaseFileMojit.error.file_not_found' );
                        }
                    } else if( "INS_SLCTF" === err[1] ) {
                        if( "0x62" === err[2] && "0x83" === err[3] ) {
                            ret = defText + i18n( 'CaseFileMojit.error.file_invalidated' );
                        } else if( "0x62" === err[2] && "0x84" === err[3] ) {
                            ret = defText + i18n( 'CaseFileMojit.error.fci_malf' );
                        } else if( "0x69" === err[2] && "0x00" === err[3] ) {
                            ret = defText + i18n( 'CaseFileMojit.error.com_not_allowed' );
                        } else if( "0x6A" === err[2] && "0x81" === err[3] ) {
                            ret = defText + i18n( 'CaseFileMojit.error.unsupported_func' );
                        } else if( "0x6A" === err[2] && "0x82" === err[3] ) {
                            ret = defText + i18n( 'CaseFileMojit.error.file_not_found' );
                        } else if( "0x6A" === err[2] && "0x86" === err[3] ) {
                            ret = defText + i18n( 'CaseFileMojit.error.param_incorrect' );
                        } else if( "0x6A" === err[2] && "0x87" === err[3] ) {
                            ret = defText + i18n( 'CaseFileMojit.error.com_len_inc' );
                        }
                    } else if( "null" === err[1] ) {
                        if( "0x61" === err[2] ) {
                            ret = defText + i18n( 'CaseFileMojit.error.resp_unhandled' );
                        } else if( "0x62" === err[2] ) {
                            alertType = 'info';
                            ret = defText + i18n( 'CaseFileMojit.error.mem_unchanged_stack' );
                        } else if( "0x64" === err[2] ) {
                            alertType = 'info';
                            ret = defText + i18n( 'CaseFileMojit.error.mem_unchanged' );
                        } else if( "0x63" === err[2] ) {
                            ret = defText + i18n( 'CaseFileMojit.error.mem_changed' );
                        } else if( "0x65" === err[2] ) {
                            ret = defText + i18n( 'CaseFileMojit.error.mem_changed' );
                        } else if( "0x66" === err[2] ) {
                            ret = defText + i18n( 'CaseFileMojit.error.sec_issue' );
                        } else if( "0x67" === err[2] ) {
                            ret = defText + i18n( 'CaseFileMojit.error.len_wrong' );
                        } else if( "0x68" === err[2] ) {
                            ret = defText + i18n( 'CaseFileMojit.error.unsupported_func' );
                        } else if( "0x69" === err[2] ) {
                            ret = defText + i18n( 'CaseFileMojit.error.com_not_allowed' );
                        } else if( "0x6A" === err[2] ) {
                            ret = defText + i18n( 'CaseFileMojit.error.param_wrong' );
                        } else if( "0x6B" === err[2] ) {
                            ret = defText + i18n( 'CaseFileMojit.error.param_wrong' );
                        } else if( "0x6C" === err[2] ) {
                            ret = defText + i18n( 'CaseFileMojit.error.len_wrong' ) + " (" + err[3] + ")";
                        } else if( "0x6D" === err[2] ) {
                            ret = defText + i18n( 'CaseFileMojit.error.ins_invalid' );
                        } else if( "0x6E" === err[2] ) {
                            ret = defText + i18n( 'CaseFileMojit.error.unsupported_class' );
                        } else if( "0x6F" === err[2] ) {
                            ret = defText + i18n( 'CaseFileMojit.error.unknown' );
                        }
                    }
                } else if( "data" === err[0] && "status" === err[1] ) {
                    if( "disconnected" === err[2] ) {
                        ret = i18n( 'CaseFileMojit.error.disconnected' );
                    }
                } else if( "no devices available" === err[0] ) {
                    ret = i18n( 'CaseFileMojit.error.no_dev' );
                }

                if( ret === "" ) {
                    ret = i18n( 'CaseFileMojit.error.unknown' ) + "<br>(" + err + ")";
                }
                err = new Error( ret );
                err.alertType = alertType;
                return callback( err );
            }
        }
    }

    /**
     * @param {Object} parameters
     * @param {Object} parameters.data
     * @param {Function} parameters.callback
     */
    function cardErrorDialog( parameters ) {
        var
            patient = parameters.patient,
            data = parameters.data,
            callback = parameters.callback,
            node = Y.Node.create( '<div></div>' ),
            // data for templateLoaded
            applyBindings = {
                listItems: Y.Array.map( data.errors, function( errorObject ) {
                    return errorObject.message;
                } ),
                remark: ''
            };

        function templateLoaded() {

            var
                dcWindow,
                title = 'Meldungen',
                // common UI
                type = data.errors.hasType( 'ERROR' ) ? 'error' : 'warn',
                buttonLabel = data.errors.hasType( 'ERROR' ) ? 'Patienten im Ersatzverfahren erfassen' : 'Ok',
                footer = [
                    {
                        isDefault: true,
                        label: buttonLabel,
                        action: function( e ) {
                            e.target.button.disable();
                            data.result[0].insuranceStatus = [];
                            callback(); //eslint-disable-line callback-return
                            dcWindow.close( e );
                        }
                    }
                ];

            // replaces footer buttons
            if( data.errors.hasCode( '3004' ) || data.errors.hasCode( '3007' ) ) {
                // FYI: data.result[0].insuranceStatus[0].cardSwipe !== null; not in case 3004

                if( data.errors.hasCode( '3004' ) ) { // P2-270
                    applyBindings.remark = 'Sollen die Versicherungsdaten temporär übernommen werden?';
                } else if( data.errors.hasCode( '3007' ) ) { // P2-260
                    applyBindings.remark = 'Wollen Sie trotzdem abrechnen?';
                }
                footer = [
                    Y.doccirrus.DCWindow.getButton( 'YES', {
                        // same as default button, because 'cardSwipe' was protected (@see: occurrences of 'P2-270')
                        action: function( e ) {
                            e.target.button.disable();
                            callback(); //eslint-disable-line callback-return
                            dcWindow.close( e );
                        }
                    } ),
                    Y.doccirrus.DCWindow.getButton( 'NO', {
                        // just remove insuranceStatus (so 'cardSwipe' is removed again)
                        isDefault: true,
                        action: function( e ) {
                            e.target.button.disable();
                            data.result[0].insuranceStatus = [];
                            patient.insuranceStatus.splice( 0, 1 );
                            callback(); //eslint-disable-line callback-return
                            dcWindow.close( e );
                        }
                    } )
                ];
            } else if( data.errors.hasCode( '3001' ) || data.errors.hasCode( '3018' ) ) {
                footer = [
                    Y.doccirrus.DCWindow.getButton( 'OK', {
                        action: function( e ) {
                            e.target.button.disable();
                            callback(); //eslint-disable-line callback-return
                            dcWindow.close( e );
                        }
                    } )
                ];
            }
            // show the dialog
            dcWindow = Y.doccirrus.DCWindow.notice( {
                title: title,
                type: type,
                window: {
                    width: 'medium',
                    buttons: {
                        footer: footer
                    }
                },
                message: node
            } );
            // apply data for templateLoaded
            ko.applyBindings( applyBindings, node.getDOMNode() );
        }

        YUI.dcJadeRepository.loadNodeFromTemplate(
            'cardreader_errordialog',
            'CardreaderMojit',
            data,
            node,
            templateLoaded
        );

    }

    /**
     * @class CardReader
     * @constructor
     */
    function CardReader() {
        CardReader.superclass.constructor.apply( this, arguments );
    }

    CardReader.NAME = "CardReader";
    CardReader.ATTRS = {
        baseURL: {
            value: "http://127.0.0.1:8888/cardreader/"
        },
        dataSource: {
            value: "file"
        }
    };

    Y.extend( CardReader, Y.Base, {

        /**
         * @method loadData
         * @param {String} urlSuffix
         * @param {Function} callback
         */
        loadData: function( urlSuffix, callback ) {
            var _this = this;

            function base64Gen( len ) {
                var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_", rtn = "",
                    i;
                for( i = 1; i < len; i++ ) {
                    rtn += alphabet[Math.floor( Math.random() * alphabet.length )];
                }
                return rtn;
            }

            Y.doccirrus.crmanager.getCardData(
                {
                    dataSource: _this.get( "dataSource" ),
                    urlSuffix: urlSuffix,
                    callID: base64Gen( 16 )
                }, function( res ) {
                    callback( null, res );
                }, function() {
                    callback( "JSON rpc call error", null );
                }
            );
        },

        /**
         * gets patient config object for PatientModel
         * @method getPatient
         * @param {Object} options
         * @param {Object} options.incaseConfig
         * @param {Function} getPatientCallback
         * @param {error|null} getPatientCallback.0 Error Argument
         * @param {object|null} getPatientCallback.1 Data Argument
         * @param {object} getPatientCallback.1.patient Patient config object
         * @param {object} getPatientCallback.1.errors CardReader status object
         * @param {object} prevPatients list of previous patients
         */
        getPatient: function( options, getPatientCallback, prevPatients ) {
            Y.log( "prevPatients: " + prevPatients, 'log', NAME );
            var
                self = this,
                terminalType = "";

            /**
             * Make some last deferred changes before calling "getPatientCallback" with the provided final results.
             * -    parameters equal those of "getPatientCallback"
             *
             * @param {Object} error
             * @param {Object} data
             */
            function finalize( error, data ) {
                var
                    args = arguments,
                    stack = new Y.Parallel();

                function show() {
                    if( data && data.patient ) {
                        resolveAddressesCountry( {
                            patient: data.patient,
                            callback: stack.add()
                        } );
                    }

                    stack.done( function() {
                        getPatientCallback.apply( self, args );
                    } );
                }

                data.terminalType = terminalType;
                if( ('undefined' === typeof prevPatients) && data.patient && data.patient._id && options && options.incaseConfig && (true === options.incaseConfig.autoEventsOnCardRead || true === options.incaseConfig.autoEventsOnCardReadNoAppointment) ) {
                    Y.doccirrus.jsonrpc.api.calevent.checkSchedule( {
                        updateArrivalStatus: options.incaseConfig.autoEventsOnCardRead,
                        patientId: data.patient._id
                    } ).done( function( response ) {
                        if( response.data && true === response.data.eventFound ) {
                            if( true === options.incaseConfig.autoEventsOnCardRead ) {
                                Y.doccirrus.DCSystemMessages.addMessage( {
                                    messageId: 'patient-arrived',
                                    content: EVENT_UPDATED,
                                    level: 'INFO'
                                } );
                            }
                            return show();
                        }
                        if( true === options.incaseConfig.autoEventsOnCardReadNoAppointment ) {
                            Y.doccirrus.modals.chooseScheduleForAdhocEvent.show( data.patient._id, show );
                        }
                    } ).fail( function( response ) {
                        Y.log( 'could not checkSchedule - this will silently fail ' + response, 'error', NAME );
                        show();
                    } );

                } else {
                    show();
                }

            }

            function mergeInsurances( patient, insuranceFromCard ) {
                var found,
                    foundIndex,
                    type = insuranceFromCard.type;

                if( Array.isArray( patient.insuranceStatus ) ) {
                    patient.insuranceStatus.some( function( insurance, index ) {
                        if( insurance.type === type ) {
                            found = insurance;
                            foundIndex = index;
                            return true;
                        }
                    } );
                } else {
                    patient.insuranceStatus = [];
                }

                if( !found ) {
                    patient.insuranceStatus.push( insuranceFromCard );
                } else {
                    patient.insuranceStatus[foundIndex] = Y.aggregate( found, insuranceFromCard, true );
                }
            }

            function updatePatient( patient, patientFromCard ) {
                var
                    mergedPatient,
                    mergedAddresses,
                    insurance = publicInsurance( patient ),
                    // patientFromCard has only one insurance
                    insuranceFromCard = patientFromCard.insuranceStatus[0];
                // remove kvkHistoricalNo on "Kassenwechsel", check only if read insurance is PUBLIC
                if( insurance && insurance.insuranceGrpId && insuranceFromCard && 'PUBLIC' === insuranceFromCard.type && insuranceFromCard.insuranceGrpId ) {
                    if( insurance.insuranceGrpId !== insuranceFromCard.insuranceGrpId ) {
                        insurance.kvkHistoricalNo = '';
                    }
                }
                // merge addresses
                mergedAddresses = handleAddressesFromUpdate( {
                    patient: patient.addresses,
                    patientFromCard: patientFromCard.addresses
                } );
                // deep merge patient objects
                // remove insurances so we do not merge wrong insurance
                patientFromCard.insuranceStatus = [];
                mergedPatient = Y.aggregate( patient, patientFromCard, true );
                mergeInsurances( mergedPatient, insuranceFromCard );

                // reapply the merged addresses (aggregate surely messed them up)
                mergedPatient.addresses = mergedAddresses;
                return mergedPatient;
            }

            function onDataLoad( error, data ) {
                if( error ) {
                    Y.log( 'error reading from card ' + error, 'error', NAME );
                    finalize( new CardReaderError( '3011' ), null );
                } else {
                    if( data.data && data.data[0].terminal ) {
                        terminalType = data.data[0].terminal;
                    }
                    fillPatientViewModel( data, options, function( err, data ) {

                        function getPatient() {
                            var endDateString, startDateString,
                                patientFromCard = data.result[0],
                                insuranceFromCard = patientFromCard.insuranceStatus[0],
                                patientsMatching = data.patientsMatching,
                                patientInsuranceStatus = patientFromCard && patientFromCard.insuranceStatus && getInsuranceByType( patientFromCard, insuranceFromCard.type ),
                                allowUserCopyOnly,
                                isNoCreate = false,
                                isDiffNoAdopt = false,
                                isDiffNoModal = false,
                                isDiffNoInitialMaximized = false,
                                endDate = new Date( patientInsuranceStatus.fk4110 ),
                                startDate = new Date( patientInsuranceStatus.fk4133 ),
                                nowDate = new Date();

                            if( "PRIVATE" !== patientInsuranceStatus.type && 'KVK' === patientInsuranceStatus.cardType && +patientInsuranceStatus.insuranceGrpId.substring( 2, 5 ) < 800 ) {
                                data.errors.push( new CardReaderError( '3015' ) );
                                allowUserCopyOnly = true;
                            }

                            if( patientInsuranceStatus.fk4110 && endDate < nowDate ) {
                                endDateString = endDate.getDate() + "." + (endDate.getMonth() + 1) + "." + endDate.getFullYear();
                                data.errors.push( new CardReaderError( '3019', {data: {"$insurance.ends": endDateString}} ) );
                                allowUserCopyOnly = true;
                            }

                            if( patientInsuranceStatus.fk4133 && startDate > nowDate ) {
                                startDateString = endDate.getDate() + "." + (endDate.getMonth() + 1) + "." + endDate.getFullYear();
                                data.errors.push( new CardReaderError( '3020', {data: {"$insurance.starts": startDateString}} ) );
                                allowUserCopyOnly = true;
                            }

                            if( allowUserCopyOnly ) {
                                isNoCreate = true;
                                isDiffNoAdopt = true;
                                isDiffNoModal = true;
                                isDiffNoInitialMaximized = true;
                            }

                            function noticeNotFound() {

                                var msg = "",
                                    footer = [
                                        Y.doccirrus.DCWindow.getButton( 'CANCEL', {isDefault: false} ),
                                        {
                                            label: 'Suchen',
                                            action: function( e ) {
                                                e.target.button.disable();
                                                this.close( e );
                                                selectPatient( {
                                                    noCreate: isNoCreate,
                                                    diffNoAdopt: isDiffNoAdopt,
                                                    diffNoModal: isDiffNoModal,
                                                    diffNoInitialMaximized: isDiffNoInitialMaximized
                                                } );
                                            }
                                        }
                                    ],
                                    showAddPatientButton = false,
                                    showDataButton = false;

                                if( allowUserCopyOnly ) {
                                    data.errors.forEach( function( error ) {
                                        if( -1 !== ['3015', '3019', '3020'].indexOf( error.code ) ) {
                                            msg += '<p>' + error.message + '</p>';
                                        }
                                    } );
                                }

                                if( prevPatients ) {
                                    msg += i18n( 'CaseFileMojit.error.batchCardsSoFar' );
                                    msg += "<br><table class=\"table\"><thead><tr><th>" + i18n( 'CaseFileMojit.error.addTableHeaderAdd' ) + "</th><th>" + i18n( 'CaseFileMojit.error.addTableHeaderStatus' ) + "</th></tr></thead><tbody>" + prevPatients + "</tbody></table><br><br>";
                                }
                                msg += i18n( 'CaseFileMojit.error.notFound1' );
                                msg += "<i>" + patientFromCard.lastname + ", " + patientFromCard.firstname + "</i>";
                                msg += i18n( 'CaseFileMojit.error.notFound2' );

                                if( allowUserCopyOnly ) {
                                    showDataButton = true;
                                } else {
                                    showAddPatientButton = true;
                                }

                                if( showAddPatientButton ) {
                                    footer.push( {
                                        isDefault: true,
                                        label: 'Anlegen',
                                        action: function( e ) {
                                            e.target.button.disable();
                                            this.close( e );
                                            addPatient( patientFromCard, null, insuranceFromCard.type );
                                        }
                                    } );
                                }
                                if( showDataButton ) {
                                    footer.push( {
                                        isDefault: true,
                                        label: 'Daten anzeigen',
                                        action: function( e ) {
                                            e.target.button.disable();
                                            this.close( e );
                                            self.dataPatientFromCard( {
                                                patientFromCard: patientFromCard
                                            } );
                                        }
                                    } );
                                }

                                return Y.doccirrus.DCWindow.notice( {
                                    message: msg,
                                    window: {
                                        width: 'medium',
                                        buttons: {
                                            footer: footer
                                        }
                                    }
                                } );
                            }

                            /**
                             * user should select a patient
                             * @param {object} [selectPatientConfig]
                             * @param {boolean} [selectPatientConfig.noCreate=false] select dialog won't show create button.
                             * @param {boolean} [selectPatientConfig.diffNoAdopt=false] diff dialog won't show adopt button.
                             * @param {boolean} [selectPatientConfig.diffNoModal=false] diff dialog won't be modal.
                             * @param {boolean} [selectPatientConfig.diffNoInitialMaximized=false] diff dialog won't be initially maximized.
                             */
                            function selectPatient( selectPatientConfig ) {
                                selectPatientConfig = selectPatientConfig || {};
                                Y.doccirrus.modals.crSelectPatient.show( {
                                    patients: patientsMatching,
                                    patientFromCard: patientFromCard,
                                    noCreate: selectPatientConfig.noCreate,
                                    callback: function( optionsSelected ) {
                                        switch( optionsSelected.action ) {
                                            // user has the option to create from patientFromCard
                                            case 'create':
                                                addPatient( optionsSelected.patient, null, insuranceFromCard.type );
                                                break;
                                            // user selected a patient
                                            case 'select':
                                                self.diffPatient( {
                                                    patient: optionsSelected.patient,
                                                    patientFromCard: patientFromCard,
                                                    prevPatients: prevPatients,
                                                    noAdopt: selectPatientConfig.diffNoAdopt,
                                                    noModal: selectPatientConfig.diffNoModal,
                                                    noInitialMaximized: selectPatientConfig.diffNoInitialMaximized,
                                                    callback: function() {
                                                        var
                                                            oldPatientVersion = Y.clone( optionsSelected.patient, true ),
                                                            updatedPatient = updatePatient( optionsSelected.patient, patientFromCard );

                                                        addPatient( updatedPatient, oldPatientVersion, insuranceFromCard.type );
                                                    }
                                                } );
                                                break;
                                        }
                                    }
                                } );
                            }

                            if( patientsMatching.length ) {

                                if( allowUserCopyOnly ) {
                                    Y.doccirrus.DCWindow.notice( {
                                        message: [
                                            '<p>' + Y.Lang.sub( 'Der Patient <i>{lastname}, {firstname}</i> wurde gefunden.', patientFromCard ) + '</p>',
                                            '<p>' + data.errors.getByCode( '3015' ).message + '</p>'
                                        ].join( '' ),
                                        window: {
                                            width: 'medium',
                                            buttons: {
                                                footer: [
                                                    Y.doccirrus.DCWindow.getButton( 'CANCEL', {isDefault: false} ),
                                                    {
                                                        label: 'Vergleichen',
                                                        isDefault: true,
                                                        action: function( e ) {
                                                            e.target.button.disable();
                                                            this.close( e );

                                                            // there may be already patients on the server (length=1 considered exactMatch, do not selectPatient dialog)
                                                            if( patientsMatching.length === 1 ) {
                                                                self.diffPatient( {
                                                                    patient: patientsMatching[0],
                                                                    patientFromCard: patientFromCard,
                                                                    prevPatients: prevPatients,
                                                                    noAdopt: isDiffNoAdopt,
                                                                    noModal: isDiffNoModal,
                                                                    noInitialMaximized: isDiffNoInitialMaximized,
                                                                    callback: function() {
                                                                        var
                                                                            readInsuranceType = insuranceFromCard.type,
                                                                            oldPatientVersion = Y.clone( patientsMatching[0], true ),
                                                                            updatedPatient = updatePatient( patientsMatching[0], patientFromCard );

                                                                        addPatient( updatedPatient, oldPatientVersion, readInsuranceType );
                                                                    }
                                                                } );
                                                            } else {
                                                                selectPatient( {
                                                                    noCreate: isNoCreate,
                                                                    diffNoAdopt: isDiffNoAdopt,
                                                                    diffNoModal: isDiffNoModal,
                                                                    diffNoInitialMaximized: isDiffNoInitialMaximized
                                                                } );
                                                            }

                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    } );
                                } else {
                                    // there may be already patients on the server (length=1 considered exactMatch, do not selectPatient dialog)
                                    if( patientsMatching.length === 1 && !pkvFamilyInjured( patientFromCard, patientsMatching[0] ) ) {
                                        self.diffPatient( {
                                            patient: patientsMatching[0],
                                            patientFromCard: patientFromCard,
                                            prevPatients: prevPatients,
                                            callback: function() {
                                                var
                                                    readInsuranceType = insuranceFromCard.type,
                                                    oldPatientVersion = Y.clone( patientsMatching[0], true ),
                                                    updatedPatient = updatePatient( patientsMatching[0], patientFromCard );

                                                addPatient( updatedPatient, oldPatientVersion, readInsuranceType );
                                            }
                                        } );
                                    } else {
                                        selectPatient();
                                    }
                                }

                            } else {
                                noticeNotFound();
                            }
                        }

                        /**
                         * we are about to provide the user a patient
                         * @param {Object} patient
                         * @param {Object} oldPatientVersion
                         * @param {String} readInsuranceType
                         * @private
                         */
                        function addPatient( patient, oldPatientVersion, readInsuranceType ) {
                            var cardError,
                                oldPatientVersionInsurance = oldPatientVersion && Array.isArray( oldPatientVersion.insuranceStatus ) && getInsuranceByType( oldPatientVersion, readInsuranceType ),
                                insuranceStatus = patient && patient.insuranceStatus && getInsuranceByType( patient, readInsuranceType );

                            function showSavePatientVersionDialog() {
                                var dcWindow = Y.doccirrus.DCWindow.notice( {
                                    title: 'Hinweis',
                                    type: 'warn',
                                    window: {
                                        width: 'medium',
                                        buttons: {
                                            footer: [
                                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                                    action: function( e ) {
                                                        e.target.button.disable();
                                                        dcWindow.close( e );
                                                        finalize( null, {
                                                            patient: patient,
                                                            errors: data.errors
                                                        } );
                                                    }
                                                } )
                                            ]
                                        }
                                    },
                                    message: 'Eine neuere Version des Patienten ist vorhanden. Die erfassten Daten werden als frühere Version gespeichert.'
                                } );
                            }

                            function checkPatientVersion() {
                                // insurance maybe changed, see: cardErrorDialog callback
                                var _insurance = getInsuranceByType( patient, readInsuranceType );
                                if( _insurance && 'PUBLIC' === _insurance.type && _insurance.cardSwipe ) {
                                    Y.doccirrus.jsonrpc.api.patient.isNewestVersion( {
                                        patientId: patient._id,
                                        timestamp: _insurance.cardSwipe
                                    } ).always( function( result ) {
                                        if( result && result.data && false === result.data.isNewestVersion ) {
                                            showSavePatientVersionDialog();
                                        } else {
                                            finalize( null, {
                                                patient: patient,
                                                errors: data.errors
                                            } );
                                        }
                                    } );

                                } else {
                                    finalize( null, {
                                        patient: patient,
                                        errors: data.errors
                                    } );
                                }

                            }

                            if( insuranceStatus ) {
                                // reject
                                if( oldPatientVersionInsurance && oldPatientVersionInsurance.cardSwipe &&
                                    insuranceStatus.insuranceGrpId === oldPatientVersionInsurance.insuranceGrpId &&
                                    insuranceStatus.cardType === 'KVK' && oldPatientVersionInsurance.cardType === 'EGK' ) {
                                    data.errors.clear();
                                    data.errors.push( new CardReaderError( '3001' ) );
                                }

                                // P2-106 Übertragung KVK- und eGK-Versichertennummern bei GKV-Versicherten (KVDT)
                                // Check if an new card version of same insurance was read before
                                if( Y.doccirrus.kbvcommonutils.readNewerCardTypeGenerationBefore( oldPatientVersionInsurance, insuranceStatus ) ) {
                                    data.errors.clear();
                                    data.errors.push( new CardReaderError( '3018' ) );
                                }
                                // if errors contains at least one "ERROR" (there could be "WARNINGS" too)
                                // delete cardSwipe to get to "Ersatzverfahren"
                                if( data.errors.hasType( 'ERROR' ) && !data.errors.hasCode( '3007' ) ) {
                                    insuranceStatus.cardSwipe = '';
                                }

                                if( data.errors.hasCode( '3002' ) || data.errors.hasCode( '3003' ) || data.errors.hasCode( '3006' ) || data.errors.hasCode( '3008' ) ||
                                    data.errors.hasCode( '3009' ) || data.errors.hasCode( '3010' ) ) {
                                    /**
                                     * handle not valid now fields
                                     * "P2-240" (Der Kostenträger dieser Karte ist noch nicht gültig. Bitte halten Sie Rücksprache mit der Versicherung.)
                                     * "P2-250" (Die IKNR dieser Karte ist noch nicht gültig. Bitte halten Sie Rücksprache mit der Versicherung.)
                                     */
                                    patient.insuranceStatus.splice( patient.insuranceStatus.indexOf( insuranceStatus ), 1 );
                                }

                            }

                            // If card is not valid only keep this error
                            cardError = data.errors.getByCode( '3002' ) || data.errors.getByCode( '3003' );
                            if( cardError ) {
                                data.errors.clear();
                                data.errors.push( cardError );
                            }

                            if( data.errors.length ) {
                                cardErrorDialog( {
                                    patient: patient,
                                    data: data,
                                    callback: function() {
                                        if( data.errors.hasCode( '3018' ) ) {
                                            deleteCardData();
                                            // process ended do nothing with card data here
                                            return;
                                        } else if( data.errors.hasCode( '3001' ) ) {
                                            patient = oldPatientVersion;
                                            finalize( null, {
                                                patient: patient,
                                                errors: data.errors
                                            } );
                                        } else {
                                            checkPatientVersion();
                                        }
                                    }
                                } );
                            } else {
                                checkPatientVersion();
                            }
                        }

                        if( err ) {
                            Y.doccirrus.DCWindow.notice( {
                                type: err.alertType || 'error',
                                message: err.message
                            } );
                            Y.log( 'unable to fill patient model: ' + err, 'error', NAME );
                        } else {
                            getPatient();
                        }
                    }, prevPatients );
                }
            }

            self.loadData( '?preventDelete', onDataLoad );
        },

        /**
         * creates difference patient to card dialog
         * @method diffPatient
         * @param {object} parameters
         * @param {object} parameters.patient
         * @param {object} parameters.patientFromCard
         * @param {object} parameters.prevPatients
         * @param {function} parameters.callback
         * @param {boolean} [parameters.noAdopt=false] dialogue won't show adopt button.
         * @param {boolean} [parameters.noModal=false] dialogue won't be modal.
         * @param {boolean} [parameters.noInitialMaximized=false] dialogue won't be initially maximized.
         * @return {{window: DCWindow}}
         */
        diffPatient: function( parameters ) {
            var
                patient = Y.clone( parameters.patient, true ),
                patientFromCard = Y.clone( parameters.patientFromCard, true ),
                noAdopt = Boolean( parameters.noAdopt ),
                noModal = Boolean( parameters.noModal ),
                noInitialMaximized = Boolean( parameters.noInitialMaximized ),
                callback = parameters.callback,
                prevPatients = parameters.prevPatients,
                node,
                aDCWindow,
                schemaEnum, schemaList, schema,
                schemaTranslation, schemaDefault, valuePatient,
                patientNode = {label: 'Stammdaten', type: 'patient', data: []},
                tmpInsuranceStatus,
                msg,
                readInsuranceType = patientFromCard.insuranceStatus[0].type,
                diffPatientsViewModel = {
                    /** Object of type properties which value is an array of properties to ignore on conflict */
                    ignores: {
                        patient: ['talk', 'dob'],
                        insuranceStatus: [
                            'abrechnungsbereiche',
                            'cardSwipe',
                            'cardType',
                            'cardTypeGeneration',
                            'cdmVersion',
                            'fk4108',
                            'fused',
                            'insurancePrintName',
                            'kv',
                            'insuranceCountry',
                            'costCarrierBillingGroup',
                            'address1',
                            'address2',
                            'originalInsuranceId',
                            'originalInsuranceGrpId',
                            'originalCostCarrierBillingSection'
                        ]
                    },
                    tables: ko.observableArray( [] ),
                    format: function( text ) {
                        var unwrap = ko.unwrap( text );
                        if( Y.doccirrus.regexp.iso8601.test( unwrap ) ) {
                            return moment( unwrap ).format( 'DD.MM.YYYY ( HH:mm )' );
                        }
                        return text;
                    },
                    isConflictValues: function( value1, value2 ) {
                        return isConflictValues( ko.unwrap( value1 ), ko.unwrap( value2 ) );
                    }
                },
                hasConflicts = false;

            function diffWindow( node ) {
                var
                    footer = [
                        (true === noAdopt) ?
                            Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                isDefault: true,
                                action: function() {
                                    aDCWindow.close();
                                    confirmCardDataDeletion();
                                }
                            } ) :
                            Y.doccirrus.DCWindow.getButton( 'CANCEL' )
                    ];

                if( !noAdopt ) {
                    footer.push( {
                        label: 'Übernehmen',
                        isDefault: true,
                        action: function( e ) {
                            patient.insuranceStatus = tmpInsuranceStatus;
                            e.target.button.disable();
                            aDCWindow.close();
                            callback();
                        }
                    } );
                } else {
                    footer[0].isDefault = true;
                }

                // create Window to show diff table
                aDCWindow = new Y.doccirrus.DCWindow( {
                    className: 'DCWindow-DiffPatient',
                    bodyContent: node,
                    title: 'Änderungen an Patienten Daten',
                    icon: Y.doccirrus.DCWindow.ICON_WARN,
                    width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                    height: 400,
                    minHeight: 400,
                    minWidth: Y.doccirrus.DCWindow.SIZE_XLARGE,
                    centered: true,
                    modal: !noModal,
                    render: document.body,
                    buttons: {
                        header: ['close', 'maximize'],
                        footer: footer
                    }
                } );
                if( !noInitialMaximized ) {
                    aDCWindow.resizeMaximized.set( 'maximized', true );
                }
            }

            // reload the patient
            Y.doccirrus.uam.loadhelper.set( 'reloadPatientDetail', true );

            function isValidProperty( type, field ) {
                if( Y.Object.owns( diffPatientsViewModel.ignores, type ) && diffPatientsViewModel.ignores[type].indexOf( field ) > -1 ) {
                    return false;
                }
                return true;
            }

            /**
             * checks if values are considered the same
             * @param {*} value1
             * @param {*} value2
             * @return {boolean}
             */
            function isConflictValues( value1, value2 ) {
                value1 = ko.unwrap( value1 );
                value2 = ko.unwrap( value2 );
                if( value1 === value2 ) {
                    return false;
                }
                if( isConflictValues.equals.indexOf( value1 ) > -1 && isConflictValues.equals.indexOf( value2 ) > -1 ) {
                    return false;
                }
                return true;
            }

            /** values considered the same */
            isConflictValues.equals = [undefined, null, '', NaN];

            // purify data to compare:
            handleAddressesFromDiff( {
                patientFromCard: patientFromCard.addresses,
                patient: patient.addresses
            } );

            tmpInsuranceStatus = patient.insuranceStatus;
            patient.insuranceStatus = Y.Array.filter( patient.insuranceStatus, function( insurance ) {
                return readInsuranceType === insurance.type;
            } );

            // build tables
            // TODO: refactor building
            Y.each( patientFromCard, function( value, key ) {
                if( Y.Object.owns( patient, key ) ) {
                    schema = Y.doccirrus.schemaloader.getSchemaByName( ['patient', key].join( '.' ) );

                    if( Y.Lang.isArray( value ) || Y.Lang.isObject( value ) ) {
                        Y.each( value, function( listItem, index ) {
                            var koItems = [],
                                label = '';
                            Y.each( listItem, function( data, k ) {

                                if( isValidProperty( key, k ) ) {
                                    schemaTranslation = getObject( [k, 'i18n'], schema );
                                    schemaDefault = getObject( [k, 'default'], schema );
                                    valuePatient = getObject( [key, index, k], patient );

                                    schemaEnum = getObject( [k, 'enum'], schema );
                                    schemaList = getObject( [k, 'list'], schema );

                                    valuePatient = Y.Lang.isUndefined( valuePatient ) ? schemaDefault : valuePatient;
                                    koItems.push( {
                                        property: schemaTranslation || k,
                                        key: k,
                                        valueCard: ko.observable( schemaEnum ? Y.doccirrus.schemaloader.translateEnumValue( 'i18n', data, schemaList ) : data ),

                                        valuePatient: ko.observable( schemaEnum ? Y.doccirrus.schemaloader.translateEnumValue( 'i18n', valuePatient, schemaList ) : valuePatient ),
                                        isConflict: ko.observable( isConflictValues( data, valuePatient ) )
                                    } );
                                }
                            } );
                            if( koItems.length ) {
                                label = getObject( ['patient.schema', key, 'i18n'].join( '.' ), Y.doccirrus.schemas ) || key;
                                diffPatientsViewModel.tables.push( {
                                    label: label,
                                    type: key,
                                    data: koItems,
                                    index: index
                                } );
                            }
                        } );
                    } else {
                        if( isValidProperty( 'patient', key ) ) {

                            schemaEnum = schema.enum;
                            schemaList = schema.list;

                            patientNode.data.push( {
                                property: schema.i18n || key,
                                key: key,
                                valueCard: ko.observable( schemaEnum ? Y.doccirrus.schemaloader.translateEnumValue( 'i18n', value, schemaList ) : value ),
                                valuePatient: ko.observable( schemaEnum ? Y.doccirrus.schemaloader.translateEnumValue( 'i18n', patient[key], schemaList ) : patient[key] ),
                                isConflict: ko.observable( isConflictValues( value, patient[key] ) )
                            } );
                        }
                    }
                }
            } );

            // add the patientNode node … if
            if( patientNode.data.length ) {
                diffPatientsViewModel.tables.unshift( patientNode );
            }

            // detect initial conflicts
            hasConflicts = Y.Array.some( diffPatientsViewModel.tables(), function( table ) {
                return Y.Array.some( table.data, function( data ) {
                    return ko.unwrap( data.isConflict );
                } );
            } );

            // sort tables properties
            Y.each( diffPatientsViewModel.tables(), function( table ) {
                table.data.sort( function( a, b ) {
                    return a.property.localeCompare( b.property );
                } );
            } );

            // we have detected conflicts
            if( hasConflicts ) {
                node = Y.Node.create( '<div></div>' );
                // load table template & bind a ViewModel
                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'cardreader_diffpatient',
                    'CardreaderMojit',
                    {},
                    node,
                    function templateLoaded() {
                        diffPatientsViewModel.cardDataI18n = i18n( 'InCaseMojit.cardreader_diffpatient.label.CARDDATA' );
                        diffPatientsViewModel.selPatientI18n = i18n( 'InCaseMojit.cardreader_diffpatient.label.SEL_PATIENT' );
                        ko.applyBindings( diffPatientsViewModel, node.getDOMNode() );
                    }
                );

                if( prevPatients ) {

                    msg = i18n( 'CaseFileMojit.error.batchCardsSoFar' );
                    msg += "<br><table class=\"table\"><thead><tr><th>" + i18n( 'CaseFileMojit.error.addTableHeaderAdd' ) + "</th><th>" + i18n( 'CaseFileMojit.error.addTableHeaderStatus' ) + "</th></tr></thead><tbody>" + prevPatients + "</tbody></table><br><br>";
                    msg += i18n( 'CaseFileMojit.error.batchErrorHeader1' );
                    msg += "<i>" + parameters.patient.lastname + ", " + parameters.patient.firstname + "</i>";
                    msg += i18n( 'CaseFileMojit.error.batchErrorHeader2' );

                    Y.doccirrus.DCWindow.notice( {
                        type: 'info',
                        message: msg,
                        callback: function() {
                            diffWindow( node );
                        }
                    } );
                } else {
                    diffWindow( node );
                }
            }
            // no conflicts
            else {
                patient.insuranceStatus = tmpInsuranceStatus;
                callback(); //eslint-disable-line callback-return
            }

            return {window: aDCWindow};
        },

        /**
         * creates data patient from card dialog
         * @method dataPatientFromCard
         * @param {object} parameters
         * @param {object} parameters.patientFromCard
         * @return {{window: DCWindow}}
         */
        dataPatientFromCard: function( parameters ) {
            var
                patientFromCard = Y.clone( parameters.patientFromCard, true ),
                node,
                aDCWindow,
                schemaTranslation,
                patientNode = {label: 'Stammdaten', type: 'patient', data: []},
                diffPatientsViewModel = {
                    /** Object of type properties which value is an array of properties to ignore on conflict */
                    ignores: {
                        patient: ['talk', 'dob'],
                        insuranceStatus: [
                            'abrechnungsbereiche',
                            'cardSwipe',
                            'cardType',
                            'cardTypeGeneration',
                            'cdmVersion',
                            'fk4108',
                            'fused',
                            'insurancePrintName',
                            'kv',
                            'insuranceCountry',
                            'costCarrierBillingGroup',
                            'address1',
                            'address2',
                            'originalInsuranceId',
                            'originalInsuranceGrpId',
                            'originalCostCarrierBillingSection'
                        ]
                    },
                    tables: ko.observableArray( [] ),
                    format: function( text ) {
                        var unwrap = ko.unwrap( text );
                        if( Y.doccirrus.regexp.iso8601.test( unwrap ) ) {
                            return moment( unwrap ).format( 'DD.MM.YYYY ( HH:mm )' );
                        }
                        return text;
                    }
                };

            function dataPatientFromCardWindow( node ) {
                // create Window to show diff table
                aDCWindow = new Y.doccirrus.DCWindow( {
                    className: 'DCWindow-DataPatientFromCard',
                    bodyContent: node,
                    title: 'Patienten Daten',
                    icon: Y.doccirrus.DCWindow.ICON_WARN,
                    width: Y.doccirrus.DCWindow.SIZE_LARGE,
                    height: 400,
                    minHeight: 400,
                    minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                    centered: true,
                    render: document.body,
                    buttons: {
                        header: ['close', 'maximize'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                isDefault: true,
                                action: function() {
                                    aDCWindow.close();
                                    confirmCardDataDeletion();
                                }
                            } )
                        ]
                    }
                } );
            }

            function isValidProperty( type, field ) {
                if( Y.Object.owns( diffPatientsViewModel.ignores, type ) && diffPatientsViewModel.ignores[type].indexOf( field ) > -1 ) {
                    return false;
                }
                return true;
            }

            // build tables
            Y.each( patientFromCard, function( value, key ) {
                var
                    schema = Y.doccirrus.schemaloader.getSchemaByName( ['patient', key].join( '.' ) ),
                    schemaEnum, schemaList;

                if( !schema ) {
                    return;
                }

                if( Y.Lang.isArray( value ) || Y.Lang.isObject( value ) ) {
                    Y.each( value, function( listItem, index ) {
                        var koItems = [],
                            label = '';
                        Y.each( listItem, function( data, k ) {

                            if( isValidProperty( key, k ) ) {
                                schemaTranslation = getObject( [k, 'i18n'], schema );

                                schemaEnum = getObject( [k, 'enum'], schema );
                                schemaList = getObject( [k, 'list'], schema );

                                koItems.push( {
                                    property: schemaTranslation || k,
                                    key: k,
                                    valueCard: ko.observable( schemaEnum ? Y.doccirrus.schemaloader.translateEnumValue( 'i18n', data, schemaList ) : data )
                                } );
                            }
                        } );
                        if( koItems.length ) {
                            label = getObject( ['patient.schema', key, 'i18n'].join( '.' ), Y.doccirrus.schemas ) || key;
                            diffPatientsViewModel.tables.push( {label: label, type: key, data: koItems, index: index} );
                        }
                    } );
                } else {
                    if( isValidProperty( 'patient', key ) ) {
                        schemaEnum = schema.enum;
                        schemaList = schema.list;

                        patientNode.data.push( {
                            property: schema.i18n || key,
                            key: key,
                            valueCard: ko.observable( schemaEnum ? Y.doccirrus.schemaloader.translateEnumValue( 'i18n', value, schemaList ) : value )
                        } );
                    }
                }
            } );

            // add the patientNode node … if
            if( patientNode.data.length ) {
                diffPatientsViewModel.tables.unshift( patientNode );
            }

            // sort tables properties
            Y.each( diffPatientsViewModel.tables(), function( table ) {
                table.data.sort( function( a, b ) {
                    return a.property.localeCompare( b.property );
                } );
            } );

            node = Y.Node.create( '<div></div>' );
            // load table template & bind a ViewModel
            YUI.dcJadeRepository.loadNodeFromTemplate(
                'cardreader_datapatientFromCard',
                'CardreaderMojit',
                {},
                node,
                function templateLoaded() {
                    diffPatientsViewModel.cardDataI18n = i18n( 'InCaseMojit.cardreader_datapatientFromCard.label.CARDDATA' );
                    ko.applyBindings( diffPatientsViewModel, node.getDOMNode() );
                }
            );

            dataPatientFromCardWindow( node );

            return {window: aDCWindow};
        },

        /**
         * @method getCardreaderList
         * @param {Function} callback A Callback which will receive the results
         */
        getCardreaderList: function( callback ) {
            jQuery.ajax( {
                type: "GET",
                url: this.get( "baseURL" ) + "devices",
                success: function( response ) {
                    callback( response.data );
                },
                error: function() {
                    callback( [] );
                }
            } );
        }
    } );

    NS.getKbvDob = getKbvDob;
    NS.mapGenderUI = mapGenderUI;
    NS.mapTalkUI = mapTalkUI;
    NS.fillPatientViewModel = fillPatientViewModel;
    NS.deleteCardData = deleteCardData;
    /**
     * creates a CardReader instance
     * @method createInstance
     * @for doccirrus.cardreader
     * @return {CardReader}
     */
    NS.createInstance = function createInstance() {
        return new CardReader();
    };

}, '0.0.1', {
    lang: ['en', 'de', 'de-ch'],
    requires: [
        'oop',
        'parallel',

        'JsonRpcReflection-doccirrus',
        'JsonRpc',

        'i18n-factory',
        'dcregexp',
        'dccommonutils',
        'dcutils',
        'dcinfrastructs',
        'dcschemaloader',
        'dcloadhelper',
        'dccatalogmap',
        'DCWindow',
        'dckbvdate',
        'dccommonerrors',
        'DCSystemMessages',
        'dccommonutils',
        'dccreateadhoceventmodal',
        'dccrmanager',
        'crselectpatientmodal',
        'location-schema',
        'dckbvutils',
        'patient-schema'
    ]
} );
