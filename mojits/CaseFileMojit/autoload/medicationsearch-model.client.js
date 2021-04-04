/*
 @author: pi
 @date: 2014/09/26
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, _, async */
//TRANSLATION INCOMPLETE!! MOJ-3201
'use strict';

YUI.add( 'DCMedicationSearchModel', function( Y, NAME ) {

        /**
         * @module caseFile
         * @submodule DCMedicationSearchModel
         * @main caseFile
         */
        var MedicationSearchModel,
            MedicationPriceComparisonModel = Y.doccirrus.KoViewModel.getConstructor( 'MedicationPriceComparisonModel' ),
            _defaultMappings,
            ABORTED = new Error( 'Request aborted' ),
            i18n = Y.doccirrus.i18n,
            ADD_INGREDIENT = i18n( 'InCaseMojit.medication_modal.placeholder.ADD_INGREDIENT' ),
            GO_TO = i18n( 'InCaseMojit.medication_modal.text.GO_TO' ),
            AMR7 = i18n( 'InCaseMojit.medication_modal.text.AMR7' ),
            AMR12 = i18n( 'InCaseMojit.medication_modal.text.AMR12' ),
            AMR101 = i18n( 'InCaseMojit.medication_modal.text.AMR101' ),
            NUMBER_ERR = i18n( 'validations.message.NUMBER_ERR' ),
            LIMITATION = i18n( 'InCaseMojit.medication_modal.text.LIMITATION' ),
            ALTERNATIVES = i18n( 'InCaseMojit.medication_modal.text.ALTERNATIVES' ),
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable;

        var MedicationTabNavModel = function( activeTabId ) {
            var self = this;

            Y.doccirrus.uam.ViewModel.mixDisposable( self );

            self.activeTab = ko.observable( activeTabId );

            self.reset = function() {
                self.activeTab( activeTabId );
            };

            self.isActive = function( id ) {
                return self._addDisposable( ko.computed( function() {
                    var activeTab = self.activeTab();
                    return activeTab === id;
                } ) );
            };

            self.activate = function( id ) {
                return function() {
                    if( id ) {
                        self.activeTab( id );
                    }
                };
            };

            self.clicked = function( vm, evt ) {
                var currentTabId = self.activeTab(),
                    id = evt.currentTarget && evt.currentTarget.id;
                if( id && id !== currentTabId ) {
                    self.activeTab( id );
                }
            };
        };

        var ProductViewModel = function() {
            var self = this;
            Y.doccirrus.uam.ViewModel.mixDisposable( self );
            self.name = ko.observable();
            self.atc = ko.observableArray();
            self.activeMolecules = ko.observableArray();
            self.otherMolecules = ko.observableArray();
            self.equivalents = ko.observableArray();
            self.identa = ko.observableArray();
            self.iconList = ko.observableArray();
            self.phGBATherapyHintName = ko.observable();

            self._showOtherMolecules = ko.computed( function() {
                var s = '',
                    arr = self.otherMolecules();
                arr.forEach( function( molecule, index ) {
                    s += molecule.name;
                    if( index < arr.length - 1 ) {
                        s += ', ';
                    }
                } );
                return s;
            } );

            self._hasContent = function( attrName ) {
                return self._addDisposable( ko.computed( function() {
                    var attr = self[attrName] && self[attrName]();
                    if( attr ) {
                        if( Array.isArray ) {
                            return Boolean( attr.length );
                        } else {
                            return Boolean( attr );
                        }
                    }
                } ) );
            };

            self.showActiveMolecule = function( molecule ) {
                var
                    result = molecule.name;
                if( molecule.strength ) {
                    result += ' ' + molecule.strength;
                }
                return result;
            };

            self._show = function( product ) {
                var
                    activeMolecules = product.phIngr || [];
                self.id = product.id;
                self.name( product.title );
                self.activeMolecules( activeMolecules );
                self.otherMolecules( product.phIngrOther );
                self.equivalents( product.phEqual );
                self.atc( product.phAtcDisplay );
                self.identa( product.phIdenta );
                self.originalData = product;
                self.phGBATherapyHintName( product.phGBATherapyHintName );
                self.iconList( product.phIcons );

            };
            self.reset = function() {
                self.id = null;
                self.name( null );
                self.activeMolecules( [] );
                self.otherMolecules( [] );
                self.equivalents( [] );
                self.atc( [] );
                self.identa( [] );
                self.originalData = null;
                self.phGBATherapyHintName( null );
                self.iconList( [] );
            };
        };

        MedicationSearchModel = function MedicationSearchModel( defaultMappings, activity, patient, multiSelect, focusInput ) {
            var self = this,
                maxresult = 10,
                KoUI = Y.doccirrus.KoUI,
                KoComponentManager = KoUI.KoComponentManager,
                caseFolder = activity.get ? activity.get( 'caseFolder' ) : activity.caseFolder,
                // MOJ-14319: [OK] [CASEFOLDER]
                insurance = patient && patient.getPublicInsurance && patient.getPublicInsurance( caseFolder && caseFolder.type ),
                iknr = insurance && insurance.insuranceId && insurance.insuranceId(),
                initPZN,
                KoTable = KoComponentManager.registeredComponent( 'KoTable' ),
                productKoTableQuery = ko.observable(),
                packageSearchKoTableQuery = ko.observable(),
                locationId,
                employeeId,
                locationList,
                location,
                employeeList,
                employee;

            if( !caseFolder ) {
                throw new Y.doccirrus.commonerrors.DCError( 400, {message: 'caseFolder is undefined'} );
            }
            if( !insurance ) {
                throw new Y.doccirrus.commonerrors.DCError( 400, {message: 'insurance is undefined'} );
            }
            switch( caseFolder.type ) {
                case 'GKV':
                case 'PKV':
                case 'BG':
                    if( !iknr ) {
                        throw new Y.doccirrus.commonerrors.DCError( 400, {message: 'iknr is undefined'} );
                    }
                    break;
            }

            Y.doccirrus.uam.ViewModel.mixDisposable( self );
            _defaultMappings = defaultMappings;

            self.productNameHasFocus = ko.observable( false );
            self.companyNameHasFocus = ko.observable( false );
            self.pznListHasFocus = ko.observable( false );
            self.companyNameAdHasFocus = ko.observable( false );
            self.ingredientListHasFocus = ko.observable( false );
            self.atcListHasFocus = ko.observable( false );

            self.selectedItems = ko.observableArray();
            self._dataSrc = Y.doccirrus.infras.getPrivateURL();
            self.bsnr = ko.observable();
            self.lanr = ko.observable();
            self.kv = ko.observable();
            self.ARVInfoTexts = ko.observableArray( [] );
            self.AMRInfo = ko.observableArray();

            self.multiSelect = multiSelect;
            self.selectedItemsTitle = i18n( 'InCaseMojit.medication_modal.text.SELECTED_ITEMS_TITLE' );
            self.atcSearchModalTitle = i18n( 'InCaseMojit.medication_modal.text.ATC_SEARCH_MODAL_TITLE' );
            self.searchPlaceholderI18n = i18n( 'general.button.SEARCH' );
            self.printI18n = i18n( 'InCaseMojit.ActivityHeadingButtonsViewModel.text.PRINT' );
            self.selectItem = function( data ) {
                var
                    self = this,
                    selectedItems = peek( self.selectedItems );
                if( multiSelect && selectedItems.every( function( item ) {
                    return item.package.originalData.id !== data.package.originalData.id;
                } ) ) {
                    self.selectedItems.push( {
                        package: {
                            originalData: data.package && data.package.originalData
                        },
                        product: {
                            originalData: data.product && data.product.originalData
                        }
                    } );
                }
            };

            self.isExpanded = function( nodeId ) {
                var i;

                for ( i =  0; i < self.infoTree.openNodes.length; i++ ) {
                    if ( self.infoTree.openNodes[i].entry &&  self.infoTree.openNodes[i].entry.id === nodeId ) {
                        return true;
                    }
                }
                return false;
            };

            self.unSelectItem = function( item ) {
                if( multiSelect ) {
                    self.selectedItems.remove( function( data ) {
                        return item.package.originalData.id === data.package.originalData.id;
                    } );
                }
            };

            self.unSelectItemButton = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'deleteItem',
                    icon: 'TRASH_O',
                    click: function( button, event, $context ) {
                        self.unSelectItem( $context.$parent );
                    }
                }
            } );

            self.getSelectedItems = function() {
                return peek( self.selectedItems );
            };

            if( activity ) {
                locationId = peek( activity.locationId );
                employeeId = peek( activity.employeeId );
                locationList = peek( activity._locationList );
                location = Y.Array.find( locationList, function( location ) {
                    return location._id === locationId;
                } );
                employeeList = peek( activity._employeeList ) || location.employees;
                employee = Y.Array.find( employeeList, function( employee ) {
                    return employee._id === employeeId;
                } );

                self.bsnr( location && unwrap( location.commercialNo ) || '' );
                self.kv( location && unwrap( location.kv ) || '' );
                self.lanr( employee && unwrap( employee.officialNo ) || '' );
                initPZN = peek( activity.phPZN );
            }

            self.searchATC = function( atcCode ) {
                return function() {
                    resetSearchAd();
                    self.atcList( [atcCode] );
                    self.searchNav.activate( 'advanced' )();
                };
            };

            function resetProductInfo() {
                if( self.selectedProduct ) {
                    self.selectedProduct.reset();
                    self.selectedPackage( null );
                    self.alternativesKoTable.data( [] );
                    self.priceHistoryKoTable.data( [] );
                    self.AMRInfo( [] );
                    self.ARVInfoTexts( [] );
                    self.tabNav.reset();
                }

            }

            function reset() {
                resetProductInfo();
                self.packageKoTable.unSelect();
                self.productKoTable.unSelect();
                self.productKoTable.data( [] );
                self.packageKoTable.data( [] );
            }

            function resetSearch() {
                self.productName( undefined );
                self.companyName( undefined );
                self.pznList( [] );
            }

            function resetSearchAd() {
                self.atcList( [] );
                self.companyNameAd( undefined );
                self.ingredientList( [] );
                self.ingredientStrength( null );
                self.ingredientStrengthValue( null );
            }

            function formatDataForTree( basicInfo, prescribingInfo ) {
                var identaData = [];

                self.selectedProduct.identa().forEach( function( item, index ) {
                    if( item.diameter ) {
                        identaData.push( {
                            id: 'PROD6' + index,
                            parent: 'PROD6',
                            name: i18n( 'InCaseMojit.medication_modal.text.DIAMETER' ) + ' - ' + item.diameter,
                            isLastLeaf: true,
                            isDirectory: false
                        } );
                    }
                    if( item.height ) {
                        identaData.push( {
                            id: 'PROD6' + index,
                            parent: 'PROD6',
                            name: i18n( 'InCaseMojit.medication_modal.text.HEIGHT' ) + ' - ' + item.height,
                            isLastLeaf: true,
                            isDirectory: false
                        } );
                    }
                    if( item.weight ) {
                        identaData.push( {
                            id: 'PROD6' + index,
                            parent: 'PROD6',
                            name: i18n( 'InCaseMojit.medication_modal.text.WEIGHT' ) + ' - ' + item.weight,
                            isLastLeaf: true,
                            isDirectory: false
                        } );
                    }
                    if( item.image ) {
                        identaData.push( {
                            id: 'PROD6' + index,
                            parent: 'PROD6',
                            name: i18n( 'InCaseMojit.medication_modal.text.IMAGE' ),
                            imageSrc: item.image,
                            isLastLeaf: true,
                            isDirectory: false
                        } );
                    }
                } );

                return [
                    {
                        id: 'PROD',
                        isDirectory: true,
                        parent: null,
                        name: i18n( 'InCaseMojit.medication_modal.submenu.PRODUCT_INFORMATION' ),
                        children: [
                            {
                                id: 'PROD0',
                                isDirectory: true,
                                parent: 'PROD',
                                name: i18n( 'InCaseMojit.medication_modal.group.AMR' ),
                                children: self.AMRInfo().map( function( item, index ) {
                                    var text, title, limitation;
                                    if( item.title ) {
                                        if( item.fileName && item.regulationTypeCode ) {
                                            if( '7' === item.regulationTypeCode ) {
                                                title = AMR7;
                                            }
                                            if( '12' === item.regulationTypeCode ) {
                                                title = AMR12;
                                            }
                                            if( '101' === item.regulationTypeCode ) {
                                                title = AMR101;
                                            }
                                            title = '<a target="_blank" href="' + self._dataSrc + '/mmi-download/REG' + item.regulationTypeCode + '/' + item.fileName + '"><span>' + title + item.title + '</span> <span class="glyphicon glyphicon-download"></span></a><br>';
                                        }
                                        if( !(item.fileName && item.regulationTypeCode) ) {
                                            title = '<strong>' + item.title + '</strong><br>';
                                        }
                                    }
                                    if( item.text ) {
                                        text = '<span>' + item.text + '</span><br>';
                                    }
                                    if( item.limitation ) {
                                        limitation = '<strong>' + LIMITATION + '</strong> <span>' + item.limitation + '</span>';
                                    }
                                    return {
                                        id: 'PROD0' + index,
                                        parent: 'PROD0',
                                        regulationTypeCode: item.regulationTypeCode,
                                        fileName: item.fileName,
                                        name: (title || '') + (text || '') + (limitation || ''),
                                        isLastLeaf: true,
                                        isDirectory: false
                                    };
                                } )
                            },
                            {
                                id: 'PROD1',
                                isDirectory: true,
                                parent: 'PROD',
                                name: i18n( 'InCaseMojit.medication_modal.group.ARV' ),
                                children: self.ARVInfoTexts().map( function( item, index ) {
                                    var
                                        text;

                                    text = '<strong>' + item.title + '</strong><br>' +
                                           '<span>' + item.datesInfo + '</span><br>' +
                                           '<span>' + item.hint + '</span><br>';

                                    if( item.hasAlternatives ) {
                                        text += '<a>' + ALTERNATIVES + '</a>';
                                    }
                                    return {
                                        id: 'PROD1' + index,
                                        parent: 'PROD1',
                                        arvItem: true,
                                        name: text,
                                        isLastLeaf: true,
                                        isDirectory: false
                                    };
                                } )
                            },
                            {
                                id: 'PROD2',
                                isDirectory: true,
                                parent: 'PROD',
                                name: i18n( 'InCaseMojit.medication_modal.radiobox.ACTIVE_MOLECULE' ),
                                children: self.selectedProduct.activeMolecules().map( function( item, index ) {
                                    return {
                                        id: 'PROD2' + index,
                                        parent: 'PROD2',
                                        name: self.selectedProduct.showActiveMolecule( item ),
                                        isLastLeaf: true,
                                        isDirectory: false
                                    };
                                } )
                            },
                            {
                                id: 'PROD3',
                                isDirectory: true,
                                parent: 'PROD',
                                name: i18n( 'InCaseMojit.medication_modal.group.OTHER_INGREDIENTS' ),
                                children: [
                                    {
                                        id: 'PROD30',
                                        parent: 'PROD3',
                                        name: self.selectedProduct._showOtherMolecules(),
                                        isLastLeaf: true,
                                        isDirectory: false
                                    }]
                            },
                            {
                                id: 'PROD4',
                                isDirectory: true,
                                parent: 'PROD',
                                name: i18n( 'InCaseMojit.medication_modal.group.EQUIVALENCES' ),
                                children: self.selectedProduct.equivalents().map( function( item, index ) {
                                    return {
                                        id: 'PROD4' + index,
                                        parent: 'PROD4',
                                        name: item.name,
                                        isLastLeaf: true,
                                        isDirectory: false
                                    };
                                } )
                            },
                            {
                                id: 'PROD5',
                                isDirectory: true,
                                parent: 'PROD',
                                name: i18n( 'InCaseMojit.medication_modal.group.ATC_CLASSIFICATION' ),
                                children: self.selectedProduct.atc().map( function( item, index ) {
                                    return {
                                        id: 'PROD5' + index,
                                        parent: 'PROD5',
                                        name: item.code + ' - ' + item.name,
                                        atcCode: item.code,
                                        isLastLeaf: true,
                                        isDirectory: false
                                    };
                                } )
                            },
                            {
                                id: 'PROD6',
                                isDirectory: true,
                                parent: 'PROD',
                                name: i18n( 'InCaseMojit.medication_modal.group.IDENTA' ),
                                children: identaData
                            }
                        ]
                    },
                    {
                        id: 'BI',
                        isDirectory: true,
                        parent: null,
                        name: i18n( 'InCaseMojit.medication_modal.submenu.BASIC_INFORMATION' ),
                        children: (basicInfo || []).map( function( item, index ) {
                            return {
                                id: 'BI' + index,
                                isDirectory: false,
                                parent: 'BI',
                                name: item.title,
                                children: [
                                    {
                                        id: 'BI' + index + index,
                                        parent: 'BI' + index,
                                        name: item.content,
                                        isLastLeaf: true,
                                        isDirectory: false
                                    }]
                            };
                        } )
                    },
                    {
                        id: 'SPC',
                        isDirectory: true,
                        parent: null,
                        name: i18n( 'InCaseMojit.medication_modal.submenu.PRESCRIBING_INFORMATION' ),
                        children: (prescribingInfo || []).slice( 1 ).map( function( item, index ) {
                            return {
                                id: 'SPC' + index,
                                isDirectory: false,
                                parent: 'SPC',
                                name: item.title,
                                children: [
                                    {
                                        id:  'SPC' + index + index,
                                        parent: 'SPC' + index,
                                        name: item.content,
                                        isLastLeaf: true,
                                        isDirectory: false
                                    }]
                            };
                        } )
                    }
                ];

            }

            function productRowClick( meta ) {
                var product = meta.row,
                    promisePackage,
                    promiseInfo,
                    pzn;
                //                    promiseProf,
                //                    promiseAMR;
                self.packageKoTable.unSelect();

                self.sectionsList( [{sectionTitle: GO_TO}] );

                if( self.selectedProduct.id !== product.id ) {
                    self.selectedProduct._show( product );
                    self.selectedPackage( null );

                    self.AMRInfo( product.phAMRText );

                    // request for packages
                    self.packageKoTable.masked( true );
                    if( self.packageKoTable.promise ) {
                        Y.log( 'rejecting previous mmi package search', 'debug', NAME );
                        self.packageKoTable.promise.reject( ABORTED );
                    }
                    promisePackage = Y.doccirrus.jsonrpc.api.mmi.getPackagesDetails( {
                        query: {
                            insuranceIknr: iknr,
                            productIdList: [product.id],
                            bsnr: self.bsnr(),
                            lanr: self.lanr()

                        }
                    } );

                    self.packageKoTable.promise = promisePackage;
                    promisePackage.done( function( response ) {
                        if( self.productKoTable.rows() && 0 !== self.productKoTable.rows().length ) {
                            pzn = initPZN || ((self.pznList().length === 1) ? self.pznList()[0] && self.pznList()[0].id : null);
                            if( response && response.data ) {
                                response.data.sort( sortPrice );
                                self.packageKoTable.data( response.data );
                                self.priceHistoryKoTable.data( [] );
                                self.packageKoTable.paging.page( 1 );
                                if( pzn && self.packageKoTable.rows() ) {
                                    self.packageKoTable.rows().forEach( function( row ) {
                                        if( (KoTable.CONST.EMPTY_ROW !== row) && (pzn === row.phPZN) && !self.packageKoTable.isSelected( {row: row} ) ) {
                                            self.packageKoTable.selectRow( {row: row} );
                                            packageRowClick( {row: row} );
                                        }
                                    } );
                                }
                            }
                        }
                    } );
                    promisePackage.always( function() {
                        self.packageKoTable.masked( false );
                        delete self.packageKoTable.promise;
                    } );

                    // request for information(basis, fach)
                    if( self.basicInfo.promise ) {
                        Y.log( 'rejecting previous mmi Basisinformation search', 'debug', NAME );
                        self.basicInfo.promise.reject( ABORTED );
                    }
                    promiseInfo = Y.doccirrus.jsonrpc.api.mmi.getProductInfo( {
                        query: {
                            documentTypeCode: ["BI", "SPC"],
                            productId: product.phImport ? ( product.original && product.original.ORIGINALPRODUCTID ) : product.id
                        }
                    } );
                    self.basicInfo.promise = promiseInfo;

                    promiseInfo.done( function( response ) {
                        if( response && response.data ) {
                            self.profInfo( response.data.SPC || [] );
                            self.basicInfo( response.data.BI || [] );
                        }
                        (response.data.BI || []).forEach( function( section, index ) {
                            self.sectionsList.push( {
                                sectionId: 'BI' + index,
                                sectionTitle: section.title
                            } );
                        } );
                        (response.data.SPC || []).slice( 1 ).forEach( function( section, index ) {
                            self.sectionsList.push( {
                                sectionId: 'SPC' + index,
                                sectionTitle: section.title
                            } );
                        } );
                        self.infoTree.setData( formatDataForTree( response.data.BI, response.data.SPC ) );
                        self.setStandardView();  // all nodes will be expanded by default - standard view
                    } );

                    promiseInfo.always( function() {
                        delete self.basicInfo.promise;
                    } );
                }

            }

            function packageRowClick( meta ) {
                var selectedPackage = meta.row,
                    selectedItem;
                if( self.selectedPackage() && (self.selectedPackage().id === selectedPackage.id) ) {
                    selectedItem = self.getSelected();
                    self.unSelectItem( selectedItem );
                    self.selectedPackage( null );
                } else {
                    self.tabNav.activate( 'productInfo' )();
                    self.selectedPackage( selectedPackage );
                    self.ARVInfoTexts( selectedPackage.phARVText );
                    self.alternativesKoTable.data( selectedPackage.phAlternatives );
                    selectedItem = self.getSelected();
                    self.selectItem( selectedItem );
                    self.infoTree.setData( formatDataForTree( self.basicInfo(), self.profInfo() ) );
                }
            }

            self.tabNav = new MedicationTabNavModel( 'productInfo' );
            self.searchNav = new MedicationTabNavModel( 'basic' );

            self.sectionsList = ko.observableArray( [{sectionTitle: GO_TO}] );
            self.section = ko.observable();
            self.searchInput = ko.observable( '' );
            self.basicInfo = ko.observableArray();
            self.profInfo = ko.observableArray();
            self.productKoTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'CaseFileMojit-DCMedicationSearchModel-productKoTable',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    height: 370,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.mmi.getProductsDetails,
                    baseParams: {query: productKoTableQuery},
                    autoLoad: false,
                    responsive: false,
                    columns: [
                        Y.doccirrus.medicationTableCols.get( 'discountOrAlternative', {
                            preRenderer: function( meta, renderer ) {
                                return renderer( meta, {_defaultMappings: _defaultMappings} );
                            }
                        } ),
                        {
                            forPropertyName: 'title',
                            label: 'Produkt',
                            width: '90%'
                        }
                    ],
                    onRowClick: function( meta ) {
                        var product = meta.row,
                            koTable = this;
                        if( koTable.isSelected( product ) ) {
                            // disable functionality to unselect item
                            return false;
                        }
                        productRowClick( meta );
                    }
                }
            } );
            self._addDisposable( ko.computed( function() {
                var rows = self.productKoTable.rows(),
                    rowsFiltered = [];
                if( rows && 0 < rows.length ) {

                    rowsFiltered = rows.filter( function( row ) {
                        if( KoTable.CONST.EMPTY_ROW !== row ) {
                            return true;
                        } else {
                            return false;
                        }
                    } );

                }
                resetProductInfo();
                if( 1 === rowsFiltered.length ) {
                    if( !self.productKoTable.isSelected( rowsFiltered[0] ) ) {
                        self.productKoTable.selectRow( {row: rowsFiltered[0]} );
                    }
                    if( self.selectedProduct.id !== rowsFiltered[0].id ) {
                        productRowClick( {row: rowsFiltered[0]} );
                    }
                }
            } ) );

            function rendererPrice( meta ) {
                if( !meta.value && 0 !== meta.value ) {
                    return '';
                }
                return Y.doccirrus.comctl.numberToLocalString( meta.value );
            }

            function sortPrice( a, b ) {
                return Y.doccirrus.comctl.dcSubtraction( a.phPriceSale, b.phPriceSale );
            }

            self.packageKoTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'CaseFileMojit-DCMedicationSearchModel-packageKoTable',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    limit: 5,
                    responsive: false,
                    height: 180,
                    columns: [
                        Y.doccirrus.medicationTableCols.get( 'discountOrAlternative', {
                            preRenderer: function( meta, renderer ) {
                                return renderer( meta, {_defaultMappings: _defaultMappings} );
                            }
                        } ),
                        {
                            forPropertyName: 'title',
                            label: 'Packungen',
                            width: '45%'
                        },
                        Y.doccirrus.medicationTableCols.get( 'phPatPay', {
                            preRenderer: function( meta, renderer ) {
                                return renderer( meta, {selected: self.getSelected(), patient: patient} );
                            }
                        } ),
                        Y.doccirrus.medicationTableCols.get( 'phPriceSale' ),
                        Y.doccirrus.medicationTableCols.get( 'phPriceRecommended' ),
                        Y.doccirrus.medicationTableCols.get( 'phFixedPay' ),
                        Y.doccirrus.medicationTableCols.get( 'fbDiff' ),
                        Y.doccirrus.medicationTableCols.get( 'phRefundAmount' ),
                        {
                            forPropertyName: 'phPZN',
                            label: 'PZN',
                            title: 'Pharmazentralnummer',
                            description: 'Pharmazentralnummer (PZN)',
                            width: '10%'
                        },
                        Y.doccirrus.medicationTableCols.get( 'phSalesStatus' ),
                        Y.doccirrus.medicationTableCols.get( 'phNormSize' ),
                        {
                            forPropertyName: 'phPackSize',
                            label: 'Packungsgröße',
                            title: 'Packungsgröße',
                            width: '10%'
                        }
                    ],
                    onRowClick: function( meta ) {
                        packageRowClick( meta );
                    }

                }
            } );

            self.priceComparisonKoTable = new MedicationPriceComparisonModel( {
                _defaultMappings: _defaultMappings,
                getContext: function() {
                    return {getSelected: self.getSelected, patient: patient};
                },
                onRowClick: function( meta ) {
                    var selectedPackage = meta.row;
                    if( selectedPackage.phPZN && selectedPackage.phCompany ) {
                        reset();
                        resetSearch();
                        self.pznList( [
                            {
                                id: selectedPackage.phPZN,
                                text: selectedPackage.phPZN
                            }
                        ] );
                    }
                }
            } );

            self.tabNav.activeTab.subscribe( function( val ) {
                if( val === 'priceComparison' ) {
                    self.priceComparisonKoTable.priceComparisonDiscount( false );
                } else if( val === 'cheaperProducts' ) {
                    self.priceComparisonKoTable.priceComparisonDiscount( true );
                }
            } );

            self.alternativesKoTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'CaseFileMojit-DCMedicationSearchModel-alternativesKoTable',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    height: 180,
                    columns: [
                        Y.doccirrus.medicationTableCols.get( 'discountOrAlternative', {
                            preRenderer: function( meta, renderer ) {
                                return renderer( meta, {_defaultMappings: _defaultMappings} );
                            }
                        } ),
                        {
                            forPropertyName: 'title',
                            label: 'Packungen',
                            width: '55%'
                        },
                        Y.doccirrus.medicationTableCols.get( 'phPatPay', {
                            preRenderer: function( meta, renderer ) {
                                return renderer( meta, {selected: self.getSelected(), patient: patient} );
                            }
                        } ),
                        Y.doccirrus.medicationTableCols.get( 'phPriceSale' ),
                        Y.doccirrus.medicationTableCols.get( 'phFixedPay' ),
                        {
                            forPropertyName: 'phPZN',
                            label: 'PZN',
                            title: 'Pharmazentralnummer',
                            description: 'Pharmazentralnummer (PZN)',
                            width: '10%'
                        },
                        Y.doccirrus.medicationTableCols.get( 'phRefundAmount', {
                            isSortable: false,
                            sortBy: null
                        } )
                    ],
                    onRowClick: function( meta ) {
                        var selectedPackage = meta.row;
                        if( selectedPackage.phPZN ) {
                            reset();
                            resetSearch();
                            self.pznList( [
                                {
                                    id: selectedPackage.phPZN,
                                    text: selectedPackage.phPZN
                                }
                            ] );
                        }
                    }
                }
            } );

            self.priceHistoryKoTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'CaseFileMojit-DCMedicationSearchModel-priceHistoryKoTable',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    height: 180,
                    columns: [
                        {
                            forPropertyName: 'date',
                            label: 'Datum',
                            width: '40%'
                        },
                        {
                            forPropertyName: 'price',
                            label: 'Preis',
                            renderer: rendererPrice,
                            isSortable: true,
                            sortBy: 'number',
                            width: '60%'
                        }
                    ]
                }
            } );
            self.packageSearchKoTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'CaseFileMojit-DCMedicationSearchModel-packageSearchKoTable',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    height: 180,
                    remote: true,
                    baseParams: {query: packageSearchKoTableQuery},
                    proxy: Y.doccirrus.jsonrpc.api.mmi.getPackagesDetails,
                    autoLoad: false,
                    columns: [
                        Y.doccirrus.medicationTableCols.get( 'discountOrAlternative', {
                            preRenderer: function( meta, renderer ) {
                                return renderer( meta, {_defaultMappings: _defaultMappings} );
                            }
                        } ),
                        {
                            forPropertyName: 'title',
                            label: 'Packungen',
                            width: '45%'
                        },
                        Y.doccirrus.medicationTableCols.get( 'phPatPay', {
                            preRenderer: function( meta, renderer ) {
                                return renderer( meta, {selected: self.getSelected(), patient: patient} );
                            }
                        } ),
                        Y.doccirrus.medicationTableCols.get( 'phPriceSale', {
                            isSortable: false,
                            sortBy: null
                        } ),
                        Y.doccirrus.medicationTableCols.get( 'phPriceRecommended' ),
                        Y.doccirrus.medicationTableCols.get( 'phFixedPay', {
                            isSortable: false,
                            sortBy: null
                        } ),
                        Y.doccirrus.medicationTableCols.get( 'fbDiff', {
                            isSortable: false,
                            sortBy: null
                        } ),
                        Y.doccirrus.medicationTableCols.get( 'phRefundAmount', {
                            isSortable: false,
                            sortBy: null
                        } ),
                        {
                            forPropertyName: 'phPZN',
                            label: 'PZN',
                            title: 'Pharmazentralnummer',
                            description: 'Pharmazentralnummer (PZN)',
                            width: '10%'
                        },
                        Y.doccirrus.medicationTableCols.get( 'phIngr' ),
                        Y.doccirrus.medicationTableCols.get( 'phIngrOther' ),
                        Y.doccirrus.medicationTableCols.get( 'phForm' ),
                        Y.doccirrus.medicationTableCols.get( 'phSalesStatus' ),
                        Y.doccirrus.medicationTableCols.get( 'phNormSize' ),
                        {
                            forPropertyName: 'phPackSize',
                            label: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.PACK_SIZE' ),
                            title: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.PACK_SIZE' ),
                            width: '10%'
                        }
                    ],
                    onRowClick: function( meta ) {
                        var selectedPackage = meta.row,
                            koTable = this;

                        if( !koTable.isSelected( selectedPackage ) ) {
                            resetSearch();
                            self.pznList( [
                                {id: selectedPackage.phPZN, text: selectedPackage.phPZN}
                            ] );
                            self.searchNav.activate( 'basic' )();
                        }
                    }

                }
            } );

            self.clearSearchInput = function() {
                self.searchInput( '' );
            };

            self.openSection = function() {
                var sectionToGo = self.section(),
                    nodeToGo;

                if( sectionToGo ) {
                    collapseNodeAndAllChildren( self.infoTree.root );

                    nodeToGo = self.infoTree.root.getNodeById( sectionToGo );

                    if( nodeToGo ) {
                        if( nodeToGo.parent ) {
                            nodeToGo.parent.expand();
                        }
                        nodeToGo.expand();
                    }
                }
                return;
            };

            self.searchInputParts = ko.computed( function() {
                var searchInput = self.searchInput();
                if( !searchInput ) {
                    return [];
                }
                return splitSearchInput( searchInput ).map( function( part ) {
                    return new RegExp( part, 'ig' );
                } );
            } );

            function onError( response ) {
                var
                    errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

                if( errors.length ) {
                    _.invoke( errors, 'display' );
                }
            }

            function splitSearchInput( text ) {
                var parts = (text || '').split( ' ' ).map( function( part ) {
                    return part.trim();
                } );

                parts = _.uniq( parts );
                return parts;
            }

            function textFormatter( text, entry ) {
                var
                    parts = self.searchInputParts();

                if( !text ) {
                    return text;
                }

                parts.forEach( function( part ) {
                    text = text.replace( part, '<mark>$&</mark>' );
                } );

                if( text && entry && entry.imageSrc ) {
                    text = '<img src="' + self._dataSrc + '/mmi-download/IDENTA/' + entry.imageSrc + '">';
                }

                if( text && entry && entry.atcCode ) {
                    text = '<a>' + entry.name + '</a>';
                }

                return text;
            }

            self.setDataMapper = function( node ) {
                var self = this,
                    parts = peek( self.searchInputParts ),
                    expanded;

                function checkNode( node, parts ) {
                    var str,
                        passed = false;

                    if( node.name ) {
                        str = node.name;
                        passed = parts.some( function( part ) {
                            return null !== str.match( part );
                        } );
                    }
                    if( !passed && node.children ) {
                        return node.children.some( function( child ) {
                            return checkNode( child, parts );
                        } );
                    }

                    return passed;
                }

                if( node.children && node.children.length ) {
                    expanded = node.children.some( function( child ) {
                        return checkNode( child, parts );
                    } );
                } else {
                    expanded = checkNode( node, parts );
                }

                if( !parts || !parts.length ) {
                    if( node.children && node.children.length ) {
                        expanded = node.children.some( function( child ) {
                            return self.isExpanded( child.id );
                        } );
                    } else {
                        expanded = self.isExpanded( node.id );
                    }
                }

                return {
                    id: node.id,
                    text: node.name || 'n/a',
                    totalCount: 0,
                    entry: node,
                    expanded: expanded,
                    children: node.children ? [] : false
                };
            };

            function expandNodeAndAllChildren( node ) {
                if( node.hasChildren() ) {
                    peek( node.children ).forEach( function( child ) {
                        expandNodeAndAllChildren( child );
                    } );
                }
                node.expand();
                self.infoTree.updateOpenNodes( node );
            }

            function collapseNodeAndAllChildren( node ) {
                if( node.hasChildren() ) {
                    peek( node.children ).forEach( function( child ) {
                        collapseNodeAndAllChildren( child );
                    } );
                }
                node.collapse();
                self.infoTree.updateOpenNodes( node );
            }

            function getExpandedNodes( node ) {
                var openChildren = [];
                if( peek( node.expanded ) ) {
                    if( node.hasChildren() ) {
                        peek( node.children ).forEach( function( child ) {
                            openChildren.push( getExpandedNodes( child ) );
                        } );
                    }
                    if( openChildren && openChildren.length ) {
                        node.expandedChildren = openChildren.filter( Boolean );
                    }
                    if( node.entry.isLastLeaf ) {
                        return {
                            parent: node.entry.parent,
                            name: node.entry.name
                        };
                    }
                    return {
                        id: node.entry.id,
                        parent: node.entry.parent,
                        name: node.entry.name,
                        expandedChildren: node.expandedChildren
                    };
                } else {
                    if( node.getParent().expanded() && !node.hasChildren() && !node.id ) {
                        return {
                            id: node.entry.id,
                            parent: node.entry.parent,
                            name: node.entry.name
                        };
                    }
                    return;
                }
            }

            self.expandAll = function() {
                expandNodeAndAllChildren( self.infoTree.root );
            };

            self.collapseAll = function() {
                collapseNodeAndAllChildren( self.infoTree.root );
            };

            self.setStandardView = function() {
                expandNodeAndAllChildren( self.infoTree.root );
            };

            self.printInfo = function() {
                var
                    openNodes = self.infoTree.root.children().map( getExpandedNodes ).filter( Boolean ),

                    formOptions = {
                        'patientRegId': '',             //  used by PUC proxy, not applicable here
                        'canonicalId': '',              //  formtemplate with role 'casefile-terminliste',
                        'formVersionId': '',            //  latest version of this form
                        'il8nDict': {},                 //  not used at present
                        'doRender': true,              //  we will call template.render after load
                        'mapperName': 'infotree',        //  type of form mapper driving this form
                        'width': 500
                    },
                    mapData = {                   //  objects which mapper will use to populate the form
                        'MedicationInfoTree': openNodes
                    },
                    template;

                async.series(
                    [
                        getFormIDFromRole,
                        getFormMeta,
                        createTreeFormTemplate,
                        mapDataToTemplate
                    ],
                    onEventListReady
                );

                function getFormIDFromRole( itcb ) {
                    function onFormLookup( err, formId ) {

                        if( err || '' === formId ) {
                            itcb( new Error( 'No form assigned to role medication-info-tree' ) );
                            return;
                        }

                        formOptions.canonicalId = formId;
                        itcb( null );
                    }

                    Y.log( 'Querying config for info-tree Form', 'debug', NAME );
                    Y.dcforms.getConfigVar( '', 'medication-info-tree', false, onFormLookup );
                }

                function getFormMeta( itcb ) {
                    function onFormMetaLoaded( err, formMeta ) {

                        if( err ) {
                            itcb( new Error( 'Info tree form metadata could not be loaded' ) );
                            return;
                        }

                        formOptions.formVersionId = formMeta.latestVersionId;
                        itcb( null );
                    }

                    Y.dcforms.getFormListing( '', formOptions.canonicalId, onFormMetaLoaded );
                }

                //  (4) instantiate and load the form
                function createTreeFormTemplate( itcb ) {
                    formOptions.callback = function onFormTemplateCreated( err, newFormTemplate ) {
                        template = newFormTemplate || null;
                        itcb( err );
                    };

                    Y.dcforms.createTemplate( formOptions );
                }

                //  (5) map the data to template
                function mapDataToTemplate( itcb ) {
                    template.map( mapData, true, itcb );
                }

                function onEventListReady( err ) {
                    if( err ) {
                        Y.log( 'Could not render calender event list form: ' + JSON.stringify( err ), 'warn', NAME );
                        return;
                    }

                    template.renderPdfServer( 'temp', '', 'Infotree', onDocumentReady );

                    function onDocumentReady( err, formForPDF ) {
                        if( err ) {
                            return;
                        }

                        //  call formtemplate API via REST
                        Y.doccirrus.comctl.privatePost( '1/media/:makepdf', {'document': formForPDF}, onPDFRenderedAlt );
                    }

                    function onPDFRenderedAlt( err, data ) {

                        data = data.data ? data.data : data;

                        if( err || !data || !data.tempId || '' === data.tempId ) {
                            Y.log( 'Could not generate PDF: ' + JSON.stringify( err ), 'warn', NAME );
                            Y.doccirrus.DCWindow.notice( {
                                type: 'info',
                                message: i18n( 'InCaseMojit.casefile_browser.print.menuitem.COULD_NOT_PRINT_CAL' )
                            } );
                        }

                        var
                            tempId = data.tempId,
                            relUrl = '/pdf/' + tempId.split( '/' ).pop();

                        Y.doccirrus.modals.printPdfModal.show( {
                            'documentUrl': relUrl,
                            'documentFileName': relUrl.replace( '/pdf/', '' ),
                            'cacheFile': relUrl,
                            'canonicalId': template.canonicalId
                        } );
                    }
                }
            };

            self.infoTree = KoComponentManager.createComponent( {
                componentType: 'KoTree',
                componentConfig: {
                    remote: false,
                    onError: onError,
                    setDataMapper: self.setDataMapper.bind( self ),
                    textFormatter: textFormatter,
                    enableDragDrop: false,
                    useToggleToExpand: true,
                    onClick: function( node, event ) {
                        var
                            isDblClick = 'dblclick' === event.type,
                            atcItemClick = node.entry && Boolean( node.entry.atcCode ),
                            arvItemClick = node.entry && Boolean( node.entry.arvItem ),
                            fileNameClick = node.entry && Boolean( node.entry.fileName && node.entry.regulationTypeCode );

                        if( fileNameClick ) {
                            window.open( self._dataSrc + '/mmi-download/REG' + node.entry.regulationTypeCode + '/' + node.entry.fileName, '_blank' );
                            return;
                        }
                        if( atcItemClick ) {
                            self.searchATC( node.entry.atcCode )();
                            return;
                        }
                        if( arvItemClick ) {
                            self.tabNav.activate( 'alternatives' );
                            return;
                        }
                        if( event ) {
                            event.stopPropagation();
                            event.preventDefault();
                        }
                        if( isDblClick ) {
                            if( peek( node.expanded ) ) {
                                collapseNodeAndAllChildren( node );
                            } else {
                                expandNodeAndAllChildren( node );
                            }
                        } else {
                            if( peek( node.expanded ) ) {
                                node.collapse();
                            } else {
                                if( node.hasChildren() && !( peek( node.children ).some( function( childNode ) { return childNode.hasChildren();} ))) {
                                    expandNodeAndAllChildren( node );
                                }
                                node.expand();
                            }
                            self.infoTree.updateOpenNodes( node );
                        }
                    },
                    iconSet: {
                        file: '',
                        open: 'fa fa-caret-down',
                        closed: 'fa fa-caret-right'
                    }
                }
            } );

            self.standardViewBtn = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'STANDARD_VIEW_BTN',
                    option: 'PRIMARY',
                    text: i18n( 'InCaseMojit.medication_modal.button.STANDARD_VIEW' ),
                    click: function() {
                        self.setStandardView();
                    }
                }
            } );
            self.expandAllBtn = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'EXPAND_ALL_BTN',
                    option: 'PRIMARY',
                    text: i18n( 'InCaseMojit.medication_modal.button.EXPAND_ALL' ),
                    click: function() {
                        self.expandAll();
                    }
                }
            } );
            self.collapseAllBtn = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'COLLAPSE_ALL_BTN',
                    option: 'PRIMARY',
                    text: i18n( 'InCaseMojit.medication_modal.button.COLLAPSE_ALL' ),
                    click: function() {
                        self.collapseAll();
                    }
                }
            } );

            self._addDisposable( ko.computed( function() {
                var searchInput = self.searchInput(), //eslint-disable-line
                    computedInitial = ko.computedContext.isInitial();

                if( computedInitial ) {
                    return;
                }
                self.infoTree.setData( formatDataForTree( self.basicInfo(), self.profInfo() ) );
            } ).extend( {rateLimit: {timeout: 1000, method: "notifyWhenChangesStop"}} ) );

            self.productName = ko.observable();
            self.companyName = ko.observable();
            self.companyNameAd = ko.observable();
            self.selectedPackage = ko.observable();
            self.selectedProduct = new ProductViewModel( defaultMappings );
            self.atcList = ko.observableArray();
            self.ingredientList = ko.observableArray();
            self.ingredientStrength = ko.observable();
            self.select2IngredientStrengthHasFocus = ko.observable();
            self.ingredientStrengthValue = ko.observable();
            self.ingredientStrengthValue.hasError = ko.computed( function() {
                return !Y.doccirrus.validations.common._validNumberOrEmpty( self.ingredientStrengthValue() );
            } );
            self.ingredientStrengthValue.validationMessages = ko.observableArray( [NUMBER_ERR] );
            self.ingredientStrengthUnit = ko.observable();
            self.ingredientStrengthUnits = [{id: 'MG', text: 'mg'}, {id: 'G', text: 'g'}, {id: 'ML', text: 'ml'}];
            self.selectedIngredientStrengths = ko.observableArray();
            self.moleculeType = ko.observable( 'activeMono' );
            self.pznList = ko.observableArray();
            self.cheaperPkgs = ko.computed( function() {
                var selectedPackage = self.selectedPackage();
                if( !selectedPackage ) {
                    return;
                }
                return selectedPackage.phCheaperPkg;
            } );
            self.addIngredientStrength = function() {
                var ingredientStrengthValue = self.ingredientStrengthValue(),
                    ingredientStrengthUnit = self.ingredientStrengthUnit(),
                    ingredientStrength = self.ingredientStrength();

                if( !ingredientStrength || !ingredientStrengthUnit ) {
                    return;
                }

                self.selectedIngredientStrengths.push( {
                    id: ingredientStrength.id,
                    text: [ingredientStrength.text, ' ', ingredientStrengthValue, ingredientStrengthUnit.text].join( '' ),
                    value: ingredientStrengthValue,
                    unit: ingredientStrengthUnit.id
                } );

                self.ingredientStrengthValue( null );
                self.ingredientStrength( null );
                self.select2IngredientStrengthHasFocus( true );
            };
            self.removeSelectedIngredientStrength = function( ingredientStrength ) {
                self.selectedIngredientStrengths.remove( ingredientStrength );
            };

            self._addDisposable( ko.computed( function() {
                var productName = self.productName(),
                    companyName = self.companyName(),
                    pznList = self.pznList(),
                    computedInitial = ko.computedContext.isInitial();
                if( computedInitial ) {
                    if( initPZN ) {
                        pznList = [
                            {id: initPZN, text: initPZN}
                        ];
                    }
                } else {
                    initPZN = null;
                }
                if( !productName && !companyName && 0 === pznList.length ) {
                    return;
                }
                reset();
                if( !self.productKoTable.autoLoad() ) {
                    self.productKoTable.autoLoad( true );
                }
                productKoTableQuery( {
                    insuranceIknr: iknr,
                    name: productName,
                    companyName: companyName,
                    patientAge: patient && unwrap( patient.age ),
                    pznList: pznList.map( function( item ) {
                        return item.id;
                    } )
                } );
            } ).extend( {rateLimit: {timeout: 1500, method: "notifyWhenChangesStop"}} ) );

            self._addDisposable( ko.computed( function() {
                var atcList = self.atcList(),
                    ingredientList = self.ingredientList(),
                    selectedIngredientStrengths = self.selectedIngredientStrengths(),
                    moleculeType = self.moleculeType(),
                    moleculeSearchStrengthMode = moleculeType === 'strength',
                    computedInitial = ko.computedContext.isInitial(),
                    companyName = self.companyNameAd(),
                    query;

                if( 0 === atcList.length && (!moleculeSearchStrengthMode && 0 === ingredientList.length || moleculeSearchStrengthMode && 0 === selectedIngredientStrengths.length) && !companyName ) {
                    return;
                }
                if( !computedInitial ) {
                    if( !self.packageSearchKoTable.autoLoad() ) {
                        self.packageSearchKoTable.autoLoad( true );
                    }
                    query = {
                        refinePlainPackage: true,
                        insuranceIknr: iknr,
                        companyName: companyName,
                        atcCodeList: atcList,
                        moleculeType: moleculeType,
                        simple: true,
                        moleculeIdList: moleculeSearchStrengthMode ? [] : ingredientList.map( function( item ) {
                            return item.code;
                        } ),
                        moleculeMassList: !moleculeSearchStrengthMode ? undefined : {
                            "moleculemass": selectedIngredientStrengths.map( function( item ) {
                                return {
                                    "massfrom": item.value,
                                    "moleculeid": item.id,
                                    "moleculeunitcode": item.unit
                                };
                            } )
                        }
                    };
                    packageSearchKoTableQuery( query );
                }
            } ).extend( {rateLimit: {timeout: 1500, method: "notifyWhenChangesStop"}} ) );

            self.getSelected = function() {
                var selectedPackage = self.selectedPackage(),
                    selectedProduct = self.selectedProduct.id ? self.selectedProduct : null;
                if( selectedProduct ) {
                    selectedProduct.AMRInfo = self.AMRInfo();
                }
                return {
                    product: selectedProduct,
                    package: selectedPackage ? {originalData: selectedPackage} : null
                };
            };

            self._addDisposable( ko.computed( function loadPriceComparison() {
                var selectedPackage = self.selectedPackage();
                self.priceComparisonKoTable.setPackage( {selectedPackage: selectedPackage, insuranceIknr: iknr} );
            } ) );
            self._addDisposable( self.selectedPackage.subscribe( function( val ) {
                if( !val ) {
                    return;
                }
                self.priceHistoryKoTable.data( val.phPriceHistory );
            } ) );
            (function() {
                var select2atcCodes = new Y.doccirrus.uam.utils.MedicationATCList( {
                    dataArray: self.atcList,
                    maxresult: maxresult
                } );
                self.select2atcCodes = select2atcCodes;
            })();

            (function() {
                var select2Ingredients = new Y.doccirrus.uam.utils.MedicationIngredientList( {
                    dataArray: self.ingredientList,
                    maxresult: maxresult,
                    exactMatch: true
                } );
                self.select2Ingredients = select2Ingredients;
            })();

            self.select2IngredientStrength = {
                data: ko.computed( {
                    read: function() {
                        return self.ingredientStrength();
                    },
                    write: function( $event ) {
                        self.ingredientStrength( $event.added || null );
                    }
                } ),
                select2: {
                    placeholder: ADD_INGREDIENT,
                    multiple: false,
                    minimumInputLength: 1,
                    query: Y.doccirrus.utils.debounceSelect2Query( function( query ) {
                        Y.doccirrus.jsonrpc.api.mmi.getMolecules( {
                            query: {
                                name: query.term,
                                maxresult: 10
                            }
                        } ).done( function( response ) {
                                var results = response.data && response.data.MOLECULE.map( function( item ) {
                                    return {
                                        id: item.ID,
                                        text: item.NAME
                                    };
                                } );
                                query.callback( {
                                    results: results
                                } );
                            }
                        )
                            .fail( function() {
                                query.callback( {
                                    results: []
                                } );
                            } );
                    }, 750 )
                }
            };

            (function() {
                var select2Pzn = new Y.doccirrus.uam.utils.MedicationPznList( {dataArray: self.pznList} );
                self.select2Pzn = select2Pzn;
            })();

            self.openAtcSearchModal = function() {
                Y.doccirrus.catalogViewer.create( {
                    multiSelect: true,
                    catalogShort: 'ARV-' + peek( self.kv ),
                    modalChooser: true,
                    allowCatalogChange: false,
                    isSelectable: function( entry ) {
                        return entry && entry.atcs && entry.atcs.length;
                    }
                } ).then( function( results ) {
                    results.forEach( function( entry ) {
                        (entry && entry.atcs || []).forEach( function( atcObj ) {
                            self.select2atcCodes.dataArray.push( atcObj.atcCode );
                        } );
                    } );
                } ).catch( function( err ) {
                    Y.log( 'could not pick catalog entry via catalogViewer: ' + err, 'error', NAME );
                } );
            };

            switch( focusInput ) {
                case 'companyNameAd':
                    self.searchNav.activate( 'advanced' )();
                    self.companyNameAdHasFocus( true );
                    break;
                case 'atcList':
                    self.searchNav.activate( 'advanced' )();
                    self.atcListHasFocus( true );
                    break;
                case 'ingredientList':
                    self.searchNav.activate( 'advanced' )();
                    self.ingredientListHasFocus( true );
                    break;
                case 'productName':
                    self.productNameHasFocus( true );
                    break;
                case 'companyName':
                    self.companyNameHasFocus( true );
                    break;
                case 'pznList':
                default:
                    self.pznListHasFocus( true );
                    break;
            }

        };

        Y.namespace( 'doccirrus.uam' ).MedicationSearchModel = MedicationSearchModel;
    },
    '0.0.1', {
        requires: [
            'dcviewmodel',
            'JsonRpcReflection-doccirrus',
            'KoUI-all',
            'dc-comctl',
            'printpdf-modal',
            'dcforms-map-infotree',
            'dcvalidations',
            'MedicationTableCols',
            'MedicationPriceComparisonModel'
        ]
    }
)
;
