/*exported _fn */

/*global ko, _*/
function _fn( Y, NAME ) {
    'use strict';

    var i18n = Y.doccirrus.i18n,
        KoUI = Y.doccirrus.KoUI,
        KoViewModel = Y.doccirrus.KoViewModel,
        KoComponentManager = KoUI.KoComponentManager,
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        SAVE_DATA = i18n( 'general.button.SAVE' );

    /**
     * LabDeviceCertificatesViewModel for KoEditableTable
     * @param config
     * @constructor
     */
    function LabDeviceCertificatesViewModel( config ) {
        LabDeviceCertificatesViewModel.superclass.constructor.call( this, config );
    }

    LabDeviceCertificatesViewModel.ATTRS = {
        validatable: {
            value: true,
            lazyAdd: false
        }
    };

    Y.extend( LabDeviceCertificatesViewModel, KoViewModel.getBase(), {

            initializer: function LabDeviceCertificatesViewModel_initializer() {
            },
            destructor: function LabDeviceCertificatesViewModel_destructor() {
            }
        },
        {
            schemaName: 'labdevice',
            NAME: 'LabDeviceCertificatesViewModel'
        }
    );

    KoViewModel.registerConstructor( LabDeviceCertificatesViewModel );

    /**
     * LabDeviceCertificatesTestViewModel for KoEditableTable
     * @param config
     * @constructor
     */
    function LabDeviceCertificatesTestViewModel( config ) {
        LabDeviceCertificatesTestViewModel.superclass.constructor.call( this, config );
    }

    LabDeviceCertificatesTestViewModel.ATTRS = {
        validatable: {
            value: true,
            lazyAdd: false
        }
    };

    Y.extend( LabDeviceCertificatesTestViewModel, KoViewModel.getBase(), {

            initializer: function LabDeviceCertificatesTestViewModel_initializer() {
            },
            destructor: function LabDeviceCertificatesTestViewModel_destructor() {
            }
        },
        {
            schemaName: 'labdevicetest',
            NAME: 'LabDeviceCertificatesTestViewModel'
        }
    );

    KoViewModel.registerConstructor( LabDeviceCertificatesTestViewModel );

    /**
     * @constructor
     * @class TabLabDeviceCertificatesViewModel
     */
    function TabLabDeviceCertificatesViewModel( config ) {
        TabLabDeviceCertificatesViewModel.superclass.constructor.call( this, config );
    }

    Y.extend( TabLabDeviceCertificatesViewModel, KoViewModel.getBase(), {

        labDevicesCertificatesData1: null,
        labDevicesCertificatesData2: null,
        editableTable1: null,
        editableTable2: null,
        locationId: null,
        isUnitUse: null,

        /** @protected */
        initializer: function() {
            var
                self = this;

            self.initObservables();
            self.initTemplate();
            self.initTabLabDevicesCertificatesTable();
            self.setData();
            self.addDisposable(ko.computed( function() {
                var result = true,
                isUnitUse = unwrap( self.isUnitUse ),
                location = unwrap( self.locationId ),
                table1Rows = unwrap( self.editableTable1.rows ),
                table2Rows = unwrap( self.editableTable2.rows );
                if ( 0 === table1Rows.length && 0 === table2Rows.length ) {
                    result = false;
                }
                if ( null === location ) {
                    result = false;
                }
                if ( 0 < table1Rows.length && null === isUnitUse ) {
                    result = false;
                }
                table1Rows.forEach( function( row ) {
                    row.locationId(location);
                    row.isUnitUse(isUnitUse);
                    if( false === row._isValid() || row.deviceType.hasError() || row.manufacturer.hasError() ) {
                        result = false;
                    }
                } );
                table2Rows.forEach( function( row ) {
                    row.locationId(location);
                    if( false === row._isValid() || row.isCertified.hasError() || row.testId.hasError() ) {
                        result = false;
                    }
                } );
                self._isValid( result );
            } ));
        },

        destructor: function() {
        },

        initObservables: function TabLabDevicesCertificates_initObservables() {
            var self = this;
            self.labDevicesCertificatesData1 = ko.observableArray( [] );
            self.labDevicesCertificatesData2 = ko.observableArray( [] );
            self.editableTable1 = ko.observable();
            self.editableTable2 = ko.observable();
            self.locationId = ko.observable( null );
            self.isUnitUse = ko.observable( null );
            self.locationReadOnly = ko.observable();
            self.locationSelected = ko.observable( false );
            self._isValid = ko.observable( false );
            self.isSaved = ko.observable( false );
        },
        initTemplate: function TabLabDevicesCertificates_initTemplate() {
            var self = this;

            self.locationI18n = i18n( 'patient-schema.Patient_T.locationId.i18n' );
            self.isUnitUseI18n = i18n( 'labdevice-schema.LabDevice_T.isUnitUse' );
            self.generalButtonDeleteI18n = i18n('general.button.DELETE');
            self.clearI18n = i18n( 'InvoiceMojit.lab_device_certificates.text.CLEAR' );
            self.initSelect2Locations();
            self.initSelect2IsUnitUse();
        },

        initTabLabDevicesCertificatesTable: function TabLabDevicesCertificates_initLabDevicesCertificatesTable() {

            var
                self = this;
            self.editableTable1 = KoComponentManager.createComponent( {
                componentType: 'KoEditableTable',
                componentConfig: {
                    ViewModel: LabDeviceCertificatesViewModel,
                    data: self.labDevicesCertificatesData1,
                    columns: [
                        {
                            forPropertyName: 'deviceType',
                            label: i18n( 'labdevice-schema.LabDevice_T.deviceType' ),
                            title: i18n( 'labdevice-schema.LabDevice_T.deviceType' ),
                            renderer: function( meta ) {
                                var
                                    deviceType = unwrap( meta.value );

                                return deviceType || '';
                            }
                        },
                        {
                            forPropertyName: 'manufacturer',
                            label: i18n( 'labdevice-schema.LabDevice_T.manufacturer' ),
                            title: i18n( 'labdevice-schema.LabDevice_T.manufacturer' ),
                            renderer: function( meta ) {
                                var
                                    manufacturer = unwrap( meta.value );

                                return manufacturer || '';
                            }
                        },
                        {
                            forPropertyName: 'deleteButton',
                            utilityColumn: true,
                            width: '60px',
                            css: {
                                'text-center': 1
                            },
                            inputField: {
                                componentType: 'KoButton',
                                componentConfig: {
                                    name: 'delete',
                                    title: Y.doccirrus.i18n( 'general.button.DELETE' ),
                                    icon: 'TRASH_O',
                                    click: function( button, $event, $context ) {
                                        var model = $context.$parent.row;
                                        if( model._id() ) {
                                            Y.doccirrus.jsonrpc.api.labdevice.delete( {
                                                query: { _id: model._id() }
                                            } ).done( function() {
                                                self.editableTable1.removeRow( model );
                                            } );
                                        } else {
                                            self.editableTable1.removeRow( model );
                                        }
                                    }
                                }
                            }
                        }
                    ],
                    onAddButtonClick: function() {
                        return true;
                    }
                }
            } );

            self.editableTable2 = KoComponentManager.createComponent( {
                componentType: 'KoEditableTable',
                componentConfig: {
                    ViewModel: LabDeviceCertificatesTestViewModel,
                    data: self.labDevicesCertificatesData2,
                    columns: [
                        {
                            forPropertyName: 'isCertified',
                            label: i18n( 'labdevicetest-schema.LabDeviceTest_T.isCertified' ),
                            title: i18n( 'labdevicetest-schema.LabDeviceTest_T.isCertified' ),
                            inputField: {
                                componentType: 'KoFieldSelect2',
                                componentConfig: {
                                    options: Y.doccirrus.schemas.labdevicetest.types.IsCertified_E.list,
                                    optionsText: 'i18n',
                                    optionsValue: 'val',
                                    select2Config: {
                                        multiple: false
                                    }
                                }
                            },
                            renderer: function( meta ) {
                                var
                                    data = unwrap( meta.value );
                                return Y.doccirrus.schemaloader.getEnumListTranslation( 'labdevicetest', 'IsCertified_E', data, 'i18n', '' );
                            }
                        },
                        {
                            forPropertyName: 'testId',
                            label: i18n( 'labdevicetest-schema.LabDeviceTest_T.testId' ),
                            title: i18n( 'labdevicetest-schema.LabDeviceTest_T.testId' ),
                            renderer: function( meta ) {
                                var
                                    testId = unwrap( meta.value );

                                return testId || '';
                            }
                        },
                        {
                            forPropertyName: 'deleteButton',
                            utilityColumn: true,
                            width: '60px',
                            css: {
                                'text-center': 1
                            },
                            inputField: {
                                componentType: 'KoButton',
                                componentConfig: {
                                    name: 'delete',
                                    title: Y.doccirrus.i18n( 'general.button.DELETE' ),
                                    icon: 'TRASH_O',
                                    click: function( button, $event, $context ) {
                                        var model = $context.$parent.row;
                                        if( model._id() ) {
                                            Y.doccirrus.jsonrpc.api.labdevicetest.delete( {
                                                query: { _id: model._id() }
                                            } ).done( function() {
                                                self.editableTable2.removeRow( model );
                                            } );
                                        } else {
                                            self.editableTable2.removeRow( model );
                                        }
                                    }
                                }
                            }
                        }
                    ],
                    onAddButtonClick: function() {
                        return true;
                    }
                }
            } );

        },
        setData: function TabLabDevicesCertificates_setData() {
            var self = this;
            self.locationReadOnly( self.initialConfig.readonly );
            if ( self.initialConfig && self.initialConfig.labData && self.initialConfig.testData ) {
                self.initialConfig.labData.forEach( function( item ) {
                    self.editableTable1.addRow({data: _.assign({}, item)});
                } );
                self.initialConfig.testData.forEach( function( item ) {
                    self.editableTable2.addRow({data: _.assign({}, item)});
                } );
                if ( self.initialConfig.labData.length > 0 ) {
                    self.locationId( self.initialConfig.labData[0].locationId );
                } else {
                    self.locationId( self.initialConfig.testData[0].locationId );
                }
                if ( self.initialConfig.labData.length > 0 ) {
                    self.isUnitUse( self.initialConfig.labData[0].isUnitUse );
                } else {
                    self.isUnitUse( null );
                }
                self.isSaved( self.initialConfig.isSaved );
            }
        },
        /**
         * Initializes select2 for location
         * @method initSelect2Location
         */

        initSelect2Locations: function() {
            var
                self = this;
            self.select2Location = {
                val: self.addDisposable( ko.computed( {
                    read: function() {
                        return unwrap( self.locationId );
                    },
                    write: function( $event ) {
                        self.locationId( $event.val );
                        self.locationSelected( true );
                    }
                } ) ),
                select2: {
                    width: '100%',
                    placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                    data: function() {
                        return {
                            results: self.initialConfig.locations
                                .map( function( location ) {
                                    return {
                                        id: location._id,
                                        text: location.locname,
                                        data: location
                                    };
                                } )
                        };
                    }
                }
            };

        },
        /**
         * Initializes select2 for isUnitUse
         * @method initSelect2IsUnitUse
         */

        initSelect2IsUnitUse: function() {
            var
                self = this;
            self.select2IsUnitUse = {
                val: self.addDisposable( ko.computed( {
                    read: function() {
                        return unwrap( self.isUnitUse );
                    },
                    write: function( $event ) {
                        self.isUnitUse( $event.val );
                    }
                } ) ),
                select2: {
                    width: '100%',
                    placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                    data: function() {

                        return {
                            results: Y.doccirrus.schemas.labdevice.types.IsUnitUse_E.list
                                .map( function( item ) {
                                    return {
                                        id: item.val,
                                        text: item.i18n
                                    };
                                } )
                        };
                    }
                }
            };

        },
        deleteCertificate: function( data, item) {
            data.certificates.remove(function( certificate ) {
                return certificate.clientId === item.clientId;
            });
            data.usingLocations.remove(function( location ) {
                return location === item.locationId();
            });
            item.clearData();

        },
        clearData: function() {
            var
                self = this;

            peek( self.editableTable1.rows ).forEach(function( item ) {
                if( item._id() ) {
                    Y.doccirrus.jsonrpc.api.labdevice.delete( {
                        query: { _id: item._id() }
                    } ).done( function() {
                        self.editableTable1.removeRow( item );
                    } );
                } else {
                    self.editableTable1.removeRow( item );
                }
            });
            peek( self.editableTable2.rows ).forEach(function( item ) {
                if( item._id() ) {
                    Y.doccirrus.jsonrpc.api.labdevicetest.delete( {
                        query: { _id: item._id() }
                    } ).done( function() {
                        self.editableTable2.removeRow( item );
                    } );
                } else {
                    self.editableTable2.removeRow( item );
                }
            });
            self.locationId( null );
            self.isUnitUse( null );
        }

    }, {
        NAME: 'TabLabDeviceCertificatesViewModel',
        ATTRS: {}
    } );

    /**
     * @constructor
     * @class TabLabDeviceCertificatesViewModel
     */
    function MainViewModel() {
        MainViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( MainViewModel, KoViewModel.getBase(), {
        /** @protected */
        initializer: function() {
            var
                self = this;

            self.initMainViewModel();
        },

        destructor: function() {
        },
        initMainViewModel: function() {
            var self = this;
            self.labDeviceCertificatesI18n = i18n( 'InvoiceMojit.invoice_navJS.menu.LABDEVICESCERTIFICATES' );
            self.certificates = ko.observableArray( [] );
            self.locationsList = ko.observable();
            self.usingLocations = ko.observableArray( [] );
            self.labDevicesTestData = ko.observable();
            self.labDevicesData = ko.observable();
            self.initLabDevicesCertificatesData();
            self.initLabDevicesCertificatesTestData();
            self.initLocation();
            self.addDisposable(ko.computed(function() {
                var labData = self.labDevicesData(),
                testData = self.labDevicesTestData(),
                locations = self.locationsList();
                if ( labData && testData && locations ) {
                    locations.forEach(function( location ) {
                        var data = {
                            readonly: true
                        };
                        data.testData = testData.filter(function( item ) {
                            return item.locationId === location._id;
                        });
                        data.labData = labData.filter(function( item ) {
                            return item.locationId === location._id;
                        });
                        if ( data.labData.length > 0 || data.testData.length > 0 ) {
                            data.locations = [location];
                            data.isSaved = true;
                            self.usingLocations.push(location._id);
                            self.addCertificate( data );
                        }
                    });
                }
            }));
            self.addDisposable(ko.computed( function() {
                var selected = unwrap( self.certificates ).filter(function( certificate ) {
                    return true === unwrap( certificate.locationSelected );
                });
                if (1 === selected.length) {
                    self.checkLocations( selected[0] );
                }
            }));
            self.initButtons();
        },
        initLabDevicesCertificatesData: function MainViewModel_loadLabCertificatesData() {
            var self = this;
            Y.doccirrus.jsonrpc.api.labdevice.read().done( function( result ) {
                self.labDevicesData(result.data);
            } ).fail( function( err ) {
                Y.log( 'Could not load Lab Certificates data: ' + err, 'error', NAME );
            } );
        },
        initLabDevicesCertificatesTestData: function MainViewModel_loadLabCertificatesTestData() {
            var self = this;
            Y.doccirrus.jsonrpc.api.labdevicetest.read().done( function( result ) {
                self.labDevicesTestData(result.data);
            } ).fail( function( err ) {
                Y.log( 'Could not load Lab Certificates data: ' + err, 'error', NAME );
            } );
        },
        initButtons: function TabLabDeviceCertificatesViewModel_initButtons() {
            var
                self = this;

            self.saveLabCertificates = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'saveLabDevicesCertificates',
                    option: 'PRIMARY',
                    disabled: self.addDisposable(ko.computed( function() {
                        var notModified,
                        disabled = [];
                        unwrap( self.certificates ).forEach(function( certificate ) {
                            var isModified1 = unwrap( certificate.editableTable1.rows ).some( function( item ) {
                                    return item.isModified();
                                } ),
                                isModified2 = unwrap( certificate.editableTable2.rows ).some( function( item ) {
                                    return item.isModified();
                                } ),
                                isValid = unwrap( certificate._isValid ),
                                isSaved = unwrap( certificate.isSaved ),
                                modified;
                            if( !( isModified1 || isModified2 ) && isSaved ) {
                                modified = isSaved;
                            } else {
                                modified = ( isModified1 || isModified2 );
                            }
                            disabled.push( !( isValid && modified ) );
                        });
                        notModified = unwrap( self.certificates ).every(function( certificate ) {
                            var isModified1 = unwrap( certificate.editableTable1.rows ).some( function( item ) {
                                    return item.isModified();
                                } ),
                                isModified2 = unwrap( certificate.editableTable2.rows ).some( function( item ) {
                                    return item.isModified();
                                } );
                            return ( unwrap( certificate.isSaved ) && !( isModified1 || isModified2 ) );
                        });
                        if( notModified ) {
                            return notModified;
                        }
                        return disabled.some(function( item ) {
                            return true === item;
                        });
                    })),
                    text: SAVE_DATA,
                    click: function() {
                        self.usingLocations([]);
                        peek( self.certificates ).forEach(function( item ) {
                            peek( item.editableTable1.rows ).filter( function( row ) {
                                return row.isModified();
                            } ).map( function( row ) {
                                var data;
                                row.isUnitUse( unwrap( item.isUnitUse ) );
                                row.locationId( unwrap( item.locationId ) );
                                if (row._id()) {
                                    data = row.toJSON();
                                    Y.doccirrus.jsonrpc.api.labdevice.update( {
                                        query: {_id: data._id},
                                        data: data,
                                        fields: ['locationId', 'isUnitUse', 'deviceType', 'manufacturer']
                                    } ).done(function(  ) {
                                        row.setNotModified();
                                    }).fail( function( err ) {
                                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                                    });
                                } else {
                                    data = row.toJSON();
                                    Y.doccirrus.jsonrpc.api.labdevice.create( {
                                        data: data
                                    } ).done(function(  ) {
                                        row.setNotModified();
                                    }).fail( function( err ) {
                                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                                    });
                                }
                            } );
                            peek( item.editableTable2.rows ).filter( function( row ) {
                                return row.isModified();
                            } ).map( function( row ) {
                                var data;
                                row.locationId( unwrap( item.locationId ) );
                                if (row._id()) {
                                    data = row.toJSON();
                                    Y.doccirrus.jsonrpc.api.labdevicetest.update( {
                                        query: {_id: data._id},
                                        data: data,
                                        fields: ['locationId', 'isCertified', 'testId']
                                    } ).done(function(  ) {
                                        row.setNotModified();
                                    }).fail( function( err ) {
                                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                                    });
                                } else {
                                    data = row.toJSON();
                                    Y.doccirrus.jsonrpc.api.labdevicetest.create( {
                                        data: data
                                    } ).done(function(  ) {
                                        row.setNotModified();
                                    }).fail( function( err ) {
                                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                                    });
                                }
                            } );
                        });
                        self.certificates( [] );
                        self.labDevicesTestData( null );
                        self.labDevicesData( null );
                        self.initLabDevicesCertificatesData();
                        self.initLabDevicesCertificatesTestData();
                    }
                }
            } );
        },
        initLocation: function( ) {
            var
                self = this;
            Y.doccirrus.jsonrpc.api.location
                .read()
                .then( function( response ) {
                    return response && response.data || [];
                } )
                .done( function( locations ) {
                    self.locationsList( locations );
                } );
        },
        addNewCertificate: function() {
            var
                self = this,
                params;

            if ( self.certificates().length < self.locationsList().length ) {
                params = {
                    locations: peek( self.locationsList ).filter(function( location ) {
                        return -1 === peek ( self.usingLocations ).indexOf(location._id);
                    }),
                    readonly: false,
                    isSaved: false
                };
                self.addCertificate( params );
            }
        },
        addCertificate: function( args ) {
            var
                self = this,
                model = new TabLabDeviceCertificatesViewModel( args );
            self.certificates.push( model );
        },
        checkLocations: function( selected ) {
            var self = this;
            unwrap( self.certificates ).forEach(function( certificate ) {
                if( !unwrap( certificate.locationReadOnly ) && !unwrap( certificate.locationSelected ) ) {
                    if( unwrap( certificate.locationId ) === unwrap( selected.locationId ) ) {
                        certificate.locationId( null );
                    }
                }
            });
            selected.locationSelected( false );
        }
    }, {
        NAME: 'MainViewModel',
        ATTRS: {}
    } );

    return {
        registerNode: function( node ) {
            Y.use(['KoViewModel', 'KoEditableTable', 'labdevicetest-schema', 'labdevice-schema'], function(){
                ko.applyBindings( new MainViewModel(), node.getDOMNode() );
            });
        }
    };
}