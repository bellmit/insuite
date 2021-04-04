/**
 * User: do
 * Date: 25/01/16  13:56
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko, $, _ */
'use strict';

YUI.add( 'dcRuleSetInspector', function( Y, NAME ) {

        var
            i18n = Y.doccirrus.i18n,
            unwrap = ko.utils.unwrapObservable,
            operatorList = Y.doccirrus.ruleutils.getVisibleOperatorList(),
            eqOperator = Y.doccirrus.KoSchemaOperatorWidget.findOperatorByName( '$eq' ),
            comparisionLists = Y.doccirrus.KoSchemaOperatorWidget.getComparisonLists(),
            validate = Y.doccirrus.ruleutils.validate,
            KoComponentManager = Y.doccirrus.KoUI.KoComponentManager, //eslint-disable-line
            KoViewModel = Y.doccirrus.KoViewModel,
            actionsAll = [
                {
                    value: 'ERROR',
                    text: i18n( 'IncaseAdminMojit.rules.actions.labels.ERROR' )
                },
                {
                    value: 'WARNING',
                    text: i18n( 'IncaseAdminMojit.rules.actions.labels.WARNING' )
                },
                {
                    value: 'TASK',
                    text: i18n( 'IncaseAdminMojit.rules.actions.labels.TASK' )
                },
                {
                    value: 'TASK_WITH_FORM',
                    text: i18n( 'IncaseAdminMojit.rules.actions.labels.TASK_WITH_FORM' )
                },
                {
                    value: 'FORM_WITHOUT_TASK',
                    text: i18n( 'IncaseAdminMojit.rules.actions.labels.FORM_WITHOUT_TASK' )
                },
                {
                    value: 'ACTIVITY',
                    text: i18n( 'IncaseAdminMojit.rules.actions.labels.ACTIVITY' )
                },
                {
                    value: 'PATIENT',
                    text: i18n( 'IncaseAdminMojit.rules.actions.labels.PATIENT' )
                }
            ];

        function toNumber( val ) {
            var num = '' === val ? val : +val;
            return 'number' === typeof num && !isNaN( num ) ? num : '';
        }

        function getRuleDescription( type, data ) {
            var rule;
            if( !data ) {
                return '';
            }
            if( 'action' === type || 'rule' === type ) {
                rule = data;
            } else {
                rule = data.rule;
            }
            if( !rule ) {
                Y.log( 'could not get rule descriptor for type ' + type, 'error', NAME );
                return;
            }
            return unwrap( rule.description );
        }

        function existsInList( list, key ) {
            return list.some( function( entry ) {
                return entry.val === key;
            } );
        }

        function getAvailableActions( actions, selectedAction ) {
            var availableActionToSelect = [
                    {
                        value: 'TASK',
                        text: i18n( 'IncaseAdminMojit.rules.actions.labels.TASK' )
                    },
                    {
                        value: 'TASK_WITH_FORM',
                        text: i18n( 'IncaseAdminMojit.rules.actions.labels.TASK_WITH_FORM' )
                    },
                    {
                        value: 'FORM_WITHOUT_TASK',
                        text: i18n( 'IncaseAdminMojit.rules.actions.labels.FORM_WITHOUT_TASK' )
                    },
                    {
                        value: 'ACTIVITY',
                        text: i18n( 'IncaseAdminMojit.rules.actions.labels.ACTIVITY' )
                    },
                    {
                        value: 'PATIENT',
                        text: i18n( 'IncaseAdminMojit.rules.actions.labels.PATIENT' )
                    }
                ],
                acts = actions(),
                hasErrorOrWarning = false,
                i;

            for( i = 0; i < acts.length; i++ ) {
                if( 'ERROR' === unwrap( acts[i].type ) || 'WARNING' === unwrap( acts[i].type ) ) {
                    hasErrorOrWarning = true;
                    break;
                }
            }

            if( (selectedAction && ('ERROR' === selectedAction.type() || 'WARNING' === selectedAction.type())) || !hasErrorOrWarning ) {
                availableActionToSelect.unshift( {
                        value: 'ERROR',
                        text: i18n( 'IncaseAdminMojit.rules.actions.labels.ERROR' )
                    },
                    {
                        value: 'WARNING',
                        text: i18n( 'IncaseAdminMojit.rules.actions.labels.WARNING' )
                    } );
            }

            return availableActionToSelect;
        }

        function RuleSetInspector( config ) {
            var
                self = this;
            self.current = ko.observable( null );
            self.ruleSet = ko.observable( null );
            self.countryMode = Y.doccirrus.commonutils.getCountryModeFromConfigs() || [];
            self.ruleSetEditor = config.ruleSetEditor;

            self.criteriaListValue = ko.observable();

            self.attributeList = ko.observableArray();
            self.attributeListValue = ko.observable().extend({ notify: 'always' });

            self.operatorList = ko.observableArray( operatorList );
            self.operatorListValue = ko.observable().extend({ deferred: true }).extend({ notify: 'always' });

            self.currentValue = ko.observable();

            self.isAction = ko.pureComputed( function() {
                var current = unwrap( self.current );
                return current && 'action' === current.type;
            } );

            self.availableActionsList = ko.observableArray( actionsAll );

            self.availableActions = ko.pureComputed( function() {
                var current = unwrap( self.current ),
                    availebleAct = actionsAll;

                if( current ) {
                    availebleAct = getAvailableActions( current.data.actions, current.data.selectedAction );
                }

                self.availableActionsList( availebleAct );
            } );

            self.isValidation = ko.pureComputed( function() {
                var current = unwrap( self.current );
                return current && 'rule-element' === current.type && 'validation' === unwrap( current.data.type );
            } );

            self.isOperator = ko.pureComputed( function() {
                var current = unwrap( self.current ),
                    dataType;
                if( current && 'rule-element' === current.type ){
                    dataType = unwrap( current.data.type );
                    return  'or' === dataType || 'and' === dataType || 'not' === dataType;
                }
            } );

            self.isRule = ko.pureComputed( function() {
                var current = unwrap( self.current );
                return current && 'rule' === current.type;
            } );

            self.isShowTaskForm = ko.pureComputed( function() {
                var current = unwrap( self.current ),
                    selectionAction = unwrap( current.data.selectedAction );

                return selectionAction && ('TASK' === selectionAction.type() || 'TASK_WITH_FORM' === selectionAction.type() ||
                                           'FORM_WITHOUT_TASK' === selectionAction.type() || 'ACTIVITY' === selectionAction.type());
            } );

            self.isShowTask = ko.pureComputed( function() {
                var current = unwrap( self.current ),
                    selectionAction = unwrap( current.data.selectedAction );

                return selectionAction && ('TASK' === selectionAction.type() || 'TASK_WITH_FORM' === selectionAction.type());
            } );

            self.isShowPatient = ko.pureComputed( function() {
                var current = unwrap( self.current ),
                    selectionAction = unwrap( current.data.selectedAction );

                return selectionAction && 'PATIENT' === selectionAction.type();
            } );

            self.descriptionHelpText = ko.observable( 'Vorlagenvariablen:<br>{activity}<br>{ruleName}<br>{activity.content}<br>{activity.user}<br>{activity.physician}<br>{activity.subType}<br>{patient.firstName}<br>{patient.lastName}<br>{patient.DoB}' );

            self.isShowTemplateSelectForm = ko.pureComputed( function() {
                var current = unwrap( self.current ),
                    selectionAction = unwrap( current.data.selectedAction );
                setTimeout( function() {
                    $( '[data-toggle="popover"]' ).popover();
                }, 200 );
                return 'TASK_WITH_FORM' === selectionAction.type() || 'FORM_WITHOUT_TASK' === selectionAction.type();
            } );

            self.isShowActivitySelect = ko.pureComputed( function() {
                var current = unwrap( self.current ),
                    selectionAction = unwrap( current.data.selectedAction );
                return 'ACTIVITY' === selectionAction.type();
            } );

            self.isCodeSelection = ko.computed( function() {
                var
                    current = unwrap( self.current ),
                    selectionAction = current && current.data && unwrap( current.data.selectedAction ),
                    template = selectionAction && selectionAction.template;
                return (selectionAction && 'ACTIVITY' === selectionAction.type() ) &&
                       (template && ( 'TREATMENT' === template.actType() || 'DIAGNOSIS' === template.actType() ) );
            } );

            self.isTreatment = ko.computed( function() {
                var
                    current = unwrap( self.current ),
                    selectionAction = current && current.data && unwrap( current.data.selectedAction ),
                    template = selectionAction && selectionAction.template;
                return selectionAction && 'ACTIVITY' === selectionAction.type() && template && 'TREATMENT' === template.actType();
            } );

            self.isDiagnosis = ko.computed( function() {
                var
                    current = unwrap( self.current ),
                    selectionAction = current && current.data && unwrap( current.data.selectedAction ),
                    template = selectionAction && selectionAction.template;
                return selectionAction && 'ACTIVITY' === selectionAction.type() && template && 'DIAGNOSIS' === template.actType();
            } );

            self.isOtherActivity = ko.computed( function() {
                var
                    current = unwrap( self.current ),
                    selectionAction = current && current.data && unwrap( current.data.selectedAction ),
                    template = selectionAction && selectionAction.template;
                return selectionAction && 'ACTIVITY' === selectionAction.type() && template &&
                       !( 'TREATMENT' === template.actType() || 'DIAGNOSIS' === template.actType() );
            } );

            self.caseFolderTypeNotSelected = ko.computed( function() {
                var
                    current = unwrap( self.current ),
                    selectionAction = current && current.data && unwrap( current.data.selectedAction ),
                    template = selectionAction && selectionAction.template;
                return !( template && template.caseFolderType() );
            } );

            self.catalogShortNotSelected = ko.computed( function() {
                var
                    current = unwrap( self.current ),
                    selectionAction = current && current.data && unwrap( current.data.selectedAction ),
                    template = selectionAction && selectionAction.template;
                return !( template && template.catalogShort() );
            } );

            self.actTypeLocal = ko.observable( null );
            self.actTypeAutocomplete = {
                val: ko.computed( {
                    read: function() {
                        if( self.isValidation() ) {
                            return self.current().data.content().actType();
                        } else {
                            return null;
                        }
                    },
                    write: function( $event ) {
                        if( self.isValidation() ) {
                            self.current().data.content().actType( $event.val );
                            self.actTypeLocal( $event.val );
                        }
                    }
                } ),
                select2: {
                    placeholder: 'Aktivität',
                    data: Y.doccirrus.ruleutils.getActTypeList()
                }
            };

            ko.computed( function() {
                var actType = self.actTypeAutocomplete.val(),
                    current = unwrap( self.current ),
                    caseFolderType = current && current.data && current.data.rule && current.data.rule.ruleSetEditor &&
                                     unwrap( current.data.rule.ruleSetEditor.caseFolderType ),
                    country = Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP[caseFolderType || 'ANY'];

                if( actType ){
                    let attributeList = Y.doccirrus.ruleutils.getAttributeList( actType );
                    const hasDQSLicense = Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.DQS );

                    if(country === 'CH') {
                        const excludeSwissModeFields = ['patientId.dataTransmissionToPVSApproved'];
                        attributeList = attributeList.filter(function (entry) {
                            return !excludeSwissModeFields.some(function (e) {
                                return e === entry.path;
                            });
                        });
                    }
                    if(!hasDQSLicense) {
                        const excludeDQSFields = ['patientId.partnerIds.licenseModifier'];
                        attributeList = attributeList.filter(function (entry) {
                            return !excludeDQSFields.some(function (e) {
                                return e === entry.path;
                            });
                        });
                    }
                    self.attributeList( attributeList );
                }
            } );

            self.showTitle = ko.computed( function() {
                var current = unwrap( self.current ),
                    currentType = current && current.type,
                    currentData = current && current.data,
                    result = [getRuleDescription( currentType, currentData )],
                    type;
                if( !currentData ) {
                    return '';
                }
                switch( currentType ) {
                    case 'action':
                        result.push( 'Aktion' );
                        break;
                    case 'rule-element':
                        if( currentData.type ) {
                            type = unwrap( currentData.type );
                            result.push( Y.doccirrus.ruleutils.translate( type ) );
                        }
                        break;
                }
                return result.join( ' > ' );
            } );

            ko.computed( function() {
                var
                    current = unwrap( self.current ),
                    caseFolderType = current && current.data && current.data.rule && current.data.rule.ruleSetEditor &&
                                     unwrap( current.data.rule.ruleSetEditor.caseFolderType ),
                    criteriaListValue = unwrap( self.criteriaListValue );
                if( criteriaListValue ){
                    criteriaListValue.casefolderType( caseFolderType );
                }
            } );

            ko.computed( function() {
                var
                    criteriaListValue = unwrap( self.criteriaListValue ),
                    value = criteriaListValue && criteriaListValue.value(), //eslint-disable-line
                    actType = self.actTypeAutocomplete.val();

                if( !criteriaListValue || !actType ){
                    return;
                }
                criteriaListValue.displayedText( criteriaListValue.getText( actType, criteriaListValue ) );
            } );

            self.criteriaListValue.subscribe( function( criteriaListValue ) {
                if( criteriaListValue ){
                    criteriaListValue.setOnCriteria( true );
                    self.attributeListValue( criteriaListValue && unwrap( criteriaListValue.path ) );
                } else {
                    self.attributeListValue( null );
                }

            } );

            self.attributeListValue.subscribe( function( attributeListValue ) {
                var
                    criteriaListValue = unwrap( self.criteriaListValue ),
                    selectedAttribute,
                    newOperator;

                if( !criteriaListValue ) {
                    return;
                }

                criteriaListValue.path( attributeListValue || null );

                if( attributeListValue ){
                    selectedAttribute = ( unwrap( self.attributeList ) || []).find( function( attr ) { return attr.path === attributeListValue; } );

                    newOperator = unwrap( criteriaListValue.setOnCriteria ) ? unwrap( criteriaListValue.operator) || null : null;
                    if( selectedAttribute ){
                        self.operatorList( Y.doccirrus.KoSchemaOperatorWidget.getOperatorForType( selectedAttribute.schemaEntry.type, selectedAttribute.schemaEntry.list || 'false', selectedAttribute.allowedOperators ) );
                        self.operatorListValue( newOperator );
                    }
                    if( newOperator === null ){
                        criteriaListValue.value( null );
                        self.currentValue( undefined );
                    }


                } else {
                    self.operatorList( [] );
                    self.operatorListValue( null );
                    self.currentValue( null );
                }

            } );

            self.operatorListValue.subscribe( function( operatorListValue ) {
                var
                    criteriaListValue = unwrap( self.criteriaListValue );

                if( !criteriaListValue ) {
                    return;
                }

                criteriaListValue.operator( operatorListValue || null );

                self.currentValue( unwrap( criteriaListValue.setOnCriteria ) ? unwrap( criteriaListValue.value ) || null : null );

                criteriaListValue.setOnCriteria( false );
                var current = unwrap( self.current );
                if( current && current.data && current.data.koSchemaValue ){
                    current.data.koSchemaValue.setValueWidgetByCriterion( unwrap( self.actTypeAutocomplete.val ), criteriaListValue );
                }
            } );

            self.currentValue.subscribe( function( val ) {
                var
                    criteriaListValue = unwrap( self.criteriaListValue );

                if( !criteriaListValue ) {
                    return;
                }
                criteriaListValue.value( val );
            } );



            self.actTypeLocal.subscribe( function( actType ) {
                var
                    criteriaListValue = unwrap( self.criteriaListValue );
                if( criteriaListValue ) {
                    criteriaListValue.value( null );
                    self.current().data.koSchemaValue.setValueWidgetByCriterion( actType, criteriaListValue );
                }
            } );

            // this.displayCriteriaText = function( data ) {
            //     var current = self.current() || {},
            //         content = current && current.data && peek( current.data.content);
            //     return data.getText( self.actTypeAutocomplete.val(), content );
            // };

            self.setOptionDisable = function( option, item ) {
                ko.applyBindingsToNode( option, {
                    attr: { title: item.i18n },
                    disable: ko.computed( function() {
                        var
                            path,
                            usedPaths,
                            current = unwrap( self.current ),
                            content = unwrap( current && current.data && current.data.content ),
                            criterionList = unwrap( content && content.criterionList );

                        if( !self.isValidation() ) {
                            return;
                        }
                        path = item.path;
                        usedPaths = (criterionList || []).map( function( entry ) {
                            return entry.path();
                        } );
                        return -1 !== usedPaths.indexOf( path );
                    } )
                }, item );
            };

            self.countEnabled = ko.observable( false );

            self.countLeftValue = ko.observable( null );
            self.countRightValue = ko.observable();

            self.countLeftOperator = ko.observable();
            self.countRightOperator = ko.observable();

            self.countLeftList = [eqOperator].concat( comparisionLists.greaterThanList );
            self.countRightList = comparisionLists.lessThanList;

            self.current.subscribe( function( current ) {
                var data = current && current.data,
                    content = data && data.content && data.content.peek(),
                    count;
                if( content ) {
                    if( 'validation' === unwrap( data.type ) ) {
                        count = content && content.count.peek();
                        self.setCount( count );
                    }
                }
            } );

            self.countEnabled.subscribe( function( val ) {
                var current = self.current(),
                    data = current && current.data,
                    content = data && data.content(),
                    count = content && unwrap( content.count ),
                    defaultCount = { $eq: 1 };

                if( content && !count && val ) {
                    self.setCount( defaultCount );
                } else if( content && 'function' === typeof content.count && !val ) {
                    content.count( null );
                }
            } );

            ko.computed( function() {

                var
                    current = unwrap( self.current ),
                    data = current && current.data,
                    content = data && unwrap( data.content ),
                    newCountObj = {},
                    countLeftValue = unwrap( self.countLeftValue ),
                    countRightValue,
                    countLeftOperator,
                    countRightOperator;

                if( countLeftValue === undefined ){
                    //special case on leaving ruleSet
                    return;
                }

                // not redundant 0 is correct value
                if( 0 !== countLeftValue && !countLeftValue && content && content.count ){
                    self.setCount( content.count() );
                }

                countRightValue = self.countRightValue();
                countLeftOperator = self.countLeftOperator();
                countRightOperator = self.countRightOperator();

                if( !unwrap( self.isValidation ) || !content ) {
                    return;
                }

                if( countLeftOperator ) {
                    newCountObj[countLeftOperator] = toNumber( countLeftValue );
                }

                if( '$eq' !== countLeftOperator && countRightValue && (0 === countRightOperator || countRightOperator) ) {
                    newCountObj[countRightOperator] = toNumber( countRightValue );
                }

                content.count( 0 < Object.keys( newCountObj ).length ? newCountObj : null );
            } );

            self.countVisible = ko.computed( function() {
                var refArea = unwrap( self.ruleSetEditor.referenceArea ),
                    caseFolderType = unwrap( self.ruleSetEditor.caseFolderType ),
                    visible = refArea && 'ENTRY' !== refArea && !_.includes( caseFolderType, 'CASEFOLDER' );

                if( !visible ) {
                    self.countEnabled( false );
                }
                return visible;
            } );

            self.activityVisible = ko.computed( function() {
                var caseFolderType = unwrap( self.ruleSetEditor.caseFolderType ),
                    visible = !(_.includes( caseFolderType, 'CASEFOLDER' ) ||
                                _.includes( caseFolderType, 'PATIENT' ) ||
                                _.includes( caseFolderType, 'TASK' ) );

                return visible;
            } );

            validate( self, {
                countLeftValue: function( val ) {
                    if( !self.countEnabled() ) {
                        return true;
                    }
                    return Y.doccirrus.validations.common._num( val ) || 'Bitte geben Sie eine Ganzahl ein!';
                },
                countRightValue: function( val ) {
                    if( !self.countEnabled() ) {
                        return true;
                    }
                    return (!val || Y.doccirrus.validations.common._num( val )) || 'Bitte geben Sie eine Ganzahl ein oder lassen Sie das Feld leer!';
                }
            } );

        }

        RuleSetInspector.prototype.setCount = function( config ) {
            var
                self = this,
                countLeftOperator = null,
                countLeftValue = null,
                countRightOperator = null,
                countRightValue = null;

            self.countEnabled( Boolean( config ) );

            if( config && ( config.$eq || 0 === config.$eq ) ) {
                countLeftOperator = '$eq';
                countLeftValue = config.$eq;
            } else if( config ) {
                Object.keys( config ).forEach( function( key ) {
                    if( existsInList( comparisionLists.greaterThanList, key ) ) {
                        countLeftOperator = key;
                        countLeftValue = config[key];
                    } else if( existsInList( comparisionLists.lessThanList, key ) ) {
                        countRightOperator = key;
                        countRightValue = config[key];
                    }
                } );
            }

            self.countLeftOperator( countLeftOperator );
            self.countLeftValue( countLeftValue );

            self.countRightOperator( countRightOperator );
            self.countRightValue( countRightValue );
        };

        RuleSetInspector.prototype.addAction = function( data ) {
            var
                self = this,
                type = ko.observable( getAvailableActions( data.actions, null )[0].value );

            data.actions.push( {
                type: type,
                template: KoViewModel.createViewModel( {
                    NAME: 'TaskTemplateModel', config: {
                        data: {},
                        type: type,
                        ruleSetEditor: self.ruleSetEditor
                    }
                } )
            } );
        };

        RuleSetInspector.prototype.inspect = function( type, data, event ) {
            var
                self = this;
            if( event ) {
                event.stopPropagation();
                event.preventDefault();
            }

            if( !unwrap( self.ruleSetEditor.isLocked ) || self.ruleSetEditor.options.isMasterDCFormTenant ) {
                self.current( { type: type, data: data } );
            }
        };

        RuleSetInspector.prototype.inspectAction = function( type, rule, action, event ) {
            var
                self = this;
            self.criteriaListValue( null );
            self.availableActionsList( actionsAll );
            rule.selectedAction = action;
            self.inspect( type, rule, event );
            self.availableActions();
            $( '[data-toggle="popover"]' ).popover();
        };

        RuleSetInspector.prototype.reset = function() {
            var
                self = this;
            self.current( null );
        };

        RuleSetInspector.prototype.removeAction = function( currentRule, action ) {
            var
                self = this,
                current = unwrap( self.current );

            current.data.actions.remove( action );
            current.data.selectedAction = null;

            self.current( null );
        };

        RuleSetInspector.prototype.setValueWidgetByCriterion = function( criterion ) {
            var
                self = this;
            if( self.actTypeAutocomplete.val() ) {
                self.koSchemaValue.setValueWidgetByCriterion( self.actTypeAutocomplete.val(), criterion );
            } else {
                self.koSchemaValue.setValueWidgetByCriterionOnly( criterion );
            }
        };

        RuleSetInspector.prototype.remove = function() {
            var
                self = this,
                current = self.current();
            if( current ) {
                self.ruleSetEditor.changed( true );
                current.data.remove();
                self.current( null );
            }
        };

        RuleSetInspector.prototype.addCriterion = function() {
            var
                self = this,
                current = self.current(), criterion;
            if( self.isValidation() && current ) {
                criterion = current.data.addCriterion(); // TODOOO rename to create?
                self.criteriaListValue( criterion );
            }
        };

        RuleSetInspector.prototype.removeCriterion = function() {
            var
                self = this,
                current = self.current();
            if( self.isValidation() && current ) {

                current.data.removeCriterion( self.criteriaListValue() );
                self.criteriaListValue( null );
            }
        };

        Y.namespace( 'doccirrus' ).RuleSetInspector = {

            name: NAME,

            create: function( config ) {
                return new RuleSetInspector( config );
            }
        };
    },
    '0.0.1', {
        requires: [
            'dcruleutils',
            'dcvalidations',
            'KoViewModel',
            'KoSchemaValue',
            'KoSchemaOperatorWidget'
        ]
    }
);



