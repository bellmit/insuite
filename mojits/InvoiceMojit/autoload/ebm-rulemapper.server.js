/**
 * User: do
 * Date: 06/01/16  11:40
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'dcebmrulemapper', function( Y, NAME ) {

        const
            _ = require( 'lodash' ),
            getAgeQuery = Y.doccirrus.ruleimportutils.getAgeQuery,
            kbvReferenceAreas = [
                {
                    code: '0', // "unbekannt"
                    sameAs: '7'
                },
                {
                    code: '1',
                    name: 'in derselben Sitzung',
                    ruleSetConfig: {
                        referenceArea: 'APK'
                    }
                },
                {
                    code: '2',
                    name: 'am Behandlungstag',
                    pluralize: count => `alle ${count} Behandlungstage`,
                    ruleSetConfig: {
                        referenceArea: 'PERIOD',
                        periodType: 'DAY',
                        periodCount: 1,
                        periodReference: 'raum'
                    }
                },
                {
                    code: '4',
                    name: 'je Behandlungswoche',
                    pluralize: count => `jede ${count}. Behandlungswochen`,
                    ruleSetConfig: {
                        referenceArea: 'PERIOD',
                        periodType: 'WEEK',
                        periodCount: 1,
                        periodReference: 'punkt'
                    }
                },
                {
                    code: '7',
                    name: 'im Behandlungsfall',
                    pluralize: count => `alle ${count} Behandlungsfälle`,
                    ruleSetConfig: {
                        referenceArea: 'PERIOD',
                        periodType: 'QUARTER',
                        periodCount: 1,
                        periodReference: 'raum'
                    }
                },
                {
                    code: '8',
                    name: 'im Krankheitsfall',
                    pluralize: count => `alle ${count} Krankheitsfälle`,
                    ruleSetConfig: {
                        referenceArea: 'PERIOD',
                        periodType: 'QUARTER',
                        periodCount: 4, // TODO: check
                        periodReference: 'raum'
                    }
                },
                {
                    code: '12',
                    name: 'im Kalenderjahr',
                    pluralize: count => `alle ${count} Kalenderjahre`,
                    ruleSetConfig: {
                        referenceArea: 'PERIOD',
                        periodType: 'YEAR',
                        periodCount: 1,
                        periodReference: 'raum'
                    }
                },
                {
                    code: '15',
                    name: 'je Leistung',
                    pluralize: count => `alle ${count} Leistungen`,
                    ruleSetConfig: {
                        referenceArea: 'ENTRY',
                        actType: 'TREATMENT',
                        code: null,
                        catalogShort: null
                    }
                },
                {
                    code: '16',
                    name: 'je Behandlungsfall im Quartal, gemäß Präambel 3.1 Nr.10',
                    ruleSetConfig: {
                        referenceArea: 'SCHEIN'
                    }
                },
                {
                    code: '17',
                    name: 'im Behandlungsfall für dasselbe Zielvolumen',
                    ruleSetConfig: {
                        referenceArea: 'SCHEIN'
                    }
                },
                {
                    code: '18',
                    name: 'je Schein',
                    ruleSetConfig: {
                        referenceArea: 'SCHEIN'
                    }
                },
                {
                    code: '19',
                    name: 'je Kalenderwoche',
                    pluralize: count => `alle ${count} Kalenderwochen`,
                    ruleSetConfig: {
                        referenceArea: 'PERIOD',
                        periodType: 'WEEK',
                        periodCount: 1,
                        periodReference: 'raum'
                    }
                }
            ],
            findRefArea = ( val, code ) => {
                let ra = kbvReferenceAreas.find( refArea => refArea.code === code );
                // atm this is only used to map code "0" to "7"
                if( ra && ra.sameAs ) {
                    ra = kbvReferenceAreas.find( refArea => ra.sameAs === refArea.code );
                }
                if( ra ) {
                    let copy = JSON.parse( JSON.stringify( ra ) );
                    if( val && !['1', 1].includes( val ) && copy.ruleSetConfig && copy.ruleSetConfig.referenceArea && copy.ruleSetConfig.referenceArea === 'PERIOD' ) {
                        if( copy.ruleSetConfig.periodCount === 1 ) {
                            copy.ruleSetConfig.periodCount = +val;
                            copy.name = ra.pluralize( copy.ruleSetConfig.periodCount );
                        } else {
                            copy.ruleSetConfig.periodCount = copy.ruleSetConfig.periodCount * (+val);
                            copy.name = ra.pluralize( copy.ruleSetConfig.periodCount / ra.ruleSetConfig.periodCount );
                        }
                    }
                    // KBV uses this reference area setup a lot to say once in a lifetime
                    if( code === '12' && copy.ruleSetConfig.periodCount === 124 ) {
                        copy.name = 'einmal im Leben ';
                    }
                    return copy;
                }
                return null;
            },
            getEntryRefArea = ( gnr, catalogShort ) => {
                const entryRefArea = findRefArea( null, '15' );
                if( !entryRefArea ) {
                    throw Error( 'reference area config not found' );
                }
                entryRefArea.ruleSetConfig.code = gnr;
                entryRefArea.ruleSetConfig.catalogShort = catalogShort;
                return entryRefArea;
            },
            ruleMapper = {
                berichtspflicht: ( value, context ) => {
                    if( 'EBM' === context.catalogShort && value ) {
                        return {
                            rules: [
                                {
                                    _refArea: getEntryRefArea( context.code, context.catalogShort ),
                                    isActive: true,
                                    description: `Berichtspflicht für ${context.code} (${context.catalogShort})`,
                                    validations: [
                                        {
                                            context: 'ACTIVITY',
                                            criteria: {
                                                actType: 'TREATMENT',
                                                code: context.code,
                                                areTreatmentDiagnosesBillable: '1'
                                            }
                                        }
                                    ],
                                    actions: [
                                        {
                                            type: 'WARNING'
                                        }
                                    ]
                                }
                            ]
                        };
                    }
                },
                administrative_gender_cd: ( value, context ) => {
                    if( '1' === value || '2' === value ) {
                        return {
                            rules: [
                                {
                                    _refArea: getEntryRefArea( context.code, context.catalogShort ),
                                    isActive: true,
                                    description: `Geschlechtsbezug ${context.code} (${context.catalogShort})`,
                                    validations: [
                                        {
                                            context: 'ACTIVITY',
                                            criteria: {
                                                actType: 'TREATMENT',
                                                'patientId.gender': '1' === value ? 'FEMALE' : 'MALE',
                                                areTreatmentDiagnosesBillable: '1'
                                            }
                                        }
                                    ],
                                    actions: [
                                        {
                                            type: 'ERROR'
                                        }
                                    ]
                                }
                            ]
                        };
                    }
                },
                altersbedingung_liste: ( value, context ) => {

                    //LAM-1865
                    //Correction of GOÄ age rules
                    if( context.catalogShort === 'GOÄ' && value.length === 1 ){
                        value = value.map( el => {
                            if( el.type === 'MIN'){
                                el.type = 'MAX';
                            }
                            if( context.code === '250a' ){
                                el.value = 8;
                            }
                            return el;
                        });
                    }

                    let ageQuery = getAgeQuery( value );

                    if( ageQuery.length ) {
                        return {
                            rules: [
                                {
                                    _refArea: getEntryRefArea( context.code, context.catalogShort ),
                                    isActive: true,
                                    description: `Altersbedingung ${context.code} (${context.catalogShort})`,
                                    validations: [
                                        {
                                            $or: ageQuery.map( q => {
                                                return {
                                                    context: 'ACTIVITY',
                                                    criteria: {
                                                        actType: 'TREATMENT',
                                                        'patientId.age': q,
                                                        areTreatmentDiagnosesBillable: '1'
                                                    }
                                                };
                                            } )
                                        }
                                    ],
                                    actions: [
                                        {
                                            type: 'ERROR'
                                        }
                                    ]
                                }
                            ]
                        };
                    }

                },
                grundleistungen_liste: ( value, context ) => {
                    let rules = [];

                    (Array.isArray( value ) && value || []).forEach( o => {
                        let refArea;

                        if( !Array.isArray( o.liste ) || !o.liste.length ) {
                            return;
                        }

                        refArea = findRefArea( o.value, o.unit );

                        if( !refArea ) {
                            return;
                        }

                        let validations = {
                            $and: [
                                {
                                    context: 'ACTIVITY',
                                    criteria: {
                                        actType: 'TREATMENT',
                                        code: context.code,
                                        areTreatmentDiagnosesBillable: '1'
                                    }
                                },
                                {
                                    context: 'ACTIVITY',
                                    criteria: {
                                        actType: 'TREATMENT',
                                        code: {$in: o.liste},
                                        $count: {
                                            $eq: 0
                                        },
                                        areTreatmentDiagnosesBillable: '1'
                                    }
                                }
                            ]
                        };

                        let rule = {
                            _refArea: refArea,
                            isActive: true,
                            description: `Erforderliche Grundleistungen für Zuschlagsleistung ${context.code} (${context.catalogShort}) ${refArea.name}`,
                            validations,
                            actions: [
                                {
                                    type: 'ERROR'
                                }
                            ]
                        };

                        rules.push( rule );
                    } );
                    return {rules: rules};
                },
                ausschluss_liste: ( value, context ) => {
                    let rules = [];

                    (Array.isArray( value ) && value || []).forEach( o => {

                        // TODOOO "kap_bez" excluded chapters, atm there is no way to check chapters

                        let refArea = findRefArea( o.value, o.unit );

                        if( !refArea ) {
                            return;
                        }

                        if( Array.isArray( o.gnr ) ) {

                            let codeList = o.gnr.map( gnrObj => gnrObj.seq );
                            if( o.tof === 1 ){
                                codeList.push( context.code ); //need for inclusion to not trigger on main code
                            }

                            let operator = o.tof === 1 ? '$nin' : '$in',
                                validations = {
                                $and: [
                                    {
                                        context: 'ACTIVITY',
                                        criteria: {
                                            actType: 'TREATMENT',
                                            code: context.code,
                                            areTreatmentDiagnosesBillable: '1'
                                        }
                                    },
                                    {
                                        context: 'ACTIVITY',
                                        criteria: {
                                            actType: 'TREATMENT',
                                            code: { [operator]: [...new Set( codeList )] },
                                            areTreatmentDiagnosesBillable: '1'
                                        }
                                    }
                                ]
                            };

                            let rule = {
                                _refArea: refArea,
                                isActive: true,
                                description: `${o.tof === 1 ? 'Einschlussliste': 'Ausschlussliste'} für ${context.code} (${context.catalogShort}) ${refArea.name}`,
                                validations,
                                actions: [
                                    {
                                        type: 'ERROR'
                                    }
                                ]
                            };
                            rules.push( rule );
                        }
                    } );

                    return {rules: rules};
                },
                anzahlbedingung_liste: ( value, context ) => {
                    let rules = [],
                        fieldCodeMap = {
                            5002: 'fk5002',
                            5006: 'daySeparation',
                            5009: 'explanations',
                            5012: 'fk5012Set.0' // TODOOO test if "static" rule engine validation can work with dot notation
                        };

                    (Array.isArray( value ) && value || []).forEach( o => {

                        let bezraum = o.bezugsraum || o, // new goä does not have inner bezugsraum object
                            refArea;

                        if( !bezraum ) {
                            return;
                        }

                        if( !bezraum.anzahl ) {
                            return;
                        }

                        let count = +bezraum.anzahl;
                        let rangeType = bezraum.type || 'MIN'; // only set in new guttermann (uv)goä data

                        if( !_.isFinite( count ) ) {
                            return;
                        }

                        refArea = findRefArea( bezraum.value, bezraum.unit );

                        if( !refArea ) {
                            return;
                        }

                        // first add the base validation, then check for possible exceptions
                        let validation = {
                            context: 'ACTIVITY',
                            criteria: {
                                actType: 'TREATMENT',
                                code: context.code,
                                $count: {
                                    ['MIN' === rangeType ? '$gt' : '$lt']: count
                                },
                                areTreatmentDiagnosesBillable: '1'
                            }
                        };

                        (Array.isArray( bezraum.aussetzungsgrund_liste ) && bezraum.aussetzungsgrund_liste || []).forEach( fieldCode => {
                            let mappedAttr = fieldCodeMap[fieldCode];
                            if( mappedAttr && !validation.criteria[mappedAttr] ) {
                                validation.criteria[mappedAttr] = {
                                    $exists: false
                                };
                            }
                        } );

                        // not included in goae right now
                        let ageQuery = getAgeQuery( bezraum.aussetzungsgrund_liste ),
                            validations = [validation];

                        if( ageQuery.length ) {

                            Y.log( `anzahlbedingung_liste: Complex validations detected v:${value} c:${context} ageQuery:${ageQuery}`, 'warn', NAME );

                            validation.push( {
                                $or: ageQuery.map( q => {
                                    return {
                                        context: 'ACTIVITY',
                                        criteria: {
                                            'patientId.age': q
                                        }
                                    };
                                } )
                            } );
                        }

                        let ruleData = {
                            _refArea: refArea,
                            isActive: true,
                            description: `Anzahlbedingungsliste ${context.code} (${context.catalogShort}) ${refArea.name}`,
                            validations: {$and: [validations]},
                            actions: [
                                {
                                    type: 'ERROR'
                                }
                            ]
                        };

                        rules.push( ruleData );
                    } );

                    return { rules };
                },
                /**
                 *  This rule checks for a added treatment if there are idc_code which need to be added as a diagnose in
                 *  the case folder. It checks for existing diagnosis with corresponding icd-code in the given refArea
                 *  and makes a warning if not.
                 * @param {Object} value: Content of treatment from catalogs.
                 * @param {Object} context: treatment code
                 * @returns {{rules: []}}
                 */
                begruendungen_liste: ( value, context ) => {
                    let rules = [];

                    (Array.isArray( value.icd_liste ) && value.icd_liste || []).forEach( o => {

                        let refArea = findRefArea( '1', '7' );

                        if( !refArea ) {
                            return;
                        }

                        if( Array.isArray( o.liste ) && o.liste.length ) {

                            let validations = {
                                $and: [
                                    {
                                        context: 'ACTIVITY',
                                        criteria: {
                                            actType: 'TREATMENT',
                                            code: context.code,
                                            areTreatmentDiagnosesBillable: '1'
                                        }
                                    },
                                    {
                                        context: "ACTIVITY",
                                        criteria: {
                                            actType: "DIAGNOSIS",
                                            code: {
                                                $in: o.liste
                                            },
                                            $count: {
                                                $eq: 0
                                            },
                                            diagnosisTreatmentRelevance: "TREATMENT_RELEVANT",
                                            diagnosisInvalidationDate: { $exists: false }
                                        }
                                    }
                                ]
                            };

                            let rule = {
                                _refArea: refArea,
                                isActive: true,
                                description: `Die Behandlung ist nur unter Eingabe einer der folgenden Diagnosen berechnungsfähig ${o.liste} ${context.code} (${context.catalogShort}) ${refArea.name}`,
                                validations,
                                actions: [
                                    {
                                        type: 'WARNING'
                                    }
                                ]
                            };
                            rules.push( rule );
                        }
                    } );

                    return {rules: rules};
                }
            };

        function map( key, value, context ) {
            const mapper = ruleMapper[key];

            if( mapper ) {
                return mapper( value, context );
            }
        }

        Y.namespace( 'doccirrus' ).ebmRuleMapper = {

            name: NAME,
            map: map

        };
    },
    '0.0.1', {requires: ['dcruleimportutils']}
);

