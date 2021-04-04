'use strict';
/*global YUI, ko, $*/

YUI.add( 'dcinvoiceerrorlogcasefoldermodal', function( Y /*NAME */) {

    var KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n,
        LINK_EYE = i18n( 'InvoiceMojit.gkv_browserJS.tooltip.LINK_EYE' ),
        NA = i18n( 'InvoiceMojit.gkv_browserJS.tooltip.NA' );
    /**
     * ErrorLogViewModel
     * @param config
     * @constructor
     */
    function ErrorLogViewModel( config ) {
        ErrorLogViewModel.superclass.constructor.call( this, config );
    }

    ErrorLogViewModel.ATTRS = {
        validatable: {
            value: true,
            lazyAdd: false
        }
    };

    Y.extend( ErrorLogViewModel, KoViewModel.getBase(), {
        initializer: function ErrorLogViewModel_initializer() {
            var self = this;
            self.errorsLength = ko.observable( 0 );
            self.warningsLength = ko.observable( 0 );
            self.advicesLength = ko.observable( 0 );
            self.patientId = self.initialConfig.patientId;
            self.caseFolderId = self.initialConfig.caseFolderId;
            self.sumexErrors = self.initialConfig.sumexErrors || [];
            self.getItemsCount();
            self.initTables();
        },

        destructor: function ErrorLogViewModel_destructor() {
        },

        getItemsCount: function ErrorLogViewModel_getItemsCount() {
            // count items for tabs
            var self = this;
            Y.doccirrus.jsonrpc.api.rulelog.calculateErrors( {
                patientId: self.patientId,
                caseFolderId: self.caseFolderId
            } ).done( function( response ) {
                var data = response && response.data;
                self.errorsLength( data.output );
                self.warningsLength( data.warnings );
                self.advicesLength( data.advices );
            } )
            .fail( function( err ) {
                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
            } );
        },

        initTables: function ErrorLogViewModel_initTables() {
            var self = this,
                columns = [
                    {
                        forPropertyName: 'number',
                        label: 'Nr.',
                        title: 'Nr.',
                        width: '30px'
                    },
                    {
                        forPropertyName: 'message',
                        label: 'Meldung',
                        title: 'Meldung',
                        width: '20%',
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'affectedActivities.code',
                        label: i18n( 'InvoiceMojit.gkv_browserJS.label.ENTIRES' ),
                        title: i18n( 'InvoiceMojit.gkv_browserJS.label.ENTIRES' ),
                        width: '20%',
                        isSortable: true,
                        isFilterable: true,
                        renderer: function( meta ) {
                            var affectedActivities = meta.row.affectedActivities,
                                patientId = meta.row.patientId,
                                caseFolderId = meta.row.caseFolderId;
                            if( !affectedActivities ) {
                                return '';
                            }
                            return affectedActivities.map( function( affectedActivity ) {
                                if( !affectedActivity ) {
                                    return  '';
                                }
                                return '<a href=/incase#/activity/' + affectedActivity.id + '/patient/' + patientId + '/casefolder/' + caseFolderId + ' target="_blank">' + ( affectedActivity.code || NA ) + '</a>';
                            } ).join( ', ' );
                        }
                    },
                    {
                        forPropertyName: 'actCodes',
                        label: i18n( 'InvoiceMojit.gkv_browserJS.label.EXCLUDED' ),
                        title: i18n( 'InvoiceMojit.gkv_browserJS.label.EXCLUDED' ),
                        width: '20%',
                        isSortable: true,
                        isFilterable: true,
                        renderer: function( meta ) {
                            var actCodes = meta.row.actCodes,
                                allCodes = meta.row.allCodes,
                                result;
                            if( !actCodes ) {
                                return '';
                            }
                            result = actCodes.map( function( code ) {
                                return code;
                            } ).join( ', ' );
                            if( allCodes && allCodes.length ) {
                                return result + ' <i class="dc-info-icon" data-toggle="tooltip" data-placement="top" title="' + allCodes.join( ', ' ) + '"></i>';
                            }
                            return result;
                        }
                    },
                    {
                        forPropertyName: 'requiredCodes',
                        label: i18n( 'InvoiceMojit.gkv_browserJS.label.MISSING' ),
                        title: i18n( 'InvoiceMojit.gkv_browserJS.label.MISSING' ),
                        width: '10%',
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'actTypes',
                        label: i18n( 'actionbutton-schema.ActionButton_T.actType.i18n' ),
                        title: i18n( 'actionbutton-schema.ActionButton_T.actType.i18n' ),
                        width: '10%',
                        isSortable: true,
                        isFilterable: true,
                        queryFilterType: Y.doccirrus.DCQuery.ENUM_ACTTYPE_OPERATOR,
                        filterField: {
                            componentType: 'KoFieldSelect2',
                            options: Y.doccirrus.schemas.activity.nameGroupedActivityTypeConfigs,
                            optionsText: '-de',
                            optionsValue: 'val'
                        },
                        renderer: function( meta ) {
                            var actTypes = meta.row.actTypes;
                            if( !actTypes ) {
                                return '';
                            }
                            return actTypes.map( function( actType ) {
                                return Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', actType, '-de', 'k.A.' );
                            } ).join( ', ' );
                        }
                    },
                    {
                        forPropertyName: 'ruleDetails',
                        label: '',
                        title: '',
                        width: '50px',
                        renderer: function( meta ) {
                            var row = meta.row;
                            if( row.ruleSetId && row.ruleId ) {
                                return '<span class="btn btn-default glyphicon glyphicon-eye-open error-table-icons" data-toggle="tooltip" data-placement="top" title="' + LINK_EYE + '"></span>';
                            }
                        },
                        onCellClick: function( meta ) {
                            var row = meta.row;
                            if( row.ruleSetId && row.ruleId ) {
                                Y.doccirrus.modals.invoiceRuleErrorModal.show( row.ruleSetId, row.ruleId );
                            }
                        }
                    }
                ],
                adviceColumns = [
                    {
                        forPropertyName: 'createActivity',
                        label: '',
                        title: '',
                        width: '50px',
                        renderer: function() {
                            return '<div class="text-right"><span class="btn btn-default glyphicon glyphicon-ok error-table-icons"></span></div>';
                        },
                        onCellClick: function( meta ) {
                            var data = meta.row;
                            data.createAllActivities = true;
                            Y.doccirrus.jsonrpc.api.rule.createRuleActivities( data ).done( function() {
                                self.getItemsCount();
                                self.activitiesTable.reload();
                            } );
                        }
                    },
                    {
                        forPropertyName: 'removeActivity',
                        label: '',
                        title: '',
                        width: '50px',
                        renderer: function() {
                            return '<div class="text-right"><span class="btn btn-default glyphicon glyphicon-remove error-table-icons"></span></div>';
                        },
                        onCellClick: function( meta ) {
                            var data = meta.row;
                            Y.doccirrus.jsonrpc.api.rulelog.removeEntriesAndUpdateCaseFolderStats( data ).done( function() {
                                self.getItemsCount();
                                self.activitiesTable.reload();
                            } );
                        }
                    }
                ];

            function getCaseFolderErrors( args ) {
                args.query = {
                    ruleLogQuery:  args.query
                };

                if ( Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() && self.sumexErrors && self.sumexErrors.length) {
                    args.query.invoiceEntriesQuery = {
                       _id: {$in: self.sumexErrors}
                    };
                }

                return  Y.doccirrus.jsonrpc.api.casefolder.getCaseFolderErrors( args );
            }


            self.errorTable = Y.doccirrus.KoUI.KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'inVoiceMojit-errorsTable',
                    sortersLimit: 2,
                    limit: 10,
                    limitList: [10, 20, 30, 40, 50],
                    remote: true,
                    proxy: getCaseFolderErrors,
                    baseParams: {
                        query: {
                            'ruleLogType': 'ERROR',
                            'patientId': self.patientId,
                            'caseFolderId': self.caseFolderId
                        }
                    },
                    columns: columns
                }
            } );

            self.warningTable = Y.doccirrus.KoUI.KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'inVoiceMojit-warningTable',
                    sortersLimit: 2,
                    limit: 10,
                    limitList: [10, 20, 30, 40, 50],
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.rulelog.getErrors,
                    baseParams: {
                        query: {
                            'ruleLogType': 'WARNING',
                            'patientId': self.patientId,
                            'caseFolderId': self.caseFolderId
                        }
                    },
                    columns: columns
                }
            } );

            self.activitiesTable = Y.doccirrus.KoUI.KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'inVoiceMojit-activitiesTable',
                    sortersLimit: 2,
                    limit: 10,
                    limitList: [10, 20, 30, 40, 50],
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.rulelog.getErrors,
                    baseParams: {
                        query: {
                            'ruleLogType': 'ACTIVITY',
                            'patientId': self.patientId,
                            'caseFolderId': self.caseFolderId
                        }
                    },
                    columns: columns.concat( adviceColumns )
                }
            } );
        },

        setActiveClass: function ErrorLogViewModel_setActiveClass() {
            // set active tab
            var self = this;
            if( self.errorsLength() > 0 ) {
                document.getElementById('kbvlog-errors').classList.add('active');
                document.getElementById('kbvlog-errors-tab').classList.add('active');
            }
            if( self.errorsLength() === 0 && self.warningsLength() > 0 ) {
                document.getElementById('kbvlog-warnings').classList.add('active');
                document.getElementById('kbvlog-warnings-tab').classList.add('active');
            }
            if( self.errorsLength() === 0 && self.warningsLength() === 0  && self.advicesLength() > 0 ) {
                document.getElementById('kbvlog-advices').classList.add('active');
                document.getElementById('kbvlog-advices-tab').classList.add('active');
            }
        }
    },
        {
            NAME: 'ErrorLogViewModel'
        }
    );

    KoViewModel.registerConstructor( ErrorLogViewModel );

        function showDialog( patientId, caseFolderId, sumexErrors ) {
            var args = {
                    patientId: patientId,
                    caseFolderId: caseFolderId,
                    sumexErrors: sumexErrors || []
                },
                layout = new ErrorLogViewModel( args ),
                node = Y.Node.create( '<div></div>' ),
                modal; //eslint-disable-line

            YUI.dcJadeRepository.loadNodeFromTemplate(
                'errorlog',
                'InvoiceMojit',
                {},
                node,
                function() {
                    modal = new Y.doccirrus.DCWindow( {
                        className: 'DCWindow-ErrorLog',
                        bodyContent: node,
                        title: i18n( 'InvoiceMojit.gkv_browserJS.title.REPORTS' ),
                        icon: Y.doccirrus.DCWindow.ICON_ERROR,
                        maximizable: true,
                        width: '95%',
                        height: '90%',
                        centered: true,
                        resizeable: true,
                        dragable: true,
                        visible: false,
                        focusOn: [],
                        modal: true,
                        render: document.body,
                        buttons: {
                            header: ['close', 'maximize'],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    isDefault: true,
                                    action: function() {
                                        var self = this;
                                        self.close();
                                    }
                                } )
                            ]
                        },
                        after: {
                            visibleChange: function( event ) {
                                if( !event.newVal ) {
                                    layout.destroy();
                                    ko.cleanNode( node.getDOMNode() );
                                }
                            }
                        }
                    } );
                    setTimeout(function() {
                        modal.show();
                        $( '#kbverror-log-tabs a' ).click( function( e ) {
                            e.preventDefault();
                            e.stopImmediatePropagation();
                            $( this ).tab( 'show' );
                        } );
                        layout.setActiveClass();
                    }, 500);
                    ko.applyBindings( layout, node.one( '#kbverror-log-container' ).getDOMNode() );
                }
            );

        }

        Y.namespace( 'doccirrus.modals' ).invoiceErrorLogCaseFolderModal = {
            show: showDialog
        };

    },
    '0.0.1',
    {
        requires: [
            'KoUI-all',
            'DCWindow',
            'invoiceentry-schema',
            'dcinvoiceruleerrormodal'
        ]
    }
);
