/**
 * User: do
 * Date: 12/01/16  16:59
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

/*global fun:true, ko */ // eslint-disable-line
fun = function _fn( Y /*,NAME*/ ) {

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n,
        viewModel = null,
        peek = ko.utils.peekObservable;

    function ViewModel() {
        ViewModel.superclass.constructor.apply( this, arguments );
    }

    function filterTree(){
        var
            self = this,
            active = self.onlyActive(),
            inactive = self.onlyInActive(),
            resolver,
            isMasterDCFormTenant = 0 <= ((Y.doccirrus.infras.getPrivateURL() + '') || window.location.host).indexOf( (Y.doccirrus.utils.getMojitBinderByType( 'IncaseAdminMojit' ).mojitProxy.pageData.get( 'masterDCFormTenant' ) + '') );

        if(!active && !inactive){
            resolver = Y.doccirrus.RuleSetTree.getOriginalResolver( { rules: self.rules, isMasterDCFormTenant: isMasterDCFormTenant } );
        } else {
            resolver = Y.doccirrus.RuleSetTree.getFilteringResolver({ active: active, inactive: inactive, rules: self.rules });
        }
        self.ruleSetList.tree.resolver = resolver;
        self.ruleSetList.tree.reload();
    }

    Y.extend( ViewModel, KoViewModel.getDisposable(), {

        leftSidePanelPinned: ko.observable(),
        rightSidePanelPinned: ko.observable(),
        select2RuleSearch: null,
        selectedRule: ko.observable(),
        onlyActive: ko.observable(),
        onlyInActive: ko.observable(),

        /** @protected */
        initializer: function() {
            var
                self = this;

            self.initObservables();
            self.initPanelConfigs();
            self.initColumnClassName();

            self.taskTypes = ko.observableArray([]);
            Y.doccirrus.jsonrpc.api.tasktype
                .getForTypeTable({
                    query: {}
                })
                .then( function( response ) {
                    var result = [];
                    if( Array.isArray( response.data ) ) {
                        result = response.data.map( function( taskType ) {
                            return {
                                id: taskType._id,
                                text: taskType.name,
                                type: taskType.type,
                                title: taskType.title,
                                urgency: taskType.urgency,
                                days: taskType.days,
                                minutes: taskType.minutes,
                                hours: taskType.hours,
                                details: taskType.details,
                                roles: taskType.roles,
                                candidates: taskType.candidates,
                                candidatesNames: taskType.candidatesNames,
                                candidatesObj: taskType.candidatesObj
                            };
                        } ) ;
                    }
                    return result;
                } )
                .done( function( res ) {
                    self.taskTypes( res );
                } );

            self.employees = ko.observableArray([]);
            Y.doccirrus.jsonrpc.api.employee.read( {
                query: {},
                includeAll: true
            } )
            .then( function( response ) {
                var
                    data = response.data;
                data = data.map( function( employee ) {
                    return {
                        id: employee._id,
                        text: Y.doccirrus.schemas.person.personDisplay( employee )
                    };
                } );
                return data;
            } )
            .done( function( response ) {
                self.employees( response );
            });

            self.markers = ko.observableArray([]);
            Y.doccirrus.jsonrpc.api.marker
                .read()
                .done( function( response ) {
                    if( Array.isArray( response.data ) ) {
                        self.markers(response.data.map( function( marker ) {
                            return {
                                icon: marker.icon,
                                id: marker._id,
                                text: marker.description,
                                severity: marker.severity
                            };
                        } ) );
                    }
                } );

            self.severities = ko.observableArray([]);
            Y.doccirrus.jsonrpc.api.severity
                .read()
                .then( function( response ) {
                    var
                        results = Y.Lang.isArray( response.data ) && response.data || [],
                        result = {};

                    results.forEach( function( item ) {
                        result[item.severity] = item.color;
                    } );

                    return result;
                } )
                .done( function( data ) {
                    self.severities( data );
                } );

            self.rules = ko.observableArray([]);
            Y.doccirrus.jsonrpc.api.rule.read( {
                query: {
                    isDirectory: true
                }
            } )
                .then( function( response ) {
                    self.rules( response.data );
                } );


            self.initRuleSetEditorAndInspector();
            self.initSelect2RuleSearch();

            self.addDisposable( self.selectedRule.subscribe( function( selectedRuleValue ) {
                if( selectedRuleValue ) {
                    self.ruleSetList.tree.loadAndExpandById( selectedRuleValue );
                }
            } ) );
            self.addDisposable( self.onlyInActive.subscribe( function( value ) {
                Y.doccirrus.utils.localValueSet( 'rule_tree_onlyInActive', value );
                if( true === value && true === self.onlyActive() ){
                    self.onlyActive( false );
                }
                filterTree.call(self);
            } ) );
            self.addDisposable( self.onlyActive.subscribe( function( value ) {
                Y.doccirrus.utils.localValueSet( 'rule_tree_onlyActive', value );
                if( true === value && true === self.onlyInActive() ){
                    self.onlyInActive( false );
                }
                filterTree.call(self);
            } ) );

            self.addDisposable( self.rules.subscribe( function() {
                filterTree.call(self);
            } ) );

            self.onlyActive( Y.doccirrus.utils.localValueGet( 'rule_tree_onlyActive') === 'true' );
            self.onlyInActive( Y.doccirrus.utils.localValueGet( 'rule_tree_onlyInActive' ) === 'true' );
            self.ruleSetList.treeImportExportI18n = i18n( 'IncaseAdminMojit.rules.tree.importExport' );
            self.ruleSetList.regenerateI18n = i18n( 'IncaseAdminMojit.rules.tree.regenerate' );
            self.ruleSetEditor.buttonSaveI18n = i18n( 'IncaseAdminMojit.rules.buttons.SAVE' );
            self.ruleSetEditor.labelActiveI18n = i18n( 'IncaseAdminMojit.rules.labels.ACTIVE' );
            self.ruleSetEditor.rulesTitleI18n = i18n( 'IncaseAdminMojit.rules.title' );
            self.ruleSetEditor.referenceAreaI18n = i18n('IncaseAdminMojit.rules.referenceAreaTitle');
            self.ruleSetEditor.refRadioEntryI18n = i18n( 'IncaseAdminMojit.rules.refAreaRadio.ENTRY' );
            self.ruleSetEditor.refRadioCertificateI18n = i18n( 'IncaseAdminMojit.rules.refAreaRadio.CERTIFICATE' );
            self.ruleSetEditor.optionsLabelI18n = i18n( 'IncaseAdminMojit.rules.options' );
            self.ruleSetEditor.caseFolderI18n = i18n( 'IncaseAdminMojit.rules.caseFolder' );
            self.ruleSetEditor.rulesConfigurationTitleI18n = i18n( 'IncaseAdminMojit.rules.rulesTitle' );
            self.ruleSetEditor.activeLabelI18n = i18n( 'IncaseAdminMojit.rules.labels.ACTIVE' );
            self.ruleSetEditor.ruleEditorIfLabelI18n = i18n( 'IncaseAdminMojit.rules.ruleEditor.IF' );
            self.ruleSetEditor.refRadioTimeI18n = i18n( 'IncaseAdminMojit.rules.refAreaRadio.TIME' );
            self.activityTypeI18n = i18n( 'IncaseAdminMojit.rules.ruleEditor.activityType' );
            self.ruleSetEditor.thenOperatorI18n = i18n( 'IncaseAdminMojit.rules.operators.then' );
            self.andOperatorI18n = i18n( 'IncaseAdminMojit.rules.operators.and' );
            self.orOperatorI18n = i18n( 'IncaseAdminMojit.rules.operators.or' );
            self.notOperatorI18n = i18n( 'IncaseAdminMojit.rules.operators.not' );
            self.criteriaI18n = i18n( 'IncaseAdminMojit.rules.ruleEditor.criteria' );
            self.attributesI18n = i18n( 'IncaseAdminMojit.rules.ruleEditor.attributes' );
            self.operatorsI18n = i18n( 'IncaseAdminMojit.rules.ruleEditor.operators' );
            self.descriptionI18n = i18n( 'IncaseAdminMojit.rules.ruleEditor.description' );
            self.ruleSetInspector.labelAssignedI18n = i18n( 'TaskMojit.TaskModal.label.ASSIGNED' );
            self.ruleSetInspector.selectValueLabelI18n = i18n( 'role-schema.Role_T.value.i18n' );

            self.periodSelection = i18n( 'IncaseAdminMojit.rules.timeOptions.periodSelection' );
            self.number = i18n( 'IncaseAdminMojit.rules.timeOptions.number' );
            self.time = i18n( 'IncaseAdminMojit.rules.timeOptions.time' );
            self.period = i18n( 'IncaseAdminMojit.rules.timeOptions.period' );
            self.timePoint = i18n( 'IncaseAdminMojit.rules.timeOptions.timePoint' );

            self.newRuleOperator = i18n( 'IncaseAdminMojit.rules.newRuleOptions.operator' );
            self.addConfig = i18n( 'IncaseAdminMojit.rules.newRuleOptions.addConfig' );
            self.andOperator = i18n( 'IncaseAdminMojit.rules.newRuleOptions.andOperator' );
            self.orOperator = i18n( 'IncaseAdminMojit.rules.newRuleOptions.orOperator' );
            self.notOperator = i18n( 'IncaseAdminMojit.rules.newRuleOptions.notOperator' );
            self.check = i18n( 'IncaseAdminMojit.rules.newRuleOptions.check' );
        },

        initSelect2RuleSearch: function () {

            var
                self = this;

            self.select2RuleSearch = {
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        var
                            selectedRule = self.selectedRule();
                        if( selectedRule ) {
                            return { id: selectedRule._id, text: selectedRule.description };
                        }
                        else {
                            return null;
                        }
                    },
                    write: function( $event ) {
                        if( $event.added ) {
                            self.selectedRule( $event.added.data );
                        } else {
                            self.selectedRule( null );
                        }
                    }
                } ).extend( { rateLimit: 0 } ) ),
                select2: {
                    width: '100%',
                    placeholder: i18n( 'IncaseAdminMojit.rules.search.placeholder' ),
                    allowClear: true,
                    minimumInputLength: 2,
                    query: function( query ) {
                        var
                            searchQuery = {
                                isDirectory: false,
                                '$or': [
                                    {
                                        description: {
                                            $regex: query.term,
                                            $options: 'i'
                                        }
                                    }, {
                                        'rules.description': {
                                            $regex: query.term,
                                            $options: 'i'
                                        }
                                    }
                                ]
                            },
                            activeStatuses = [];

                        if( self.onlyActive() ){ activeStatuses.push(true); }
                        if( self.onlyInActive() ){ activeStatuses.push(false); }
                        if( activeStatuses.length ){
                            searchQuery.isActive = {$in: activeStatuses };
                        }

                        Y.doccirrus.jsonrpc.api.rule.getFilteredRules( {
                            query: searchQuery,
                            options: {
                                limit: 25
                            }
                        } ).done( function( response ) {
                            var data = response.data;
                            query.callback( {
                                results: data.map( function( rule ) {
                                    return {
                                        id: rule._id,
                                        text: rule.description,
                                        data: rule
                                    };
                                } )
                            } );
                        } );
                    }
                }
            };
        },

        initRuleSetEditorAndInspector: function() {
            var
                self = this,
                isMasterDCFormTenant = 0 <= ((Y.doccirrus.infras.getPrivateURL() + '') || window.location.host).indexOf( (Y.doccirrus.utils.getMojitBinderByType( 'IncaseAdminMojit' ).mojitProxy.pageData.get( 'masterDCFormTenant' ) + '') );

            self.ruleSetList = Y.doccirrus.RuleSetTree.create( {
                isMasterDCFormTenant: isMasterDCFormTenant,
                rules: self.rules
            } );

            self.ruleSetEditor = Y.doccirrus.RuleSetEditor.create( {
                onUnload: self.onRuleEditorUnload.bind( self ),
                isMasterDCFormTenant: isMasterDCFormTenant,
                markers: self.markers,
                severities: self.severities,
                taskTypes: self.taskTypes,
                employees: self.employees
            } );

            self.ruleSetInspector = Y.doccirrus.RuleSetInspector.create( {
                ruleSetEditor: self.ruleSetEditor
            } );

            self.addDisposable( self.ruleSetList.tree.selectedNode.subscribe( function( node ) {
                var data = node && node.initialConfig && node.initialConfig.entry,
                    modifications,
                    locked = peek( self.ruleSetEditor.isLocked ),
                    changed = peek( self.ruleSetEditor.changed ),
                    valid = peek( self.ruleSetEditor.isValid ),
                    countLeftValue = ko.unwrap( self.ruleSetInspector.countLeftValue );


                if( true === changed && !locked && valid){
                    modifications = Y.doccirrus.utils.confirmModificationsDialog();
                    modifications.on( 'discard', function() {
                        self.ruleSetEditor.changed( false );
                        self.initialHash = undefined;
                        if( countLeftValue !== undefined ){ self.ruleSetInspector.countLeftValue( undefined ); }
                        self.loadRuleSet( data );
                    } );
                    modifications.on( 'save', function() {
                        if( countLeftValue !== undefined ){ self.ruleSetInspector.countLeftValue( undefined ); }
                        self.ruleSetEditor.save( self.ruleSetEditor );
                    } );

                } else {
                    self.initialHash = undefined;
                    self.ruleSetEditor.changed( false );
                    if( countLeftValue !== undefined ){ self.ruleSetInspector.countLeftValue( undefined ); }
                    self.loadRuleSet( data );
                }

            } ) );

            self.addDisposable( ko.computed( function() {
                var newHash = self.getRuleSetHash( self.ruleSetEditor, self.ruleSetInspector );
                self.ruleSetEditor.changed( self.initialHash && self.initialHash !== newHash );
            } ) );
        },

        initPanelConfigs: function () {
            var
                self = this;

            self.leftSidePanelConfig = {
                side: 'left',
                name: 'leftSidePanel',
                panelHeading: i18n( 'IncaseAdminMojit.rules.tree.title' ),
                initialPinned: true,
                onInit: function( sideBar ) {
                    sideBar.$container.addClass( 'col-xs-4' );

                },
                onPin: function( pinned ) {
                    self.leftSidePanelPinned( pinned );
                }
            };

            self.rightSidePanelConfig = {
                side: 'right',
                name: 'rightSidePanel',
                panelHeading: '',
                initialPinned: true,
                onInit: function( sideBar ) {
                    sideBar.$container.addClass( 'col-xs-4' );
                    sideBar.showTitle = ko.computed( function() {
                        var panelHeading = ko.unwrap( self.ruleSetInspector.showTitle );
                        sideBar.$panel.find( '.panel-heading > span' ).first().text( panelHeading );
                    } );
                },
                onPin: function( pinned ) {
                    self.rightSidePanelPinned( pinned );
                },
                onDestroy: function( sideBar ) {
                    if( sideBar.showTitle && sideBar.showTitle.dispose ) {
                        sideBar.showTitle.dispose();
                    }
                }
            };
        },

        initObservables: function () {
            var
                self = this;
            self.leftSidePanelPinned( false );
            self.rightSidePanelPinned( false );
            self.selectedRule( null );
        },

        initColumnClassName: function() {
            var
                self = this;

            self.columnClassName = self.addDisposable( ko.computed( function() {
                var
                    isLeftPinned = ko.unwrap( self.leftSidePanelPinned ),
                    isRightPinned = ko.unwrap( self.rightSidePanelPinned );

                if( !isLeftPinned && !isRightPinned ) {
                    return 'col-xs-12';
                }
                else if( (isLeftPinned && !isRightPinned) || (!isLeftPinned && isRightPinned) ) {
                    return 'col-xs-8';
                }
                else if( isLeftPinned && isRightPinned ) {
                    return 'col-xs-4';
                }
            } ) );
        },

        onRuleEditorUnload: function () {
            var
                self = this;
            self.initialHash = undefined;
            self.ruleSetEditor.changed( false );
            var
                current = self.ruleSetList.tree.selectedNode(),
                parent = current && current.parent;

            self.ruleSetInspector.reset();

            if( parent ) {
                parent.unload();
            }
            self.ruleSetList.tree.deselectAll();
        },

        loadRuleSet: function ( ruleSetData ) {
            var
                self = this;
            self.ruleSetInspector.reset();
            self.ruleSetInspector.ruleSet( ruleSetData );
            self.ruleSetEditor.load( ruleSetData, self.ruleSetInspector );
            setTimeout( function (){
                self.initialHash = Y.doccirrus.KoViewModel.fastHash( self.ruleSetEditor.serialize() );
                self.ruleSetEditor.changed( false );
            }, 10 );
            window.scrollTo( 0, 0 );
        },

        getRuleSetHash: function( ruleSet, ruleInspector ){
            var tmp; //eslint-disable-line no-unused-vars
            [ 'description', 'referenceArea', 'isActive', 'isLocked', 'caseFolderType', 'periodType', 'periodCount',
                'periodReference', 'actType', 'catalogShort', 'code', 'parent' ].forEach( function( key ){
                tmp = ko.unwrap( ruleSet[key] );
            });
            var rules = ko.unwrap( ruleSet.rules );
            rules.forEach(function( rule ){
                [ 'description', 'isActive', 'validations' ].forEach( function( key ){
                    tmp = ko.unwrap( rule[key] );
                });
                var actions = ko.unwrap( rule.actions ) || [];
                actions.forEach(function(action){
                    tmp = ko.unwrap( action.type );
                    var template = ko.unwrap( action.template );
                    [ 'title', 'urgency', 'details', 'roles', 'candidates', 'caseFolder', 'days', 'hours', 'minutes',
                        'actType', 'caseFolderType', 'catalogShort', 'code', 'diagnosisCert', 'toCreate', 'explanations',
                        'linkActivities', 'autoCreate', 'markers', 'type', 'taskType', 'filenameRegexp', 'arrayFieldPath' ].forEach( function( templateKey ){
                        tmp = ko.unwrap( template[templateKey] );
                    });
                });

            });

            [ 'actTypeLocal', 'criteriaListValue', 'currentValue', 'countEnabled','countLeftValue', 'countRightValue',
                'countLeftOperator', 'countRightOperator' ].forEach( function( key ){
                tmp = ko.unwrap( ruleInspector[key] );
            });
            var criteriaListValue = ko.unwrap( ruleInspector.criteriaListValue );
            if(criteriaListValue){
                tmp = ko.unwrap( criteriaListValue.operator );
                tmp = ko.unwrap( criteriaListValue.value );
            }

            var locked = peek( ruleSet.isLocked);
            return !locked ? Y.doccirrus.KoViewModel.fastHash( ruleSet.serialize() ) : '';
        }

    }, {
        ATTRS: {
            binder: {
                valueFn: function() {
                    return Y.doccirrus.utils.getMojitBinderByType( 'IncaseAdminMojit' );
                }
            }
        }
    } );

    return {
        registerNode: function rule_editor_registerNode( node ) {
            viewModel = new ViewModel( {
                node: function() {
                    return node.getDOMNode();
                }
            } );
            ko.applyBindings( viewModel, node.getDOMNode() );
        },
        deregisterNode: function( node ) {
            ko.cleanNode( node.getDOMNode() );
        }
    };
};
