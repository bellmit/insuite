/*
 *  Modal to select, filter and arrange labdata to be mapped into tables on forms MOJ-9074
 *
 *  Opened in reponse to click on labdatatable form elements
 *
 *  @author: strix
 *  @date: 15/06/2018
 */

/*eslint strict:0 */
/*global YUI, ko */

'use strict';

YUI.add( 'DcSelectLabDataModal', function( Y, NAME ) {
        var
            i18n = Y.doccirrus.i18n,
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            CANCEL = i18n( 'InCaseMojit.select_labdata_modalJS.button.CANCEL' ),
            SELECT = i18n( 'InCaseMojit.select_labdata_modalJS.button.SELECT' ),
            //SELECT_CHART = i18n( 'InCaseMojit.select_labdata_modalJS.button.SELECT_CHART' ),

            KoViewModel = Y.doccirrus.KoViewModel;

        /**
         *
         *  @param options
         */

        function showLabdataModal( options ) {
            var
                JADE_TEMPLATE = 'InCaseMojit/views/selectlabdatadata_modal',
                LabdataTableEditorModel = KoViewModel.getConstructor( 'LabdataTableEditorModel' ),

                btnCancel = Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                    label: CANCEL
                } ),

                /*
                btnSelectCharts = Y.doccirrus.DCWindow.getButton( 'CHARTS', {
                    isDefault: true,
                    label: SELECT_CHART,
                    action: onSelectAsCharts
                } ),
                */

                btnSelect = Y.doccirrus.DCWindow.getButton( 'OK', {
                    isDefault: true,
                    label: SELECT,
                    action: onSelectionComplete
                } ),

                modalOptions = {
                    className: 'DCWindow-SelectLabdata',
                    bodyContent: null,                                              //  added from template
                    title:  i18n( 'InCaseMojit.select_labdata_modalJS.title' ),
                    icon: Y.doccirrus.DCWindow.ICON_LIST,
                    width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                    centered: true,
                    modal: true,
                    render: document.body,
                    buttons: {
                        header: [ 'close', 'maximize' ],
                        footer: [ btnCancel, /* btnSelectCharts, */ btnSelect ]
                    },
                    after: { visibleChange: onModalVisibilityChange }
                },

                modal,      //  eslint-disable-line no-unused-vars
                template,
                labdataTableModel;

            Promise.resolve( Y.doccirrus.jsonrpc.api.jade.renderFile( { path: JADE_TEMPLATE } ) )
                .then( onTemplateLoaded )
                .catch( catchUnhandled );

            function onTemplateLoaded( response ) {
                template = ( response && response.data ) ? response.data : null;
                modalOptions.bodyContent = Y.Node.create( template );

                labdataTableModel = new LabdataTableEditorModel( options );

                modal = new Y.doccirrus.DCWindow( modalOptions );

                ko.applyBindings( labdataTableModel, modalOptions.bodyContent.getDOMNode() );

            }

            function onModalVisibilityChange( event ) {
                if( !event.newVal ) {
                    ko.cleanNode( modalOptions.bodyContent.getDOMNode() );
                    labdataTableModel.destroy();
                }
            }

            function onSelectionComplete() {
                var
                    formTableDef = labdataTableModel.getFormTableDefinition(),
                    labData = labdataTableModel.getAsFormTable( true );

                //  TODO: apply filters

                if ( options.onSelected ) {
                    options.onSelected( formTableDef, labData );
                } else {
                    Y.log( 'onSelected Callback not given to labdata table modal.', 'warn', NAME );
                }

                modal.close();
            }

            /*
            function onSelectAsCharts() {
                Y.log( 'TODO: Inject selected data as single column of charts', 'info', NAME );
            }
            */

        }

        Y.namespace( 'doccirrus.modals' ).selectLabData = {
            show: showLabdataModal
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'doccirrus',
            'KoViewModel',
            'KoUI-all',
            'inCaseUtils',
            'activity-schema',
            'v_activityDataItem-schema',
            'LabdataTableEditorModel'
        ]
    }
);
