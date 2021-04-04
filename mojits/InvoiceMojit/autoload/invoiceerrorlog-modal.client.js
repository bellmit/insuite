'use strict';
/*global YUI, ko, $, _*/

YUI.add( 'dcinvoiceerrorlogmodal', function( Y /*NAME */) {

    var KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n,
        LINK_PEN = i18n( 'InvoiceMojit.gkv_browserJS.tooltip.LINK_PEN' ),
        LINK_SCHEIN = i18n( 'InvoiceMojit.gkv_browserJS.tooltip.LINK_SCHEIN' ),
        LINK_EYE = i18n( 'InvoiceMojit.gkv_browserJS.tooltip.LINK_EYE' );
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
                self.locationId = self.initialConfig.locationId;
                self.invoiceLogId = self.initialConfig.invoiceLogId;
                self.logType = self.initialConfig.type;
                self.getItemsCount();
                self.initTables();
            },

            destructor: function ErrorLogViewModel_destructor() {
                var self = this;
                if( self.errorTable ) {
                    self.errorTable = null;
                }
                if( self.warningTable ) {
                    self.warningTable = null;
                }
                if( self.activitiesTable ) {
                    self.activitiesTable = null;
                }
            },

            getItemsCount: function ErrorLogViewModel_getItemsCount() {
                // get count of items for tabs
                var self = this;
                Y.doccirrus.jsonrpc.api.invoicelog.calculateEntries( {
                    inVoiceLogId: self.invoiceLogId
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

            spliceRemovedItem: function ErrorLogViewModel_spliceRemovedItem( item, activityId, factCode ) {
                // removes activity code from item
                ( item.data && item.data.affectedActivities ).forEach( function( activity, idx ) {
                    if( activity.id === activityId &&
                        activity.code === factCode ) {
                        item.data.affectedActivities.splice( idx, 1 );
                    }
                } );
                return item;
            },

            removeCodesFromOthers: function ErrorLogViewModel_removeCodesFromOthers( item ) {
                // remove code was removed by user from invoiceentry
                var self = this;
                Y.doccirrus.jsonrpc.api.invoicelog.removeCode( {
                    data: item,
                    query: {
                        _id: item._id
                    }
                } ).done( function() {
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: 'invoiceEntries-done',
                        content: 'activity successfully removed'
                    } );
                    self.reloadTables();
                } ).fail( function( err ) {
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                } );
            },

            removeCode: function ErrorLogViewModel_removeCode( $data, $event ) {
                var
                    self = this,
                    row = $data.row,
                    activityId = $event.originalEvent.target.dataset.activity,
                    factCode = $event.originalEvent.target.dataset.code;
                $event.stopPropagation();

                if( "SPAN" !== $event.originalEvent.target.tagName ||  !activityId || !factCode) {
                    return;
                }

                Y.doccirrus.jsonrpc.api.activity.delete( {
                    // remove activity and codes where this activity was in entry
                    query: {
                        _id: activityId
                    }
                } ).done( function( response ) {
                    var
                        data = response.data[ 0 ] && response.data[ 0 ].data;
                    if( data ) {
                        Y.doccirrus.jsonrpc.api.invoicelog.getEntries( {
                            query: {
                                invoiceLogId: self.invoiceLogId,
                                'data.affectedActivities.code': $event.originalEvent.target.dataset.code,
                                'data.affectedActivities.id': $event.originalEvent.target.dataset.activity
                            }
                        } ).done( function( response ) {
                            var data = response && response.data;
                            if ( data && data.length ) {
                                data.forEach(function( item ) {
                                    self.removeCodesFromOthers(  self.spliceRemovedItem( item, activityId, factCode ) );
                                });
                            } else {
                                self.removeCodesFromOthers(  self.spliceRemovedItem( row ) );
                            }
                        } ).fail( function( err ) {
                            Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                        } );
                    }
                } ).fail( function( err ) {
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                } );
            },

            initTables: function ErrorLogViewModel_initTables() {
                var self = this,
                columns = [
                    {
                        componentType: 'KoTableColumnCheckbox',
                        forPropertyName: 'checked',
                        title: i18n( 'InvoiceMojit.gkv_browserJS.label.DONE' ),
                        label: '',
                        visible: true,
                        checkMode: 'multi'
                    },
                    {
                        forPropertyName: 'number',
                        label: 'Nr.',
                        title: 'Nr.',
                        width: '30px'
                    },
                    {
                        forPropertyName: 'data.text',
                        label: i18n( 'InvoiceMojit.gkv_browserJS.label.MESSAGE' ),
                        title: i18n( 'InvoiceMojit.gkv_browserJS.label.MESSAGE' ),
                        width: '20%',
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'data.patientName',
                        label: 'Patient',
                        title: 'Patient',
                        width: '15%',
                        isSortable: true,
                        isFilterable: true,
                        renderer: function( meta ) {
                            var patientId = meta.row.data.patientId,
                                caseFolderId = meta.row.data.caseFolderId,
                                patientName = meta.row.data.patientName;
                            if( !patientId ){
                                return patientName;
                            }

                            return '<a href=/incase#/patient/' + patientId + '/tab/casefile_browser/' + ( caseFolderId ? 'casefolder/' + caseFolderId : '' ) + ' target="_blank">' + patientName + '</a>';
                        }
                    },
                    {
                        forPropertyName: 'data.affectedActivities.code',
                        label: i18n( 'InvoiceMojit.gkv_browserJS.label.ENTIRES' ),
                        title: i18n( 'InvoiceMojit.gkv_browserJS.label.ENTIRES' ),
                        width: '20%',
                        isSortable: true,
                        isFilterable: true,
                        renderer: function( meta ) {
                            var affectedActivities = meta.row.data.affectedActivities,
                                patientId = meta.row.data.patientId,
                                caseFolderId = meta.row.data.caseFolderId;
                            if( !affectedActivities ) {
                                return '';
                            }
                            return affectedActivities.map( function( affectedActivity ) {
                                if( !affectedActivity ) {
                                    return  '';
                                }
                                return '<a href=/incase#/activity/' + affectedActivity.id + '/patient/' + patientId + '/casefolder/' + caseFolderId +' target="_blank">' + affectedActivity.code + '</a>';
                            } ).join( ', ' );
                        }
                    },
                    {
                        forPropertyName: 'data.factIdCode',
                        label: i18n( 'InvoiceMojit.gkv_browserJS.label.EXCLUDED' ),
                        title: i18n( 'InvoiceMojit.gkv_browserJS.label.EXCLUDED' ),
                        width: '20%',
                        isSortable: true,
                        isFilterable: true,
                        renderer: function( meta ) {
                            var factIdCode = meta.row.data.factIdCode,
                                allCodes = meta.row.data.allCodes,
                                result;
                            if( !factIdCode ) {
                                return '';
                            }
                            result = factIdCode.map( function( code ) {
                                return code;
                            } ).join( ', ' );
                            if( allCodes && allCodes.length ) {
                                return result + ' <i class="dc-info-icon" data-toggle="tooltip" data-placement="top" title="' + allCodes.join( ', ' ) + '"></i>';
                            }
                            return result;
                        }
                    },
                    {
                        forPropertyName: 'data.requiredCodes',
                        label: i18n( 'InvoiceMojit.gkv_browserJS.label.MISSING' ),
                        title: i18n( 'InvoiceMojit.gkv_browserJS.label.MISSING' ),
                        width: '10%',
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'data.actTypes',
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
                            var actTypes = meta.row.data.actTypes;
                            if( !actTypes ) {
                                return '';
                            }
                            return actTypes.map(function( actType ) {
                                return Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', actType, '-de', 'k.A.' );
                            }).join( ', ' );
                        }
                    },
                    {
                        forPropertyName: 'data.employeeName',
                        label: i18n( 'InvoiceMojit.gkv_browserJS.label.PHYSICIANS' ),
                        title: i18n( 'InvoiceMojit.gkv_browserJS.label.PHYSICIANS' ),
                        width: '10%',
                        isSortable: true,
                        isFilterable: true,
                        visible: false
                    },
                    {
                        forPropertyName: 'data.link',
                        label: '',
                        title: '',
                        width: '50px',
                        renderer: function( meta ) {
                            var link = meta.row.data.link;
                            if( !link ) {
                                return '';
                            }
                            return '<a class="btn btn-default glyphicon glyphicon-pencil error-table-icons" href=' + link + ' target="_blank" data-toggle="tooltip" data-placement="top" title="' + LINK_PEN + '"></a>';
                        }
                    }
                ],
                warningsTableColumns;
                if( 'KBV' === self.logType ) {
                    // push scheinId column to gkv errors
                    columns.push( {
                        forPropertyName: 'data.scheinId',
                        label: '',
                        title: '',
                        width: '50px',
                        renderer: function( meta ) {
                            var
                                scheinId = meta.row.data.scheinId,
                                patientId = meta.row.data.patientId,
                                caseFolderId = meta.row.data.caseFolderId,
                                link;
                            if( !scheinId ) {
                                return '';
                            }
                            link = '<a class="btn btn-default glyphicon glyphicon-list error-table-icons" href=' + "/incase#/activity/" + scheinId;
                            if( patientId && caseFolderId ) {
                                link += '/patient/' + patientId + '/casefolder/' + caseFolderId;
                            }
                            link += ' target="_blank" data-toggle="tooltip" data-placement="top" title="' + LINK_SCHEIN + '"></a>';
                            return link;
                        }
                    } );
                }
                columns.push( {
                    forPropertyName: 'ruleDetails',
                    label: '',
                    title: '',
                    width: '50px',
                    renderer: function( meta ) {
                        var row = meta.row;
                        if( row.data.ruleSetId && row.data.ruleId) {
                            return '<span class="btn btn-default glyphicon glyphicon-eye-open error-table-icons" data-toggle="tooltip" data-placement="top" title="' + LINK_EYE + '"></span>';
                        }
                    },
                    onCellClick: function( meta ) {
                        var row = meta.row;
                        if( row.data.ruleSetId && row.data.ruleId) {
                            Y.doccirrus.modals.invoiceRuleErrorModal.show( row.data.ruleSetId, row.data.ruleId );
                        }
                    }
                } );
                self.errorTable = Y.doccirrus.KoUI.KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        stateId: 'inVoiceMojit-errorsTable',
                        sortersLimit: 2,
                        limit: 10,
                        limitList: [10, 20, 30, 40, 50],
                        remote: true,
                        proxy: Y.doccirrus.jsonrpc.api.invoicelog.getEntries,
                        baseParams: {
                            query: {
                                invoiceLogId: self.invoiceLogId,
                                type: 'ERROR'
                            }
                        },
                        columns: _.map(columns, function( v ) {return _.assign( {}, v );})
                    }
                } );

                warningsTableColumns = _.map(columns, function( v ) {return _.assign( {}, v );});

                if( 'KBV' === self.logType ) {
                    warningsTableColumns.splice( _.findIndex( warningsTableColumns, function( col ) {
                        return col.forPropertyName === 'data.link';
                    } ), 0, {
                        forPropertyName: 'data.blPseudoGnrStatus',
                        label: 'BL',
                        title: 'BL',
                        width: '100px',
                        isSortable: true,
                        isFilterable: true,
                        queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                        filterField: {
                            componentType: 'KoFieldSelect2',
                            options: Y.doccirrus.schemas.kbvlog.types.BlPseudoGnrStatus_E.list,
                            optionsText: '-de',
                            optionsValue: 'val'
                        },
                        renderer: function( meta ) {
                            return meta.value;
                        }
                    } );
                }

                self.warningTable = Y.doccirrus.KoUI.KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        stateId: 'inVoiceMojit-warningTable',
                        sortersLimit: 2,
                        limit: 10,
                        limitList: [10, 20, 30, 40, 50],
                        remote: true,
                        proxy: Y.doccirrus.jsonrpc.api.invoicelog.getEntries,
                        baseParams: {
                            query: {
                                invoiceLogId: self.invoiceLogId,
                                type: 'WARNING'
                            }
                        },
                        columns: warningsTableColumns
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
                        proxy: Y.doccirrus.jsonrpc.api.invoicelog.getEntries,
                        baseParams: {
                            query: {
                                invoiceLogId: self.invoiceLogId,
                                type: 'ADVICE'
                            }
                        },
                        columns: _.map(columns, function( v ) {return _.assign( {}, v );})
                    }
                } );

                self.addDisposable(ko.computed( function() {
                        self.errorTable.getComponentColumnCheckbox().checked();
                        self.warningTable.getComponentColumnCheckbox().checked();
                        self.activitiesTable.getComponentColumnCheckbox().checked();
                        setTimeout(function() {
                            $('#kbverror-log-container table tr th').css( "background-color", "" );
                            $('#kbverror-log-container table tr td').css( "background-color", "" );
                            $('#kbverror-log-container table tr th').has( 'span.selectedRowChecked' ).css( "background-color", "#dff0d8" );
                            $('#kbverror-log-container table tr td').has( 'input.selectedRowChecked' ).css( "background-color", "#dff0d8" );
                        }, 100);
                    } ).extend( { rateLimit: 0 } )
                );
            },

            reloadTables: function ErrorLogViewModel_reloadTables() {
                var self = this;
                self.getItemsCount();
                if( self.errorTable ) {
                    self.errorTable.reload();
                }
                if( self.warningTable ) {
                    self.warningTable.reload();
                }
                if( self.activitiesTable ) {
                    self.activitiesTable.reload();
                }
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

        function showDialog( locationId, invoiceLogId, type, callback ) {

            var args = {
                    locationId: locationId,
                    invoiceLogId: invoiceLogId,
                    type: type
                },
                layout = new ErrorLogViewModel( args ),
                node = Y.Node.create( '<div></div>' ),
                modal;
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
                        width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                        height: Y.doccirrus.DCWindow.SIZE_XLARGE,
                        resizeable: true,
                        dragable: true,
                        centered: true,
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
                                        var self = this,
                                            allEntries = [],
                                            // get checked rows to remove
                                            checkboxColErrors = layout.errorTable.getComponentColumnCheckbox(),
                                            checkedRowsErrors = checkboxColErrors.checked ? checkboxColErrors.checked() : null,
                                            checkboxColWarnings = layout.warningTable.getComponentColumnCheckbox(),
                                            checkedRowsWarnings = checkboxColWarnings.checked ? checkboxColWarnings.checked() : null,
                                            checkboxColAdvices = layout.activitiesTable.getComponentColumnCheckbox(),
                                            checkedRowsAdvices = checkboxColAdvices.checked ? checkboxColAdvices.checked() : null;
                                        self.close();
                                        allEntries = allEntries.concat( checkedRowsErrors );
                                        allEntries = allEntries.concat( checkedRowsWarnings );
                                        allEntries = allEntries.concat( checkedRowsAdvices );

                                        if( 0 < allEntries.length ) {
                                            // remove checked entries
                                            Y.doccirrus.jsonrpc.api.invoicelog.removeEntries( {
                                                data: allEntries
                                            } ).done( function() {
                                                Y.doccirrus.DCSystemMessages.addMessage( {
                                                    messageId: 'invoiceEntries-done',
                                                    content: Y.Lang.sub(i18n( 'InvoiceMojit.gkv_browserJS.label.ITEMS_WERE_REMOVED' ), {
                                                        N: allEntries.length
                                                    })
                                                } );
                                            } ).fail( function( err ) {
                                                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                                            } );
                                        }
                                        callback();
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
                        modal.resizeMaximized.set( 'maximized', true );
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

        Y.namespace( 'doccirrus.modals' ).invoiceErrorLogModal = {
            show: showDialog
        };

    },
    '0.0.1',
    {
        requires: [
            'KoUI-all',
            'DCWindow',
            'invoiceentry-schema',
            'dcinvoiceruleerrormodal',
            'kbvlog-schema'
        ]
    }
);
