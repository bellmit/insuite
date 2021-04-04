/**
 * User: oliversieweke
 * Date: 07.12.18  15:34
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */



YUI.add( 'dctarmedrulemapper', function( Y, NAME ) {

        //not counted block only cumulated with rules due to past valid date
        //LNR_MASTER	LNR_SLAVE	ART_SLAVE	GUELTIG_VON	GUELTIG_BIS
        //07	07		B	1/1/2001	3/31/2006
        //08	39.0011	L	7/1/2008	12/31/2017
        //08	39.0016	L	7/1/2008	12/31/2017
        //09	09		B	1/1/2001	12/31/2007
        //10	05.0720	L	1/1/2001	3/31/2007
        //10	05.0740	L	1/1/2001	3/31/2007
        //10	19.0410	L	1/1/2001	3/31/2007
        //10	19.0590	L	1/1/2001	3/31/2007
        //10	19.0590	L	4/1/2007	12/31/2007
        //11	11		B	1/1/2001	12/31/2017
        //13	13		B	1/1/2001	12/31/2007
        //20	20		B	1/1/2008	6/30/2008
        //53	39.0011	L	1/1/2008	12/31/2017
        //53	39.0016	L	1/1/2008	12/31/2017
        //57	24.0010	L	6/1/2012	12/31/2017

        //only valid until '12/31/2199'
        const BLOCK_CUMULATION = { //eslint-disable-line no-unused-vars
            '01': [
                { code: '01', type: 'B' }
            ],
            '02': [
                { code: '02', type: 'B' }
            ],
            '03': [
                { code: '03', type: 'B' }
            ],
            '04': [
                { code: '04', type: 'B' }
            ],
            '05': [
                { code: '05', type: 'B' }
            ],
            '06': [
                { code: '06', type: 'B' }
            ],
            '08': [
                { code: '08', type: 'B' },
                { code: '39.0010', type: 'L' },
                { code: '39.0015', type: 'L' }
            ],
            '10': [
                { code: '10', type: 'B' },
                { code: '05.0720', type: 'L' },
                { code: '05.0720', type: 'L' },
                { code: '19.0410', type: 'L' }
            ],
            '12': [
                { code: '12', type: 'B' }
            ],
            '14': [
                { code: '14', type: 'B' }
            ],
            '15': [
                { code: '15', type: 'B' },
                { code: '08.0220', type: 'L' },
                { code: '08.1230', type: 'L' }
            ],
            '16': [
                { code: '16', type: 'B' }
            ],
            '51': [
                { code: '51', type: 'B' }
            ],
            '52': [
                { code: '52', type: 'B' }
            ],
            '53': [
                { code: '53', type: 'B' },
                { code: '39.0010', type: 'L' },
                { code: '39.0015', type: 'L' }
            ],
            '54': [
                { code: '54', type: 'B' }
            ],
            '55': [
                { code: '55', type: 'B' }
            ],
            '56': [
                { code: '56', type: 'B' }
            ],
            '57': [
                { code: '57', type: 'B' },
                { code: '00.0850', type: 'L' },
                { code: '00.0855', type: 'L' },
                { code: '00.1510', type: 'L' },
                { code: '00.1580', type: 'L' },
                { code: '00.1590', type: 'L' },
                { code: '05.0010', type: 'L' },
                { code: '05.0020', type: 'L' },
                { code: '05.0030', type: 'L' },
                { code: '24.0015', type: 'L' },
                { code: '35.0210', type: 'L' },
                { code: '35.0220', type: 'L' },
                { code: '35.0510', type: 'L' },
                { code: '35.0520', type: 'L' }
            ]
        };

        const TARMED_REFERENCE_AREAS = [
            {
                code: '1',
                name: 'in derselben Sitzung',
                ruleSetConfig: {
                    referenceArea: 'APK'
                }
            },
            {
                code: '150',
                name: 'je Leistung',
                ruleSetConfig: {
                    referenceArea: 'ENTRY',
                    actType: 'TREATMENT',
                    code: null,
                    catalogShort: null
                }
            },




        // TARMED CT_ZR_EINHEIT Codes ----------------------------------------------------------------------------------
            {   //confirmed
                code: '06',
                name: 'in derselben Lokalisation und Sitzung',
                ruleSetConfig: {
                    referenceArea: 'APK'
                }
            },
            {
                code: '07',
                name: 'in derselben Sitzung',
                ruleSetConfig: {
                    referenceArea: 'APK'
                }
            },
            {
                code: '08',
                name: 'auf derselben Fall',
                ruleSetConfig: {
                    referenceArea: 'SCHEIN'
                }
            },
            {
                code: '09',
                name: 'auf derselben Patient',
                ruleSetConfig: {
                    referenceArea: 'PERIOD',
                    periodType: 'YEAR',
                    periodCount: 124,
                    periodReference: 'raum'
                }
            },
            {
                code: '10',
                name: 'auf derselben Seite',
                ruleSetConfig: {
                    referenceArea: 'APK'
                }
            },
            {   //confirmed
                code: '11',
                name: 'auf derselben Aufenthalt',
                ruleSetConfig: {
                    referenceArea: 'APK'
                }
            },
            {   //confirmed
                code: '12',
                name: 'auf derselben Testreihe',
                ruleSetConfig: {
                    referenceArea: 'PERIOD',
                    periodType: 'YEAR',
                    periodCount: 1,
                    periodReference: 'punkt'
                }
            },
            {   //confirmed
                code: '13',
                name: 'auf derselben Schwangerschaft',
                ruleSetConfig: {
                    referenceArea: 'PERIOD',
                    periodType: 'MONTH',
                    periodCount: 9,
                    periodReference: 'punkt'
                }
            },
            {
                code: '14',
                name: 'auf derselben Geburt',
                ruleSetConfig: {
                    referenceArea: 'PERIOD',
                    periodType: 'MONTH',
                    periodCount: 9,
                    periodReference: 'punkt'
                }
            },
            {   //confirmed
                code: '15',
                name: 'auf derselben Bestrahlungsphase',
                ruleSetConfig: {
                    referenceArea: 'APK'
                }
            },
            {   //confirmed
                code: '16',
                name: 'auf derselben Einsendung',
                ruleSetConfig: {
                    referenceArea: 'APK'
                }
            },
            {   //confirmed
                code: '17',
                name: 'auf derselben Autopsie',
                ruleSetConfig: {
                    referenceArea: 'APK'
                }
            },
            {   //confirmed
                code: '18',
                name: 'auf derselben Gutachten',
                ruleSetConfig: {
                    referenceArea: 'APK'
                }
            },
            {   //confirmed
                code: '20',
                name: 'am selben Sparte und Tag',
                ruleSetConfig: {
                    referenceArea: 'APK'
                }
            },
            {
                code: '21',
                name: 'am selben Tag',
                ruleSetConfig: {
                    referenceArea: 'PERIOD',
                    periodType: 'DAY',
                    periodCount: 0,
                    periodReference: 'raum'
                }
            },
            {
                code: '22',
                name: 'in derselben Woche',
                ruleSetConfig: {
                    referenceArea: 'PERIOD',
                    periodType: 'WEEK',
                    periodCount: 0,
                    periodReference: 'raum'
                }
            },
            {
                code: '23',
                name: 'im selben Monat',
                ruleSetConfig: {
                    referenceArea: 'PERIOD',
                    periodType: 'MONTH',
                    periodCount: 0,
                    periodReference: 'raum'
                }
            },
            {
                code: '26',
                name: 'im selben Jahr',
                ruleSetConfig: {
                    referenceArea: 'PERIOD',
                    periodType: 'YEAR',
                    periodCount: 0,
                    periodReference: 'raum'
                }
            },
            {   //confirmed
                code: '31',
                name: 'auf derselben Bestrahlungsphase und Bestrahlungsvolumen',
                ruleSetConfig: {
                    referenceArea: 'APK'
                }
            },
            {
                code: '40',
                name: 'in derselben Gelenkregion',
                ruleSetConfig: {
                    referenceArea: 'APK'
                }
            },
            {   //confirmed
                code: '41',
                name: 'in derselben Region und Seite',
                ruleSetConfig: {
                    referenceArea: 'APK'
                }
            },
            {   //confirmed
                code: '42',
                name: 'in derselben Gelenkregion und Seite',
                ruleSetConfig: {
                    referenceArea: 'APK'
                }
            },
            {   //confirmed
                code: '45',
                name: 'in derselben Hauptleistung',
                ruleSetConfig: {
                    referenceArea: 'APK'
                }
            },
            {
                code: '51',
                name: 'in derselben Sitzung pro Jahr',
                ruleSetConfig: {
                    referenceArea: 'PERIOD',
                    periodType: 'YEAR',
                    periodCount: 0,
                    periodReference: 'raum'
                }
            },
            {
                code: '54',
                name: 'in derselben Sitzung und Patient',
                ruleSetConfig: {
                    referenceArea: 'APK'
                }
            }
        ];

        const getCatalogName = ( catalogShort ) => {
            return catalogShort === 'TARMED_UVG_IVG_MVG' ? 'TARMED' : catalogShort;
        };

        const findRefArea = ( val, code ) => {
            let ra = TARMED_REFERENCE_AREAS.find( refArea => refArea.code === code );
            if( ra ) {
                ra = JSON.parse( JSON.stringify( ra ) );
                // Check if Still needed
                if( val && ra.ruleSetConfig && ra.ruleSetConfig.referenceArea && ra.ruleSetConfig.referenceArea === 'PERIOD' ) {
                    ra.ruleSetConfig.periodCount = +val;
                }
                // --------------------------------------------------------------------------------

                return ra;
            }
            return null;
        };

        const getEntryRefArea = ( code, catalogShort ) => {
            const entryRefArea = findRefArea( null, '150' );
            entryRefArea.ruleSetConfig.code = code;
            entryRefArea.ruleSetConfig.catalogShort = catalogShort;
            return entryRefArea;
        };


        const getValidityCondition = ( rule, context ) => ({
            // The rule should only bite if it is currently valid and if the treatment it is related to is als currently valid
            ...(rule.validFrom || context.validFrom) && {$gte: new Date( Math.max( rule.validFrom, context.validFrom ) )},
            ...(rule.validUntil || context.validUntil) && {$lte: new Date( Math.min( rule.validUntil || Infinity, context.validUntil || Infinity ) )} // A null value, means that there is no restriction concerning the validity.
        });

        const groupByValidityPeriod = rules => {
            return rules.reduce( ( validityPeriodMap, currentValue ) => {
                //do not count From validity to not separate valid cases in different rules (check 00.0095 hierarchyRules)
                let validityPeriodHash = JSON.stringify( {
                    //validFrom: currentValue.validFrom,
                    validUntil: currentValue.validUntil
                } );
                return validityPeriodMap.set( validityPeriodHash, [...validityPeriodMap.get( validityPeriodHash ) || [], currentValue] );
            }, new Map() );
        };

        const ruleMapper = {
            genderRules: ( genderRules, context ) => {
                if( Array.isArray( genderRules ) && genderRules.length ) {
                    // 0 --> Only for male
                    // 1 --> Only for female
                    return {
                        rules: [
                            {
                                _refArea: getEntryRefArea( context.code, context.catalogShort ),
                                isActive: true,
                                description: `Geschlechtsbezug ${context.code} (${getCatalogName(context.catalogShort)})`,
                                validations: [
                                    {
                                        $or: genderRules.map( genderRule => ({
                                            context: 'ACTIVITY',
                                            criteria: {
                                                actType: 'TREATMENT',
                                                'patientId.gender': genderRule.code === '0' ? 'FEMALE' : 'MALE',
                                                timestamp: getValidityCondition( genderRule, context )
                                            }
                                        }) )
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

            ageRules: ( ageRules, context ) => {
                const rules = [];

                if( Array.isArray( ageRules ) && ageRules.length ) {
                    const andOr = [];
                    let andRule = false;

                    for( let ageRule of ageRules){  // eslint-disable-line
                        const {from, until, unit} = ageRule;

                        if(from && until && from > until){
                            andRule = true;
                        }
                        if( from ){
                            andOr.push( {
                                context: 'ACTIVITY',
                                criteria: {
                                    actType: 'TREATMENT',
                                    'ageOnTimestamp': {$lt: from, unit},
                                    timestamp: getValidityCondition( ageRule, context )
                                }
                            } );
                        }
                        if( until ) {
                            andOr.push( {
                                context: 'ACTIVITY',
                                criteria: {
                                    actType: 'TREATMENT',
                                    'ageOnTimestamp': {$gte: until, unit},
                                    timestamp: getValidityCondition( ageRule, context )
                                }
                            } );
                        }
                    }
                    if( andOr.length ){
                        let validations;
                        if( andRule ){
                            validations = [ { $and: andOr }];
                        } else {
                            validations = [ { $or: andOr }];
                        }
                        rules.push( {
                            _refArea: getEntryRefArea( context.code, context.catalogShort ),
                            isActive: true,
                            description: `Altersbedingung ${context.code} (${getCatalogName(context.catalogShort)})`,
                            validations,
                            actions: [
                                {
                                    type: 'ERROR'
                                }
                            ]
                        } );
                    }


                // TOLERANCE WARNINGS ----------------------------------------------------------------------------------
                // rule engine not support fromTolerance / untilTolerance inside patientId.age clause rule need to be generated with
                // already precalculated tolerance modifications, suspend for now
                /*
                    const toleranceValidations = [];

                    ageRules.forEach( ageRule => {
                        const {from, until, fromTolerance, untilTolerance, unit} = ageRule;

                        if( ageRule.fromTolerance > 0 ) {
                            toleranceValidations.push( {
                                context: 'ACTIVITY',
                                criteria:
                                    {
                                        actType: 'TREATMENT',
                                        'patientId.age': {
                                            unit, fromTolerance, // tolerance will be factored for the $gte condition in the rule processing
                                            $gte: from,
                                            $lte: from
                                        },
                                        timestamp: getValidityCondition( ageRule, context )
                                    }

                            } );
                        }

                        if( ageRule.untilTolerance > 0 ) {
                            toleranceValidations.push( {
                                context: 'ACTIVITY',
                                criteria:
                                    {
                                        actType: 'TREATMENT',
                                        'patientId.age': {
                                            unit, untilTolerance, // tolerance will be factored for the $lt condition in the rule processing
                                            $gte: until,
                                            $lt: until
                                        },
                                        timestamp: getValidityCondition( ageRule, context )
                                    }

                            } );
                        }
                    } );

                    if( toleranceValidations.length ) {
                        rules.push( {
                            _refArea: getEntryRefArea( context.code, context.catalogShort ),
                            isActive: true,
                            description: `Altersbedingung ${context.code} (${context.catalogShort})`,
                            validations: [
                                {$or: toleranceValidations}
                            ],
                            actions: [
                                {
                                    type: 'WARNING'
                                }
                            ]
                        } );
                    }
                */
                // ----------------------------------------------------------------------------------------------------
                }

                return {rules};
            },

            frequencyRules: ( frequencyRules, context ) => {
                if( Array.isArray( frequencyRules ) && frequencyRules.length ) {
                    const rules = [];

                    frequencyRules.forEach( frequencyRule => {
                        let {quantity, timeQuantity, timeUnit} = frequencyRule;
                        //skip period value adjustment for pregnancy, birt and lifetime intervals
                        const _refArea = findRefArea( (['13', '14', '09'].includes( timeUnit ) ? null : timeQuantity ), timeUnit );

                        if( !_refArea ) { // TODO: Map all timeUnits. Only 07 mapped for the moment, covering 90% of the rules;
                            return;
                        }

                        //for Site unit allowed 2 times more (e.g. for left and right ears)
                        if( timeUnit === '10' ){
                            quantity *= 2;
                        }

                        rules.push( {
                            _refArea,
                            isActive: true,
                            description: `Anzahlbedingungsliste ${context.code} (${getCatalogName(context.catalogShort)} ${_refArea.name})`,
                            validations: [
                                {
                                    context: 'ACTIVITY',
                                    criteria: {
                                        actType: 'TREATMENT',
                                        code: {
                                            $eq: context.code,
                                            $catalogShort: context.catalogShort
                                        },
                                        $count: {$gt: quantity},
                                        timestamp: getValidityCondition( frequencyRule, context )
                                    }
                                }
                            ],
                            actions: [
                                {
                                    type: 'ERROR'
                                }
                            ]
                        } );
                    } );

                    return {rules};
                }
            },

            hierarchyRules: ( hierarchyRules, context ) => {
                if( Array.isArray( hierarchyRules ) && hierarchyRules.length ) {
                    const rules = [];
                    const hierarchyRulesGroupedByValidityPeriod = groupByValidityPeriod( hierarchyRules );

                    hierarchyRulesGroupedByValidityPeriod.forEach( ( hierarchyRules, validityPeriodHash ) => {
                        const _refArea = findRefArea( null, '1' );
                        _refArea.name = 'Hierarchie ' + _refArea.name;

                        rules.push( {
                            _refArea,
                            isActive: true,
                            description: `Erforderliche Grundleistung ${hierarchyRules.length > 1 ? 'unter ' : ''}${hierarchyRules.map( rule => rule.seq ).join( ', ' )} für Zuschlagsleistung ${context.code} (${getCatalogName(context.catalogShort)}) ${_refArea.name}`,
                            validations: {
                                $and: [
                                    {
                                        context: 'ACTIVITY',
                                        criteria: {
                                            actType: 'TREATMENT',
                                            code: {
                                                $eq: context.code,
                                                $catalogShort: context.catalogShort
                                            },
                                            timestamp: getValidityCondition( JSON.parse( validityPeriodHash ), context )
                                        }
                                    },
                                    {
                                        context: 'ACTIVITY',
                                        criteria: {
                                            actType: 'TREATMENT',
                                            catalogShort: context.catalogShort,
                                            code: {
                                                $in: hierarchyRules.map( rule => rule.seq )
                                            },
                                            $count: {
                                                $eq: 0
                                            }
                                        }
                                    }
                                ]
                            },
                            actions: [
                                {
                                    type: 'ERROR'
                                }
                            ]
                        } );
                    } );

                    return {rules};
                }
            },

            combinationRules: ( combinationRules, context, u_extra ) => {
                // NB: the combinationRules come in pairs with redundant information
                if( Array.isArray( combinationRules ) && combinationRules.length === 2 ) {
                    //get time interval from corresponding frequency rule and find refArea or set SCHEIN
                    let _refArea;
                    if( u_extra && u_extra.frequencyRules && u_extra.frequencyRules.length ){
                        let {timeUnit} = u_extra.frequencyRules[0];
                        _refArea = findRefArea( null, timeUnit );
                        if(!_refArea) {
                            Y.log( `ruleMapper: Combination unknown area ${timeUnit} for ${context.code}`, 'warn', NAME );
                        }
                    }

                    if(!_refArea){
                        _refArea = findRefArea( null, '08' ); //SCHEIN by default
                    }
                    _refArea.name = 'Kombination ' + _refArea.name;

                    let rules = {
                        rules: [
                            {
                                _refArea,
                                isActive: true,
                                description: `Kombinationsregel ${context.code} und ${combinationRules[0].seq} ${combinationRules[0].type === 'or' ? 'oder' : 'und'} ${combinationRules[1].seq} (${getCatalogName(context.catalogShort)})`,
                                validations: {
                                    $and: [
                                        {
                                            context: 'ACTIVITY',
                                            criteria: {
                                                actType: 'TREATMENT',
                                                code: {
                                                    $eq: context.code,
                                                    $catalogShort: context.catalogShort
                                                },
                                                timestamp: getValidityCondition( combinationRules[0], context )
                                            }
                                        }
                                    ]
                                },
                                actions: [
                                    {
                                        type: 'ERROR'
                                    }
                                ]
                            }

                        ]
                    };

                    if( combinationRules[0].type === 'or' ) {
                        rules.rules[0].validations.$and.push( {
                            context: 'ACTIVITY',
                            criteria: {
                                actType: 'TREATMENT',
                                code: {
                                    $eq: combinationRules[0].seq,
                                    $catalogShort: context.catalogShort
                                }
                            }
                        } );
                        rules.rules[0].validations.$and.push( {
                            context: 'ACTIVITY',
                            criteria: {
                                actType: 'TREATMENT',
                                code: {
                                    $eq: combinationRules[1].seq,
                                    $catalogShort: context.catalogShort
                                }
                            }
                        } );
                    } else {
                        rules.rules[0].validations.$and.push( { $or: [ {
                            context: 'ACTIVITY',
                            criteria: {
                                actType: 'TREATMENT',
                                code: {
                                    $eq: combinationRules[0].seq,
                                    $catalogShort: context.catalogShort
                                },
                                $count: { $eq: 0 }
                            }
                        }, {
                            context: 'ACTIVITY',
                            criteria: {
                                actType: 'TREATMENT',
                                code: {
                                    $eq: combinationRules[1].seq,
                                    $catalogShort: context.catalogShort
                                },
                                $count: { $eq: 0 }
                            }
                        } ] } );
                    }

                    return rules;
                }
            },
            dignityRules: ( dignityRules, context ) => {
                const _refArea = findRefArea( null, '150' ); //Entry rule
                const rules = [];

                if( dignityRules.quantDignity && Object.keys(dignityRules.quantDignity).length > 0 ){
                    if( dignityRules.quantDignity.code ){
                        rules.push( {
                            _refArea,
                            isActive: true,
                            description: `Leistung '${context.code}' benötigt quantitative Dignität '${dignityRules.quantDignity.text || dignityRules.quantDignity.code}'`,
                            validations: [
                                {
                                    context: 'ACTIVITY',
                                    criteria: {
                                        actType: 'TREATMENT',
                                        code: {
                                            $eq: context.code,
                                            $catalogShort: context.catalogShort
                                        },
                                        'employeeId.quantiDignities': {$nin: [dignityRules.quantDignity.code]}
                                    }
                                }
                            ],
                            actions: [
                                {
                                    type: 'ERROR'
                                }
                            ]
                        } );


                    }
                }

                if( Array.isArray( dignityRules.qualDignity ) && dignityRules.qualDignity.length ) {
                    let requiredDignities = dignityRules.qualDignity.map( el => el.code ).filter( el => el !== '9999' );
                    if( requiredDignities.length ){
                        rules.push( {
                            _refArea,
                            isActive: true,
                            description: `Leistung '${context.code}' benötigt qualitative Dignität '${requiredDignities.join(';')}'`,
                            validations: [
                                {
                                    context: 'ACTIVITY',
                                    criteria: {
                                        actType: 'TREATMENT',
                                        code: {
                                            $eq: context.code,
                                            $catalogShort: context.catalogShort
                                        },
                                        'employeeId.qualiDignities': {$nin: requiredDignities },
                                        timestamp: getValidityCondition( dignityRules.qualDignity[0], context )
                                    }
                                }
                            ],
                            actions: [
                                {
                                    type: 'ERROR'
                                }
                            ]
                        } );
                    }

                }

                if( rules.length ){
                    return {rules};
                }
            },
            treatmentGroups: ( treatmentGroups, context ) => {
                const
                    rules = [],
                    operatorsMap = {
                        '<=': '$gt',
                        '<': '$gte',
                        '>=': '$lt',
                        '>': '$lte',
                        '=': '$eq'
                    },
                    groupCriterias = {
                        '04': { 'ageOnTimestamp': {$gte: 6, $lte: 75} }
                    },
                    validUntilDateWrong = new Date( '1999-12-30T23:00:00.000Z' ).getTime(),
                    validUntilDateCorrect = new Date( '2199-12-30T23:00:00.000Z');

                for( let treatmentGroup of treatmentGroups){  // eslint-disable-line
                    const
                        { code: groupCode } = treatmentGroup;

                    if( !treatmentGroup.frequencyRules || !treatmentGroup.frequencyRules.length ){
                        continue;
                    }

                    for( let frequencyRule of treatmentGroup.frequencyRules){   // eslint-disable-line
                        let { quantity, operator, time: {quantity: periodQuantity, unitCode, unitTextSingular, unitTextPlural } } = frequencyRule;
                        const _refArea = findRefArea( periodQuantity, unitCode );

                        if( !_refArea || !quantity) {
                            Y.log( `treatmentGroups: not clear mapper data (${JSON.stringify(_refArea)}|${quantity}) for ${context.code}:${groupCode}`, 'warn', NAME );
                            continue;
                        }

                        if( frequencyRule.validUntil && frequencyRule.validUntil.getTime() === validUntilDateWrong ){
                            frequencyRule.validUntil = validUntilDateCorrect;
                        }

                        let
                            criteria = {
                                actType: 'TREATMENT',
                                code: {
                                    $eq: context.code,
                                    $catalogShort: context.catalogShort
                                },
                                $count: {},
                                timestamp: getValidityCondition( frequencyRule, context )
                            };

                        criteria.$count[operatorsMap[operator]] = Number( quantity );
                        if(groupCriterias[groupCode]){
                            criteria = {...criteria, ...groupCriterias[groupCode]};
                        }

                        rules.push( {
                            _refArea,
                            isActive: true,
                            description: `${context.code} max. ${Number( quantity )} mal pro ${periodQuantity} ${periodQuantity === 1 ? unitTextSingular : unitTextPlural}`,
                            validations: [
                                {
                                    context: 'ACTIVITY',
                                    criteria
                                }
                            ],
                            actions: [
                                {
                                    type: 'ERROR'
                                }
                            ]
                        } );
                    }

                }

                if( rules.length ){
                    return {rules};
                }
            },

            /*
            //commented out for now because Zuzacleuistung need HauptLeistug that not member of Block

            blocRules: (blockRules, context, u_extra) => {
                const
                    rules = [];

                //get time interval from corresponding frequency rule and find refArea or set SCHEIN
                let _refArea;
                if( u_extra && u_extra.frequencyRules && u_extra.frequencyRules.length ){
                    let {timeUnit} = u_extra.frequencyRules[0];
                    _refArea = findRefArea( null, timeUnit );
                    if(!_refArea) {
                        Y.log( `ruleMapper: Cumulation unknown area ${timeUnit} for ${context.code}`, 'warn', NAME );
                    }
                }

                if(!_refArea){
                    _refArea = findRefArea( null, '21' ); //APK by default
                }

                const refAreaName = _refArea.name;
                _refArea.name = 'Block Kumulation ' + _refArea.name;

                let cumulatedCodes = [];

                for( let blockRule of blockRules){  // eslint-disable-line
                    const
                        { code } = blockRule,
                        cumulatedEntries = BLOCK_CUMULATION[code];

                    if( !cumulatedEntries ){
                        continue;
                    }

                    for (let entry of cumulatedEntries) { // eslint-disable-line
                        switch( entry.type ) {
                            case 'L': {
                                cumulatedCodes.push( entry.code );
                                break;
                            }
                            case 'B': {
                                let treatmenlBlockMembers = (context.treatmentBlocks || []).find( el => el._id === code );
                                cumulatedCodes = [...cumulatedCodes, ...(treatmenlBlockMembers.groupMembers || [])];
                                break;
                            }
                            default:
                                Y.log( `ruleMapper.BlockRules: unkmown cumulated entry type ${entry.type}`, 'warn', NAME );
                        }
                    }

                    if( context.treatmentCategory !== 'Referenzleistung' && cumulatedCodes.length ){
                        cumulatedCodes.push( context.code );
                        cumulatedCodes = [...new Set( cumulatedCodes )];
                        rules.push( {
                            _refArea,
                            isActive: true,
                            description: `${context.code} nur kumulierbar mit LB-${code} (${context.catalogShort}) ${refAreaName}`,
                            validations: [
                                {
                                    $and: [
                                        {
                                            context: 'ACTIVITY',
                                            criteria: {
                                                actType: 'TREATMENT',
                                                code: {
                                                    $eq: context.code,
                                                    $catalogShort: context.catalogShort
                                                }
                                            },
                                            timestamp: getValidityCondition( blockRule, context )
                                        },
                                        {
                                            context: 'ACTIVITY',
                                            criteria: {
                                                actType: 'TREATMENT',
                                                catalogShort: context.catalogShort,
                                                code: { $nin: cumulatedCodes }
                                            },
                                            timestamp: getValidityCondition( blockRule, context )
                                        }
                                    ]
                                }
                            ],
                            actions: [
                                {
                                    type: 'ERROR'
                                }
                            ]
                        } );
                    }
                }

                if( rules.length ){
                    return { rules };
                }
            },
             */

            cumulationRules: ( cumulationRules, context, u_extra ) => { //eslint-disable-line no-unused-vars
                const
                    rules = [];
                let
                    incl = [];

                //get time interval from corresponding frequency rule and find refArea or set SCHEIN
                let _refArea;
                //do not take frequency time for cumulation jyst use Sitzung

                // if( u_extra && u_extra.frequencyRules && u_extra.frequencyRules.length ){
                //     let {timeUnit} = u_extra.frequencyRules[0];
                //     _refArea = findRefArea( null, timeUnit );
                //     if(!_refArea) {
                //         Y.log( `ruleMapper: Cumulation unknown area ${timeUnit} for ${context.code}`, 'warn', NAME );
                //     }
                // }

                if(!_refArea){
                    _refArea = findRefArea( null, '1' ); //SITZUNG by default
                }

                const refAreaName = _refArea.name;
                _refArea.name = 'Kumulation ' + _refArea.name;

                let firstIncl;

                for( let cumulationRule of cumulationRules){  // eslint-disable-line
                    const
                        { masterType, slaveSeq, slaveType, type } = cumulationRule;

                    if( masterType !== 'L' ){
                        continue; // all rules are treatment based
                    }

                    switch( slaveType ){
                        case 'L': {
                            if( type === 'E' ){
                                incl.push( slaveSeq );
                                if( !firstIncl ){
                                    firstIncl = JSON.parse( JSON.stringify( cumulationRule ) );
                                }
                            }

                            break;
                        }
                        case 'G': {
                            let  treatmentGroupMembers = (context.treatmentGroups || []).find( el => el._id === slaveSeq );
                            if( type === 'E' ) {
                                incl = incl.concat( treatmentGroupMembers && treatmentGroupMembers.groupMembers || [] );
                                if( !firstIncl ) {
                                    firstIncl = JSON.parse( JSON.stringify( cumulationRule ) );
                                }
                            }

                            if( (context.treatmentCategory !== 'Referenzleistung' || context.catalogShort === "Pandemieleistungen" ) && type === 'X' && treatmentGroupMembers && treatmentGroupMembers.groupMembers && treatmentGroupMembers.groupMembers.length ){

                                let
                                    specialPair = [ '00.2560', '00.2570' ],
                                    specialCase = specialPair.includes( context.code ),
                                    andValidation = {
                                        $and: [
                                            {
                                                context: 'ACTIVITY',
                                                criteria: {
                                                    actType: 'TREATMENT',
                                                    code: {
                                                        $eq: context.code,
                                                        $catalogShort: context.catalogShort
                                                    }
                                                },
                                                timestamp: getValidityCondition( cumulationRule, context )
                                            },
                                            {
                                                context: 'ACTIVITY',
                                                criteria: {
                                                    actType: 'TREATMENT',
                                                    catalogShort: context.catalogShort,
                                                    code: { $nin: [...new Set([
                                                        ...(treatmentGroupMembers.groupMembers || []),
                                                        ...(specialCase ? specialPair : [ context.code] )
                                                    ] ) ] }
                                                },
                                                timestamp: getValidityCondition( cumulationRule, context )
                                            }
                                        ]
                                    },
                                    andValidationPairHandling = {
                                        $and: [
                                            {
                                                context: 'ACTIVITY',
                                                criteria: {
                                                    actType: 'TREATMENT',
                                                    code: {
                                                        $eq: specialPair[0],
                                                        $catalogShort: context.catalogShort
                                                    }
                                                },
                                                timestamp: getValidityCondition( cumulationRule, context )
                                            },
                                            {
                                                context: 'ACTIVITY',
                                                criteria: {
                                                    actType: 'TREATMENT',
                                                    code: {
                                                        $eq: specialPair[1],
                                                        $catalogShort: context.catalogShort
                                                    }
                                                },
                                                timestamp: getValidityCondition( cumulationRule, context )
                                            },
                                            {
                                                context: 'ACTIVITY',
                                                criteria: {
                                                    actType: 'TREATMENT',
                                                    catalogShort: context.catalogShort,
                                                    code: { $in: (treatmentGroupMembers.groupMembers || []).filter( el => !specialPair.includes( el ) ) },
                                                    $count: { $eq : 0 }
                                                },
                                                timestamp: getValidityCondition( cumulationRule, context )
                                            }
                                        ]
                                    };

                                rules.push( {
                                    _refArea,
                                    isActive: true,
                                    description: `${context.code} nur kumulierbar mit LG-${slaveSeq} (${context.catalogShort}) ${refAreaName}`,
                                    validations: [
                                        specialPair.includes( context.code ) ? { $or: [ andValidation, andValidationPairHandling ] } : andValidation
                                    ],
                                    actions: [
                                        {
                                            type: 'ERROR'
                                        }
                                    ]
                                } );
                            }
                            break;
                        }
                        default:
                            //not processed type like K or B
                            continue;

                    }
                }

                if( incl.length ){

                    rules.push( {
                        _refArea,
                        isActive: true,
                        description: `Ausschlussliste für ${context.code} (${context.catalogShort}) ${refAreaName}`,
                        validations: [
                            {
                                $and: [
                                    {
                                        context: 'ACTIVITY',
                                        criteria: {
                                            actType: 'TREATMENT',
                                            code: {
                                                $eq: context.code,
                                                $catalogShort: context.catalogShort
                                            }
                                        },
                                        timestamp: getValidityCondition( firstIncl, context )
                                    },
                                    {
                                        context: 'ACTIVITY',
                                        criteria: {
                                            actType: 'TREATMENT',
                                            catalogShort: context.catalogShort,
                                            code: { $in: [...new Set(incl)] }
                                        },
                                        timestamp: getValidityCondition( firstIncl, context )
                                    }
                                ]
                            }
                        ],
                        actions: [
                            {
                                type: 'ERROR'
                            }
                        ]
                    } );
                }

                if( rules.length ){
                    return { rules };
                }
            }
        };

        function map( key, value, context, u_extra ) {
            const mapper = ruleMapper[key];

            if( mapper ) {
                return mapper( value, context, u_extra );
            }
        }

        Y.namespace( 'doccirrus' ).tarmedRuleMapper = {
            name: NAME,
            map
        };
    },
    '0.0.1', {requires: ['dcruleimportutils']}
);