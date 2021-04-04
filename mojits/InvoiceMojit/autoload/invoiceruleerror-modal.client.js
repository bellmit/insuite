'use strict';
/*global YUI, ko, _*/

YUI.add( 'dcinvoiceruleerrormodal', function( Y/*, NAME */ ) {

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n;

    function RuleOperator( type, data, rule, ruleSet ) {
        var self = this;

        this.type = ko.observable( type );
        this.content = ko.observableArray().extend( { rateLimit: 100 } );

        this.operatorName = ko.computed( function() {
            var type = self.type();
            return Y.doccirrus.ruleutils.translate( type );
        } );

        if( !Array.isArray( data ) ) {
            throw Error( 'content must be an array' );
        }

        data.forEach( function( entry ) {
            var operator = findOperator( entry, rule, ruleSet );

            if( operator ) {
                operator.parent = self;
                self.content.push( operator );
            } else {
                self.addValidation( entry, rule, ruleSet );
            }
        } );
    }

    RuleOperator.prototype.addValidation = function( validationData, rule, ruleSet ) {
        var
            validation = new RuleValidation( validationData, rule, ruleSet );

        validation.parent = this;
        this.content.push( validation );
    };

    function isArea( ruleSet, area ){
        return  'ENTRY' === ruleSet.referenceArea && _.includes( ruleSet.caseFolderType, area );
    }

    function RuleValidation( data, rule, ruleSet ) {
        var
            criteria = data.criteria || {},
            isCaseFolder = isArea( ruleSet, 'CASEFOLDER' ),
            isPatient = isArea( ruleSet, 'PATIENT' ),
            isTask = isArea( ruleSet, 'TASK' ),
            parsedCriteria = Y.doccirrus.ruleutils.parseCriteria( criteria, isCaseFolder, isPatient, isTask );
        this.isActivity = ko.observable( !isCaseFolder && !isPatient );
        this.type = ko.observable( 'validation' );
        this.content = ko.observable( parsedCriteria );
    }

    function findOperator( data, rule, ruleSet ) {
        var operatorType, operatorContent;

        if( Array.isArray( data ) && data.length > 1 ) {
            operatorType = 'and';
            operatorContent = data;
        } else if( data.$and ) {
            operatorType = 'and';
            operatorContent = data.$and;
        } else if( data.$or ) {
            operatorType = 'or';
            operatorContent = data.$or;
        } else if( data.$not ) {
            operatorType = 'not';
            operatorContent = data.$not;
        } else if( Array.isArray( data ) && data.length === 1 ){
            if( data[0] && data[0].criteria ){
                operatorType = 'and';
                operatorContent = data;
            } else {
                return findOperator( data[0], rule, ruleSet );
            }
        }
        if( !operatorContent || !operatorType ) {
            return;
        }
        return new RuleOperator( operatorType, operatorContent, rule, ruleSet );
    }

    function RuleLogModalModel( config ) {
        RuleLogModalModel.superclass.constructor.call( this, config );
    }

    Y.extend( RuleLogModalModel, KoViewModel.getDisposable(), {

        initializer: function RuleLogModalModel_initializer( config ) {
            var
                self = this;
            self.selectedRuleSet = ko.observable();
            self.pleaseWait = i18n( 'utils_clientJS.showLoadingMask.text' );
            self.loadRuleSetPreview( config.ruleSetId, config.ruleId );
        },

        loadRuleSetPreview: function( ruleSetId, ruleId ) {
            var
                self = this;
            Y.doccirrus.jsonrpc.api.rule.read( {
                query: {
                    _id: ruleSetId
                }
            } ).done( function( response ) {
                var
                    ruleSet = response && response.data && response.data[0] || {},
                    operator;

                ruleSet.rules = ( ruleSet && ruleSet.rules || [] ).filter( function(entry){
                    return !ruleId || !entry.ruleId || ruleId === entry.ruleId;
                });

                ruleSet.rules = Y.doccirrus.schemautils.recoverKey( ruleSet.rules );

                ruleSet.rules.forEach( function( entry ) {
                    if( entry.validations ) {
                        entry.content = ko.observableArray();
                        operator = findOperator( entry.validations, entry, ruleSet );
                        if( !operator ) {
                            throw Error( 'no operator found' );
                        }
                        entry.content( [operator] );
                    }
                } );
                self.selectedRuleSet( ruleSet );
            } );
        },
        displayAction: function( action ) {
            return Y.doccirrus.ruleutils.translate( ko.unwrap( action.type ) );
        }
    }, {
        NAME: 'RuleLogModalModel'
    } );

    KoViewModel.registerConstructor( RuleLogModalModel );

    function show( ruleSetId, ruleId ) {
        var node = Y.Node.create( '<div></div>' ),
            modal, //eslint-disable-line
            data = {
                ruleSetId: ruleSetId,
                ruleId: ruleId
            },
            viewModel = new RuleLogModalModel( data );

        YUI.dcJadeRepository.loadNodeFromTemplate(
            'invoiceruleerror-modal',
            'InvoiceMojit',
            {},
            node,
            function() {

                modal = new Y.doccirrus.DCWindow( {
                    className: 'DCWindow-RuleDetails',
                    bodyContent: node,
                    title: i18n( 'InvoiceMojit.invoiceruleerror_modal.title' ),
                    icon: Y.doccirrus.DCWindow.ICON_LIST,
                    width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                    centered: true,
                    modal: true,
                    render: document.body,
                    buttons: {
                        header: ['close', 'maximize'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                isDefault: true,
                                action: function() {
                                    this.close();
                                }
                            } )
                        ]
                    }
                } );

                ko.applyBindings( viewModel, node.one( '#ruleDeatails' ).getDOMNode() );
            }
        );
    }

    Y.namespace( 'doccirrus.modals' ).invoiceRuleErrorModal = {
        show: show
    };

}, '0.0.1', {
    requires: [
        'KoViewModel',
        'DCWindow',
        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'rulelog-schema',
        'dcRuleSetEditor'
    ]
} );
