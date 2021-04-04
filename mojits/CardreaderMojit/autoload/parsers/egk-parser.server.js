/**
 * User: do
 * Date: 15/02/18  16:16
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI */

YUI.add( 'egk-parser', function( Y/*, NAME*/ ) {

    /**
     * @modul doccirrus.cardreader.parsers.egk
     */

    const
        moment = require( 'moment' ),
        getObject = Y.doccirrus.commonutils.getObject,
        Promise = require( 'bluebird' ),
        XmlParser = require( 'xml2js' ).Parser,
        XmlParserProcessors = require( 'xml2js' ).processors,
        xmlParser = new XmlParser( {
            tagNameProcessors: [XmlParserProcessors.stripPrefix]
        } ),

        NAME_MAX_LENGTH = Y.doccirrus.cardreader.parsers.utils.NAME_MAX_LENGTH,
        NAME_EXT_MAX_LENGTH = Y.doccirrus.cardreader.parsers.utils.NAME_EXT_MAX_LENGTH,
        STREET_MAX_LENGTH = Y.doccirrus.cardreader.parsers.utils.STREET_MAX_LENGTH,
        HOUSENO_MAX_LENGTH = Y.doccirrus.cardreader.parsers.utils.HOUSENO_MAX_LENGTH,
        ZIP_MAX_LENGTH = Y.doccirrus.cardreader.parsers.utils.ZIP_MAX_LENGTH,
        CITY_MAX_LENGTH = Y.doccirrus.cardreader.parsers.utils.CITY_MAX_LENGTH,
        COUNTRYCODE_MAX_LENGTH = Y.doccirrus.cardreader.parsers.utils.COUNTRYCODE_MAX_LENGTH,
        ADDON_MAX_LENGTH = Y.doccirrus.cardreader.parsers.utils.ADDON_MAX_LENGTH,
        POSTBOX_MAX_LENGTH = Y.doccirrus.cardreader.parsers.utils.POSTBOX_MAX_LENGTH,
        INSURANCE_NAME_MAX_LENGTH = Y.doccirrus.cardreader.parsers.utils.INSURANCE_NAME_MAX_LENGTH,

        checkAndGetInsuranceData = Y.doccirrus.cardreader.parsers.utils.checkAndGetInsuranceData,
        mapGender = Y.doccirrus.cardreader.parsers.utils.mapGender,
        mapTalk = Y.doccirrus.cardreader.parsers.utils.mapTalk,
        getKbvDob = Y.doccirrus.cardreader.parsers.utils.getKbvDob,
        getTerminalTypeFromDeviceType = Y.doccirrus.cardreader.parsers.utils.getTerminalTypeFromDeviceType,
        parseStatusDetails = Y.doccirrus.cardreader.parsers.utils.parseStatusDetails,
        cutToLength = Y.doccirrus.cardreader.parsers.utils.cutToLength;

    function parseXml( str ) {
        return new Promise( ( resolve, reject ) => {
            xmlParser.parseString( str, ( err, result ) => {
                if( err ) {
                    reject( err );
                    return;
                }
                resolve( result );
            } );
        } );
    }

    function getAddresses( result ) {
        const
            addresses = [],
            streetAddress = getObject( 'patient.UC_PersoenlicheVersichertendatenXML.Versicherter.0.Person.0.StrassenAdresse.0', result ),
            pboxAddress = getObject( 'patient.UC_PersoenlicheVersichertendatenXML.Versicherter.0.Person.0.PostfachAdresse.0', result );

        let countryOfAddress = '';

        if( streetAddress ) {
            countryOfAddress = streetAddress.Land[0].Wohnsitzlaendercode[0];
            addresses.push( {
                kind: 'OFFICIAL',
                street: cutToLength( getObject( 'Strasse.0', streetAddress ), STREET_MAX_LENGTH ),
                houseno: cutToLength( getObject( 'Hausnummer.0', streetAddress ), HOUSENO_MAX_LENGTH ),
                zip: countryOfAddress === 'D' ? cutToLength( getObject( 'Postleitzahl.0', streetAddress ), ZIP_MAX_LENGTH ) : '',
                city: cutToLength( getObject( 'Ort.0', streetAddress ), CITY_MAX_LENGTH ),
                countryCode: cutToLength( getObject( 'Land.0.Wohnsitzlaendercode.0', streetAddress ), COUNTRYCODE_MAX_LENGTH ), // TODO: set country too
                addon: cutToLength( getObject( 'Anschriftenzusatz.0', streetAddress ), ADDON_MAX_LENGTH )
            } );
        }

        if( pboxAddress ) {
            countryOfAddress = pboxAddress.Land[0].Wohnsitzlaendercode[0];
            addresses.push( {
                kind: 'POSTBOX',
                city: cutToLength( getObject( 'Ort.0', pboxAddress ), CITY_MAX_LENGTH ),
                countryCode: cutToLength( getObject( 'Land.0.Wohnsitzlaendercode.0', pboxAddress ), COUNTRYCODE_MAX_LENGTH ), // TODO: set country too
                postbox: cutToLength( getObject( 'Postfach.0', pboxAddress ), POSTBOX_MAX_LENGTH ),
                zip: countryOfAddress === 'D' ? cutToLength( getObject( 'Postleitzahl.0', pboxAddress ), ZIP_MAX_LENGTH ) : ''
            } );
        }
        return addresses;
    }

    function getInsuranceStatus( result, cardVersion, deviceType, status, insuranceId, catalogData ) {

        const
            parsedStatusDetails = parseStatusDetails( status ),
            start = getObject( 'common.UC_AllgemeineVersicherungsdatenXML.Versicherter.0.Versicherungsschutz.0.Beginn.0', result ),
            end = getObject( 'common.UC_AllgemeineVersicherungsdatenXML.Versicherter.0.Versicherungsschutz.0.Ende.0', result ),
            persGroup = getObject( 'protected.UC_GeschuetzteVersichertendatenXML.BesonderePersonengruppe.0', result ) ||
                        getObject( 'protected.UC_GeschuetzteVersichertendatenXML.Besondere_Personengruppe.0', result ),
            costCarrierBillingSection = Y.doccirrus.kbvcommonutils.getCostCarrierBillingSectionByPersGroup( persGroup ),
            insurancePrintName = cutToLength( catalogData.abrechnungsbereiche && catalogData.abrechnungsbereiche[costCarrierBillingSection] || catalogData.abrechnungsbereich, INSURANCE_NAME_MAX_LENGTH ),
            insuranceName = cutToLength( getObject( 'common.UC_AllgemeineVersicherungsdatenXML.Versicherter.0.Versicherungsschutz.0.Kostentraeger.0.Name.0', result ), INSURANCE_NAME_MAX_LENGTH ),
            insuranceNameCostUnit = cutToLength( getObject( 'common.UC_AllgemeineVersicherungsdatenXML.Versicherter.0.Versicherungsschutz.0.Kostentraeger.0.AbrechnenderKostentraeger.0.Name.0', result ), INSURANCE_NAME_MAX_LENGTH ),
            insuranceCountry = getObject( 'common.UC_AllgemeineVersicherungsdatenXML.Versicherter.0.Versicherungsschutz.0.Kostentraeger.0.Kostentraegerlaendercode.0', result ),
            insuranceCountryCostUnit = getObject( 'common.UC_AllgemeineVersicherungsdatenXML.Versicherter.0.Versicherungsschutz.0.Kostentraeger.0.AbrechnenderKostentraeger.0.Kostentraegerlaendercode.0', result ),
            fk3010 = getObject( 'validation.PN.TS.0', result ), // JJJJMMTThhmmss
            fk3011 = getObject( 'validation.PN.E.0', result ),
            fk3012 = getObject( 'validation.PN.EC.0', result ),
            fk3013 = getObject( 'validation.PN.PZ.0', result ),
            insuranceStatus = {
                type: 'PUBLIC',
                cardType: 'EGK',
                terminalType: getTerminalTypeFromDeviceType( deviceType ),
                cardTypeGeneration: refineCardVersion( cardVersion ),
                cdmVersion: getObject( 'patient.UC_PersoenlicheVersichertendatenXML.$.CDM_VERSION', result ),
                fk4108: '',
                fk4133: (start && moment( start, 'YYYYMMDD' ).utc().toJSON()) || null,
                fk4110: (end && moment( end, 'YYYYMMDD' ).utc().toJSON()) || null,
                insuranceNo: getObject( 'patient.UC_PersoenlicheVersichertendatenXML.Versicherter.0.Versicherten_ID.0', result ),
                insuranceName: insuranceNameCostUnit || insuranceName,
                insurancePrintName,
                kv: catalogData.kv,
                insuranceId: insuranceId,
                insuranceGrpId: catalogData.vknr,
                insuranceCountry: insuranceCountryCostUnit || insuranceCountry,
                cardSwipe: null,
                insuranceKind: getObject( 'common.UC_AllgemeineVersicherungsdatenXML.Versicherter.0.Zusatzinfos.0.ZusatzinfosGKV.0.Versichertenart.0', result ),
                persGroup: persGroup || '',
                dmp: getObject( 'protected.UC_GeschuetzteVersichertendatenXML.DMP_Kennzeichnung.0', result ) || '',
                costCarrierBillingSection,
                costCarrierBillingGroup: (catalogData.kostentraegergruppeId) || '00',
                locationFeatures: getObject( 'common.UC_AllgemeineVersicherungsdatenXML.Versicherter.0.Zusatzinfos.0.ZusatzinfosGKV.0.Zusatzinfos_Abrechnung_GKV.0.WOP.0', result ),
                abrechnungsbereiche: catalogData.abrechnungsbereiche || {},
                feeSchedule: catalogData.gebuehrenordnung,
                fused: catalogData.fused || false,
                address1: Y.doccirrus.commonutils.buildInsuranceAddressPart( catalogData, 1 ),
                address2: Y.doccirrus.commonutils.buildInsuranceAddressPart( catalogData, 2 ),
                fk3010: fk3010,
                fk3011: fk3011,
                fk3012: fk3012,
                fk3013: fk3013 ? fk3013.replace( /\n|\r/gm, '' ) : undefined // KVDT KP2-185 (5)
            };

        if( 'mobile' === deviceType ) {
            let cardSwipe = getObject( 'Einlesedatum', parsedStatusDetails );
            if( cardSwipe ) {
                insuranceStatus.cardSwipe = moment( cardSwipe, 'DDMMYYYY' ).utc().toJSON();
            }
            let fk4108 = getObject( 'Zulassungsnummer', parsedStatusDetails );
            if( cardSwipe ) {
                insuranceStatus.fk4108 = fk4108.trim();
            }
        }
        return insuranceStatus;
    }

    function refineCardVersion( cardVersion ) {
        if( 'G1+' === cardVersion ) {
            return 'G1plus';
        }
        return cardVersion || '0';
    }

    function parse( user, rawData ) {
        return Promise.props( {
            patient: parseXml( rawData.patient ),
            common: parseXml( rawData.insurance.common ),
            protected: rawData.insurance.protected ? parseXml( rawData.insurance.protected ) : {},
            validation: rawData.validation ? parseXml( rawData.validation ) : {}
        } ).then( ( result ) => {
            const
                patient = {
                    firstname: cutToLength( getObject( 'patient.UC_PersoenlicheVersichertendatenXML.Versicherter.0.Person.0.Vorname.0', result ), NAME_MAX_LENGTH ),
                    lastname: cutToLength( getObject( 'patient.UC_PersoenlicheVersichertendatenXML.Versicherter.0.Person.0.Nachname.0', result ), NAME_MAX_LENGTH ),
                    gender: mapGender( getObject( 'patient.UC_PersoenlicheVersichertendatenXML.Versicherter.0.Person.0.Geschlecht.0', result ) ),
                    talk: mapTalk( getObject( 'patient.UC_PersoenlicheVersichertendatenXML.Versicherter.0.Person.0.Geschlecht.0', result ) ),
                    kbvDob: getKbvDob( getObject( 'patient.UC_PersoenlicheVersichertendatenXML.Versicherter.0.Person.0.Geburtsdatum.0', result ) ),
                    nameaffix: cutToLength( getObject( 'patient.UC_PersoenlicheVersichertendatenXML.Versicherter.0.Person.0.Namenszusatz.0', result ) || '', NAME_EXT_MAX_LENGTH ),
                    fk3120: cutToLength( getObject( 'patient.UC_PersoenlicheVersichertendatenXML.Versicherter.0.Person.0.Vorsatzwort.0', result ) || '', NAME_EXT_MAX_LENGTH ),
                    title: cutToLength( getObject( 'patient.UC_PersoenlicheVersichertendatenXML.Versicherter.0.Person.0.Titel.0', result ), NAME_EXT_MAX_LENGTH ),
                    addresses: getAddresses( result ),
                    insuranceStatus: []
                };

            // transform kbvDob string to date object
            let kbvDate = new Y.doccirrus.KBVDateValidator( patient.kbvDob );
            patient.dob = kbvDate.getISOString();

            const
                insuranceId = cutToLength( getObject( 'common.UC_AllgemeineVersicherungsdatenXML.Versicherter.0.Versicherungsschutz.0.Kostentraeger.0.Kostentraegerkennung.0', result ), INSURANCE_NAME_MAX_LENGTH ),
                insuranceIdCostUnit = getObject( 'common.UC_AllgemeineVersicherungsdatenXML.Versicherter.0.Versicherungsschutz.0.Kostentraeger.0.AbrechnenderKostentraeger.0.Kostentraegerkennung.0', result );

            return checkAndGetInsuranceData( user, (insuranceIdCostUnit || insuranceId) ).then( ( insuranceResult ) => {
                patient.insuranceStatus.push( getInsuranceStatus( result, rawData.cardVersion, rawData.deviceType, rawData.status, (insuranceIdCostUnit || insuranceId), (insuranceResult.data || {}) ) );
                return {patient, feedback: insuranceResult.feedback};
            } );
        } );
    }

    Y.namespace( 'doccirrus.cardreader.parsers' ).egk = {
        parse
    };

}, '0.0.1', {
    lang: ['en', 'de', 'de-ch'],
    requires: ['dccommonutils', 'card-parser-utils', 'dckbvdate']
} );
