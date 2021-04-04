/**
 * User: pi
 * Date: 13/08/15  11:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'TransformerModel', function( Y, NAME ) {
        /**
         * @module TransformerModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            DUMMY = "Dummy/Lokal";

        /**
         * __ABSTRACT__
         *
         * NOTE: when extending this class and you want to adjust things wrapped inside the initializer, they have to be pulled out of the initializer here and be placed in overwritable or reusable prototype functions or ATTRs on this class
         *
         * @class TransformerModel
         * @constructor
         * @extends KoViewModel
         */
        function TransformerModel( config ) {
            TransformerModel.superclass.constructor.call( this, config );
        }

        TransformerModel.ATTRS = {
            /**
             * @attribute availableTransformerTypeList
             * @type {Array}
             * @default Y.doccirrus.schemas.flow.types.TransformerType_E.list
             */
            availableTransformerTypeList: {
                value: Y.doccirrus.schemas.flow.types.TransformerType_E.list,
                lazyAdd: false
            },
            transformerTypes: {
                value: Y.doccirrus.schemas.flow.transformerTypes,
                lazyAdd: false
            },
            validatable: {
                value: true,
                lazyAdd: false
            }
        };
        Y.extend( TransformerModel, KoViewModel.getBase(), {
            initializer: function TransformerModel_initializer( config ) {
                var self = this;

                self.initTransformer( config && config.data );
            },
            destructor: function TransformerModel_destructor() {
            },
            /**
             * initializes transformer model
             */
            initTransformer: function TransformerModel_initTransformer( data ) {
                var
                    self = this;

                self.availableTransformerTypeList = self.get( 'availableTransformerTypeList' );
                self.transformerTypes = self.get( 'transformerTypes' );

                self.getName = ko.computed( self.getNameComputed, self );

                switch( self.transformerType() ) {
                    case self.transformerTypes.GDTSTUDY:
                        self.initSele2Procedure();
                        self.initSele2GdtExportVersion();
                        self.initSele2GdtExportEncoding();
                        break;
                    case self.transformerTypes.GDTPATIENT:
                    case self.transformerTypes.GDTVIEW:
                        self.initSele2GdtExportVersion();
                        self.initSele2GdtExportEncoding();
                        break;
                    case self.transformerTypes.OPHTHALMOLOGY_TMP_IMPORT:
                        self.initObservablesForTmpImportTransformerConfigs();
                        break;
                    case self.transformerTypes.GDT_JSON:
                        self.initSele2GdtVersion( data.gdtVersions );

                        self.onDeleteRowClick = function( index ) {
                            self.gdtMappingsForUnknownFields.splice( index, 1 );
                        };

                        self.onAddRowClick = function() {
                            self.gdtMappingsForUnknownFields.push( {} );
                        };
                        break;
                    case self.transformerTypes.LDT_TRANSACTION:
                    case self.transformerTypes.LDT_TRANSACTION_EXTENDED:
                    case self.transformerTypes.LDT_UPLOAD:
                        self.initSele2LdtVersion( data.ldtVersions, self.transformerType() );
                        break;
                    case self.transformerTypes.OSIRIX:
                        self.initSele2dicomModalities( data.modalities );
                        break;
                    case self.transformerTypes.HL7_LDT_JSON:
                        self.onAddRowClick = function() {
                            if( self.internalExternalLabTreatments ) {
                                self.internalExternalLabTreatments.push( {} );
                            }
                        };
                        self.onDeleteRowClick = function( index ) {
                            if( self.internalExternalLabTreatments ) {
                                self.internalExternalLabTreatments.splice( index, 1 );
                            }
                        };
                        break;
                }
            },
            /**
             * Initializes select2 for procedure
             * @method initSele2Procedure
             */
            initSele2Procedure: function TransformerModel_initSele2Procedure() {
                var
                    self = this,
                    procedures = [],
                    initProcedur = ko.utils.peekObservable( self.procedure );
                if( initProcedur ) {
                    procedures = [{id: initProcedur, text: initProcedur}];
                }
                Y.doccirrus.jsonrpc.api.device.getProcedureList()
                    .done( function( response ) {
                        var data = response.data;
                        procedures.length = 0;
                        if( data ) {
                            Object.keys( data ).forEach( function( procedure ) {
                                procedures.push( {
                                    id: procedure,
                                    text: procedure + " - " + data[procedure].desc
                                } );
                            } );
                        }
                        if( procedures.length && !ko.utils.peekObservable( self.procedure ) ) {
                            self.procedure( procedures[0].id );
                        }

                    } );
                self.select2Procedure = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            var procedure = ko.unwrap( self.procedure );
                            return procedure;
                        },
                        write: function( $event ) {
                            self.procedure( $event.val );
                        }
                    } ) ),
                    select2: {
                        width: '100%',
                        data: procedures
                    }
                };

            },
            /**
             * Initializes select2 for GDT export version
             * @method initSele2GdtExportVersion
             */
            initSele2GdtExportVersion: function TransformerModel_initSele2GdtExportVersion() {
                var
                    self = this,
                    gdtVersions = [
                        {
                            id: "gdt21",
                            text: "gdt21"
                        }, {
                            id: "gdt30",
                            text: "gdt30"
                        }
                    ];

                if( !ko.unwrap( self.gdtVersion ) ) {
                    self.gdtVersion( gdtVersions[0].text );
                }

                self.select2GdtExportVersion = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            var gdtVersion = ko.unwrap( self.gdtVersion );
                            return gdtVersion;
                        },
                        write: function( $event ) {
                            self.gdtVersion( $event.val );
                        }
                    } ) ),
                    select2: {
                        width: '100%',
                        data: gdtVersions
                    }
                };
            },
            /**
             * Initializes select2 for GDT export encoding
             * @method initSele2GdtExportEncoding
             */
            initSele2GdtExportEncoding: function TransformerModel_initSele2GdtExportEncoding() {
                var
                    self = this,
                    gdtEncodings = [
                        {
                            id: "ISO 8859-1",
                            text: "ISO 8859-1"
                        }, {
                            id: "ASCII (german)",
                            text: "ASCII (german)"
                        }, {
                            id: "Code page 437",
                            text: "Code page 437"
                        }, {
                            id: "ISO 8859-15",
                            text: "ISO 8859-15"
                        }
                    ];

                if( self.gdtEncoding() === undefined ) {
                    self.gdtEncoding( gdtEncodings[0].text );
                }

                self.select2GdtExportEncoding = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            var gdtEncoding = ko.unwrap( self.gdtEncoding );
                            return gdtEncoding;
                        },
                        write: function( $event ) {
                            self.gdtEncoding( $event.val );
                        }
                    } ) ),
                    select2: {
                        width: '100%',
                        data: gdtEncodings
                    }
                };
            },
            /**
             * Initializes observables for TMP-Import transformer configs
             * @method initObservablesForTmpImportTransformerConfigs
             */
            initObservablesForTmpImportTransformerConfigs: function TransformerModel_initObservablesForTmpImportTransformerConfigs() {
                var self = this;

                self.onDeleteRowClick = function( index ) {
                    self.mappingTmpFileRows.splice( index, 1 );
                };

                self.onAddRowClick = function() {
                    self.mappingTmpFileRows.push( {label: '', rowNumber: 0} );
                };
            },
            /**
             * Initializes select2 for LDT export version
             * @method initSele2GdtExportVersion
             */
            initSele2LdtVersion: function TransformerModel_initSele2LdtExportVersion( _ldtVersions, action ) {
                var
                    self = this,
                    initLdtVersion = ko.utils.peekObservable( self.ldtVersion );

                self.ldtVersions = _ldtVersions || (initLdtVersion ? [initLdtVersion] : []);
                self.ldtBillingFlag = ko.observable( false );
                self.ldtDisallowGkvBilling = ko.observable( false );
                self.ldtAllowGkvBilling = ko.observable( false );
                self.checkFilesWithLdkPm = ko.observable( false );

                self.refBSNRMappingFields = [
                    'Kein',
                    '0201'
                ];

                self.refLANRMappingFields = [
                    'Kein',
                    '0212'
                ];

                if( !_ldtVersions ) {
                    Y.doccirrus.jsonrpc.api.device.getLDTVersions()
                        .done( function( response ) {
                            var data = response.data;
                            var currentLdtVersion = ko.utils.peekObservable( self.ldtVersion );
                            self.ldtVersions.length = 0;
                            self.ldtVersions = self.ldtVersions.concat( data );
                            if( self.ldtVersions.length && !currentLdtVersion ) {
                                self.ldtVersion( self.ldtVersions[0] );
                            }
                            //migration??
                            // if( currentLdtVersion && currentLdtVersion.includes( '.' ) ) {
                            //     var split = currentLdtVersion.split( '.' );
                            //     self.ldtVersion( self.ldtVersions.find( el => el === split[1] ) );
                            // }
                        } );
                }

                self.select2refBSNR = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            return ko.unwrap( self.selectedRefBSNR );
                        },
                        write: function( $event ) {
                            self.selectedRefBSNR( $event.val );
                        }
                    } ) ),
                    select2: {
                        width: '100px',
                        data: function() {
                            return {
                                results: self.refBSNRMappingFields.map( function( version ) {
                                    return {
                                        id: version,
                                        text: version
                                    };
                                } )
                            };
                        }
                    }
                };

                self.select2refLANR = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            return ko.unwrap( self.selectedRefLANR );
                        },
                        write: function( $event ) {
                            self.selectedRefLANR( $event.val );
                        }
                    } ) ),
                    select2: {
                        width: '100px',
                        data: function() {
                            return {
                                results: self.refLANRMappingFields.map( function( version ) {
                                    return {
                                        id: version,
                                        text: version
                                    };
                                } )
                            };
                        }
                    }
                };

                self.select2LdtVersion = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            var ldtVersion = ko.unwrap( self.ldtVersion );
                            return ldtVersion;
                        },
                        write: function( $event ) {
                            self.ldtVersion( $event.val );
                        }
                    } ) ),
                    select2: {
                        width: '100%',
                        data: function() {
                            if( action === 'LDT_TRANSACTION' ) {
                                self.ldtVersions = self.ldtVersions.filter( function( version ) {
                                    return version !== 'ldt.ldt30';
                                } );
                            }
                            return {
                                results: self.ldtVersions.map( function( version ) {
                                    return {
                                        id: version,
                                        text: version
                                    };
                                } )
                            };
                        }
                    }
                };

                self.checkFileWithLdkPmVisible = ko.computed( function() {
                    var ldtVersion = self.ldtVersion();
                    if( 'ldt.ldt30' === ldtVersion ) {
                        if( !ko.utils.peekObservable( self._id ) ) {
                            self.checkFileWithLdkPm( ko.utils.peekObservable( self.checkFilesWithLdkPm ) );
                        }
                        return true;
                    }
                    self.checkFileWithLdkPm( false );
                    return false;
                } );

                if( !ko.utils.peekObservable( self._id ) ) {
                    Y.doccirrus.jsonrpc.api.settings.read()
                        .then( function( response ) {
                            var settings = response.data && response.data[0] || {};
                            self.billingFlag( true === settings.ldtBillingFlag );
                            self.disallowGkvBilling( true === settings.ldtDisallowGkvBilling );
                            self.allowGkvBilling( true === settings.ldtAllowGkvBilling );
                            self.checkFilesWithLdkPm( true === settings.checkFilesWithLdkPm );
                        } )
                        .fail( function( err ) {
                            Y.log( 'could not set default value of checkFileWithLdkPm ' + err, 'error', NAME );
                        } );
                }
            }, /**
             * Initializes select2 modalities for inPacs-related components
             * @method initSele2GdtExportVersion
             */
            initSele2dicomModalities: function TransformerModel_initSele2dicomModalities( _modalities ) {
                var
                    self = this,
                    selectedModality = ko.utils.peekObservable( self.modality );
                self.modalities = _modalities || (selectedModality ? [selectedModality] : []);
                if( !_modalities ) {
                    Y.doccirrus.jsonrpc.api.inpacsmodality.read( {} )
                        .done( function( response ) {
                            var data = response.data.map( function( modality ) {
                                return modality.name;
                            } );
                            data.unshift( DUMMY );
                            self.modalities.length = 0;
                            self.modalities = self.modalities.concat( data );
                            if( self.modalities.length && !ko.utils.peekObservable( self.modality ) ) {
                                self.modality( self.modalities[0] );
                            }
                        } );
                }

                self.select2modalities = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            return ko.unwrap( self.modality );
                        },
                        write: function( $event ) {
                            self.modality( $event.val );
                        }
                    } ) ),
                    select2: {
                        width: '100%',
                        data: function() {
                            return {
                                results: self.modalities.map( function( version ) {
                                    return {
                                        id: version,
                                        text: version
                                    };
                                } )
                            };
                        }
                    }
                };
            },
            /**
             * Initializes select2 for gdt version
             * @method initSele2gdtVersion
             */
            initSele2GdtVersion: function TransformerModel_initSele2GdtVersion( _gdtVersions ) {
                var
                    self = this,
                    initGdtVersion = ko.utils.peekObservable( self.gdtVersion ),
                    hasInitGdtVersion = initGdtVersion && initGdtVersion.length && initGdtVersion.split;
                self.gdtVersions = _gdtVersions || (initGdtVersion ? [initGdtVersion] : []);
                if( !_gdtVersions ) {
                    Y.doccirrus.jsonrpc.api.device.getGDTVersions()
                        .done( function( response ) {
                            var data = response.data;
                            self.gdtVersions.length = 0;
                            self.gdtVersions = self.gdtVersions.concat( data );
                            if( self.gdtVersions.length && !ko.utils.peekObservable( self.gdtVersion ) ) {
                                self.gdtVersion( self.gdtVersions[0] );
                            }

                        } );
                }

                self.gdtFields = ko.observableArray();
                if( hasInitGdtVersion ) {
                    Y.doccirrus.jsonrpc.api.device.getFieldsForXDT( {
                        query: {
                            xdt: 'gdt',
                            version: initGdtVersion.split( '.' )[1]
                        }
                    } )
                        .done( function( response ) {
                            self.gdtFields( response.data );
                        } )
                        .fail( function( err ) {
                            Y.log( 'could not get fields for gdt version ' + initGdtVersion.split( '.' )[1] + '. Error: ' + err, 'error', NAME );
                        } );
                }

                self.select2GdtVersion = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            var gdtVersion = ko.unwrap( self.gdtVersion );
                            return gdtVersion;
                        },
                        write: function( $event ) {
                            var newGdtVersion = $event.val;

                            self.gdtVersion( newGdtVersion );

                            Y.doccirrus.jsonrpc.api.device.getFieldsForXDT( {
                                query: {
                                    xdt: 'gdt',
                                    version: newGdtVersion.split( '.' )[1]
                                }
                            } )
                                .done( function( response ) {
                                    self.gdtFields( response.data );
                                } );
                        }
                    } ) ),
                    select2: {
                        width: '100%',
                        data: function() {
                            return {
                                results: self.gdtVersions.map( function( version ) {
                                    return {
                                        id: version,
                                        text: version
                                    };
                                } )
                            };
                        }
                    }
                };

            },
            /**
             * @method getNameComputed
             * @returns {string}
             */
            getNameComputed: function TransformerModel_getNameComputed() {
                var
                    self = this,
                    transformerType = self.transformerType(),
                    result = '';
                self.availableTransformerTypeList.some( function( TransformerTypeDesc ) {
                    if( TransformerTypeDesc.val === transformerType ) {
                        result += TransformerTypeDesc.i18n;
                        return true;
                    } else {
                        return false;
                    }
                } );

                return result;
            }
        }, {
            schemaName: 'transformer',
            NAME: 'TransformerModel'
        } );
        KoViewModel.registerConstructor( TransformerModel );

        function GDTMappingRowModel( config ) {
            GDTMappingRowModel.superclass.constructor.call( this, config );
        }

        GDTMappingRowModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( GDTMappingRowModel, KoViewModel.getBase(), {
            initializer: function( config ) {
                var self = this;

                self.config = config;

                self.select2GdtMappingAction = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            return self.gdtMappingAction();
                        },
                        write: function( $event ) {
                            var val = $event.val;
                            self.gdtMappingAction( val );
                        }
                    } ) ),
                    select2: {
                        width: '100%',
                        data: Y.doccirrus.schemas.flow.types.GdtMappingAction_E.list.map( function( data ) {
                            return {id: data.val, text: data.i18n};
                        } )
                    }
                };
            },
            destructor: function() {
            }
        }, {
            schemaName: 'flow.transformers.GDTMappingRow',
            NAME: 'GDTMappingRowModel'
        } );
        KoViewModel.registerConstructor( GDTMappingRowModel );

        function InternalExternalLabTreatmentsConfigModel( config ) {
            InternalExternalLabTreatmentsConfigModel.superclass.constructor.call( this, config );
        }

        InternalExternalLabTreatmentsConfigModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( InternalExternalLabTreatmentsConfigModel, KoViewModel.getBase(), {
            initializer: function( config ) {
                var self = this;

                self.config = config;

                self.select2InternalExternalLabTreatments = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            return ko.unwrap( self.type );
                        },
                        write: function( $event ) {
                            var val = $event.val;
                            self.type( val );
                        }
                    } ) ),
                    select2: {
                        width: '100%',
                        data: Y.doccirrus.schemas.flow.types.InternalExternalLabTreatmentsMapping_E.list.map( function( data ) {
                            return {id: data.val, text: data.i18n};
                        } )
                    }
                };
            },
            destructor: function() {
            }
        }, {
            schemaName: 'flow.transformers.InternalExternalLabTreatmentsConfig',
            NAME: 'InternalExternalLabTreatmentsConfigModel'
        } );
        KoViewModel.registerConstructor( InternalExternalLabTreatmentsConfigModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'flow-schema'
        ]
    }
);
