/**
 * User: do
 * Date: 19/02/18  11:00
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
/*jslint anon:true, nomen:true*/


/**
 */



YUI.add( 'kvk-parser', function( Y/*, NAME*/ ) {

    /**
     * @modul doccirrus.cardreader.parsers.kvk
     *
     * tag  length  value                                                                           optional    Daten typ
     * '60' 70-212  VersichertenDatenTemplate
     * '80' 2-28    KrankenKassenName                                                                           AN
     * '81' 7       KrankenKassenNummer                                                                         N
     * '8F' 5       VKNR/ WOP-Kennzeichen*) 1)                                                                  N
     * '82' 6-12    VersichertenNummer                                                                          N
     * '83' 4       VersichertenStatus1) (siehe Anhang 6.8)                                                     N
     * '90' 1-3     StatusErgänzung1) 4)                                                                        AN
     * '84' 2-15    Titel2) (mehrere Titel sind durch Blank getrennt)                               o           AN
     * '85' 1-28    VorName1) 2) (mehrere Vornamen sind durch Bindestrich oder Blank getrennt                   AN
     * '86' 1-15    NamensZusatz/VorsatzWort2) (mehrere Namenszusätze sind durch Blank getrennt)    o           AN
     * '87' 2-28    FamilienName                                                                                AN
     * '88' 8       GeburtsDatum (TTMMJJJJ)                                                                     N
     * '89' 2-28    StraßenName&HausNummer (durch Blank getrennt)                                   o           AN
     * '8A' 1-3     WohnsitzLänderCode3) (Datenobjekt entfällt bei Defaultwert = D)                 o           AN
     * '8B' 4-7     Postleitzahl3)                                                                              N AN
     *
     * '8C' 2-22    OrtsName 1),3) (mehrere Namensbestandteile durch Blank oder Sonderzeichen getrennt)         AN
     * '8D' 4       GültigkeitsDatum1) (MMJJ)                                                                   N
     * '8E' 1       PrüfSumme (XOR) über das gesamte VersichertenDaten-Template                                 XOR
     */

    const
        moment = require( 'moment' ),
        getObject = Y.doccirrus.commonutils.getObject,
        getTerminalTypeFromDeviceType = Y.doccirrus.cardreader.parsers.utils.getTerminalTypeFromDeviceType,
        simpleAsn1Parser = Y.doccirrus.cardreader.parsers.utils.simpleAsn1Parser,
        Promise = require( 'bluebird' ),
        PRIVATE_IKNR = '0000000',
        isPrivateInsuranceId = (iknr => PRIVATE_IKNR === iknr),
        tags = [
            {tag: Number( 0x80 ), len: [2, 28],  propName: 'KrankenKassenName',             optional: false},
            {tag: Number( 0x81 ), len: 7,        propName: 'KrankenKassenNummer',           optional: false},
            {tag: Number( 0x8F ), len: 5,        propName: 'VKNR_WOP_Kennzeichen',         optional: false},
            {tag: Number( 0x82 ), len: [6, 12],  propName: 'VersichertenNummer',            optional: false},
            {tag: Number( 0x83 ), len: 4,        propName: 'VersichertenStatus',            optional: false},
            {tag: Number( 0x90 ), len: [1, 3],   propName: 'StatusErgänzung',               optional: false},
            {tag: Number( 0x84 ), len: [2, 15],  propName: 'Titel',                         optional: true},
            {tag: Number( 0x85 ), len: [1, 28],  propName: 'VorName',                       optional: false},
            {tag: Number( 0x86 ), len: [1, 15],  propName: 'NamensZusatz_VorsatzWort',      optional: true},
            {tag: Number( 0x87 ), len: [2, 28],  propName: 'FamilienName',                  optional: false},
            {tag: Number( 0x88 ), len: 8,        propName: 'GeburtsDatum',                  optional: false},
            {tag: Number( 0x89 ), len: [2 - 28], propName: 'StraßenName_HausNummer',        optional: true},
            {tag: Number( 0x8A ), len: [1 - 3],  propName: 'WohnsitzLänderCode',            optional: true},
            {tag: Number( 0x8B ), len: [4 - 7],  propName: 'Postleitzahl',                  optional: false},
            {tag: Number( 0x8C ), len: [2 - 22], propName: 'OrtsName',                      optional: false},
            {tag: Number( 0x8D ), len: 4,        propName: 'GültigkeitsDatum',              optional: false},
            {tag: Number( 0x8E ), len: 1,        propName: 'PrüfSumme',                     optional: false},
            {tag: Number( 0x91 ), len: 8,        propName: 'Einlesedatum',                  optional: false},
            {tag: Number( 0x92 ), len: 37,       propName: 'Zulassungsnummer',              optional: false},
            {tag: Number( 0x93 ), len: 1,        propName: 'Prüfsumme',                     optional: false}

        ],
        kvkToObj = ( rawData ) => {
            const
                // TODO: search better solution to equalzier test and data base data
                buff = rawData.kvkBuffer && rawData.kvkBuffer.buffer ? Buffer.from( rawData.kvkBuffer.buffer, 'base64' ) : Buffer.from( rawData.kvkBuffer, 'base64' );

            return simpleAsn1Parser( buff, tags );
        },

        NAME_MAX_LENGTH = Y.doccirrus.cardreader.parsers.utils.NAME_MAX_LENGTH,
        NAME_EXT_MAX_LENGTH = Y.doccirrus.cardreader.parsers.utils.NAME_EXT_MAX_LENGTH,
        STREET_MAX_LENGTH = Y.doccirrus.cardreader.parsers.utils.STREET_MAX_LENGTH,
        HOUSENO_MAX_LENGTH = Y.doccirrus.cardreader.parsers.utils.HOUSENO_MAX_LENGTH,
        ZIP_MAX_LENGTH = Y.doccirrus.cardreader.parsers.utils.ZIP_MAX_LENGTH,
        CITY_MAX_LENGTH = Y.doccirrus.cardreader.parsers.utils.CITY_MAX_LENGTH,
        COUNTRYCODE_MAX_LENGTH = Y.doccirrus.cardreader.parsers.utils.COUNTRYCODE_MAX_LENGTH,
        POSTBOX_MAX_LENGTH = Y.doccirrus.cardreader.parsers.utils.POSTBOX_MAX_LENGTH,
        INSURANCE_NAME_MAX_LENGTH = Y.doccirrus.cardreader.parsers.utils.INSURANCE_NAME_MAX_LENGTH,

        checkAndGetInsuranceData = Y.doccirrus.cardreader.parsers.utils.checkAndGetInsuranceData,
        getPrivateInsurance = Y.doccirrus.cardreader.parsers.utils.getPrivateInsurance,
        cutToLength = Y.doccirrus.cardreader.parsers.utils.cutToLength;

    function getAddresses( result ) {
        const
            addresses = [],
            streetAndHouseno = getObject( 'StraßenName_HausNummer', result ),
            isPbox = streetAndHouseno && streetAndHouseno.includes( 'Postfach' );

        if( !isPbox ) {
            const lastIndexOfSpace = !streetAndHouseno ? -1 : streetAndHouseno.lastIndexOf( ' ' );
            let street = streetAndHouseno, houseno = '';
            if( -1 !== lastIndexOfSpace ) {
                street = streetAndHouseno.substr( 0, lastIndexOfSpace );
                houseno = streetAndHouseno.substr( lastIndexOfSpace + 1 );
            }
            addresses.push( {
                kind: 'OFFICIAL',
                street: cutToLength( street, STREET_MAX_LENGTH ),
                houseno: cutToLength( houseno, HOUSENO_MAX_LENGTH ),
                zip: cutToLength( getObject( 'Postleitzahl', result ), ZIP_MAX_LENGTH ),
                city: cutToLength( getObject( 'OrtsName', result ), CITY_MAX_LENGTH ),
                countryCode: cutToLength( getObject( 'WohnsitzLänderCode', result ) || 'D', COUNTRYCODE_MAX_LENGTH ), // TODO: set country too
                addon: ''
            } );
        } else {
            addresses.push( {
                kind: 'POSTBOX',
                city: cutToLength( getObject( 'OrtsName', result ), CITY_MAX_LENGTH ),
                countryCode: cutToLength( getObject( 'WohnsitzLänderCode', result ), COUNTRYCODE_MAX_LENGTH ), // TODO: set country too
                postbox: cutToLength( streetAndHouseno, POSTBOX_MAX_LENGTH ),
                zip: cutToLength( getObject( 'Postleitzahl', result ), ZIP_MAX_LENGTH )
            } );
        }
        return addresses;
    }

    function mapStatusUpdate( statusUpdate ) {
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
        if( -1 !== ['4', '6', '7', '8'].indexOf( statusUpdate ) ) {
            result.persGroup = statusUpdate;
        } else if( statusUpdate in dmpMap ) {
            result.dmp = dmpMap[statusUpdate];
        }
        return result;
    }

    function getInsuranceStatus( result, deviceType, insuranceId, catalogData ) {
        const
            status = getObject( 'VersichertenStatus', result ),
            vknrOrWop = getObject( 'VKNR_WOP_Kennzeichen', result ),
            wop = (vknrOrWop || '').includes( '000' ) ? vknrOrWop.substring( vknrOrWop.length - 2, vknrOrWop.length ) : null,
            statusUpdate = mapStatusUpdate( getObject( 'StatusErgänzung', result ) ),
            ends = getObject( 'GültigkeitsDatum', result ),
            endsDate = ends ? (moment( ends, 'MMYY' ).endOf( 'month' )) : null,
            insuranceStatus = {
                type: 'PUBLIC',
                cardType: 'KVK',
                terminalType: getTerminalTypeFromDeviceType( deviceType ),
                cardTypeGeneration: '0',
                cdmVersion: null,
                fk4108: '',
                fk4133: null,
                fk4110: (endsDate && endsDate.utc().toJSON()) || null,
                insuranceNo: getObject( 'VersichertenNummer', result ),
                insuranceName: cutToLength( getObject( 'KrankenKassenName', result ), INSURANCE_NAME_MAX_LENGTH ).trim().replace(/^\W/, ''),
                insurancePrintName: cutToLength( catalogData.abrechnungsbereich, INSURANCE_NAME_MAX_LENGTH ).trim().replace(/^\W/, ''),
                kv: catalogData.kv,
                insuranceId: insuranceId,
                insuranceGrpId: catalogData.vknr,
                insuranceCountry: null,
                cardSwipe: null,
                insuranceKind: status && status[0] || null,
                persGroup: statusUpdate.persGroup || '',
                dmp: statusUpdate.dmp || '',
                costCarrierBillingSection: Y.doccirrus.kbvcommonutils.getCostCarrierBillingSectionByPersGroup( statusUpdate.persGroup ),
                costCarrierBillingGroup: (catalogData.kostentraegergruppeId) || '00',
                locationFeatures: wop,
                abrechnungsbereiche: catalogData.abrechnungsbereiche || {},
                feeSchedule: catalogData.gebuehrenordnung,
                fused: catalogData.fused || false,
                address1: Y.doccirrus.commonutils.buildInsuranceAddressPart( catalogData, 1 ),
                address2: Y.doccirrus.commonutils.buildInsuranceAddressPart( catalogData, 2 )
            };

        if( 'mobile' === deviceType ) {
            let cardSwipe = getObject( 'Einlesedatum', result );
            if( cardSwipe ) {
                insuranceStatus.cardSwipe = moment( cardSwipe, 'DDMMYYYY' ).utc().toJSON();
            }
            let fk4108 = (getObject( 'Zulassungsnummer', result ) || '').trim().replace( /[^ -~]+/g, '' );
            if( cardSwipe ) {
                insuranceStatus.fk4108 = fk4108;
            }
        }
        return insuranceStatus;
    }

    function getPrivateInsuranceStatus( result, deviceType, insuranceId, catalogData ) {
        const
            ends = getObject( 'GültigkeitsDatum', result ),
            endsDate = ends ? (moment( ends, 'MMYY' ).endOf( 'month' )) : null,
            insuranceStatus = {
                type: 'PRIVATE',
                cardType: 'KVK',
                terminalType: getTerminalTypeFromDeviceType( deviceType ),
                cardTypeGeneration: '0',
                cdmVersion: null,
                fk4108: '',
                fk4133: null,
                fk4110: (endsDate && endsDate.utc().toJSON()) || null,
                insuranceNo: getObject( 'VersichertenNummer', result ),
                insuranceName: cutToLength( getObject( 'KrankenKassenName', result ), INSURANCE_NAME_MAX_LENGTH ),
                insuranceId: insuranceId,
                insuranceGrpId: catalogData.vknr,
                insuranceCountry: null,
                feeSchedule: '3',
                address1: Y.doccirrus.commonutils.buildInsuranceAddressPart( catalogData, 1 ),
                address2: Y.doccirrus.commonutils.buildInsuranceAddressPart( catalogData, 2 )
            };

        return insuranceStatus;
    }

    function getKbvDobKvk( str ) {
        var
            parsed = /(\d\d)(\d\d)(\d\d\d\d)/.exec( str );

        if( null === parsed || 4 > parsed.length ) {
            return '';
        }
        return parsed[1] + '.' +
               parsed[2] + '.' +
               parsed[3];
    }

    function parse( user, rawData ) {
        return Promise.resolve().then( () => {
            const
                kvkObj = kvkToObj( rawData ),
                patient = {
                    firstname: cutToLength( getObject( 'VorName', kvkObj ), NAME_MAX_LENGTH ),
                    lastname: cutToLength( getObject( 'FamilienName', kvkObj ), NAME_MAX_LENGTH ),
                    gender: null,
                    talk: '',
                    kbvDob: getKbvDobKvk( getObject( 'GeburtsDatum', kvkObj ) ),
                    // NamensZusatz_VorsatzWort => 3100 Namenszusatz
                    nameaffix: cutToLength( getObject( 'NamensZusatz_VorsatzWort', kvkObj ), NAME_EXT_MAX_LENGTH ),
                    fk3120: '',
                    title: cutToLength( getObject( 'Titel', kvkObj ), NAME_EXT_MAX_LENGTH ),
                    addresses: getAddresses( kvkObj ),
                    insuranceStatus: []
                };

            // transform kbvDob string to date object
            let kbvDate = new Y.doccirrus.KBVDateValidator( patient.kbvDob );
            patient.dob = kbvDate.getISOString();

            let insuranceId = getObject( 'KrankenKassenNummer', kvkObj );
            const
                insuranceName = getObject( 'KrankenKassenName', kvkObj ),
                isPrivate = isPrivateInsuranceId( insuranceId );

            if( !isPrivate ) {
                insuranceId = ('10' + insuranceId);
            } else {
                delete patient.gender; // Never take empty gender from private cards. For KVK this is mandatory.
            }

            return (isPrivate ? getPrivateInsurance( insuranceName ) : checkAndGetInsuranceData( user, insuranceId )).then( ( insuranceResult ) => {
                if( isPrivate ) {
                    patient.insuranceStatus.push( getPrivateInsuranceStatus( kvkObj, rawData.deviceType, insuranceId, (insuranceResult.data && insuranceResult.data[0] || {}) ) );
                } else {
                    patient.insuranceStatus.push( getInsuranceStatus( kvkObj, rawData.deviceType, insuranceId, (insuranceResult.data || {}) ) );
                }
                return {patient, feedback: insuranceResult.feedback};
            } );

        } );
    }

    Y.namespace( 'doccirrus.cardreader.parsers' ).kvk = {
        parse
    };

}, '0.0.1', {
    lang: ['en', 'de', 'de-ch'],
    requires: ['dccommonutils', 'card-parser-utils', 'dckbvdate']
} );
