/**
 * User: do
 * Date: 09/11/17  13:02
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'edoc-converter', function( Y, NAME ) {
        const
            moment = require( 'moment' ),
            xmlbuilder = require( 'xmlbuilder' ),
            Promise = require( 'bluebird' ),
            COPD_4_0_0_LAST_QUARTER = Y.doccirrus.edmpcommonutils.COPD_4_0_0_LAST_QUARTER,
            PARTICIPATION_CHRONICHEART_FAILURE_LAST_QUARTER = Y.doccirrus.edmpcommonutils.PARTICIPATION_CHRONICHEART_FAILURE_LAST_QUARTER,
            DMP_PERS_GROUP_CHANGES_LAST_QUARTER = Y.doccirrus.edmpcommonutils.DMP_PERS_GROUP_CHANGES_LAST_QUARTER,
            Q3_2018 = Y.doccirrus.edmpcommonutils.Q3_2018,
            Q4_2018 = Y.doccirrus.edmpcommonutils.EHKS_V2_3_2_LAST_QUARTER,
            Q1_2019 = Y.doccirrus.edmpcommonutils.Q1_2019,
            Q3_2019 = Y.doccirrus.edmpcommonutils.Q3_2019,
            Q1_2021 = Y.doccirrus.edmpcommonutils.Q1_2021,
            getObject = Y.doccirrus.commonutils.getObject,
            isHgv = Y.doccirrus.schemas.activity.isHgv,
            operatorMatcher = /^\$(\S*):(\S*)/,
            VALUE_RESULT_TYPE = 'value',
            delay = ( ms ) => {
                return new Promise( resolve => {
                    setTimeout( () => {
                        resolve();
                    }, ms || 0 );
                } );
            },
            convert = ( args, processCfg ) => {
                const
                    context = args.context,
                    writer = args.writer;

                let doc = xmlbuilder.begin( writer.write.bind( writer ) ),
                    iterate = part => {
                        return Promise.resolve( delay( 0 ) ).then( () => {
                            if( Array.isArray( part ) ) {
                                return Promise.each( part, iterate );
                            }

                            if( 'object' === typeof part ) {
                                let key = Object.keys( part )[0];
                                let opMatchResult = operatorMatcher.exec( key );

                                part = part[key];

                                if( null !== opMatchResult ) {
                                    let op = opMatchResult[1];
                                    let path = opMatchResult[2];
                                    let pathValue = getObject( path, context );
                                    if( op === 'if' && true === pathValue ) {
                                        return Promise.resolve( iterate( part ) );
                                    } else if( op === 'switch' ) {

                                        let keys = Object.keys( part );
                                        let idx = keys.indexOf( pathValue );

                                        if( -1 !== idx ) {
                                            return Promise.resolve( iterate( part[keys[idx]] ) );
                                        }
                                    }

                                    return;
                                }
                                return Promise.resolve( iterate( part ) );
                            }

                            if( 'function' === typeof part ) {
                                return Promise.resolve( part( doc, context ) ).then( _doc => {
                                    // _doc is the current element returned by converter function
                                    doc = _doc;
                                } );
                            }
                        } );
                    };

                return Promise.each( processCfg, iterate ).then( () => {
                    doc.end();
                    return writer.end();
                } );
            },

            actTypeSchemaVersionMap = {
                DM1: {
                    name: 'XSD_EDM1',
                    version: '4.11'
                },
                DM2: {
                    name: 'XSD_EDM2',
                    version: '5.11'
                },
                BK: {
                    name: 'XSD_BK',
                    version: '4.20'
                },
                KHK: {
                    name: 'XSD_EKHK',
                    version: '4.11'
                },
                ASTHMA: {
                    name: 'XSD_EAB',
                    version: '4.41'
                },
                COPD: {
                    name: 'XSD_ECOPD',
                    version: '3.41'
                },
                EHKSD: {
                    name: 'XSD_EHKS',
                    version: '2.31'
                }
            },

            actTypeSchemaVersionAfterQ1_2018Map = {
                DM1: {
                    name: 'XSD_EDM1',
                    version: '5.01'
                },
                DM2: {
                    name: 'XSD_EDM2',
                    version: '6.01'
                },
                BK: {
                    name: 'XSD_BK',
                    version: '4.20'
                },
                KHK: {
                    name: 'XSD_EKHK',
                    version: '4.12'
                },
                ASTHMA: {
                    name: 'XSD_EAB',
                    version: '4.42'
                },
                COPD: {
                    name: 'XSD_ECOPD',
                    version: '4.01'
                },
                EHKSD: {
                    name: 'XSD_EHKS',
                    version: '2.31'
                },
                EHKSND: {
                    name: 'XSD_EHKS',
                    version: '2.31'
                }
            },

            actTypeSchemaVersionAfterQ2_2018Map = {
                DM1: {
                    name: 'XSD_EDM1',
                    version: '5.02'
                },
                DM2: {
                    name: 'XSD_EDM2',
                    version: '6.02'
                },
                BK: {
                    name: 'XSD_BK',
                    version: '4.21'
                },
                KHK: {
                    name: 'XSD_EKHK',
                    version: '4.13'
                },
                ASTHMA: {
                    name: 'XSD_EAB',
                    version: '4.43'
                },
                COPD: {
                    name: 'XSD_ECOPD',
                    version: '4.02'
                },
                EHKSD: {
                    name: 'XSD_EHKS',
                    version: '2.31'
                },
                EHKSND: {
                    name: 'XSD_EHKS',
                    version: '2.31'
                }
            },

            actTypeSchemaVersionAfterQ3_2018Map = {
                DM1: {
                    name: 'XSD_EDM1',
                    version: '5.02'
                },
                DM2: {
                    name: 'XSD_EDM2',
                    version: '6.02'
                },
                BK: {
                    name: 'XSD_BK',
                    version: '4.23'
                },
                KHK: {
                    name: 'XSD_EKHK',
                    version: '4.13'
                },
                ASTHMA: {
                    name: 'XSD_EAB',
                    version: '4.43'
                },
                COPD: {
                    name: 'XSD_ECOPD',
                    version: '4.02'
                },
                EHKSD: {
                    name: 'XSD_EHKS',
                    version: '2.31'
                },
                EHKSND: {
                    name: 'XSD_EHKS',
                    version: '2.31'
                }
            },

            actTypeSchemaVersionAfterQ4_2018Map = {
                DM1: {
                    name: 'XSD_EDM1',
                    version: '5.02'
                },
                DM2: {
                    name: 'XSD_EDM2',
                    version: '6.02'
                },
                BK: {
                    name: 'XSD_BK',
                    version: '4.23'
                },
                KHK: {
                    name: 'XSD_EKHK',
                    version: '4.13'
                },
                ASTHMA: {
                    name: 'XSD_EAB',
                    version: '4.43'
                },
                COPD: {
                    name: 'XSD_ECOPD',
                    version: '4.02'
                },
                EHKSD: {
                    name: 'XSD_EHKS',
                    version: '2.32'
                },
                EHKSND: {
                    name: 'XSD_EHKS',
                    version: '2.32'
                }
            },

            actTypeSchemaVersionAfterQ1_2019Map = {
                DM1: {
                    name: 'XSD_EDM1',
                    version: '5.03'
                },
                DM2: {
                    name: 'XSD_EDM2',
                    version: '6.03'
                },
                BK: {
                    name: 'XSD_BK',
                    version: '4.23'
                },
                KHK: {
                    name: 'XSD_EKHK',
                    version: '4.14'
                },
                ASTHMA: {
                    name: 'XSD_EAB',
                    version: '4.44'
                },
                COPD: {
                    name: 'XSD_ECOPD',
                    version: '4.03'
                },
                EHKSD: {
                    name: 'XSD_EHKS',
                    version: '2.32'
                },
                EHKSND: {
                    name: 'XSD_EHKS',
                    version: '2.32'
                }
            },

            actTypeSchemaVersionAfterQ3_2019Map = {
                DM1: {
                    name: 'XSD_EDM1',
                    version: '5.03'
                },
                DM2: {
                    name: 'XSD_EDM2',
                    version: '6.03'
                },
                BK: {
                    name: 'XSD_BK',
                    version: '4.23'
                },
                KHK: {
                    name: 'XSD_EKHK',
                    version: '4.14'
                },
                ASTHMA: {
                    name: 'XSD_EAB',
                    version: '4.44'
                },
                COPD: {
                    name: 'XSD_ECOPD',
                    version: '4.03'
                },
                EHKSD: {
                    name: 'XSD_EHKS',
                    version: '2.33'
                },
                EHKSND: {
                    name: 'XSD_EHKS',
                    version: '2.33'
                }
            },

            actTypeSchemaVersionAfterQ1_2021Map = {
                DM1: {
                    name: 'XSD_EDM1',
                    version: '5.04'
                },
                DM2: {
                    name: 'XSD_EDM2',
                    version: '6.04'
                },
                BK: {
                    name: 'XSD_BK',
                    version: '4.23'
                },
                KHK: {
                    name: 'XSD_EKHK',
                    version: '4.15'
                },
                ASTHMA: {
                    name: 'XSD_EAB',
                    version: '4.45'
                },
                COPD: {
                    name: 'XSD_ECOPD',
                    version: '4.04'
                },
                EHKSD: {
                    name: 'XSD_EHKS',
                    version: '2.33'
                },
                EHKSND: {
                    name: 'XSD_EHKS',
                    version: '2.33'
                }
            },

            qDocuSchemaMap = {
                2020: {
                    name: 'XSD_QDOCU',
                    version: '1.0',
                    schemaLocation: 'interface_LE/2020_kv_pid_1.0_Export.xsd',
                    specification: '2020 PB V05'
                },
                2021: {
                    name: 'XSD_QDOCU',
                    version: '1.0',
                    schemaLocation: 'interface_LE/2021_kv_pid_1.0_Export.xsd',
                    specification: '2021 PB V04'
                }
            },

            dateFormat = 'YYYY-MM-DD',

            // utils

            formatDate = ( date, format ) => {
                return moment( date ).format( format || dateFormat );
            },

            isAfterQ = ( quarter, context ) => {
                const
                    afterDate = moment( quarter, 'Q/YYYY' ),
                    edmpContext = context && context.edmp,
                    contextDate = edmpContext && moment( edmpContext.quarter + '/' + edmpContext.year, 'Q/YYYY' );
                if( !contextDate ) {
                    Y.log( 'edmp-filebuilder: isAfterQ called without context', 'warn', NAME );
                    return false;
                }
                return contextDate.isAfter( afterDate );
            },

            getSchemaVersion = ( context ) => {
                const
                    actType = context.activity.actType;

                if( context.activity.actType === 'HGV' ) {
                    return {
                        name: context.activity.dmpType === 'FIRST' ? 'XSD_QSHGV_VV' : 'XSD_QSHGV_NV',
                        version: '1.12'
                    };
                }

                if( context.activity.actType === 'HGVK' ) {
                    return {
                        name: 'XSD_QSHGVK',
                        version: '1.12'
                    };
                }

                if( context.activity.actType === 'QDOCU' ) {
                    const year = moment( context.activity.datumunt ).format( 'YYYY' );
                    return qDocuSchemaMap[year];
                }

                if( isAfterQ( Q1_2021, context ) ) {
                    return actTypeSchemaVersionAfterQ1_2021Map[actType];
                }

                if( isAfterQ( Q3_2019, context ) ) {
                    return actTypeSchemaVersionAfterQ3_2019Map[actType];
                }

                if( isAfterQ( Q1_2019, context ) ) {
                    return actTypeSchemaVersionAfterQ1_2019Map[actType];
                }

                if( isAfterQ( Q4_2018, context ) ) {
                    return actTypeSchemaVersionAfterQ4_2018Map[actType];
                }

                if( isAfterQ( Q3_2018, context ) ) {
                    return actTypeSchemaVersionAfterQ3_2018Map[actType];
                }

                if( isAfterQ( DMP_PERS_GROUP_CHANGES_LAST_QUARTER, context ) ) {
                    return actTypeSchemaVersionAfterQ2_2018Map[actType];
                }

                if( isAfterQ( PARTICIPATION_CHRONICHEART_FAILURE_LAST_QUARTER, context ) ) {
                    return actTypeSchemaVersionAfterQ1_2018Map[actType];
                }

                const
                    schemaVersion = actTypeSchemaVersionMap[actType];

                if( ('DM1' === actType || 'DM2' === actType) && isAfterQ( '2/2017', context ) ) {
                    if( 'DM1' === actType ) {
                        schemaVersion.version = '5.00';
                    } else {
                        schemaVersion.version = '6.00';
                    }
                } else if( 'COPD' === actType && isAfterQ( COPD_4_0_0_LAST_QUARTER, context ) ) {
                    schemaVersion.version = '4.00';
                }
                return schemaVersion;
            },

            getCertNo = ( actType ) => {
                if( ['EHKSD', 'EHKSND'].includes( actType ) ) {
                    return Y.config.insuite.kbv.ehksCertNumber;
                }

                if( actType === 'BK' ) {
                    return Y.config.insuite.kbv.dmpCertNumberBK;
                }

                if( actType === 'HGV' ) {
                    return Y.config.insuite.kbv.dmpCertNumberHGV;
                }

                if( actType === 'HGVK' ) {
                    return Y.config.insuite.kbv.dmpCertNumberHGVK;
                }

                return Y.config.insuite.kbv['edmpCertNumber' + actType];
            },

            s = ( str, defaultValue, maxLength ) => {
                if( 'string' !== typeof str ) {
                    str = defaultValue;
                }

                if( s.length > maxLength ) {
                    str = str.substring( 0, maxLength );
                }

                return str;
            },

            buildAddress = ( doc, ADL, STR, HNR, ZIP, CTY, CNT, context ) => {

                if( isHgv( context.activity.actType ) ) {
                    doc = doc.ele( 'addr');
                }
                else {
                    doc = doc.ele( 'addr', {
                        USE: 'PHYS'
                    } );
                }

                if( ADL ) {
                    (Array.isArray( ADL ) ? ADL : [ADL]).filter( Boolean ).forEach( v => {
                        doc = doc.ele( 'ADL', {
                            V: s( v, '', 40 )
                        } ).up();
                    } );
                }

                if( STR ) {
                    doc = doc.ele( 'STR', {
                        V: s( STR, '', 46 )
                    } ).up();
                }

                if( HNR ) {
                    doc = doc.ele( 'HNR', {
                        V: s( HNR, '', 9 )
                    } ).up();
                }

                if( ZIP ) {
                    doc = doc.ele( 'ZIP', {
                        V: s( ZIP, '', 10 )
                    } ).up();
                }

                if( CTY ) {
                    doc = doc.ele( 'CTY', {
                        V: s( CTY, '', 40 )
                    } ).up();
                }

                if( CNT ) {
                    doc = doc.ele( 'CNT', {
                        V: s( CNT, '', 3 )
                    } ).up();
                }

                return doc.up();
            },

            buildCommunications = ( doc, comObj ) => {
                if( comObj.phone ) {
                    doc = doc.ele( 'telecom', {
                        V: 'tel:' + s( comObj.phone, '', 150 ),
                        USE: 'WP'
                    } ).up();
                }

                if( comObj.fax ) {
                    doc = doc.ele( 'telecom', {
                        V: 'fax:' + s( comObj.fax, '', 150 ),
                        USE: 'WP'
                    } ).up();
                }

                if( comObj.email ) {
                    doc = doc.ele( 'telecom', {
                        V: 'mailto:' + s( comObj.email, '', 150 ),
                        USE: 'WP'
                    } ).up();
                }

                if( comObj.website ) {
                    doc = doc.ele( 'telecom', {
                        V: (-1 === comObj.website.indexOf( 'http://' ) ? 'http://' : '') + s( comObj.website, '', 150 ),
                        USE: 'WP'
                    } ).up();
                }

                return doc.up();
            },

            buildInsurance = ( doc, context, schein, short = false ) => {

                const
                    patient = context.patient,
                    publicInsurance = patient.insuranceStatus,
                    locationFeatures = schein && schein.locationFeatures || publicInsurance.locationFeatures;

                if( !publicInsurance ) {
                    return doc;
                }

                doc = doc
                    .ele( 'local_header', {
                        ignore: 'all',
                        descriptor: 'sciphox'
                    } )
                    .ele( 'sciphox:sciphox-ssu', {
                        type: 'insurance',
                        country: 'de',
                        version: 'v3'
                    } )
                    .ele( 'sciphox:GesetzlicheKrankenversicherung' )
                    .ele( 'sciphox:Kostentraegerbezeichnung', {
                        V: s( publicInsurance.insurancePrintName || publicInsurance.insuranceName, '', 45 )
                    } ).up()
                    .ele( 'sciphox:Kostentraegerkennung', {
                        V: s( publicInsurance.insuranceId, '', 9 )
                    } ).up();
                if( false === short ) {
                    doc = doc.ele( 'sciphox:KostentraegerAbrechnungsbereich', {
                        V: s( publicInsurance.costCarrierBillingSection, '', 2 ),
                        S: '2.16.840.1.113883.3.7.1.16'
                    } ).up();

                    if( locationFeatures ) {
                        doc = doc.ele( 'sciphox:WOP', {
                            V: s( locationFeatures, '', 2 ),
                            S: '2.16.840.1.113883.3.7.1.17'
                        } ).up();
                    }

                    if( publicInsurance.insuranceGrpId ) {
                        doc = doc.ele( 'sciphox:AbrechnungsVKNR', {
                            V: s( publicInsurance.insuranceGrpId, '', 5 ),
                            S: 'AbrechnungsVKNR'
                        } ).up();
                    }

                    if( publicInsurance.fk4124 ) {
                        doc = doc.ele( 'sciphox:SKTZusatzangabe', {
                            V: s( publicInsurance.fk4124, '', 60 )
                        } ).up();
                    }

                    doc = doc.ele( 'sciphox:Versichertennummer', {
                        V: s( publicInsurance.insuranceNo, 'X999999999', 12 )
                    } ).up()
                        .ele( 'sciphox:Versichertenart', {
                            V: s( publicInsurance.insuranceKind, '', 1 ),
                            S: '2.16.840.1.113883.3.7.1.1'
                        } ).up();

                    if( isAfterQ( DMP_PERS_GROUP_CHANGES_LAST_QUARTER, context ) ) {
                        doc = doc.ele( 'sciphox:BesonderePersonengruppe', {
                            V: s( Y.doccirrus.kbvcommonutils.mapPersGroupToKVDT( publicInsurance.persGroup ), '00', 2 ),
                            S: '1.2.276.0.76.5.222'
                        } ).up();
                    } else if( publicInsurance.persGroup ) {
                        doc = doc.ele( 'sciphox:BesonderePersonengruppe', {
                            V: s( publicInsurance.persGroup, '', 2 ),
                            S: '1.2.276.0.76.5.222'
                        } ).up();
                    }

                    if( isAfterQ( DMP_PERS_GROUP_CHANGES_LAST_QUARTER, context ) ) {
                        doc = doc.ele( 'sciphox:DMP_Kennzeichnung', {
                            V: s( Y.doccirrus.kbvcommonutils.mapDmpToKVDT( publicInsurance.dmp ), '00', 2 ),
                            S: '1.2.276.0.76.5.223'
                        } ).up();
                    } else if( publicInsurance.dmp ) {
                        doc = doc.ele( 'sciphox:DMP_Kennzeichnung', {
                            V: s( publicInsurance.dmp, '', 2 ),
                            S: '1.2.276.0.76.5.223'
                        } ).up();
                    }

                    if( publicInsurance.fk4133 ) {
                        doc = doc.ele( 'sciphox:VersicherungsschutzBeginn', {
                            V: s( formatDate( publicInsurance.fk4133 ), '', 8 )
                        } ).up();
                    }

                    if( publicInsurance.fk4110 ) {
                        doc = doc.ele( 'sciphox:VersicherungsschutzEnde', {
                            V: s( formatDate( publicInsurance.fk4110 ), '', 8 )
                        } ).up();
                    }

                    if( publicInsurance.cardSwipe ) {
                        doc = doc.ele( 'sciphox:Einlesedatum', {
                            V: s( formatDate( publicInsurance.cardSwipe ), '', 8 )
                        } ).up();
                    }
                }

                return doc.up().up().up();
            },

            buildParagraph = ( doc, DN ) => {
                return doc.ele( 'paragraph' )
                    .ele( 'caption' )
                    .ele( 'caption_cd', {
                        DN: DN
                    } )
                    .up().up()
                    .ele( 'content' );
            },

            buildObservations = ( doc ) => {
                return doc
                    .ele( 'local_markup', {
                        ignore: 'all',
                        descriptor: 'sciphox'
                    } )
                    .ele( 'sciphox:sciphox-ssu', {
                        type: 'observation',
                        country: 'de',
                        version: 'v1'
                    } )
                    .ele( 'sciphox:Beobachtungen' );
            },
            checkAttr = ( attr ) => {
                if( 'boolean' === typeof attr || 'string' === typeof attr || 'number' === typeof attr ) {
                    return true;
                }
                return Boolean( attr );
            },

            buildObservation = ( doc, param, values, resultType, context, subObservations ) => {
                let keys;
                doc = doc.ele( 'sciphox:Beobachtung' )
                    .ele( 'sciphox:Parameter', {
                        DN: param
                    } ).up();

                if( !Array.isArray( values ) ) {
                    values = [values];
                }

                values.forEach( ( value, index ) => {
                    keys = Object.keys( value );
                    if( !keys.every( key => checkAttr( value[key] ) ) ) {
                        Y.log( 'skipped edmp value because empty', 'debug', NAME );
                        return;
                    }
                    doc = doc.ele( 'sciphox:' + (VALUE_RESULT_TYPE === (Array.isArray( resultType ) ? resultType[index] : resultType) ? 'Ergebniswert' : 'Ergebnistext'), value ).up();
                } );

                if( Array.isArray( subObservations ) && subObservations.length ) {
                    doc = doc.ele( 'sciphox:Beobachtungen' );
                    subObservations.forEach( subObservation => {
                        doc = subObservation( doc, context );
                    } );
                    doc = doc.up();
                }

                return doc.up();
            },

            buildDate = ( doc, param, date ) => {
                doc = doc.ele( 'sciphox:Beobachtung' )
                    .ele( 'sciphox:Parameter', {
                        DN: param
                    } ).up();

                doc = doc.ele( 'sciphox:Zeitpunkt_dttm', date ).up();

                return doc.up();
            },

            buildDateObservation = ( doc, param, date, values ) => {

                let keys;
                doc = doc.ele( 'sciphox:Beobachtung' )
                    .ele( 'sciphox:Parameter', {
                        DN: param
                    } ).up();

                if( !Array.isArray( values ) ) {
                    values = [values];
                }

                values.forEach( ( value ) => {
                    keys = Object.keys( value );
                    if( !keys.every( key => checkAttr( value[key] ) ) ) {
                        Y.log( 'skipped dmp value because empty', 'debug', NAME );
                        return;
                    }
                    doc = doc.ele( 'sciphox:Ergebnistext', value ).up();
                } );

                doc = doc.ele( 'sciphox:Zeitpunkt_dttm', date ).up();

                return doc.up();
            },

            translateEnum = ( type, value ) => {
                return Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', type, value, '-de', '' );
            },

            mapGender = ( value, newSchemaVersion ) => {
                if( 'MALE' === value ) {
                    return 'M';
                }

                if( 'FEMALE' === value ) {
                    return 'F';
                }

                if( !newSchemaVersion && 'VARIOUS' === value || 'UNKNOWN' === value ) {
                    return 'UN';
                }

                if( newSchemaVersion && 'VARIOUS' === value ) {
                    return 'UN';
                }

                return 'X';
            },

            // mapper
            startHeader = ( doc ) => {
                return doc
                    .dec( {
                        encoding: 'ISO-8859-15'
                    } )
                    .ele( 'levelone', {
                        'xmlns': 'urn::hl7-org/cda',
                        'xmlns:sciphox': 'urn::sciphox-org/sciphox',
                        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance'/*,
                             'xsi:schemaLocation': 'urn::hl7-org/cda Schema.xsd' OPTIONAL */
                    } );
            },
            endHeader = ( doc ) => {
                return doc.up().up().up().up();
            },

            software = ( doc, context ) => {
                doc = doc
                    .ele( 'local_header', {
                        ignore: 'all',
                        descriptor: 'sciphox'
                    } )
                    .ele( 'sciphox:sciphox-ssu', {
                        type: 'software',
                        country: 'de',
                        version: 'v1'
                    } )
                    .ele( 'sciphox:Software' )
                    .ele( 'sciphox:id', {
                        EX: getCertNo( context.activity.actType ),
                        RT: 'KBV-Prüfnummer'
                    } ).up()
                    .ele( 'sciphox:SoftwareName', {
                        V: 'inSuite'
                    } ).up()
                    .ele( 'sciphox:SoftwareVersion', {
                        V: Y.config.insuite.version
                    } ).up()
                    .ele( 'sciphox:SoftwareTyp', {
                        V: 'PVS'
                    } ).up()
                    .ele( 'sciphox:Kontakt' )
                    .ele( 'sciphox:Kontakttyp', {
                        V: 'SOFTV',
                        S: '1.2.276.0.76.3.1.1.5.2.3',
                        DN: 'Softwareverantwortlicher'
                    } ).up()
                    .ele( 'organization.nm', {
                        V: 'Doc Cirrus GmbH'
                    } ).up();

                doc = buildAddress( doc, '', 'Bessemerstr.', '82', '12103', 'Berlin', 'D', context );
                doc = buildCommunications( doc, {
                    phone: '+49.30.20898729.0',
                    fax: '+49.30.20898729.9'
                } );

                doc = doc.ele( 'sciphox:Software' )
                    .ele( 'sciphox:SoftwareName', {
                        V:  context.xsdSchema.name
                    } ).up()
                    .ele( 'sciphox:SoftwareVersion', {
                        V: context.xsdSchema.version
                    } ).up()
                    .ele( 'sciphox:SoftwareTyp', {
                        V: 'XSD'
                    } ).up().up();

                return doc;
            },
            startBody = ( doc ) => {
                return doc
                    .ele( 'body' )
                    .ele( 'section' );
            },
            openParagraph = ( name ) => {
                return function( doc ) {
                    doc = buildParagraph( doc, name );
                    doc = buildObservations( doc );
                    return doc;
                };
            },
            closeParagraph = ( doc ) => {
                return doc.up().up().up().up().up();
            };

        Y.namespace( 'doccirrus' ).edocConverter = {

            name: NAME,
            convert,
            mapper: {
                startHeader,
                software,
                endHeader,
                startBody,
                openParagraph,
                closeParagraph
            },
            utils: {
                dateFormat,
                formatDate,
                isAfterQ,
                getCertNo,
                s,
                buildAddress,
                buildCommunications,
                buildInsurance,
                buildObservations,
                buildObservation,
                buildDate,
                buildDateObservation,
                translateEnum,
                mapGender,
                getSchemaVersion

            }
        };
    },
    '0.0.1', {requires: ['dcmongodb', 'patient-schema', 'edmp-utils', 'dccommonutils', 'xkm', 'edmp-commonutils']}
);

