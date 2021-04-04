/*global YUI, ko, Promise */

'use strict';

YUI.add( 'selectlocations-modal', function( Y, NAME ) {
    var
        i18n = Y.doccirrus.i18n,
        WINDOW_SIZE = Y.doccirrus.DCWindow.SIZE_LARGE + 200,
        WINDOW_HEIGHT = 700,

        KoViewModel = Y.doccirrus.KoViewModel,
        Disposable = KoViewModel.getDisposable();

    function SelectLocationsModel( config ) {
        SelectLocationsModel.superclass.constructor.call( this, config );
    }

    Y.extend( SelectLocationsModel, Disposable, {
        initializer: function( options ) {
            var self = this;
            self._initLocations( options.locationDescriptors );
        },

        destructor: function() {
            var self = this;
            self.locations.dispose();
            self.locations = null;
        },

        _initLocations: function( locationDescriptors ) {
            var self = this, i;

            for ( i = 0; i < locationDescriptors.length; i++ ) {
                //  used for indexing linked table rows
                locationDescriptors[i]._id = locationDescriptors[i].locationId;
                //  disable rows where a new pvslog cannot be created with current settings
                locationDescriptors[i].disabled = ( locationDescriptors[i].pvsLogId !== '' || locationDescriptors[i].noActivities );
                //  pre-select all candidate locations where creation of pvslog is possible
                locationDescriptors[i].checked = !locationDescriptors[i].disabled;
            }
            self.locations = ko.observableArray( locationDescriptors );

            self.locationsTable = Y.doccirrus.KoUI.KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    scrollToTopOfTableWhenPaging: false,
                    data: self.locations,
                    stateId: 'dc-pvslog-location-table',
                    states: ['limit'],
                    striped: false,
                    baseParams: {
                        sort: {
                            locationName: 1
                        }
                    },
                    limit: 5,
                    limitList: [5, 10, 20, 30, 40, 50],
                    columns: [
                        {
                            componentType: 'KoTableColumnLinked',
                            forPropertyName: 'linked',
                            label: '(y)',
                            visible: true,
                            isCheckBoxDisabledHook: function( data ) {
                                return ( data.pvsLogId !== '' );
                            },
                            toggleLinkOfRowHook: function( link, data ) {
                                var
                                    columnLinked = this,
                                    isRowLinked = columnLinked.isLinked( link );

                                if ( data.disabled ) { return false; }

                                if( isRowLinked ) {
                                    columnLinked.removeLink( link );
                                    data.checked = false;
                                } else {
                                    columnLinked.addLink( link );
                                    data.checked = true;
                                }
                                
                                return true;
                            },
                            toggleSelectAllHook: function( rows ) {
                                var
                                    columnLinked = this,
                                    addedIds = [],
                                    i;

                                //  link as a single batch to prevent multiple remap / rerender of forms
                                for( i = 0; i < rows.length; i++ ) {
                                    if ( false === rows[i].disabled ) {
                                        addedIds.push( rows[i]._id );
                                        rows[i].checked = true;
                                    }
                                }

                                columnLinked.addLinks( addedIds );
                                return true;
                            },
                            toggleDeselectAllHook: function( rows ) {
                                var
                                    removedIds = [],
                                    columnLinked = this, i;

                                for ( i = 0; i < rows.length; i++ ) {
                                    rows[i].checked = false;
                                    removedIds.push( rows[i]._id );
                                }

                                columnLinked.removeLinks( removedIds );
                                return true;
                            }
                        },
                        {
                            forPropertyName: 'locationName',
                            label: i18n( 'SelectLocationsDialog.table.locationName' ),
                            title: i18n( 'SelectLocationsDialog.table.locationName' ),
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                return meta.value;
                            }
                        },
                        {
                            forPropertyName: 'employees',
                            label: i18n( 'SelectLocationsDialog.table.employeeNames' ),
                            title: i18n( 'SelectLocationsDialog.table.employeeNames' ),
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                return Array.isArray( meta.value ) && meta.value.length ? meta.value.map( function( phy ) {
                                    return phy.firstname + ' ' + phy.lastname;
                                } ).join( ', ' ) : '-';
                            }
                        }
                        /* TODO: add button to show current pvslog blocking creation
                        {
                            forPropertyName: '_id',
                            label: '',
                            title: '',
                            width: '50px',
                            visible: true,
                            renderer: function() {
                                return '<button class="btn btn-primary btn-sm"><i class="fa fa-copy"></i></button>';
                            }
                        }
                        */
                    ]//,
                    //onRowClick: onTableRowClick
                }
            } );

            //  Set initial selections
            ko.ignoreDependencies( function() {
                var
                    componentColumnLinked = self.locationsTable.getComponentColumnLinked(),
                    linkIds = [],
                    i;

                for ( i = 0; i < locationDescriptors.length; i++ ) {
                    if ( locationDescriptors[i].checked ) {
                        linkIds.push( locationDescriptors[i].locationId );
                    }
                }

                componentColumnLinked.removeLinks();
                componentColumnLinked.addLinks( linkIds );
            } );

            //  Handle click of rows / more info button / not used at present
            /**
            function onTableRowClick( evt ) {
                alert( 'onTableRowClick: ' + JSON.stringify( evt ) );
            }
            */

        },

        locations: null,
        locationsTable: null,
        /**
         * Serializes this Model to a javascript object.
         * @method toJSON
         * @returns {Object}
         */

        toJSON: function() {
            var
                self = this,
                locations = self.locations(),
                jsonObj = [],
                i;

            for ( i = 0; i < locations.length; i++ ) {
                if ( locations[i].checked ) {
                    jsonObj.push( locations[i] );
                }
            }

            return jsonObj;
        }


    } );

    /**
     *  Provides a dialog to select locations to generate PVS logs for
     *
     *
     *  @method show
     *  @param  options                     {Object}
     *  @param  options.locationDescriptors {Object}    See pvslog-api::getCandidateLocations
     *  @param  options.onLocationsSelected {Function}  Called when user confirms location selection
     *  @param  options.onCancelDialog      {Function}  Called when dialog is cancelled without confirming selection
     *
     *  @returns {Y.EventTarget}
     *  @for doccirrus.modals.filterInvoiceItems
     */

    function showSelectLocationsModal( options ) {

        if ( !options || !options.locationDescriptors ) {
            Y.log( 'Cannot create modal, needs set of locations to present to user.', 'warn', NAME );
            return;
        }

        Promise
            .props( {
                modules: Y.doccirrus.utils.requireYuiModule( [
                    'node',
                    'JsonRpcReflection-doccirrus',
                    'JsonRpc',
                    'DCWindow'
                ] ),
                template: Y.doccirrus.jsonrpc.api.jade
                    .renderFile( {path: 'InvoiceMojit/views/SelectLocationsDialog'} )
                    .then( function( response ) {
                        return response.data;
                    } )
            } )
            .then( function( props ) {
                var
                    template = props.template,
                    bindings = new SelectLocationsModel( options ),
                    bodyContent = Y.Node.create( template ),
                    dialog = new Y.doccirrus.DCWindow( {
                        id: 'DCWindow-SelectLocationsDialog',
                        className: 'DCWindow-SelectLocationsDialog',
                        bodyContent: bodyContent,
                        title: i18n( 'SelectLocationsDialog.title' ),
                        icon: Y.doccirrus.DCWindow.ICON_INFO,

                        width: WINDOW_SIZE,
                        minHeight: WINDOW_HEIGHT,
                        minWidth: Y.doccirrus.DCWindow.SIZE_XLARGE,

                        maximizable: true,
                        centered: true,
                        modal: true,

                        render: document.body,
                        buttons: {
                            header: ['close'],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                {
                                    label: i18n( 'SelectLocationsDialog.buttons.CHOOSELOCATIONS.label' ),
                                    name: 'CHOOSELOCATIONS',
                                    value: 'CHOOSELOCATIONS',
                                    isDefault: true,
                                    action: onChooseLocations
                                }
                            ]
                        },
                        after: {
                            visibleChange: onVisibilityChange
                        }
                    } );

                //  necessary to re-center after table node is added (similar to processNextTick)
                window.setTimeout( function() { dialog.centered(); }, 1 );

                /**
                 *  Raised when the CHOOSELOCATIONS button is clicked
                 *  @param e
                 */

                function onChooseLocations( e ) {
                    var selectedLocations;

                    if ( options.onLocationsSelected ) {
                        selectedLocations = bindings.toJSON();

                        if ( 0 === selectedLocations.length ) {
                            Y.log( 'No locations chosen, can not continue.', 'debug', NAME );
                            return;
                        }

                        options.onLocationsSelected( selectedLocations );
                    }

                    dialog.close( e );
                }

                function onVisibilityChange( yEvent ) {
                    // also captures cancel for e.g.: ESC
                    if( !yEvent.newVal ) {
                        setTimeout( function() { // delay for letting others fire first
                            if ( options.onCancelDialog ) {
                                options.onCancelDialog();
                            }

                            bindings.dispose();
                            ko.cleanNode( bodyContent.getDOMNode() );

                        }, 10 );
                    }
                }

                ko.applyBindings( bindings, bodyContent.getDOMNode() );
            } );
    }

    Y.namespace( 'doccirrus.modals' ).selectLocations = {
        show: showSelectLocationsModal
    };

}, '0.0.1', {
    requires: [
        'oop',
        'event-custom',
        'doccirrus',
        'dcutils',
        'KoViewModel'
    ]
} );
