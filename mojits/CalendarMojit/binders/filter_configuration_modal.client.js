/*global YUI, ko*/

'use strict';

YUI.add( 'filterconfigurationmodal', function( Y /*NAME*/ ) {
        var
            KoViewModel = Y.doccirrus.KoViewModel,
            i18n = Y.doccirrus.i18n,
            unwrap = ko.unwrap;

        /**
         * FilterConfigurationViewModel
         * @param config
         * @constructor
         */
        function FilterConfigurationViewModel( config ) {
            FilterConfigurationViewModel.superclass.constructor.call( this, config );
        }

        FilterConfigurationViewModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( FilterConfigurationViewModel, KoViewModel.getBase(), {
                initializer: function FilterConfigurationViewModel_initializer( config ) {
                    var
                        self = this;
                    self.visibleI18n = i18n('KoUI.KoTableUsageConfiguration.KoTableUsageConfigurationDialog.VISIBLE');
                    self.designationI18n = i18n('KoUI.KoTableUsageConfiguration.KoTableUsageConfigurationDialog.DESIGNATION');
                    self.descriptionI18n = i18n('KoUI.KoTableUsageConfiguration.KoTableUsageConfigurationDialog.DESCRIPTION');
                    self.actionI18n = i18n( 'general.button.DELETE' );
                    self.filters = ko.observableArray( config );
                },
                destructor: function FilterConfigurationViewModel_destructor() {
                },
                /**
                 * removes filter selected configuration
                 */
                removeConfiguration: function TabGraphicWaitingListViewModel_removeConfiguration( $context, item ) {
                    var
                        self = this,
                        value = item,
                        list = unwrap( self.filters ),
                        valueIndex = list.indexOf( value );

                    list.splice(valueIndex, 1);
                    Y.doccirrus.utils.localValueSet( 'filterConfiguration', list );
                    self.filters( list );
                }
            },
            {
                NAME: 'FilterConfigurationViewModel'
            } );

        KoViewModel.registerConstructor( FilterConfigurationViewModel );

        function getTemplate( node, callback ) {
            YUI.dcJadeRepository.loadNodeFromTemplate(
                'filter_configuration',
                'CalendarMojit',
                {},
                node,
                callback
            );
        }

        function show( data, isEdit, callback ) {
            var node = Y.Node.create( '<div></div>' );

            getTemplate( node, function() {
                var model = new FilterConfigurationViewModel( data ),
                    modal = new Y.doccirrus.DCWindow( { //eslint-disable-line
                        className: 'DCWindow-filterConfiguration',
                        bodyContent: node,
                        title: isEdit ? i18n( 'CalendarMojit.tab_graphic-waiting-list.text.EDIT_FILTER' ) : i18n( 'CalendarMojit.tab_graphic-waiting-list.text.SAVE_FILTER' ),
                        icon: Y.doccirrus.DCWindow.ICON_LIST,
                        width: Y.doccirrus.DCWindow.MEDIUM,
                        height: Y.doccirrus.DCWindow.MEDIUM,
                        resizeable: true,
                        dragable: true,
                        maximizable: true,
                        centered: true,
                        visible: true,
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
                                        var
                                            self = this,
                                            filters = unwrap( model.filters );
                                        Y.doccirrus.utils.localValueSet( 'filterConfiguration', filters );
                                        self.close();
                                        callback();
                                    }
                                } )
                            ]
                        },
                        after: {
                            visibleChange: function( event ) {
                                if( !event.newVal ) {
                                    ko.cleanNode( node.getDOMNode() );
                                    model.destroy();
                                }
                            }
                        }
                    } );
                ko.applyBindings( model, node.getDOMNode() );

            } );
        }

        Y.namespace( 'doccirrus.modals' ).filterConfiguration = {
            show: show
        };

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'doccirrus',
            'KoViewModel',
            'DCWindow'
        ]
    }
);
