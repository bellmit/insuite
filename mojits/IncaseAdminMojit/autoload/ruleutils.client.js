/**
 * User: do
 * Date: 25/01/16  16:08
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko, _ */
'use strict';

YUI.add( 'dcruleutils', function( Y, NAME ) {

        var
            i18n = Y.doccirrus.i18n,
            translations = {
                and: i18n( 'IncaseAdminMojit.rules.operators.and' ),
                or: i18n( 'IncaseAdminMojit.rules.operators.or' ),
                validation: 'Prüfung',
                ERROR: i18n( 'IncaseAdminMojit.rules.actions.labels.ERROR' ),
                WARNING: i18n( 'IncaseAdminMojit.rules.actions.labels.WARNING' ),
                TASK: i18n( 'IncaseAdminMojit.rules.actions.labels.TASK' ),
                TASK_WITH_FORM: i18n( 'IncaseAdminMojit.rules.actions.labels.TASK_WITH_FORM' ),
                FORM_WITHOUT_TASK: i18n( 'IncaseAdminMojit.rules.actions.labels.FORM_WITHOUT_TASK' ),
                ACTIVITY: i18n( 'IncaseAdminMojit.rules.actions.labels.ACTIVITY' ),
                PATIENT: i18n( 'IncaseAdminMojit.rules.actions.labels.PATIENT' )
            },
            actTypeWhiteList = Y.doccirrus.schemas.activity.activityTypes,
            operatorList = _getOperatorList(),
            greaterThanOperators = ['$gt', '$gte', 'gt', 'gte'],
            lessThanOperators = ['$lt', '$lte', 'lt', 'lte'],
            comparisonOperators = greaterThanOperators.concat( lessThanOperators ),
            unwrap = ko.utils.unwrapObservable;

        function _getOperatorList() {
            var operatorList = [
                { val: '$eq', visible: true },
                { val: '$eqDate', visible: true },
                { val: '$ne', visible: true },
                { val: '$neDate', visible: true },
                { val: '$regex', visible: true },
                { val: '$options', visible: false },
                { val: '$in', visible: true },
                { val: '$nin', visible: true },
                { val: '$all', visible: true },
                { val: '$exists', visible: true },

                { val: '$comp', visible: true },
                { val: '$compDate', visible: true },

                { val: '$gt', visible: false },
                { val: '$lt', visible: false },
                { val: '$gte', visible: false },
                { val: '$lte', visible: false }
            ];
            return operatorList.map( function( op ) {
                op.i18n = Y.doccirrus.i18n( 'operator_list.' + op.val );
                return op;
            } );
        }

        function merge( a, b ) {
            var i;
            for( i in b ) {
                if( b.hasOwnProperty( i ) ) {
                    a[i] = b[i];
                }
            }
        }

        function findOperatorByName( name ) {
            var result;
            operatorList.some( function( op ) {
                if( op.val.replace( '$', '' ) === name.replace( '$', '' ) ) {
                    result = op;
                    return true;
                }
            } );
            return result;
        }

        function makeAttributeList( actType ) {
            var schema = Y.doccirrus.schemas.activity.getRuleEngineSchema( actType, ( ( actType === 'task' ) ? 'task' : undefined ) ),
                xmlTypes;

            if( ('MEASUREMENT' === actType || 'PROCESS' === actType) && ( Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.CARDIO ) ||
                                               Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.DOQUVIDE ) ||
                                               Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.DQS )) ){
                xmlTypes = Y.doccirrus.schemas.cardio.xmlTypes;
                Object.keys(xmlTypes).filter( function(xmlKey){
                    return xmlKey.indexOf('MDC.') === 0 || xmlKey.indexOf('BIO.') === 0;
                }).forEach( function(xmlKey){
                    var cuttedKey = xmlKey;
                    schema['d_extra.' +cuttedKey] = {
                        "type": xmlTypes[xmlKey],
                        "i18n": cuttedKey.replace(/\./g,' '),
                        "rule-engine": {}
                    };
                });


            }

            return {actType: actType, list: refineAttrList( actType, schema ) || []};
        }

        var attributeLists;
        function getAttributeList( actType ) {
            var result;
            if(!attributeLists){
                attributeLists = actTypeWhiteList.map( function( actType ) {
                    return makeAttributeList( actType );
                } );
                attributeLists.push( makeAttributeList( 'casefolder' ));
                attributeLists.push( makeAttributeList( 'patient' ));
                attributeLists.push( makeAttributeList( 'task' ));
            }

            attributeLists.some( function( listDef ) {
                if( actType === listDef.actType ) {
                    result = listDef.list;
                    return true;
                }
            } );
            return result;
        }

        function getVisibleOperatorList() {
            return operatorList.filter( function( op ) {
                return false !== op.visible;
            } );
        }

        function getComparisonLists() {
            var result = {
                greaterThanList: [],
                lessThanList: []
            };

            operatorList.forEach( function( entry ) {
                if( -1 !== greaterThanOperators.indexOf( entry.val ) ) {
                    result.greaterThanList.push( entry );
                } else if( -1 !== lessThanOperators.indexOf( entry.val ) ) {
                    result.lessThanList.push( entry );
                }
            } );

            return result;
        }

        function getComparisonList() {
            return operatorList.filter( function( entry ) {
                return -1 !== operatorList.indexOf( entry.val );
            } );
        }

        function getAttributeListItem( actType, path ) {
            if( !actType || !path ) {
                return;
            }
            var result,
                attrList = getAttributeList( actType );

            attrList.some( function( item ) {
                if( item.path === path ) {
                    result = item;
                    return true;
                }
            } );

            return result;
        }

        function setI18n( actType, path, i18n ) {

            if( 'TREATMENT' === actType && 'code' === path ) {
                return 'GNR';
            }

            if( 'DIAGNOSIS' === actType && 'code' === path ) {
                return 'ICD';
            }

            return i18n;
        }

        function isComparisonOperator( config ) {
            return config.some( function( o ) {
                if( -1 !== comparisonOperators.indexOf( o.operator ) ) {
                    return true;
                }
            } );
        }

        function createComparisonValue( config, allowEqual ) {
            var result = {};

            config.forEach( function( entry ) {
                if( -1 !== comparisonOperators.indexOf( entry.operator ) ) {
                    result[entry.operator] = entry.value;
                } else if( allowEqual && '$eq' === entry.operator ) {
                    result.$eq = entry.value;
                }
            } );

            return result;
        }

        function isRegExOperator( config ) {
            return config.some( function( o ) {
                if( '$regex' === o.operator ) {
                    return true;
                }
            } );
        }

        function createRegExValue( config ) {
            var result = {
                $regex: '',
                $options: ''
            };

            config.forEach( function( operatorEntry ) {
                if( '$regex' === operatorEntry.operator ) {
                    result.$regex = operatorEntry.value;
                }

                if( '$options' === operatorEntry.operator ) {
                    result.$options = operatorEntry.value;
                }
            } );

            return result;
        }

        function translateOperator( operatorName ) {
            var result;
            if( !operatorName ){
                return '';
            }
            operatorList.some( function( entry ) {
                if( entry.val.replace( '$', '' ) === operatorName.replace( '$', '' ) ) {
                    result = entry.i18n;
                    return true;
                }
            } );
            return result;
        }

        function translateEnum( value, list ) {
            var result;
            list.some( function( entry ) {
                if( entry.val === value ) {
                    result = entry.i18n;
                    return true;
                }
            } );
            return result;
        }

        function refineAttrList( actType, ruleEngineSchema ) {
            var result = [];
            if( actType ){
                Object.keys( ruleEngineSchema ).forEach( function( key ) {

                    var schemaEntry = ruleEngineSchema[key],
                        ruleEngineDesc = schemaEntry['rule-engine'],
                        entry = {
                            path: key,
                            i18n: setI18n( actType, key, ruleEngineDesc.i18n || schemaEntry.i18n ),
                            allowedOperators: ruleEngineDesc.allowedOperators || [],
                            schemaEntry: schemaEntry
                        };
                    if( ruleEngineDesc.type ){
                        entry.schemaEntry.type = ruleEngineDesc.type;
                    }
                    result.push( entry );
                } );

                // virtual paths, will be converted to a dob time range query by rule engine
                result.push(
                    {
                        path: 'patientId.age',
                        i18n: 'Alter',
                        allowedOperators: [],
                        schemaEntry: {
                            type: 'Number'
                        }
                    },
                    {
                        path: 'patientId.isPensioner',
                        i18n: i18n( 'person-schema.Person_T.isPensioner' ),
                        schemaEntry: {
                            type: 'Boolean',
                            "rule-engine": {
                                simpleType: true
                            }
                        }
                    },
                    {
                        path: 'patientId.workingAt',
                        i18n: i18n( 'person-schema.Person_T.workingAt' ),
                        schemaEntry: {
                            type: 'String'
                        }
                    },
                    {
                        path: 'patientId.jobTitle',
                        i18n: i18n( 'person-schema.Person_T.jobTitle' ),
                        schemaEntry: {
                            type: 'String'
                        }
                    }
                 );

                if( 'SCHEIN' === actType ){
                    result.push( {
                        path: 'nAPK',
                        i18n: 'nAPK_L',
                        allowedOperators: [],
                        schemaEntry: {
                            type: 'Number'
                        }
                    } );
                }
                if( ![ 'casefolder', 'patient', 'task' ].includes( actType ) ) {
                    result.push( {
                        path: 'ageOnTimestamp',
                        i18n: 'Alter am Datum',
                        allowedOperators: [],
                        schemaEntry: {
                            type: 'Number'
                        }
                    } );
                }
                if( [ 'casefolder', 'patient' ].includes( actType ) ) {
                    result = result.filter( function(el){
                        return /^patientId\./.test(el.path);
                    });
                }

                if( !([ 'casefolder', 'task' ].includes( actType )) ) {
                    result.push( {
                        path: 'patientId.caseFolderOpen',
                        i18n: 'Fall öffnen',
                        allowedOperators: [ '$eq' ],
                        schemaEntry: {
                            list: [
                                {
                                    val: true,
                                    i18n: 'ja'
                                },
                                {
                                    val: false,
                                    i18n: 'nein'
                                }
                            ],
                            type: 'Boolean'
                        }
                    } );
                }

                if( 'casefolder' === actType ){
                    result = result.concat( [
                        {
                            path: 'type',
                            i18n: 'Type',
                            allowedOperators: [],
                            schemaEntry: {
                                type: 'String',
                                "list": JSON.parse( JSON.stringify( Y.doccirrus.schemas.person.types.Insurance_E.list || [] ) )
                            }

                        },
                        {
                            path: 'additionalType',
                            i18n: 'Additional Type',
                            allowedOperators: [],
                            schemaEntry: {
                                type: 'String',
                                "list": Y.doccirrus.schemas.casefolder.types.Additional_E.list || []
                            }
                        },
                        {
                            path: 'new',
                            i18n: 'Neue Fall',
                            allowedOperators: [],
                            schemaEntry: {
                                list: [
                                    {
                                        val: true,
                                        i18n: 'ja'
                                    },
                                    {
                                        val: false,
                                        i18n: 'nein'
                                    }
                                ],
                                type: 'Boolean'
                            }
                        }
                    ] );
                }

                result = result.map( function(el){
                    if( /^patientId\./.test(el.path) ){
                        el.i18n = '(P) ' + el.i18n;
                    }
                    if( /^employeeId\./.test(el.path) ){
                        el.i18n = '(M) ' + el.i18n;
                    }
                    if( /^locationId\./.test(el.path) ){
                        el.i18n = '(B) ' + el.i18n;
                    }
                    return el;
                });
            }


            return result;
        }

        function Criteria( actType, criterionList, count, isCaseFolder, isPatient, isTask ) {
            var
                self = this;

            isPatient = isPatient || false;
            isCaseFolder = isCaseFolder || false;
            isTask = isTask || false;

            self.actType = ko.observable( actType );
            self.criterionList = ko.observableArray( criterionList );
            self.count = ko.observable( count ? createComparisonValue( count, true ) : null );
            self.isCaseFolder = ko.observable( isCaseFolder );
            self.isPatient = ko.observable( isPatient );
            self.isTask = ko.observable( isTask );
            self.isActivity = ko.observable( !isCaseFolder && !isPatient && !isTask );


            self.displayActType = ko.computed( function() {
                var aT = self.actType();
                return Y.doccirrus.ruleutils.translateActType( aT );
            } );

            self.displayCount = ko.computed( function() {
                var c = self.count(),
                    arr = Object.keys( (c && 'object' === typeof c) ? c : {} ).map( function( key ) {
                        var v = c[key];
                        return translateOperator( key ) + ' ' + v;
                    } );

                return 'Anzahl ' + arr.join( '; ' );
            } );
        }

        Criteria.prototype.serialize = function() {
            var
                self = this,
                actType = unwrap( self.actType ),
                count = unwrap( self.count ),
                result = {
                    actType: {
                        $eq: actType || undefined
                    },
                    $count: count || undefined
                };

                if( 'casefolder' === actType || 'patient' === actType || 'task' === actType ){
                    result = {};
                }

            unwrap( self.criterionList ).forEach( function( criterion ) {
                merge( result, criterion.serialize() );
            } );

            return result;
        };

        Criteria.prototype.addCriterion = function() {
            var
                self = this,
                criterion = new Criterion( '', [{operator: '$eq', value: ''}] );
            self.criterionList.push( criterion );
            return criterion;
        };

        Criteria.prototype.removeCriterion = function( criterion ) {
            // TODOOO destroy model...
            var
                self = this;
            self.criterionList.remove( criterion );
        };

        function Criterion( path, config ) {
            var
                self = this,
                operator, value;
            self.path = ko.observable( path );

            if( isComparisonOperator( config ) ) {
                operator = '$comp';
                value = createComparisonValue( config );
            } else if( isRegExOperator( config ) ) {
                operator = '$regex';
                value = createRegExValue( config );
            } else {
                operator = config[0].operator;
                value = config[0].value;
            }

            self.operator = ko.observable( operator );
            self.value = ko.observable( value );
            self.casefolderType = ko.observable( null );
            self.setOnCriteria = ko.observable( true );
            self.displayedText = ko.observable();
        }

        function detectUnit( number ){ // reveret to ruleimportuils::getAgeInYears
            if( number && 'object' !== typeof number && !Number.isInteger( number ) ){
                if( !Number.isInteger( number ) && Number.isInteger( parseFloat(( number * 12 ).toFixed(5))) ){
                    return {value: parseFloat(( number * 12 ).toFixed(5)), unit: 'Monat'};
                }
                if( !Number.isInteger( number ) && Number.isInteger( parseFloat(( number * 365 ).toFixed(5))) ){
                    return {value: parseFloat(( number * 365 ).toFixed(5)), unit: 'Tag'};
                }
                if( Number.isInteger( parseFloat(( number * 52 ).toFixed(5))) ){
                    return {value: parseFloat(( number * 52 ).toFixed(5)), unit: 'Woche'};
                }
            } else {
                return {value: 'object' !== typeof number && number || 0, unit: 'Jahr'};
            }
        }

        function splitLongText( text, len ){
            var result = '';

            while( text && text.length ){
                result += text.substring( 0, len ) + ' ';
                text = text.substring( len );
            }

            return result;
        }

        Criterion.prototype.getText = function( actType, context ) {
            if( !actType ) {
                return '';
            }
            var
                self = this,
                list,
                result = '',
                attrList = getAttributeList( actType ),

                //here reacted on changes --------
                path = unwrap( self.path ),
                value = unwrap( self.value ),
                operator = unwrap( self.operator ),

                pathTranslated = '', operatorTranslated, valueTranslated;

            attrList.some( function( entry ) {
                if( entry.path === path ) {
                    pathTranslated = entry.i18n;
                    if( entry.schemaEntry.list ) {
                        // translate enum values
                        value = translateEnum( value, entry.schemaEntry.list ) || value;
                    }
                    return true;
                }
            } );

            var
                tValue,
                valueRegExp,
                LEN = 10;
            if( '$eq' === operator && value && ( value.$catalogShort || '' === value.$catalogShort ) && 'code' === path ) {
                result = pathTranslated + ' ' + translateOperator( operator ) +
                         ( ( '' !== value.$catalogShort ) ? ' (' + value.$catalogShort + ') ' : ' ' ) +
                         ( ( value.$eq && typeof value.$eq !== 'object' ) ? value.$eq : '' );
            } else if( value && value.hasOwnProperty && value.hasOwnProperty('$catalogShort') && ('code' !== path || '$eq' !== operator ) ) {
                value = '';
                result = pathTranslated + ' ' + translateOperator( operator );
            } else if( value && ( value.$regex || '' === value.$regex ) && '$regex' !== operator ) {
                value = '';
                result = pathTranslated + ' ' + translateOperator( operator );
            } else if( '$comp' === operator || '$compDate' === operator) {
                value = value || {};
                value = Object.keys( 'object' === typeof value ? value : {} ).map( function( key ) {
                    var v = value[key], tV;
                    if( 'patientId.age' === path ){
                        tV = detectUnit(v);
                        return translateOperator( key ) + ' ' + tV.value + ' (' + tV.unit + ')';
                    }
                    return translateOperator( key ) + ' ' + v;
                } );

                result = pathTranslated + ' ' + value.join( '; ' );
            } else if( -1 !== ['$eq', '$ne'].indexOf( operator ) && 'patientId.age' === path ){
                tValue = detectUnit(value);
                result = pathTranslated + ' ' + translateOperator( operator ) + ( tValue.value ? ' ' + tValue.value + ' (' + tValue.unit + ')' : '' );
            } else if( -1 !== ['$in', '$nin', '$all'].indexOf( operator ) ) {
                operatorTranslated = translateOperator( operator );
                list = Array.isArray( value ) ? value.join( ', ' ) : '';
                result = pathTranslated + ' ' + operatorTranslated + ' ' + list;
            } else if( '$regex' === operator ) {
                operatorTranslated = translateOperator( operator );
                valueRegExp = value && value.$regex;
                result = pathTranslated + ' ' + operatorTranslated + ' ' + ( valueRegExp ? '/' + splitLongText(valueRegExp, LEN ) + '/' + value.$options || '' : '' );
            } else if( -1 !== ['$eq', '$ne'].indexOf( operator ) && 'patientId.markers' === path && context && context.markers ){ //TODO
                operatorTranslated = translateOperator( operator );
                valueTranslated = context.markers().find( function(marker){ return marker.id === value; }) || {};
                result = pathTranslated + ' ' + operatorTranslated + ' ' + valueTranslated.text || value;
            } else if( -1 !== ['$eq', '$ne'].indexOf( operator ) && 'taskType' === path && context && context.taskTypes ) {
                operatorTranslated = translateOperator( operator );
                valueTranslated = context.taskTypes().find( function(taskType){ return taskType.id === value; }) || {};
                result = pathTranslated + ' ' + operatorTranslated + ' ' + valueTranslated.text || value;
            } else {
                operatorTranslated = translateOperator( operator );

                if( '$exists' === operator ) {
                    value = false === value ? 'nicht' : '';
                }

                if( '' === pathTranslated && !operatorTranslated && !value ) {
                    value = 'nicht';
                }

                result = pathTranslated + ' ' + operatorTranslated + ' ' + ( value || '' ) ;
            }

            return result;
        };

        Criterion.prototype.serialize = function() {
            var
                self = this,
                result = {},
                path = unwrap( self.path ),
                operator = unwrap( self.operator ),
                value = unwrap( self.value );

            if(!path || !operator){
                return result;
            }

            switch( operator ) {
                case '$comp':
                case '$regex':
                    result[path] = value;
                    break;
                case '$eq':
                    if(value && (value.$catalogShort || '' === value.$catalogShort)){
                        result[path] = value; //special for catalog code widget
                    } else {
                        result[path] = {};
                        result[path][operator] = value;
                    }
                    break;
                default:
                    result[path] = {};
                    result[path][operator] = value;
            }

            return result;
        };

        function isObject( obj ) {
            return _.isObject( obj );
        }

        function actTypeFilter( entry ) {
            return -1 !== actTypeWhiteList.indexOf( entry.val );
        }

        function mapActTypeEntry( entry ) {
            return {id: entry.val, text: entry.i18n};
        }

        function getActTypeList( functionalityList ) {
            var list = Y.doccirrus.schemas.activity.nameGroupedActivityTypeConfigs;
            list = list.filter( function ( entry) {
                return ( entry.notVisible === 'undefined' ) || !entry.notVisible;
            } );
            if( functionalityList ) {
                list = list.filter( function ( entry) {
                    var eF = entry.functionality && entry.functionality;
                    if( !eF ){
                        return false;
                    }
                    var i;
                    for(i = 0; i < functionalityList.length; i++){
                       if( eF === functionalityList[i] ){
                           return true;
                       }
                    }
                    return false;
                } );
            }
            return list.filter( actTypeFilter ).map( mapActTypeEntry );
        }

        function translate( str ) {
            var translation = translations[str];
            return translation || str;
        }

        function translateActType( actType ) {
            var result;
            Y.doccirrus.schemas.activity.types.Activity_E.list.some( function( entry ) {
                if( entry.val === actType ) {
                    result = entry.i18n;
                    return true;
                }
            } );
            return result || 'k.A.';
        }

        function parseCriterionObject( criterion ) {
            var results = [];
            Object.keys( criterion ).forEach( function( key ) {
                var operator = findOperatorByName( key );
                if( operator ) {
                    results.push( {
                        operator: key,
                        value: criterion[key]
                    } );
                }
            } );
            return results;
        }

        function parseCriteria( criteria, isCaseFolder, isPatient, isTask, options ) {
            var criteriaArr = [],
                $count = null,
                actType = isCaseFolder ? 'casefolder' : isPatient ? 'patient' : isTask ? 'task' : null,
                insuranceStatusPrefix = 'patientId.insuranceStatus.';

            if( !isObject( criteria ) ) {
                return criteriaArr;
            }

            Object.keys( criteria ).forEach( function( _key ) {
                var
                    key, split,
                    criterion = criteria[_key],
                    parsedCriterion;

                if( '$or' === _key && criterion[0] && 'object' === typeof criterion[0] &&
                    Object.keys(criterion[0])[0] && 0 === Object.keys(criterion[0])[0].indexOf( insuranceStatusPrefix ) ) {
                    _key = Object.keys(criterion[0])[0];
                    criterion = criterion[0][_key];
                    delete criteria.$or;
                    criteria[_key] = criterion;
                }

                if( 0 === _key.indexOf( insuranceStatusPrefix ) ) {
                    split = _key.split( '.' );
                    split.splice( 2, 1 );
                    key = split.join( '.' );
                } else {
                    key = _key;
                }

                if( '$count' === key ) {
                    $count = parseCriterionObject( criterion );
                } else if( 'actType' === key ) {
                    actType = parseCriterionObject( criterion );
                    actType = actType && actType && actType[0] && actType[0].value || criterion;
                } else if( isObject( criterion ) ) {
                    if( criterion.$catalogShort || '' === criterion.$catalogShort){
                        parsedCriterion = [
                            {
                                value: criterion,
                                operator: '$eq'
                            }
                        ];
                    } else {
                        parsedCriterion = parseCriterionObject( criterion );
                    }
                } else {
                    parsedCriterion = [
                        {
                            value: criterion,
                            operator: '$eq'
                        }
                    ];
                }

                var criterionObj;
                if( parsedCriterion && parsedCriterion.length ) {
                    criterionObj = Object.assign( new Criterion( key, parsedCriterion ), options || {} );
                    criterionObj.displayedText( criterionObj.getText( actType, criterionObj ) );
                    criteriaArr.push( criterionObj );
                }

            } );

            if( 'string' !== typeof actType && !isCaseFolder && !isPatient && !isTask ) {
                throw Error( 'actType must be set and must be an object!' );
            }

            return new Criteria( ( (isTask)? 'task': (isPatient)? 'patient': (isCaseFolder)? 'casefolder': actType ), criteriaArr, $count, isCaseFolder, isPatient, isTask );
        }

        function validate( context, config ) {

            var refKeys = [],
                validationsKeys = [],
                allKeys;

            Object.keys( config ).forEach( function( key ) {
                var val = config[key];

                if( ko.isObservable( context[key] ) ) {

                    if( 'function' === typeof val ) {
                        validationsKeys.push( key );
                        context[key].validate = val;
                        context[key].hasError = ko.observable( false );
                        context[key].validationMessages = ko.observableArray();
                    } else {
                        refKeys.push( key );
                    }
                }

            } );

            allKeys = refKeys.concat( validationsKeys );

            context.isValid = ko.computed( function() {
                var result, currentVal, isValid = true;
                allKeys.forEach( function( key ) {
                    var invalid = false;
                    if( ko.isObservable( context[key] ) ) {
                        currentVal = context[key]();
                        if( 'function' === typeof context[key].validate ) {
                            result = context[key].validate.call( context, currentVal );
                            invalid = 'string' === typeof result || false === result;
                            if( isValid && invalid ) {
                                isValid = false;
                            }
                            context[key].hasError( invalid );
                            context[key].validationMessages( 'string' === typeof result ? [result] : [] );
                        }
                    }
                } );
                return isValid;
            } );
        }

        /**
         * @method getMeta
         * @public
         *
         * traverse rule validation tree and collect all unique codes and actTypes
         * as result returns list of found codes and act types for ruleSet
         *
         * @param {Object} rules        note: this collection is mutated
         *
         * @returns {Object}            collected metadata for ruleSet
         */
        function getMeta( rules ) {
            //Note: rules is mutated - that is desired functionality for rule saving
            var actTypes = [],
                actCodes = [],
                actOperations = [],
                criterias = [],
                metaCaseOpen = false;

            rules.forEach( function( rl ) {
                function getOperations( value, operations ) {
                    if( 'object' === typeof value && null !== value ) {

                        if( value instanceof Array ) {
                            value.forEach( function(el){
                                return getOperations( el, operations );
                            });
                        } else {
                            return getOperations( value[Object.keys(value)[0]], operations.concat( Object.keys( value ) ) );
                        }
                    } else {
                        return operations;
                    }
                }

                function getCriteriaValue( value, strictOperator ) {
                    var keys;
                    if( 'object' === typeof value && null !== value ) {

                        if (value instanceof Array ) {
                            return value;
                        } else {
                            if(strictOperator){
                                keys = [ strictOperator ];
                            } else {
                                keys = Object.keys(value).filter( function(el){ return el !== '\\\\$catalogShort' && el !== '\\\\$exists'; } );
                            }

                            return keys[0] ? getCriteriaValue( value[keys[0]] ) : [];
                        }
                    } else {
                        return [ value ];
                    }
                }

                function proccessCriteria( criteria, collectedCodes, collectedTypes ) {
                    var hasCount0 = false, value;
                    Object.keys( criteria ).forEach( function( criteriaKey ) {
                        if( criteriaKey === '\\\\$or' && criteria['\\\\$or'].length ){
                            criteria['\\\\$or'].forEach( function( orCriteria ){
                                proccessCriteria( orCriteria, collectedCodes, collectedTypes );
                            });
                        }

                        if(!criteriaKey){
                            return;
                        }
                        criterias.push( criteriaKey );
                        actOperations = actOperations.concat( getOperations( criteria[criteriaKey], [] ));
                        switch( criteriaKey ) {
                            case 'actType':
                                value = getCriteriaValue( criteria[criteriaKey] );
                                actTypes = actTypes.concat( value );
                                collectedTypes = collectedTypes.concat( value );
                                break;
                            case 'code':
                                value = getCriteriaValue( criteria[criteriaKey] );
                                actCodes = actCodes.concat( value );
                                collectedCodes = collectedCodes.concat( value );
                                break;
                            case '\\\\$count':
                                value = getCriteriaValue( criteria[criteriaKey], '\\\\$eq' );
                                hasCount0 = 0 === ( value && value[ 0 ] );
                                break;
                            case 'patientId\\\\-caseFolderOpen':
                                value = getCriteriaValue( criteria[criteriaKey], '\\\\$eq' );
                                metaCaseOpen = metaCaseOpen || ( value && value[ 0 ] );
                                break;
                        }
                    } );
                    if(collectedCodes.length){
                        if(hasCount0){
                            rl.metaRequiredCodes = _.uniq( (rl.metaRequiredCodes || []).concat(collectedCodes) );
                        } else {
                            rl.metaCodes = _.uniq( (rl.metaCodes || []).concat(collectedCodes) );
                        }
                    }
                    if(collectedTypes.length) {
                        rl.metaActTypes = _.uniq( (rl.metaActTypes || []).concat( collectedTypes ) );
                    }
                }

                function proccessValidation( vld ) {
                    if (Array.isArray(vld) ) {
                        vld.forEach( function( vl ) {
                            proccessValidation( vl );
                        });
                    } else {
                        Object.keys( vld ).forEach( function( vlk ) {
                            switch( vlk ) {
                                case '\\\\$and':
                                case '\\\\$or':
                                case '\\\\$not':
                                    proccessValidation( vld[ vlk ] );
                                    break;
                                case 'criteria':
                                    proccessCriteria( vld[ vlk ], [], rl.metaActTypes || [] );
                                    break;
                            }
                        } );
                    }

                }

                proccessValidation( rl.validations );
            } );

            return {
                criterias: _.uniq(criterias).map( function( el ) { return el.replace(/\\\\\$/g, '$').replace( /\\\\\-/g, '.' ); }),
                actTypes: _.uniq(actTypes),
                actCodes: _.uniq(actCodes),
                metaFuzzy: ( -1 !== actOperations.indexOf('\\\\$regex') || -1 !== actOperations.indexOf('\\\\$exists') ||
                    ( -1 !== criterias.indexOf('nAPK') && 0 === actCodes.length )
                ),
                metaCaseOpen: metaCaseOpen
            };
        }

        Y.namespace( 'doccirrus' ).ruleutils = {

            name: NAME,
            translate: translate,
            getActTypeList: getActTypeList,
            parseCriteria: parseCriteria,
            operatorList: operatorList,
            getAttributeList: getAttributeList,
            translateActType: translateActType,
            getAttributeListItem: getAttributeListItem,
            makeAttributeList: makeAttributeList,
            getVisibleOperatorList: getVisibleOperatorList,
            getComparisonLists: getComparisonLists,
            findOperatorByName: findOperatorByName,
            getComparisonList: getComparisonList,
            validate: validate,
            getMeta: getMeta
        };
    },
    '0.0.1', {requires: ['activity-schema', 'patient-schema', 'cardio-schema']}
);

