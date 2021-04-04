/**
 * User: do
 * Date: 02/06/15  15:06
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI*/

YUI.add( 'cardreader', function( Y, NAME ) {
    /*jshint validthis:true */

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

    var Prom = require( 'bluebird' ),
        moment = require( 'moment' ),

        verifyKT = promisifyApi( Y.doccirrus.api.catalog.verifyKT ),
        getMatchingPatients = promisifyApi( Y.doccirrus.api.patient.getMatchingPatients ),
        i18n = Y.doccirrus.i18n,
        CardReaderError = Y.doccirrus.commonerrors.DCError,

        PRIVATE_IKNR = '0000000',

        STREET_MAX_LENGTH = 46,
        HOUSENO_MAX_LENGTH = 9,
        ZIP_MAX_LENGTH = 10,
        CITY_MAX_LENGTH = 40,
        COUNTRYCODE_MAX_LENGTH = 3,
        ADDON_MAX_LENGTH = 40,
        POSTBOX_MAX_LENGTH = 8,
        NAME_MAX_LENGTH = 45,
        NAME_EXT_MAX_LENGTH = 20,
        INSURANCE_NAME_MAX_LENGTH = 45;

    function promisifyApi( fn ) {
        return function promisifiedApiCall( args ) {
            return new Prom( function( resolve, reject ) {
                args.callback = function( err, result ) {
                    if( err ) {
                        return reject( err );
                    }
                    resolve( result );
                };
                fn( args );
            } );
        };
    }

    function mapCardReaderError( data ) {

        Y.log( 'no card data received: ' + data.Error, 'error', NAME );

        //cardreader error translation needs to be modified here

        var ret = "",
            err = data.Error.split( '.' );

        if( "!cmd" === err[0] ) {
            ret = i18n( 'CaseFileMojit.error.no_cmd' );
        } else if( "cmd" === err[0] ) {
            if( "sw" === err[1] ) {
                ret = i18n( 'CaseFileMojit.error.no_bytes' );
            } else if( "INS_READB" === err[1] || "INS_ERASE" === err[1] ) {
                if( "0x62" === err[2] && "0x81" === err[3] ) {
                    ret = i18n( 'CaseFileMojit.error.data_corruption' );
                } else if( "0x62" === err[2] && "0x82" === err[3] ) {
                    ret = i18n( 'CaseFileMojit.error.unex_eof' );
                } else if( "0x65" === err[2] && "0x81" === err[3] ) {
                    ret = i18n( 'CaseFileMojit.error.mem_fail' );
                } else if( "0x69" === err[2] && "0x00" === err[3] ) {
                    ret = i18n( 'CaseFileMojit.error.com_not_allowed' );
                } else if( "0x69" === err[2] && "0x81" === err[3] ) {
                    ret = i18n( 'CaseFileMojit.error.cmd_fail_file_struc' );
                } else if( "0x69" === err[2] && "0x82" === err[3] ) {
                    ret = i18n( 'CaseFileMojit.error.unsatisfied_sec_status' );
                } else if( "0x69" === err[2] && "0x86" === err[3] ) {
                    ret = i18n( 'CaseFileMojit.error.cmd_no_file' );
                } else if( "0x6A" === err[2] && "0x81" === err[3] ) {
                    ret = i18n( 'CaseFileMojit.error.unsupported_func' );
                } else if( "0x6A" === err[2] && "0x82" === err[3] ) {
                    ret = i18n( 'CaseFileMojit.error.file_not_found' );
                }
            } else if( "INS_SLCTF" === err[1] ) {
                if( "0x62" === err[2] && "0x83" === err[3] ) {
                    ret = i18n( 'CaseFileMojit.error.file_invalidated' );
                } else if( "0x62" === err[2] && "0x84" === err[3] ) {
                    ret = i18n( 'CaseFileMojit.error.fci_malf' );
                } else if( "0x69" === err[2] && "0x00" === err[3] ) {
                    ret = i18n( 'CaseFileMojit.error.com_not_allowed' );
                } else if( "0x6A" === err[2] && "0x81" === err[3] ) {
                    ret = i18n( 'CaseFileMojit.error.unsupported_func' );
                } else if( "0x6A" === err[2] && "0x82" === err[3] ) {
                    ret = i18n( 'CaseFileMojit.error.file_not_found' );
                } else if( "0x6A" === err[2] && "0x86" === err[3] ) {
                    ret = i18n( 'CaseFileMojit.error.param_incorrect' );
                } else if( "0x6A" === err[2] && "0x87" === err[3] ) {
                    ret = i18n( 'CaseFileMojit.error.com_len_inc' );
                }
            } else if( "null" === err[1] ) {
                if( "0x61" === err[2] ) {
                    ret = i18n( 'CaseFileMojit.error.resp_unhandled' );
                } else if( "0x62" === err[2] ) {
                    ret = i18n( 'CaseFileMojit.error.mem_unchanged' );
                } else if( "0x64" === err[2] ) {
                    ret = i18n( 'CaseFileMojit.error.mem_unchanged' );
                } else if( "0x63" === err[2] ) {
                    ret = i18n( 'CaseFileMojit.error.mem_changed' );
                } else if( "0x65" === err[2] ) {
                    ret = i18n( 'CaseFileMojit.error.mem_changed' );
                } else if( "0x66" === err[2] ) {
                    ret = i18n( 'CaseFileMojit.error.sec_issue' );
                } else if( "0x67" === err[2] ) {
                    ret = i18n( 'CaseFileMojit.error.len_wrong' );
                } else if( "0x68" === err[2] ) {
                    ret = i18n( 'CaseFileMojit.error.unsupported_func' );
                } else if( "0x69" === err[2] ) {
                    ret = i18n( 'CaseFileMojit.error.com_not_allowed' );
                } else if( "0x6A" === err[2] ) {
                    ret = i18n( 'CaseFileMojit.error.param_wrong' );
                } else if( "0x6B" === err[2] ) {
                    ret = i18n( 'CaseFileMojit.error.param_wrong' );
                } else if( "0x6C" === err[2] ) {
                    ret = i18n( 'CaseFileMojit.error.len_wrong' ) + " (" + err[3] + ")";
                } else if( "0x6D" === err[2] ) {
                    ret = i18n( 'CaseFileMojit.error.ins_invalid' );
                } else if( "0x6E" === err[2] ) {
                    ret = i18n( 'CaseFileMojit.error.unsupported_class' );
                } else if( "0x6F" === err[2] ) {
                    ret = i18n( 'CaseFileMojit.error.unknown' );
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
        return 'Keine Daten von der Karte erhalten:<br>' + ret;
    }

    function cutToLength( str, len ) {
        if( 'string' === typeof str ) {
            return str.substr( 0, len );
        }
        return '';
    }

    function buildAddressesFromCardData( parameters ) {
        var
            mapped = parameters.mapped,
            original = parameters.original,
            isKVK = parameters.isKVK,
            lastIndexOfSpace,
            streetAndStreetNo,
            addresses = [],
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
            countryCode: cutToLength( mapped.insured.locale, COUNTRYCODE_MAX_LENGTH ) || 'D',
            addon: cutToLength( original.insured.addressPlus, ADDON_MAX_LENGTH )
        };

        POSTBOX = {
            kind: 'POSTBOX',
            city: cutToLength( mapped.insured.pobLocation, CITY_MAX_LENGTH ),
            countryCode: cutToLength( mapped.insured.pobLocaleT, COUNTRYCODE_MAX_LENGTH ) || 'D',
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

    function mapGenderUI( val ) {
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
        return (2 === +val || 'F' === val) ? 'MS' : 'MR';
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

    function getData( data ) {
        if( data.data && data.data.length ) {
            return data.data[0];
        }
        throw Error( '' );
    }

    function checkData( data ) {
        var cardError;
        if( data.Error ) {
            throw Y.doccirrus.errors.rest( 1111, mapCardReaderError( data ) );
        }

        if( data.mapped.status && (data.mapped.status.generation === 'G0') ) {
            cardError = new CardReaderError( '3000' );
            throw Y.doccirrus.errors.rest( 3000, cardError.message );
        }

        return data;
    }

    function getCatalogSDKT() {
        return Y.doccirrus.api.catalog.getCatalogDescriptor( {
            actType: '_CUSTOM',
            short: 'SDKT'
        } );
    }

    function mapBasicData( data ) {
        var kbvDate,
            mapped = data.mapped[0],
            original = data.original[0];

        this.result.push( {
            cardType: data.cardType,
            terminal: data.terminal
        } );

        if( mapped.insured ) {
            this.result[0] = Y.mix( this.result[0], {
                firstname: cutToLength( mapped.insured.firstName, NAME_MAX_LENGTH ),
                lastname: cutToLength( mapped.insured.lastName, NAME_MAX_LENGTH ),
                gender: mapGenderUI( original.insured.gender ),
                talk: mapTalkUI( original.insured.gender ),
                kbvDob: getKbvDob( original.insured.birth ),  // cardreader is not handling dates cleanly, MOJ-1699
                addresses: buildAddressesFromCardData( {
                    mapped: mapped,
                    original: original,
                    isKVK: this.result[0].cardType === 'KVK'
                } ),
                nameaffix: cutToLength( (this.result[0].cardType === 'KVK' ? (mapped.insured.prefix || original.insured.infix) : original.insured.prefix), NAME_EXT_MAX_LENGTH ),
                fk3120: cutToLength( this.result[0].cardType === 'KVK' ? '' : original.insured.infix, NAME_EXT_MAX_LENGTH ),
                title: cutToLength( mapped.insured.title, NAME_EXT_MAX_LENGTH )
            }, true );
        } else {
            Y.log( 'no data for patient', 'warn', NAME );
        }

        // MOJ-3232 set the dob correctly as per PatientModel
        kbvDate = new Y.doccirrus.KBVDateValidator( this.result[0].kbvDob );
        this.result[0].dob = moment( kbvDate.getDate(), "DD.MM.YYYY" ).toJSON();

        return data;
    }

    function mapPrivateInsurance( args ) {

        return Y.doccirrus.api.catalog.getPKVKT( {
            name: args.mapped.insurance.costUnit && args.mapped.insurance.costUnit.name || undefined
        } ).then( function( result ) {
            var insuranceData = result && result[0];
            args.self.result[0] = Y.mix( args.self.result[0], {
                careDegree: 'NO',
                insuranceStatus: [
                    {
                        type: 'PRIVATE',
                        cardType: args.self.result[0].cardType || undefined,
                        cardTypeGeneration: (args.mapped.status && args.mapped.status.generation) || undefined,
                        cdmVersion: (args.mapped.status && args.mapped.status.cdmVersion) || undefined,
                        fk4108: (args.mapped.status && args.mapped.status.legalNo) || undefined,
                        fk4133: (args.starts && args.starts.utc().toJSON()) || null,
                        fk4110: (args.ends && args.ends.utc().toJSON()) || null,
                        insuranceNo: args.mapped.insured && args.mapped.insured.id || undefined,
                        insuranceName: args.mapped.insurance.costUnit && args.mapped.insurance.costUnit.name || undefined,
                        insuranceId: args.iknr,
                        insuranceCountry: args.mapped.insurance.costUnit && args.mapped.insurance.costUnit.locale || undefined,
                        feeSchedule: '3',
                        address1: Y.doccirrus.commonutils.buildInsuranceAddressPart( insuranceData, 1 ),
                        address2: Y.doccirrus.commonutils.buildInsuranceAddressPart( insuranceData, 2 )
                    }
                ]
            }, true );
        } );
    }

    function mapPublicInsurance( args ) {
        return verifyKT( {
            user: args.self.user,
            originalParams: {
                ik: args.iknr,
                ktab: '00',
                catalog: args.ctlg.filename
            }
        } ).then( function( result ) {
            var
                persGroup,
                mapped = args.mapped,
                data = result || {},
                _data = data && data.data && data.data.length && data.data[0] || {},
                mappedStatusUpdate = mapStatusUpdate( mapped.insurance.statusUpdate, args.self.result[0].cardType === 'KVK' );

            if( 1 !== data.code && data.status && data.status.code ) {
                args.self.errors.push( new CardReaderError( data.status.code, {type: (2 === data.code || 5 === data.code) ? 'WARNING' : 'ERROR'} ) );
            }

            persGroup = mapped.insurance.persGroup || mappedStatusUpdate.persGroup;

            args.self.result[0] = Y.mix( args.self.result[0], {
                careDegree: 'NO',
                insuranceStatus: [
                    {
                        type: 'PUBLIC',
                        cardType: args.self.result[0].cardType || undefined,
                        cardTypeGeneration: (mapped.status && mapped.status.generation) || undefined,
                        cdmVersion: (mapped.status && mapped.status.cdmVersion) || undefined,
                        fk4108: (mapped.status && mapped.status.legalNo) || undefined,
                        fk4133: (args.starts && args.starts.utc().toJSON()) || null,
                        fk4110: (args.ends && args.ends.utc().toJSON()) || null,
                        insuranceNo: mapped.insured && mapped.insured.id || undefined,
                        insuranceName: cutToLength( args.insuranceName, INSURANCE_NAME_MAX_LENGTH ),
                        insurancePrintName: cutToLength( _data.abrechnungsbereich, INSURANCE_NAME_MAX_LENGTH ),
                        kv: _data.kv || undefined,
                        insuranceId: args.iknr,
                        insuranceGrpId: (_data.vknr) || mapped.insurance.id || undefined,
                        insuranceCountry: mapped.insurance.costUnit && mapped.insurance.costUnit.locale || undefined,
                        insuranceKind: mapped.insurance.kind || (mapped.insurance.status && mapped.insurance.status[0]),
                        persGroup: persGroup,
                        dmp: mapped.insurance.dmp || mappedStatusUpdate.dmp,
                        costCarrierBillingSection: Y.doccirrus.kbvcommonutils.getCostCarrierBillingSectionByPersGroup( persGroup ),
                        costCarrierBillingGroup: (_data.kostentraegergruppeId) || '00',
                        locationFeatures: mapped.insurance.wop,
                        abrechnungsbereiche: _data.abrechnungsbereiche || {},
                        feeSchedule: _data.gebuehrenordnung || undefined,
                        fused: _data.fused || false,
                        fusedFrom: _data.fusedFrom || null,
                        fusedToInsuranceId: _data.fusedToInsuranceId || null,
                        address1: Y.doccirrus.commonutils.buildInsuranceAddressPart( _data, 1 ),
                        address2: Y.doccirrus.commonutils.buildInsuranceAddressPart( _data, 2 )
                    }
                ]
            }, true );
        } );
    }

    function mapInsurance( data ) {
        var iknr, ctlg, starts, ends, insuranceName, cardError,
            mapped = data.mapped[0],
            original = data.original[0];

        ctlg = getCatalogSDKT();
        // use conKT ("abrechnungs_ik") if there is one
        iknr = original.insurance.costUnit && (original.insurance.costUnit.conKT || original.insurance.costUnit.id) || '';
        iknr = correctShortNum( iknr );

        if( mapped.insurance.starts ) {
            starts = moment( (this.result[0].cardType === 'KVK') ? ('20' + mapped.insurance.starts.substr( 2 ) + mapped.insurance.starts.substr( 0, 2 )) : original.insurance.starts, 'YYYYMMDD' );
        }

        if( mapped.insurance.ends ) {
            ends = moment( (this.result[0].cardType === 'KVK') ? ('20' + mapped.insurance.ends.substr( 2 ) + mapped.insurance.ends.substr( 0, 2 )) : original.insurance.ends, 'YYYYMMDD' );

            // P2-166 KVK -> eGK transformation
            if( this.result[0].cardType === 'KVK' ) {
                ends.endOf( 'month' );
            }

        }

        insuranceName = mapped.insurance && mapped.insurance.costUnit && (mapped.insurance.costUnit.conKTName || mapped.insurance.costUnit.name);

        cardError = Y.doccirrus.commonutils.checkCardValidityDate( starts, ends );
        if( null !== cardError ) {
            this.errors.push( cardError );
        }

        if( isPrivate( iknr ) ) {
            return mapPrivateInsurance();
        } else if( ctlg ) {
            return mapPublicInsurance( {
                iknr: iknr,
                ctlg: ctlg,
                mapped: mapped,
                starts: starts,
                ends: ends,
                insuranceName: insuranceName,
                self: this
            } );
        }

        Y.log( 'SDKT catalogue not found!', 'error', NAME );
        throw Y.doccirrus.errors.rest( 3017, 'SDKT Katalog nicht gefunden!' );
    }

    function checkExistence() {
        var user = this.user,
            cardData = this.result[0];
        return getMatchingPatients( {
            user: user,
            originalParams: {
                cardData: cardData
            }
        } );
    }

    function mapCardData( user, cardData ) {
        var ctx = {user: user, result: [], errors: []};
        return Prom.resolve( cardData ).bind( ctx )
            .then( getData )
            .then( checkData )
            .then( mapBasicData )
            .then( mapInsurance )
            .then( checkExistence )
            .then( function( patientsMatching ) {
                return {
                    patientFromCard: JSON.parse( JSON.stringify( this.result[0] ) ),
                    patientsMatching: JSON.parse( JSON.stringify( patientsMatching ) ),
                    errors: this.errors,
                    originalCardData: cardData
                };
            } );
    }

    Y.doccirrus.cardreader.mapCardData = function( user, cardData, callback ) {
        if( 'function' === typeof callback ) {
            mapCardData( user, cardData ).asCallback( callback );
        } else {
            return mapCardData( user, cardData );
        }
    };

}, '0.0.1', {
    lang: ['en', 'de', 'de-ch'],
    requires: ['dckbvdate', 'catalog-api', 'patient-api', 'dckbvutils']
} );
