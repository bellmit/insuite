/*jslint anon:true, sloppy:true, nomen:true*/
/*global fun:true, $, ko, moment, YUI, YUI_config */
/*exported fun*/
/*TRANSLATION INCOMPLETE!! MOJ-3201*/
fun = function _fn( Y, NAME ) {
    'use strict';

    var supportCountryExtensions = Y.doccirrus.commonutils.supportCountryExtensions;

    var CatalogModel = supportCountryExtensions( function CatalogModel( params ) {
        var self = this,
            peek = ko.utils.peekObservable,
            unwrap = ko.unwrap,
            KoViewModel = Y.doccirrus.KoViewModel,
            OmimChainItemModel = KoViewModel.getConstructor( 'OmimChainItemModel' ),
            InsuranceGroupPriceModel = KoViewModel.getConstructor( 'InsuranceGroupPriceModel' ),
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager,
            i18n = Y.doccirrus.i18n,
            CODE = i18n( 'IncaseAdminMojit.incase_tab_catalogsJS.label.CODE' ),
            EDIT_CATALOG = i18n( 'IncaseAdminMojit.incase_tab_catalogs.title.EDIT_CATALOG' ),
            CATALOG_VERSIONS = i18n( 'IncaseAdminMojit.incase_tab_catalogs.title.CATALOG_VERSIONS' ),
            OMIM_G_CHAINS = i18n( 'IncaseAdminMojit.incase_tab_catalogs.title.OMIM_G_CHAINS' ),
            CATALOG_SHORT = i18n( 'IncaseAdminMojit.incase_tab_catalogsJS.label.CATALOG_SHORT' ),
            TAGS = i18n( 'IncaseAdminMojit.incase_tab_catalogsJS.label.TAGS' ),
            COUNT = i18n( 'IncaseAdminMojit.incase_tab_catalogsJS.label.COUNT' ),
            LOCATION = i18n( 'IncaseAdminMojit.incase_tab_catalogsJS.label.LOCATION' ),
            VERSION = i18n( 'IncaseAdminMojit.incase_tab_catalogsJS.label.VERSION' ),
            EXTENSIBLE = i18n( 'IncaseAdminMojit.incase_tab_catalogsJS.label.EXTENSIBLE' ),
            DELETE = i18n( 'general.button.DELETE' ),
            DELETE_ERROR = i18n( 'IncaseAdminMojit.incase_tab_catalogsJS.message.DELETE_ERROR' ),
            BTN_ADD = i18n( 'IncaseAdminMojit.incase_tab_catalogsJS.button.ADD' ),
            CHANGE_TAG = i18n( 'IncaseAdminMojit.incase_tab_catalogsJS.button.CHANGE_TAG' ),
            COPY = i18n( 'IncaseAdminMojit.incase_tab_catalogsJS.button.COPY' ),
            OMIMCHAIN_CHAINNAME = i18n( 'omimchain-schema.OmimChain_T.chainName' ),
            OMIMCHAIN_DESCRIPTION = i18n( 'omimchain-schema.OmimChain_T.description' ),
            OMIMCHAIN_CHAIN = i18n( 'omimchain-schema.OmimChain_T.chain' ),
            KBVUTILITYPRICE_UTILITYNAME = i18n( 'kbvutilityprice-schema.KbvUtilityPrice_T.utilityName' ),
            KBVUTILITYPRICE_UTILITYPOSITIONNO = i18n( 'kbvutilityprice-schema.KbvUtilityPrice_T.utilityPositionNo' ),
            KBVUTILITYPRICE_KV = i18n( 'kbvutilityprice-schema.KbvUtilityPrice_T.kv' ),
            KBVUTILITYPRICE_ACTIVE = i18n( 'kbvutilityprice-schema.KbvUtilityPrice_T.active' ),
            KBVUTILITYPRICE_INSURANCETYPE = i18n( 'kbvutilityprice-schema.KbvUtilityPrice_T.insuranceType' ),
            KBVUTILITYPRICE_CAREPROVIDER = i18n( 'kbvutilityprice-schema.KbvUtilityPrice_T.careProvider' ),
            KBVUTILITYPRICE_PRICES = i18n( 'kbvutilityprice-schema.KbvUtilityPrice_T.prices' ),
            KBVUTILITYPRICE_CONFIRM_OFFICIAL = i18n( 'kbvutilityprice-schema.KbvUtilityPrice_T.confirmOfficial' ),
            YES = i18n( 'InCaseMojit.casefile_detail.checkbox.YES' ),
            NO = i18n( 'InCaseMojit.casefile_detail.checkbox.NO' ),
            KBVUTILITYPRICE_PRICES_INSURANCE_GROUP = i18n( 'kbvutilityprice-schema.InsuranceGroupPrice_T.insuranceGroupId' ),
            KBVUTILITYPRICE_PRICES_PRICE = i18n( 'kbvutilityprice-schema.InsuranceGroupPrice_T.price' ),
            UTILITY_PRICE = i18n( 'kbvutilityprice-schema.KbvUtilityPrice_T.UTILITY_PRICE' ),
            LBL_YES = i18n( 'IncaseAdminMojit.incase_tab_catalogsJS.label.YES' ),
            LBL_NO = i18n( 'IncaseAdminMojit.incase_tab_catalogsJS.label.NO' ),
            ADD_CHAIN_BTN = i18n( 'omimchain-schema.OmimChain_T.ADD_CHAIN_BTN' ),
            EDIT_CHAIN_BTN = i18n( 'omimchain-schema.OmimChain_T.EDIT_CHAIN_BTN' ),
            REMOVE_CHAIN_BTN = i18n( 'omimchain-schema.OmimChain_T.REMOVE_CHAIN_BTN' ),
            ADD_PRICE_BTN = i18n( 'kbvutilityprice-schema.KbvUtilityPrice_T.ADD_PRICE_BTN' ),
            EDIT_PRICE_BTN = i18n( 'kbvutilityprice-schema.KbvUtilityPrice_T.EDIT_PRICE_BTN' ),
            REMOVE_PRICE_BTN = i18n( 'kbvutilityprice-schema.KbvUtilityPrice_T.REMOVE_PRICE_BTN' ),
            EDIT_INSURANCE_GROUPS_BTN = i18n( 'kbvutilityprice-schema.KbvUtilityPrice_T.EDIT_INSURANCE_GROUPS_BTN' ),
            CONFIRM_PRICE_CHANGES_BTN = i18n( 'kbvutilityprice-schema.KbvUtilityPrice_T.CONFIRM_PRICE_CHANGES_BTN' ),
            ADD_UT_PRICE_LBL = i18n( 'kbvutilityprice-schema.KbvUtilityPrice_T.ADD_UT_PRICE_LBL' ),
            EDIT_UT_PRICE_LBL = i18n( 'kbvutilityprice-schema.KbvUtilityPrice_T.EDIT_UT_PRICE_LBL' ),
            catalogShortList = [],
            locationList = params.locationList || [],
            invoiceConfig = params.invoiceConfig || {},
            defaultMappings = params.defaultMappings || {},
            kbvUtilities = null,
            isGermany = Y.doccirrus.commonutils.doesCountryModeIncludeGermany(),
            isSwitz = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();


        function getKbvUtilities() {
            if( kbvUtilities ) {
                return Promise.resolve( kbvUtilities );
            }
            return Promise.resolve( Y.doccirrus.jsonrpc.api.catalog.getKbvUtilities() ).then( function( response ) {
                var data = response.data;
                kbvUtilities = data;
                return data;
            } );
        }

        function confirmKbvUtilityPriceOverride( err, callback ) {
            Y.doccirrus.DCWindow.confirm( {
                message: err.message,
                callback: callback
            } );
        }

        /**
         * @class OmimChainEditModel
         * @constructor
         * @extends KoViewModel
         */
        function OmimChainEditorModel( config ) {
            OmimChainEditorModel.superclass.constructor.call( this, config );
        }

        OmimChainEditorModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( OmimChainEditorModel, KoViewModel.getBase(), {

                initializer: function OmimChainEditorModel_initializer() {
                    var
                        self = this;
                    self.initTable();
                },
                initTable: function() {
                    var
                        self = this;
                    self.chainTable = KoComponentManager.createComponent( {
                        componentType: 'KoEditableTable',
                        componentConfig: {
                            stateId: 'OmimChainEditorModelChainTable',
                            ViewModel: OmimChainItemModel,
                            data: self.chain,
                            columns: ['omimG', 'genName', 'omimP', 'desc'].map( function( attrName ) {
                                return {
                                    label: i18n( 'omimchain-schema.OmimChainItem_T.' + attrName ),
                                    text: i18n( 'omimchain-schema.OmimChainItem_T.' + attrName ),
                                    forPropertyName: attrName + '2',
                                    inputField: {
                                        componentType: 'KoFieldSelect2',
                                        componentConfig: {
                                            useSelect2Data: true,
                                            select2Read: function( value ) {
                                                if( !value ) {
                                                    return value;
                                                }
                                                return {id: value[attrName], text: value[attrName], data: value};
                                            },
                                            select2Write: function( $event, observable ) {
                                                observable( $event.added.data );
                                            },
                                            select2Config: {
                                                multiple: false,
                                                query: function( query ) {
                                                    self.searchOmimCodes( query.term, attrName ).then( function( response ) {
                                                        query.callback( {
                                                            results: (response && response.data && response.data.map( function( item ) {
                                                                return {
                                                                    id: item[attrName],
                                                                    text: item[attrName],
                                                                    data: item
                                                                };
                                                            } )) || []
                                                        } );
                                                    } );
                                                }
                                            }
                                        }
                                    },
                                    renderer: function( meta ) {
                                        var value = unwrap( meta.value );
                                        return value && value[attrName] || '';
                                    }
                                };
                            } ).concat( [
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
                                            title: i18n( 'general.button.DELETE' ),
                                            icon: 'TRASH_O',
                                            disabled: ko.computed( function() {
                                                return unwrap( self._isModelReadOnly );
                                            } ),
                                            click: function( button, $event, $context ) {
                                                var
                                                    rowModel = $context.$parent.row;
                                                self.chain.remove( rowModel );
                                            }
                                        }
                                    }
                                }
                            ] ),
                            isAddRowButtonDisabled: function() {
                                return false;
                            },
                            onAddButtonClick: function() {
                                self.chain.push( new self.chainTable.ViewModel( {data: {}} ) );
                                return false;
                            }
                        }
                    } );

                    self.isTableContentValid = ko.computed( function() {
                        var rows = self.chainTable.rows(),
                            result = true;

                        rows.forEach( function( row ) {
                            if( false === row._isValid() ) {
                                result = false;
                            }
                        } );
                        return result;
                    } );

                },
                searchOmimCodes: function( term, attrName ) {
                    var omimCatalog = Y.doccirrus.catalogmap.getCatalogOMIM(),
                        query = {
                            catalog: omimCatalog.filename
                        };

                    query[attrName] = {
                        $regex: term,
                        $options: 'i'
                    };

                    return Promise.resolve( Y.doccirrus.jsonrpc.api.catalog.read( {
                        query: query,
                        options: {
                            itemsPerPage: 10,
                            sort: {tagId: 1}
                        }
                    } ) ).catch( function( err ) {
                        showError( err );
                    } );
                },
                destructor: function OmimChainEditorModel_destructor() {
                }
            },
            {
                schemaName: 'v_omim_chain_editor',
                NAME: 'OmimChainEditorModel',
                ATTRS: {
                    validatable: {
                        value: true,
                        lazyAdd: false
                    }
                }
            }
        );
        /**
         * @class KbvUtilityPriceEditorModel
         * @constructor
         * @extends KoViewModel
         */
        function KbvUtilityPriceEditorModel( config ) {
            KbvUtilityPriceEditorModel.superclass.constructor.call( this, config );
        }

        function mapEntryToTreeNode( entry ) {
            var isDirectory = Boolean( entry.totalCount || 0 === entry.totalCount );
            return {
                id: entry._id,
                text: isDirectory ? entry.title : '(' + entry.seq + ') ' +
                                                  ( entry.locname ? ' [' + entry.locname + '] ' : '' ) +
                                                  entry.title,
                totalCount: entry.totalCount,
                entry: entry,
                children: isDirectory
            };
        }

        function createGetData( api ) {
            return function( node ) {
                return new Promise( function( resolve, reject ) {
                    var query = {};
                    if( !node ) {
                        query.catalogShort = null;
                        query.locationId = null;
                    } else if( node && node.entry && 1 === node.entry.level ){
                        query.level = node.entry.level;
                        query.catalogShort = null;
                        query.locationId =  node.entry.locationId;
                    } else {
                        query.catalogShort = node.id;
                        query.locationId =  node.entry.locationId;
                    }

                    api( {
                        query: query,
                        options: {
                            sort: {
                                title: 1
                            },
                            fields: {
                                _id: 1, title: 1, seq: 1, locname: 1, totalCount: 1, level: 1, locationId: 1, catalogShort: 1
                            }
                        }
                    } )
                        .then( function( response ) {
                            return (response && response.data || []).map( mapEntryToTreeNode );
                        } )
                        .then( resolve )
                        .fail( function( response ) {
                            reject( response );
                        } );
                } );
            };
        }

        function showExportImportDialog( cb ) {

            var
                node = Y.Node.create( '<div></div>' ),
                importExportModel = new Y.doccirrus.RuleImportExport.create( {
                    exportConfig: {
                        resolver: createGetData( Y.doccirrus.jsonrpc.api.catalogusageimportexport.listSetOnDB ),
                        enableDragDrop: false
                    },
                    importConfig: {
                        resolver: createGetData( Y.doccirrus.jsonrpc.api.catalogusageimportexport.listSetOnDisk ),
                        enableDragDrop: false
                    },
                    jsonRpcApiImportExport: Y.doccirrus.jsonrpc.api.catalogusageimportexport,
                    metaDataFileName: 'catalogusages_meta.json',
                    fileNamePrefix: 'catalogusages-'
                } ),
                importExportWindow = null,
                downloadDisabled; /*eslint-disable-line*/

            YUI.dcJadeRepository.loadNodeFromTemplate(
                'RuleImportExport',
                'IncaseAdminMojit',
                {},
                node,
                function templateLoaded() {
                    importExportWindow = new Y.doccirrus.DCWindow( {
                        className: 'DCWindow-CataloGUsage-Import-Export',
                        bodyContent: node,
                        title: i18n( 'IncaseAdminMojit.incase_tab_catalogs.title.IMPORT_EXPORT_CATALOG' ),
                        icon: Y.doccirrus.DCWindow.ICON_WARN,
                        width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                        height: Y.doccirrus.DCWindow.SIZE_LARGE,
                        minHeight: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                        minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                        centered: true,
                        maximizable: true,
                        modal: true,
                        render: document.body,
                        buttons: {
                            header: ['close', 'maximize'],
                            footer: [
                                {
                                    name: 'mapLocations',
                                    classNames: '',
                                    label: i18n( 'IncaseAdminMojit.rules.RuleImportExport.buttons.MAP_LOCATIONS' ),
                                    action: function() {
                                       importExportModel.toggleMapping();
                                    }
                                },
                                Y.doccirrus.DCWindow.getButton( 'CLOSE' ),
                                {
                                    name: 'downloadRules',
                                    classNames: 'btn-primary',
                                    label: i18n( 'IncaseAdminMojit.rules.RuleImportExport.buttons.DOWNLOAD_ARCHIVE' ),
                                    action: function() {
                                        importExportModel.downloadArchive();
                                    }
                                },
                                {
                                    name: 'uploadRules',
                                    template: '<button type="button" />',
                                    classNames: 'btn-primary',
                                    label: i18n( 'IncaseAdminMojit.rules.RuleImportExport.buttons.UPLOAD_ARCHIVE' ),
                                    action: function() {
                                        importExportModel.uploadArchive();
                                    }
                                }
                            ]
                        },
                        after: {
                            visibleChange: function() {
                                importExportModel.dispose();
                                cb();
                            }
                        }
                    } );

                    // Since I can't found the possibility to create the buttons already with an icons, add the icons after the buttons are added.
                    var downloadRulesBtn = $( 'button[name=downloadRules]' ),
                        uploadRulesBtn = $( 'button[name=uploadRules]' ),
                        mapBtn = $( 'button[name=mapLocations]' );

                    mapBtn.attr('data-toggle', 'button');
                    downloadRulesBtn.html( '<i class="fa fa-chevron-circle-down"></i> ' + downloadRulesBtn.html() );
                    uploadRulesBtn.html( '<i class="fa fa-chevron-circle-up"></i> ' + uploadRulesBtn.html() );

                    // eslint-disable-next-line no-unused-vars
                    downloadDisabled = ko.computed( function() {
                        if( !importExportWindow || !importExportWindow._ATTR_E_FACADE || importExportWindow._ATTR_E_FACADE.attrName === 'destroyed' ) {
                            return;
                        }

                        var
                            download = importExportWindow.getButton( 'downloadRules' ).button,
                            upload = importExportWindow.getButton( 'uploadRules' ).button,
                            mapBtn = importExportWindow.getButton( 'mapLocations' ).button,
                            children = importExportModel.importTree.root.children(),
                            showLocationMapping = importExportModel.showLocationMapping();

                        if( showLocationMapping ){
                            download.disable();
                            upload.disable();
                        } else {
                            download.enable();
                            upload.enable();
                        }

                        if( 0 === children.length ) {
                            download.disable();
                            mapBtn.disable();
                        } else if( !showLocationMapping ){
                            download.enable();
                            mapBtn.enable();
                        }

                    } );

                    ko.applyBindings( importExportModel, node.getDOMNode() );
                }
            );
        }

        KbvUtilityPriceEditorModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( KbvUtilityPriceEditorModel, KoViewModel.getBase(), {

                initializer: function KbvUtilityPriceEditorModel_initializer( config ) {
                    var
                        self = this;

                    self.kbvUtilities = config.kbvUtilities;
                    self.insuranceGroups = config.insuranceGroups || [];

                    if( !self.isNew() && -1 === self.kbvUtilities.indexOf( peek( self.utilityName ) ) ) {
                        self.utilityName( null );
                        self.active( true );
                    }

                    self.displayPrice = ko.computed( {
                        read: function() {
                            var price = unwrap( self.price );
                            price = Y.doccirrus.comctl.numberToLocalString( price );
                            return price;
                        },
                        write: function( val ) {
                            val = Y.doccirrus.comctl.localStringToNumber( val );
                            self.price( val );
                        }
                    } );

                    self.priceTable = KoComponentManager.createComponent( {
                        componentType: 'KoEditableTable',
                        componentConfig: {
                            stateId: 'InsuranceGroupBrowser-insuranceGroupTable',
                            ViewModel: InsuranceGroupPriceModel,
                            data: self.prices,
                            columns: [
                                {
                                    label: KBVUTILITYPRICE_PRICES_INSURANCE_GROUP,
                                    text: KBVUTILITYPRICE_PRICES_INSURANCE_GROUP,
                                    forPropertyName: 'insuranceGroupId',
                                    inputField: {
                                        componentType: 'KoFieldSelect2',
                                        componentConfig: {
                                            useSelect2Data: true,
                                            select2Read: function( item ) {
                                                var text;
                                                if( !item ) {
                                                    return null;
                                                }
                                                self.insuranceGroups.some( function( item ) {
                                                    if( item._id === item ) {
                                                        text = item.name;
                                                        return true;
                                                    }
                                                } );
                                                if( !text ) {
                                                    return null;
                                                }
                                                return {id: item, text: text};
                                            },
                                            select2Config: {
                                                query: undefined,
                                                initSelection: undefined,
                                                placeholder: ' ',
                                                multiple: false,
                                                data: self.insuranceGroups.map( function( item ) {
                                                    return {id: item._id, text: item.name, _data: item};
                                                } )
                                            }
                                        }
                                    },
                                    renderer: function( meta ) {
                                        var insuranceGroupName = '',
                                            value = unwrap( meta.value );
                                        self.insuranceGroups.some( function( item ) {
                                            if( item._id === value ) {
                                                insuranceGroupName = item.name;
                                                return true;
                                            }
                                        } );
                                        return insuranceGroupName;
                                    }
                                },
                                {
                                    label: KBVUTILITYPRICE_PRICES_PRICE,
                                    text: KBVUTILITYPRICE_PRICES_PRICE,
                                    forPropertyName: 'displayPrice'
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
                                            title: i18n( 'general.button.DELETE' ),
                                            icon: 'TRASH_O',
                                            click: function( button, $event, $context ) {
                                                var rowModel = $context.$parent.row;
                                                self.prices.remove( rowModel );
                                            }
                                        }
                                    }
                                }
                            ],
                            onAddButtonClick: function() {
                                self.prices.push( new InsuranceGroupPriceModel( {
                                    data: {
                                        insuranceGroupId: null,
                                        price: null
                                    }
                                } ) );
                                return false;
                            }
                        }
                    } );

                    self.isTableContentValid = ko.computed( function() {
                        var rows = self.priceTable.rows(),
                            result = true;

                        rows.forEach( function( row ) {
                            if( false === row._isValid() ) {
                                result = false;
                            }
                        } );
                        return result;
                    } );

                    self.utilityNameSelect2 = {
                        val: ko.computed( {
                            read: function() {
                                var
                                    code = self.utilityName();

                                if( code ) {
                                    return code;
                                }
                                else {
                                    return null;
                                }
                            },
                            write: function( $event ) {
                                var text = $event.added && $event.added.text,
                                    positionNoList = ($event.added && $event.added.data && $event.added.data.positionsnr_liste || []).filter( function( ut ) {
                                        return ut.charAt( 0 ) === 'X';
                                    } ).join( ', ' );
                                self.utilityName( text );
                                self.utilityPositionNo( positionNoList );
                            }
                        } ),
                        select2: {
                            allowClear: true,
                            placeholder: 'KG / X0205',
                            dropdownAutoWidth: true,
                            dropdownCssClass: 'dc-select2-kbvUtilityNameAutoComplete',
                            initSelection: function( element, callback ) {
                                var val = self.utilityName.peek();
                                callback( {id: val, text: val} );
                            },
                            query: function( query ) {
                                Promise.resolve( Y.doccirrus.jsonrpc.api.catalog.searchKbvUtilityNamesAndPositions( {query: query.term} ) ).then( function( response ) {
                                    var data = response.data;
                                    query.callback( {
                                        results: data.map( function( ut ) {
                                            return {id: ut.name, text: ut.name, data: ut};
                                        } )
                                    } );
                                } );
                            }
                        }
                    };

                    self.kvSelect2 = {
                        val: ko.computed( {
                            read: function() {
                                var
                                    code = self.kv();

                                if( code ) {
                                    return code;
                                }
                                else {
                                    return null;
                                }
                            },
                            write: function( $event ) {
                                var val = $event.val;
                                self.kv( val );
                            }
                        } ),
                        select2: {
                            allowClear: true,
                            placeholder: '',
                            dropdownAutoWidth: true,
                            dropdownCssClass: 'dc-select2-kvAutoComplete',
                            data: function() {
                                return {
                                    results: self.groupLocationListByKv()
                                };
                            }
                        }
                    };
                    if( !self.careProvider.peek() ) {
                        self.careProvider( '' );
                    }
                    self.careProviderSelect2 = {
                        val: ko.computed( {
                            read: function() {
                                var
                                    code = self.careProvider();

                                if( code ) {
                                    return code;
                                }
                                else {
                                    return null;
                                }
                            },
                            write: function( $event ) {
                                var val = $event.val;
                                self.careProvider( val );
                            }
                        } ),
                        select2: {
                            dropdownAutoWidth: true,
                            dropdownCssClass: 'dc-select2-careProviderAutoComplete',
                            data: function() {
                                return {
                                    results: Y.doccirrus.schemas.kbvutilityprice.types.CareProvider_E.list.map( function( entry ) {
                                        return {id: entry.val, text: entry.i18n};
                                    } )
                                };
                            }
                        }
                    };

                    self.insuranceTypeSelect2 = {
                        val: ko.computed( {
                            read: function() {
                                var
                                    code = self.insuranceType();

                                if( code ) {
                                    return code;
                                }
                                else {
                                    return null;
                                }
                            },
                            write: function( $event ) {
                                var val = $event.val;
                                self.insuranceType( val );
                            }
                        } ),
                        select2: {
                            placeholder: '',
                            dropdownAutoWidth: true,
                            dropdownCssClass: 'dc-select2-insuranceTypeAutoComplete',
                            data: function() {
                                return {
                                    results: Y.doccirrus.schemas.person.types.Insurance_E.list.map( function( entry ) {
                                        return {id: entry.val, text: entry.i18n};
                                    } )
                                };
                            }
                        }
                    };


                },
                groupLocationListByKv: function() {
                    var group = {};
                    locationList.forEach( function( location ) {
                        if( !location.kv ) {
                            return;
                        }
                        if( !group[location.kv] ) {
                            group[location.kv] = [];
                        }
                        group[location.kv].push( location.locname );
                    } );
                    return Object.keys( group ).map( function( kv ) {
                        return {id: kv, text: kv + ' (' + group[kv].join( ', ' ) + ')'};
                    } );
                },
                destructor: function KbvUtilityPriceEditorModel_destructor() {
                }
            },
            {
                schemaName: 'v_kbvutilityprice_editor',
                NAME: 'KbvUtilityPriceEditorModel',
                ATTRS: {
                    validatable: {
                        value: true,
                        lazyAdd: false
                    }
                }
            }
        );

        function refreshTable() {
            self.catalogTable.reload();
        }

        function refreshOmimChainTable() {
            self.omimChainTable.reload();
        }

        function refreshKbvUtilityPricesTable() {
            self.kbvUtilityPriceTable.reload();
        }

        function showError( err ) {
            Y.doccirrus.DCWindow.notice( {
                type: 'error',
                message: err && err.message || err,
                window: {
                    width: 'medium'
                }
            } );
        }

        function onUpdate() {
            refreshTable();
        }

        function renderOmimChain( chain ) {
            return chain.map( function( chainItem ) {
                return [chainItem.omimG, chainItem.genName, chainItem.omimP, chainItem.desc].join( ', ' );
            } ).join( '<br>' );
        }

        function getTemplate( path ) {
            return Y.doccirrus.jsonrpc.api.jade
                .renderFile( {path: path} )
                .then( function( response ) {
                    return response.data;
                } );
        }

        function saveOmimChain( data ) {
            var method = data._id ? 'update' : 'create',
                params = {
                    data: data
                };
            if( data._id ) {
                params.query = {
                    _id: data._id
                };
                params.fields = Object.keys( data );
            }
            return Promise.resolve( Y.doccirrus.jsonrpc.api.omimchain[method]( params ) );
        }

        function saveKbvUtilityPrice( data ) {
            var method = data._id ? 'update' : 'create',
                params = {
                    data: data
                };
            if( data._id ) {
                data.official = false;
                params.query = {
                    _id: data._id
                };
                params.fields = Object.keys( data );
            }
            return Promise.resolve( Y.doccirrus.jsonrpc.api.kbvutilityprice[method]( params ) );
        }

        function showOmimChainEditDialog( omimChain ) {
            return getTemplate( 'IncaseAdminMojit/views/incase_tab_catalogs_omimchain_editor' ).then( function( template ) {

                var bodyContent = Y.Node.create( template ),
                    model = new OmimChainEditorModel( {data: omimChain || {}} ),
                    modal = new Y.doccirrus.DCWindow( {
                        className: 'DCWindow-KBVUtilityDiagnosesCreation',
                        bodyContent: bodyContent,
                        title: omimChain ? EDIT_CHAIN_BTN : ADD_CHAIN_BTN,
                        icon: Y.doccirrus.DCWindow.ICON_LIST,
                        centered: true,
                        modal: true,
                        dragable: true,
                        maximizable: true,
                        resizeable: true,
                        render: document.body,
                        focusOn: [],
                        buttons: {
                            header: ['close', 'maximize'],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                    action: function() {
                                        modal.close();
                                    }
                                } ),
                                Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                    isDefault: true,
                                    action: function() {
                                        var data = model.toJSON();
                                        saveOmimChain( data ).then( function() {
                                            modal.close();
                                            refreshOmimChainTable();
                                        } ).catch( function( err ) {
                                            showError( err );
                                        } );
                                    }
                                } )
                            ]
                        }
                    } );
                modal.getButton( 'SAVE' ).button.disable();
                ko.computed( function() {
                    var okBtn,
                        isModelValid = model._isValid(),
                        isTableContentValid = model.isTableContentValid();
                    if( !modal ) {
                        return;
                    }
                    okBtn = modal.getButton( 'SAVE' ).button;
                    if( isModelValid && isTableContentValid ) {
                        okBtn.enable();
                    }
                    else {
                        okBtn.disable();
                    }
                } );

                ko.applyBindings( model, bodyContent.getDOMNode() );
            } );

        }

        function getInsuranceGroups() {
            return Promise.resolve( Y.doccirrus.jsonrpc.api.insurancegroup.read() ).then( function( response ) {
                return response.data && response.data || [];
            } );
        }

        function showKbvUtilityPriceEditDialog( kbvUtilityPrice ) {
            return Promise.props( {
                kbvUtilities: getKbvUtilities(),
                insuranceGroups: getInsuranceGroups()
            } ).then( function( props ) {
                return getTemplate( 'IncaseAdminMojit/views/incase_tab_catalogs_kbvutilityprice_editor' ).then( function( template ) {

                    var bodyContent = Y.Node.create( template ),
                        model = new KbvUtilityPriceEditorModel( {
                            kbvUtilities: props.kbvUtilities,
                            insuranceGroups: props.insuranceGroups,
                            data: kbvUtilityPrice || {}
                        } ),
                        modal = new Y.doccirrus.DCWindow( {
                            className: 'DCWindow-KbvUtilityPriceEditDialog',
                            bodyContent: bodyContent,
                            title: kbvUtilityPrice ? EDIT_UT_PRICE_LBL : ADD_UT_PRICE_LBL ,
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            centered: true,
                            modal: true,
                            dragable: true,
                            maximizable: true,
                            resizeable: true,
                            render: document.body,
                            width: Y.doccirrus.DCWindow.SIZE_LARGE,
                            focusOn: [],
                            buttons: {
                                header: ['close', 'maximize'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                        action: function() {
                                            modal.close();
                                        }
                                    } ),
                                    Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                        isDefault: true,
                                        action: function() {
                                            var data = model.toJSON();
                                            saveKbvUtilityPrice( data ).then( function() {
                                                modal.close();
                                                refreshKbvUtilityPricesTable();
                                            } ).catch( function( err ) {
                                                if( 30300 === err.code ) {
                                                    confirmKbvUtilityPriceOverride( err, function( result ) {
                                                        if( result.success ) {
                                                            data._id = err.data.kbvUtilityId;
                                                            saveKbvUtilityPrice( data ).then( function() {
                                                                modal.close();
                                                            } ).catch( showError );
                                                        } else {
                                                            modal.close();
                                                        }
                                                    } );
                                                } else {
                                                    showError( err );
                                                }
                                            } );
                                        }
                                    } )
                                ]
                            }
                        } );
                    modal.getButton( 'SAVE' ).button.disable();
                    ko.computed( function() {
                        var okBtn,
                            isModelValid = model._isValid(),
                            isTableContentValid = model.isTableContentValid();

                        if( !modal ) {
                            return;
                        }
                        okBtn = modal.getButton( 'SAVE' ).button;
                        if( isModelValid && isTableContentValid ) {
                            okBtn.enable();
                        }
                        else {
                            okBtn.disable();
                        }
                    } );

                    ko.applyBindings( model, bodyContent.getDOMNode() );
                } );
            } );

        }

        function removeOmimChains( omimChainIds ) {
            return Promise.resolve( Y.doccirrus.jsonrpc.api.omimchain.delete( {
                query: {
                    _id: {$in: omimChainIds}
                }
            } ) ).then( function() {
                refreshOmimChainTable();
            } ).catch( function( err ) {
                showError( err );
            } );
        }

        function removeKbvUtilityPrices( ids ) {
            return Promise.resolve( Y.doccirrus.jsonrpc.api.kbvutilityprice.delete( {
                query: {
                    _id: {$in: ids}
                }
            } ) ).then( function() {
                refreshKbvUtilityPricesTable();
            } ).catch( function( err ) {
                showError( err );
            } );
        }

        var country = {};

        if( isSwitz ) {
            country = {country: 'CH'};
        }

        if( isGermany ) {
            country = {country: 'D'};
        }

        if( isSwitz && isGermany ) {
            country = {};
        }

        var catalogDescriptors = Y.doccirrus.catalogmap.getCatalogs( country ).filter( function( entry ) {
                return entry.virtual !== true;
            } ),
            userFilter = Y.doccirrus.utils.getFilter(),
            filterQuery = userFilter && userFilter.location && {"locationId": userFilter.location},
            locationMap = {},
            catalogList;
        catalogList = Y.doccirrus.catalogmap.getCatalogs( Object.assign( {actType: 'TREATMENT'}, country ) )
            .concat( Y.doccirrus.catalogmap.getCatalogs( Object.assign( {actType: 'DIAGNOSIS'}, country ) ) )
            .concat( Y.doccirrus.catalogmap.getCatalogs( Object.assign( {actType: 'MEDICATION'}, country ) ) );

        locationList.forEach( function( item ) {
            locationMap[item._id] = item.locname;
        } );
        var
            lastMatch,
            result,
            date = moment();
        self.publicBillingFactor = null;
        if( invoiceConfig ) {
            (invoiceConfig.invoicefactors || []).some( function( factor ) {
                var
                    current = moment( factor.year, 'YYYY' ).quarter( +factor.quarter ).startOf( 'quarter' ).hour( 0 ).minutes( 0 ).seconds( 0 );
                if( +factor.year === date.year() && +factor.quarter === date.quarter() ) {
                    result = factor;
                    return true;
                } else if( date.isAfter( current ) && (!lastMatch || current.isAfter( lastMatch )) ) {
                    lastMatch = factor;
                    return false;
                }
                return false;
            } );
            self.publicBillingFactor = result || lastMatch || null;
        }

        self.sideBarNavItems = [
            {
                id: 'EDIT_CATALOG',
                title: EDIT_CATALOG
            },
            {
                id: 'CATALOG_VERSIONS',
                title: CATALOG_VERSIONS
            }

        ];

        if( YUI_config.doccirrus.Env.countryMode.includes( 'D' ) ) {
            self.sideBarNavItems.push(
                {
                    id: 'OMIM_G_CHAINS',
                    title: OMIM_G_CHAINS
                },
                {
                    id: 'KBVUTILITY_PRICES',
                    title: UTILITY_PRICE
                }
            );
        }

        self.selectedItem = ko.observable( params.confirmKbvUtilityOfficialPrices ? self.sideBarNavItems.find( function( item ) {
            return item.id === 'KBVUTILITY_PRICES';
        } ) : self.sideBarNavItems[0] );

        self.catalogTable = KoComponentManager.createComponent( {
            componentType: 'KoTable',
            componentConfig: {
                stateId: 'IncaseAdminMojit-IncaseAdminMojitBinderIndex-catalogTable',
                states: ['limit'],
                fillRowsToLimit: false,
                remote: true,
                rowPopover: false,
                proxy: Y.doccirrus.jsonrpc.api.catalogusage.getSortedByLocation,
                baseParams: {
                    query: filterQuery, catalogShortList: catalogList.map( function( descr ) {
                        return descr.short;
                    } )
                },
                columns: [
                    {
                        componentType: 'KoTableColumnCheckbox',
                        forPropertyName: 'select',
                        label: ''
                    },
                    {
                        forPropertyName: 'seq',
                        label: CODE,
                        title:CODE,
                        renderer: function( meta ) {
                            var data = meta.row;
                            return '<span title="' + (data.title || '') + '">' + data.seq + '</span>';
                        },
                        isSortable: true,
                        isFilterable: true,
                        queryFilterType: Y.doccirrus.DCQuery.IREGEX_OPERATOR
                    },
                    {
                        forPropertyName: 'catalogShort',
                        label: CATALOG_SHORT,
                        queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                        filterField: {
                            componentType: 'KoFieldSelect2',
                            options: catalogList,
                            optionsText: 'short',
                            optionsValue: 'short'
                        },
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'tags',
                        label: TAGS,
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'count',
                        label: COUNT,
                        isSortable: true,
                        isFilterable: true,
                        queryFilterType: Y.doccirrus.DCQuery.GT_OPERATOR,
                        renderer: function( meta ) {
                            var
                                value = meta.value;
                            return undefined === value ? 0 : value;
                        }
                    },
                    {
                        forPropertyName: 'locationId',
                        label: LOCATION,
                        isSortable: true,
                        isFilterable: true,
                        queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                        filterField: {
                            componentType: 'KoFieldSelect2',
                            options: locationList,
                            optionsText: 'locname',
                            optionsValue: '_id'
                        },
                        renderer: function( meta ) {
                            var
                                value = meta.value;
                            return locationMap[value];
                        }
                    },
                    {
                        forPropertyName: 'value',
                        label:  i18n( 'InCaseMojit.casefile_browserJS.placeholder.PRICE' ),
                        isSortable: false,
                        isFilterable: false,
                        renderer: function( meta ) {
                            var
                                data = meta.row,
                                catalogShort = data.catalogShort,
                                value,
                                priceItem,
                                actualUnit;
                            if( 'MMI' === data.catalogShort || 'HCI' === data.catalogShort ){
                                value = data.phPriceSale;
                            } else if( data.catalog || data.value === 'bewertung_liste' ) { // entries with 'bewertung_liste' must be always calculated
                                switch( catalogShort ) {
                                    case 'UVGOÄ':
                                        value = data.u_extra && data.u_extra.tarifvertrag && data.u_extra.tarifvertrag.bg_ahb;
                                        break;
                                    case 'GebüH':
                                        value = data.u_extra && data.u_extra.pkv1;
                                        break;
                                    case 'GOÄ':
                                        if( 'bewertung_liste' === data.unit && data.u_extra && data.u_extra.bewertung_liste && data.u_extra.bewertung_liste[0] ) {
                                            actualUnit = data.u_extra.bewertung_liste[0].unit;
                                        } else {
                                            actualUnit = data.unit;
                                        }

                                        if( 'bewertung_liste' === data.value && data.u_extra && data.u_extra.bewertung_liste && data.u_extra.bewertung_liste[0] ) {
                                            value = data.u_extra.bewertung_liste[ 0 ].value || 0;
                                            if( 'Punkte' === actualUnit ) {
                                                value = Y.doccirrus.comctl.dcMul( value, Y.doccirrus.schemas.activity.goaeInvoiceFactor );
                                            }
                                        } else {
                                            value = data.value || 0;
                                            if( 'Punkte' === actualUnit ) {
                                                value = Y.doccirrus.comctl.dcMul( value, Y.doccirrus.schemas.activity.goaeInvoiceFactor );
                                            }
                                        }
                                        break;
                                    case 'EBM':
                                        if( 'bewertung_liste' === data.unit && data.u_extra ) {
                                            priceItem = Y.doccirrus.schemas.catalog.getPriceItemFromList( data.u_extra && data.u_extra.bewertung_liste );
                                            actualUnit = priceItem && priceItem.unit;
                                        } else {
                                            actualUnit = data.unit;
                                        }
                                        if( 'bewertung_liste' === data.value ) {
                                            priceItem = Y.doccirrus.schemas.catalog.getPriceItemFromList( data.u_extra && data.u_extra.bewertung_liste );
                                            if( 'Euro' === actualUnit ) {
                                                value = priceItem && priceItem.value;
                                            } else {
                                                value = Y.doccirrus.comctl.dcMul( priceItem && priceItem.value, self.publicBillingFactor && self.publicBillingFactor.factor);
                                            }
                                        } else {
                                            if( 'Punkte' === actualUnit ) {
                                                value = Y.doccirrus.comctl.dcMul( data.value, self.publicBillingFactor && self.publicBillingFactor.factor);
                                            } else {
                                                value = data.value;
                                            }
                                        }
                                        break;
                                    default:
                                        value = data.value || data.price;
                                }
                            } else {
                                value = data.value || data.price;
                            }
                            return Y.doccirrus.comctl.numberToLocalString( value );
                        }
                    },
                    {
                        forPropertyName: 'billingFactorValue',
                        label:  i18n( 'InCaseMojit.casefile_browserJS.placeholder.FACTOR' ),
                        isSortable: false,
                        isFilterable: false,
                        renderer: function( meta ) {
                            var
                                data = meta.row,
                                value = meta.value;
                            if( 'EBM' === data.catalogShort ){
                                value = '';
                            }
                            return value && Y.doccirrus.comctl.numberToLocalString( value ) || '';
                        }
                    },
                    {
                        forPropertyName: 'title',
                        label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DESCRIPTION' ),
                        visible: false,
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'explanations',
                        label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.EXPLANATIONS' ),
                        isSortable: true,
                        isFilterable: true,
                        visible: false,
                        renderer: function( meta ) {
                            var
                                value = meta.value;
                            return value || '';
                        }
                    }
                ],
                onRowClick: function( meta ) {
                    var data = meta.row;
                    data.publicBillingFactor = self.publicBillingFactor;
                    Y.doccirrus.modals.catalogUsageModal.showEditDialog( data, onUpdate );
                }
            }
        } );
        self._deleteSelected = KoComponentManager.createComponent( {
            componentType: 'KoButton',
            componentConfig: {
                name: 'deleteSelected',
                text: DELETE,
                disabled: ko.computed( function() {
                    return 0 === self.catalogTable.getComponentColumnCheckbox().checked().length;
                } ),
                click: function() {
                    var selected = self.catalogTable.getComponentColumnCheckbox().checked(),
                        setectedIds = [],
                        selectedEntries = [];
                    selected.forEach( function( item ) {
                        setectedIds.push( item._id );
                        selectedEntries.push({ locationId: item.locationId, code: item.seq, catalogShort: item.catalogShort});
                    } );

                    Y.doccirrus.jsonrpc.api.catalogusage.deleteBatch( {
                        query: {
                            ids: setectedIds,
                            catalogTextsRefs: selectedEntries
                        },
                        options: {
                            override: true
                        }
                    } ).done( function() {
                        refreshTable();
                    } ).fail( function() {
                        Y.doccirrus.DCWindow.notice( {
                            type: 'error',
                            message: DELETE_ERROR,
                            window: {
                                width: 'medium'
                            }
                        } );
                    } );
                }
            }
        } );

        self._add = KoComponentManager.createComponent( {
            componentType: 'KoButton',
            componentConfig: {
                name: 'add',
                text: BTN_ADD,
                click: function() {
                    var actTypes = Y.doccirrus.schemas.catalog.getDisplayCatalogActTypes();
                    if( !catalogShortList.length ) {
                        actTypes.forEach( function( actType ) {
                            var catalogs = Y.doccirrus.catalogmap.getCatalogs( {
                                actType: actType,
                                country: Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ? "CH" : "D"
                            } );
                            catalogShortList = catalogShortList.concat( catalogs );
                        } );
                    }
                    Y.doccirrus.modals.catalogUsageModal.showAddDialog( {
                        catalogShortList: catalogShortList,
                        locationList: locationList,
                        defaultMappings: defaultMappings
                    }, refreshTable );

                }
            }
        } );

        self._importExport = KoComponentManager.createComponent( {
            componentType: 'KoButton',
            componentConfig: {
                name: 'importExport',
                text: '',
                icon: 'IMPEXP',
                click: function() {
                    showExportImportDialog( refreshTable );
                }
            }
        } );

        self._copySelected = KoComponentManager.createComponent( {
            componentType: 'KoButton',
            componentConfig: {
                name: 'copyToLocation',
                text: COPY,
                disabled: ko.computed( function() {
                    return 0 === self.catalogTable.getComponentColumnCheckbox().checked().length;
                } ),
                click: function() {
                    var checkedCodes = self.catalogTable.getComponentColumnCheckbox().checked(),
                        distinctLocations = {};
                    checkedCodes.forEach( function( catalog ) {
                        if( catalog.locationId ) {
                            distinctLocations[catalog.locationId] = true;
                        }
                    } );
                    Y.doccirrus.modals.catalogUsageModal.showCopyDialog( {
                        checkedCodes: checkedCodes,
                        locationList: locationList.filter( function( location ) {
                            return !distinctLocations[location._id];
                        } )
                    }, refreshTable );
                }
            }
        } );

        self._changeSelected = KoComponentManager.createComponent( {
            componentType: 'KoButton',
            componentConfig: {
                name: 'changeTag',
                text: CHANGE_TAG,
                disabled: ko.computed( function() {
                    return 0 === self.catalogTable.getComponentColumnCheckbox().checked().length;
                } ),
                click: function() {
                    var checkedCodes = self.catalogTable.getComponentColumnCheckbox().checked();
                    Y.doccirrus.modals.catalogUsageModal.showEditBatchDialog( {
                        checkedCodes: checkedCodes,
                        locationList: locationList
                    }, refreshTable );

                }
            }
        } );

        self.catalogDescriptorsTable = KoComponentManager.createComponent( {
            componentType: 'KoTable',
            componentConfig: {
                stateId: 'IncaseAdminMojit-IncaseAdminMojitBinderIndex-catalogDescriptorsTable',
                states: ['limit'],
                fillRowsToLimit: false,
                rowPopover: false,
                data: catalogDescriptors,
                columns: [
                    {
                        forPropertyName: 'short',
                        label: CATALOG_SHORT,
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'version',
                        label: VERSION,
                        isSortable: true,
                        isFilterable: true,
                        renderer: function( meta ) {
                            var value = meta.value;
                            return value || '';
                        }
                    },
                    {
                        forPropertyName: 'extensible',
                        label: EXTENSIBLE,
                        isSortable: true,
                        isFilterable: true,
                        queryFilterType: Y.doccirrus.DCQuery.EQ_BOOL_OPERATOR,
                        filterField: {
                            componentType: 'KoFieldSelect2',
                            options: [{val: true, i18n: LBL_YES }, {val: false, i18n: LBL_NO }],
                            optionsText: 'i18n',
                            optionsValue: 'val',
                            select2Config: {
                                multiple: false
                            }
                        },
                        renderer: function( meta ) {
                            var value = meta.value;
                            return value ? LBL_YES : LBL_NO ;
                        }
                    }
                ]
            }
        } );

        self.omimChainTable = KoComponentManager.createComponent( {
            componentType: 'KoTable',
            componentConfig: {
                stateId: 'IncaseAdminMojit-IncaseAdminMojitBinderIndex-omimChainTable',
                states: ['limit'],
                fillRowsToLimit: false,
                rowPopover: false,
                remote: true,
                proxy: Y.doccirrus.jsonrpc.api.omimchain.getOmimChains,
                columns: [
                    {
                        componentType: 'KoTableColumnCheckbox',
                        forPropertyName: 'select',
                        label: ''
                    },
                    {
                        forPropertyName: 'chainName',
                        label: OMIMCHAIN_CHAINNAME,
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'description',
                        label: OMIMCHAIN_DESCRIPTION,
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'chain',
                        label: OMIMCHAIN_CHAIN,
                        isSortable: true,
                        isFilterable: true,
                        renderer: function( meta ) {
                            var value = meta.value;
                            return renderOmimChain( value );
                        }
                    }
                ],
                onRowClick: function() {
                    return false;
                }
            }
        } );

        self.addOmimChainBtn = KoComponentManager.createComponent( {
            componentType: 'KoButton',
            componentConfig: {
                name: 'addOmimChainBtn',
                text: ADD_CHAIN_BTN,
                click: function() {
                    showOmimChainEditDialog();
                }
            }
        } );

        self.editOmimChainBtn = KoComponentManager.createComponent( {
            componentType: 'KoButton',
            componentConfig: {
                name: 'editOmimChainBtn',
                text: EDIT_CHAIN_BTN,
                disabled: ko.computed( function() {
                    return 1 !== self.omimChainTable.getComponentColumnCheckbox().checked().length;
                } ),
                click: function() {
                    var checked = self.omimChainTable.getComponentColumnCheckbox().checked(),
                        data = checked && checked[0];
                    showOmimChainEditDialog( data );
                }
            }
        } );

        self.removeOmimChainBtn = KoComponentManager.createComponent( {
            componentType: 'KoButton',
            componentConfig: {
                name: 'removeOmimChainBtn',
                text: REMOVE_CHAIN_BTN,
                disabled: ko.computed( function() {
                    return 0 === self.omimChainTable.getComponentColumnCheckbox().checked().length;
                } ),

                click: function() {
                    var checkedOmimChainIds = self.omimChainTable.getComponentColumnCheckbox().checked().map( function( omimChain ) {
                        return omimChain._id;
                    } );

                    if( checkedOmimChainIds ) {
                        removeOmimChains( checkedOmimChainIds );
                    }
                }
            }
        } );

        self.kbvUtilityPriceTable = KoComponentManager.createComponent( {
            componentType: 'KoTable',
            componentConfig: {
                stateId: 'IncaseAdminMojit-IncaseAdminMojitBinderIndex-kbvUtilityPriceTable',
                states: ['limit'],
                fillRowsToLimit: false,
                rowPopover: false,
                remote: true,
                proxy: Y.doccirrus.jsonrpc.api.kbvutilityprice.read,
                columns: [
                    {
                        componentType: 'KoTableColumnCheckbox',
                        forPropertyName: 'select',
                        label: ''
                    },
                    {
                        forPropertyName: 'utilityName',
                        label: KBVUTILITYPRICE_UTILITYNAME,
                        title: KBVUTILITYPRICE_UTILITYNAME,
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'utilityPositionNo',
                        label: KBVUTILITYPRICE_UTILITYPOSITIONNO,
                        title: KBVUTILITYPRICE_UTILITYPOSITIONNO,
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'kv',
                        label: KBVUTILITYPRICE_KV,
                        title: KBVUTILITYPRICE_KV,
                        isSortable: true,
                        isFilterable: true,
                        width: '10%'
                    },
                    {
                        forPropertyName: 'active',
                        label: KBVUTILITYPRICE_ACTIVE,
                        title: KBVUTILITYPRICE_ACTIVE,
                        isSortable: true,
                        isFilterable: false,
                        width: '10%',
                        renderer: function( meta ) {
                            var value = meta.value;
                            return value ? LBL_YES : LBL_NO ;
                        }
                    },
                    {
                        forPropertyName: 'insuranceType',
                        label: KBVUTILITYPRICE_INSURANCETYPE,
                        title: KBVUTILITYPRICE_INSURANCETYPE,
                        isSortable: true,
                        isFilterable: true,
                        queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                        filterField: {
                            componentType: 'KoFieldSelect2',
                            options: Y.doccirrus.schemas.person.types.Insurance_E.list,
                            optionsText: 'i18n',
                            optionsValue: 'val'
                        },
                        renderer: function( meta ) {
                            var
                                status = meta.value;
                            return Y.doccirrus.schemaloader.getEnumListTranslation( 'person', 'Insurance_E', status, 'i18n', '' );
                        }
                    },
                    {
                        forPropertyName: 'careProvider',
                        label: KBVUTILITYPRICE_CAREPROVIDER,
                        title: KBVUTILITYPRICE_CAREPROVIDER,
                        isSortable: true,
                        isFilterable: true,
                        queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                        filterField: {
                            componentType: 'KoFieldSelect2',
                            options: Y.doccirrus.schemas.person.types.Insurance_E.list,
                            optionsText: 'i18n',
                            optionsValue: 'val'
                        },
                        renderer: function( meta ) {
                            var
                                status = meta.value;
                            return Y.doccirrus.schemaloader.getEnumListTranslation( 'kbvutilityprice', 'CareProvider_E', status, 'i18n', '' );
                        }
                    },
                    {
                        forPropertyName: 'prices',
                        label: KBVUTILITYPRICE_PRICES,
                        title: KBVUTILITYPRICE_PRICES,
                        renderer: function( meta ) {
                            var row = meta.row;
                            if( row.insuranceType !== 'PUBLIC' ) {
                                return Y.doccirrus.comctl.numberToLocalString( row.price );
                            }
                            return (meta.value || []).map( function( priceConfig ) {
                                return (priceConfig.insuranceGroupName + ': ' + Y.doccirrus.comctl.numberToLocalString( priceConfig.price ));
                            } ).join( ', ' );
                        }
                    },
                    {
                        forPropertyName: 'confirmOfficial',
                        label: KBVUTILITYPRICE_CONFIRM_OFFICIAL,
                        title: KBVUTILITYPRICE_CONFIRM_OFFICIAL,
                        isSortable: true,
                        isFilterable: true,
                        queryFilterType: Y.doccirrus.DCQuery.EQ_BOOL_OPERATOR,
                        filterField: {
                            componentType: 'KoFieldSelect2',
                            options: [{val: true, i18n: YES}, {val: false, i18n: NO}],
                            optionsText: 'i18n',
                            optionsValue: 'val',
                            select2Config: {
                                multiple: false
                            }
                        },
                        renderer: function( meta ) {
                            var row = meta.row;
                            var text = meta.value ? YES : NO;
                            if( meta.value && row.officialPrice ) {
                                text += [' (', Y.doccirrus.comctl.numberToLocalString( row.officialPrice ), ')'].join( '' );
                            }
                            return text;
                        }
                    }
                ],
                onRowClick: function() {
                    return false;
                }
            }
        } );

        if( params.confirmKbvUtilityOfficialPrices ) {
            self.kbvUtilityPriceTable.filters().forEach( function( filter ) {
                if( filter.forPropertyName === 'confirmOfficial' ) {
                    filter.filterField.value( true );
                    self.kbvUtilityPriceTable.filterParams( {confirmOfficial: {$eq: true}} );
                }
            } );
        }

        self.addKbvUtilityPriceBtn = KoComponentManager.createComponent( {
            componentType: 'KoButton',
            componentConfig: {
                name: 'addKbvUtilityPriceBtn',
                text: ADD_PRICE_BTN,
                click: function() {
                    showKbvUtilityPriceEditDialog();
                }
            }
        } );

        self.editKbvUtilityPriceBtn = KoComponentManager.createComponent( {
            componentType: 'KoButton',
            componentConfig: {
                name: 'editKbvUtilityPriceBtn',
                text: EDIT_PRICE_BTN,
                disabled: ko.computed( function() {
                    return 1 !== self.kbvUtilityPriceTable.getComponentColumnCheckbox().checked().length;
                } ),
                click: function() {
                    var checked = self.kbvUtilityPriceTable.getComponentColumnCheckbox().checked(),
                        data = checked && checked[0];
                    showKbvUtilityPriceEditDialog( data );
                }
            }
        } );

        self.removeKbvUtilityPriceBtn = KoComponentManager.createComponent( {
            componentType: 'KoButton',
            componentConfig: {
                name: 'removeKbvUtilityPriceBtn',
                text: REMOVE_PRICE_BTN,
                disabled: ko.computed( function() {
                    return 0 === self.kbvUtilityPriceTable.getComponentColumnCheckbox().checked().length;
                } ),

                click: function() {
                    var ids = self.kbvUtilityPriceTable.getComponentColumnCheckbox().checked().map( function( entry ) {
                        return entry._id;
                    } );

                    if( ids && ids.length ) {
                        removeKbvUtilityPrices( ids );
                    }
                }
            }
        } );

        self.showInsuranceGroupsBtn = KoComponentManager.createComponent( {
            componentType: 'KoButton',
            componentConfig: {
                name: 'showInsuranceGroupsBtn',
                text: EDIT_INSURANCE_GROUPS_BTN,
                click: function() {
                    Y.doccirrus.modals.insuranceGroupModal.show();
                }
            }
        } );

        self.confirmPriceChangesBtn = KoComponentManager.createComponent( {
            componentType: 'KoButton',
            componentConfig: {
                name: 'confirmPriceChangesBtn',
                text: CONFIRM_PRICE_CHANGES_BTN,
                disabled: ko.computed( function() {
                    return 0 === self.kbvUtilityPriceTable.getComponentColumnCheckbox().checked().filter( function( entry ) {
                        return entry.confirmOfficial;
                    } ).length;
                } ),
                click: function() {

                    var pricesToConfirm = self.kbvUtilityPriceTable.getComponentColumnCheckbox().checked().filter( function( entry ) {
                        return entry.confirmOfficial;
                    } );
                    if( !pricesToConfirm.length ) {
                        return;
                    }
                    Promise.resolve( Y.doccirrus.jsonrpc.api.kbvutilityprice.confirmPriceChange( {
                        pricesToConfirm: pricesToConfirm
                    } ) ).then( function( response ) {
                        refreshKbvUtilityPricesTable();
                        if( response.meta && response.meta.errors && response.meta.errors.length ) {
                            Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( response ), 'display' );
                        }
                    } ).catch( function( error ) {
                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    } );
                }
            }
        } );

    });

    return {

        registerNode: function( yNode, key, options ) {
            Y.doccirrus.jsonrpc.api.location.read( {} )
                .done( function( response ) {
                    ko.applyBindings( new CatalogModel( {
                        locationList: Y.Lang.isArray( response.data ) && response.data || [],
                        invoiceConfig: options.invoiceConfig,
                        defaultMappings: options.defaultMappings,
                        confirmKbvUtilityOfficialPrices: options.confirmKbvUtilityOfficialPrices
                    } ), yNode.getDOMNode() );
                } )
                .fail( function( err ) {
                    Y.log( 'could not load catalog viewwe ' + err, 'error', NAME );
                } );
        },

        deregisterNode: function( yNode ) {
            ko.cleanNode( yNode.getDOMNode() );
        }
    };
};
