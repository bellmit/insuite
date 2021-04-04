/*
 @author: pi
 @date: 2014/09/22
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, _ */

'use strict';

YUI.add( 'DCCatalogUsageModal', function( Y, NAME ) {

        var i18n = Y.doccirrus.i18n,
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,
            SAVE_ERROR = i18n( 'IncaseAdminMojit.catalogusage_modal_clientJS.message.SAVE_ERROR' ),
            COPY_ERROR = i18n( 'IncaseAdminMojit.catalogusage_modal_clientJS.message.COPY_ERROR' ),
            EXIST_INFO = i18n( 'IncaseAdminMojit.catalogusage_modal_clientJS.message.EXIST_INFO' ),
            ADD_MODAL_TITLE = i18n( 'IncaseAdminMojit.catalogusage_modal_clientJS.title.ADD_MODAL_TITLE' ),
            EDIT_MODAL_TITLE = i18n( 'IncaseAdminMojit.catalogusage_modal_clientJS.title.EDIT_MODAL_TITLE' ),
            EDIT_BATCH_MODAL_TITLE = i18n( 'IncaseAdminMojit.catalogusage_modal_clientJS.title.EDIT_BATCH_MODAL_TITLE' ),
            COPY_MODAL_TITLE = i18n( 'IncaseAdminMojit.catalogusage_modal_clientJS.title.COPY_MODAL_TITLE' ),
            BTN_ADD = i18n( 'IncaseAdminMojit.catalogusage_modal_clientJS.button.ADD' ),
            BTN_COPY = i18n( 'IncaseAdminMojit.catalogusage_modal_clientJS.button.COPY' ),
            SELECT_CATALOG = i18n( 'IncaseAdminMojit.catalogusage_modal_clientJS.placeholder.SELECT_CATALOG' ),
            SELECT_LOCATION = i18n( 'IncaseAdminMojit.catalogusage_modal_clientJS.placeholder.SELECT_LOCATION' ),
            SELECT_CODE = i18n( 'IncaseAdminMojit.catalogusage_modal_clientJS.placeholder.SELECT_CODE' );

        function CatalogUsageEditModel( config ) {
            var self = this;
            Y.doccirrus.uam.ViewModel.mixDisposable( self );
            self.initEditModel( config );
            self.initAttrModel( config );
        }

        CatalogUsageEditModel.prototype = {
            initEditModel: function( config ) {
                var self = this;
                self.mainText1I18n = i18n( 'IncaseAdminMojit.catalogusage_edit_modal.text.MAIN_TEXT1' );
                self.mainText2I18n = i18n( 'IncaseAdminMojit.catalogusage_edit_modal.text.MAIN_TEXT2' );
                self.labelTagsI18n = i18n( 'IncaseAdminMojit.incase_tab_catalogsJS.label.TAGS' );
                self.labelPZNI18n = i18n( 'IncaseAdminMojit.incase_tab_catalogsJS.label.PZN' );
                self.labelAliasI18n = i18n( 'IncaseAdminMojit.incase_tab_catalogsJS.label.ALIAS' );
                self.labelLabelI18n = i18n( 'IncaseAdminMojit.incase_tab_catalogsJS.label.LABEL' );
                self.labelNoteI18n = i18n( 'IncaseAdminMojit.incase_tab_catalogsJS.label.NOTE' );
                self.labelReasonI18n = i18n( 'IncaseAdminMojit.incase_tab_catalogsJS.label.REASON' );
                self.priceI18n = i18n( 'InCaseMojit.casefile_browserJS.placeholder.PRICE' );
                self.factorI18n = i18n( 'InCaseMojit.casefile_browserJS.placeholder.FACTOR' );
                self.totalI18n = i18n( 'InCaseMojit.casefile_browserJS.placeholder.TOTAL' );
                self.descriptionI18n = i18n( 'InCaseMojit.casefile_browserJS.placeholder.DESCRIPTION' );
                self.explanationsI18n = i18n( 'InCaseMojit.casefile_browserJS.placeholder.EXPLANATIONS' );
                self.initSelect2Tag( config );
            },
            /**
             * init select2 for tag
             * @method initSelect2Tag
             */
            initSelect2Tag: function( data ) {
                var self = this;
                self._tags = ko.observableArray( data.tags || [] );
                if( data.catalogShort ) {
                    self.catalogShort = ko.observable( data.catalogShort );
                }
                (function() {
                    var
                        _select2tags = new Y.doccirrus.uam.utils.CatalogUsageTagList( {
                            dataArray: self._tags,
                            catalogShort: self.catalogShort
                        } );
                    self._select2tags = _select2tags;
                    self._addDisposable( _select2tags.data );
                })();

            },

            initAttrModel: function( data ) {
                var self = this,
                    publicBillingFactor = data.publicBillingFactor,
                    validation = Y.doccirrus.validations.common.validNumber[0],
                    mandatory = Y.doccirrus.validations.common.mandatory[0],
                    catalogsWithBillingFactor = [ 'UVGOÄ', 'GebüH', 'GOÄ' ],
                    factor;
                if('EBM' === data.catalogShort){
                    factor = publicBillingFactor && publicBillingFactor.factor;
                } else {
                    factor = data.billingFactorValue;
                }
                self.showPrice = ko.observable( 'ICD-10' !== data.catalogShort );
                self.showFactorAndTotal = ko.observable( 'EBM' !== data.catalogShort );
                self.value = ko.observable();
                self.value.validationMessages = ko.observableArray( [validation.msg] );
                self.value.hasError = ko.computed( function() {
                    var
                        isValid = validation.validator( Y.doccirrus.comctl.localStringToNumber( self.value() ) );
                    return !isValid || !self.value();
                } );
                self._addDisposable( ko.computed( function() {
                        var price = data.value,
                            catalogShort = data.catalogShort,
                            actualUnit,
                            priceItem;

                        if( 'MMI' === data.catalogShort ) {
                            price = data.phPriceSale;
                        } else if( data.catalog ) {
                            switch( catalogShort ) {
                                case 'UVGOÄ':
                                    price = data.u_extra && data.u_extra.tarifvertrag && data.u_extra.tarifvertrag.bg_ahb;
                                    break;
                                case 'GebüH':
                                    price = data.u_extra && data.u_extra.pkv1;
                                    break;
                                case 'GOÄ':
                                    if( 'bewertung_liste' === data.unit && data.u_extra && data.u_extra.bewertung_liste && data.u_extra.bewertung_liste[ 0 ] ) {
                                        actualUnit = data.u_extra.bewertung_liste[ 0 ].unit;
                                    } else {
                                        actualUnit = data.unit;
                                    }

                                    if( 'bewertung_liste' === data.value && data.u_extra && data.u_extra.bewertung_liste && data.u_extra.bewertung_liste[ 0 ] ) {
                                        price = data.u_extra.bewertung_liste[ 0 ].value || 0;
                                        if( 'Punkte' === actualUnit ) {
                                            price = Y.doccirrus.comctl.dcMul( price, Y.doccirrus.schemas.activity.goaeInvoiceFactor );
                                        }
                                    } else {
                                        price = data.value || 0;
                                        if( 'Punkte' === actualUnit ) {
                                            price = Y.doccirrus.comctl.dcMul( price, Y.doccirrus.schemas.activity.goaeInvoiceFactor );
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
                                            price = priceItem && priceItem.value;
                                        } else {
                                            price = Y.doccirrus.comctl.dcMul( priceItem && priceItem.value, publicBillingFactor && publicBillingFactor.factor );
                                        }
                                    } else {
                                        if( 'Punkte' === actualUnit ) {
                                            price = Y.doccirrus.comctl.dcMul( data.value, publicBillingFactor && publicBillingFactor.factor );
                                        } else {
                                            price = data.value;
                                        }
                                    }
                                    break;
                                default:
                                    price = data.value || data.price;
                            }
                        } else {
                            price = data.value || data.price;
                        }
                        price = Y.doccirrus.comctl.numberToLocalString( price );
                        return self.value( price );
                    }
                ) );

                var medicationsEntry = ( 'MMI' === data.catalogShort ) || ( 'HCI' === data.catalogShort );
                self.isMMIEntry = ko.observable( medicationsEntry );

                if( medicationsEntry ) {
                    self.phPZN = ko.observable( data.phPZN );
                    self.seq = ko.observable( data.seq );
                    self.phNLabel = ko.observable( data.phNLabel );
                    self.phNote = ko.observable( data.phNote );
                    self.phReason = ko.observable( data.phReason );
                }
                self.billingFactorValue = ko.observable( factor );
                self._displayBillingFactorValue = ko.computed( Y.doccirrus.comctl.simpleHelperPriceComputed( self.billingFactorValue, {decimals: 4} ) );
                self._displayBillingFactorValue.validationMessages = ko.observableArray( [validation.msg] );
                self._displayBillingFactorValue.hasError = ko.computed( function() {
                    var
                        isValid = -1 === catalogsWithBillingFactor.indexOf( peek( self.catalogShort ) ) || validation.validator( self.billingFactorValue() );
                    return !isValid;
                } );

                self.title = ko.observable( data.title );
                self.title.validationMessages = ko.observableArray( [mandatory.msg] );
                self.title.hasError = ko.computed( function() {
                    var
                        isValid = mandatory.validator( self.title() );
                    return !isValid;
                } );
                self.explanations = ko.observable( data.explanations );

                self.total = ko.observable();
                self._addDisposable( ko.computed( {
                    read: function() {
                        var billingFactorValue = self.billingFactorValue() || 0,
                            value = Y.doccirrus.comctl.localStringToNumber( self.value() ) || 0;

                        return self.total( Y.doccirrus.comctl.numberToLocalString( ( billingFactorValue * value ).toFixed( 2 ) ) );
                    }
                } ) );
                self._isValid = ko.computed( function() {
                    return !unwrap( self._displayBillingFactorValue.hasError ) && !unwrap( self.value.hasError ) &&
                           !unwrap( self.title.hasError );
                } );

                self.changeEnabled = ( 'UVGOÄ' === data.catalogShort ||
                                       'GOÄ' === data.catalogShort || 'GebüH' === data.catalogShort ) && false === data.catalog;
            }
        };

        function showEditDialog( data, callback ) {
            function show() {
                var modal,
                    node = Y.Node.create( '<div></div>' ),
                    catalogUsageModel = new CatalogUsageEditModel( JSON.parse( JSON.stringify( data ) ) );
                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'catalogusage_edit_modal',
                    'IncaseAdminMojit',
                    {},
                    node,
                    function() {
                        function closeModal() {
                            modal.close();
                            ko.cleanNode( node );
                            callback();
                        }

                        function onSaveFail() {
                            Y.log( 'Can not update catalog usage entry with id: ' + catalogUsageModel._id, 'error', NAME );
                            Y.doccirrus.DCWindow.notice( {
                                type: 'error',
                                message: SAVE_ERROR,
                                window: {
                                    width: 'medium'
                                }
                            } );
                            closeModal();
                        }

                        modal = new Y.doccirrus.DCWindow( {
                            className: 'DCWindow-Appointment',
                            bodyContent: node,
                            title: Y.Lang.sub( EDIT_MODAL_TITLE, {
                                code: (data && data.seq) || '',
                                catalog: (data && data.catalogShort) || ''
                            } ),
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            width: Y.doccirrus.DCWindow.SIZE_LARGE,
                            height: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                            minHeight: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                            minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                            centered: true,
                            modal: true,
                            render: document.body,
                            buttons: {
                                header: [ 'close' ],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                    Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                        isDefault: true,
                                        action: function() {
                                            var dataToSave = {
                                                value: Y.doccirrus.comctl.localStringToNumber( peek( catalogUsageModel.value ) ),
                                                billingFactorValue: peek( catalogUsageModel.billingFactorValue ),
                                                title: peek( catalogUsageModel.title ),
                                                explanations: peek( catalogUsageModel.explanations ),
                                                updateAttr: true,
                                                tags: peek( catalogUsageModel._tags )
                                            };

                                            if( peek( catalogUsageModel.isMMIEntry ) ) {
                                                dataToSave = {
                                                    phPZN: peek( catalogUsageModel.phPZN ),
                                                    seq: peek( catalogUsageModel.seq ),
                                                    phNLabel: peek( catalogUsageModel.phNLabel ),
                                                    phNote: peek( catalogUsageModel.phNote ),
                                                    phReason: peek( catalogUsageModel.phReason ),
                                                    updateAttr: true,
                                                    tags: peek( catalogUsageModel._tags )
                                                };
                                            }
                                            if( !data.seqId ) {
                                                closeModal();
                                            }

                                            if( !catalogUsageModel.changeEnabled ) {
                                                delete dataToSave.value;
                                                delete dataToSave.billingFactorValue;
                                            }

                                            Y.doccirrus.jsonrpc.api.catalogusage.updateBySeqId( {
                                                query: {
                                                    _id: data._id
                                                },
                                                data: dataToSave
                                            } ).done( closeModal ).fail( onSaveFail );
                                        }
                                    } )
                                ]
                            },
                            after: {
                                destroy: function() {

                                    if( catalogUsageModel && catalogUsageModel._dispose ) {
                                        catalogUsageModel._dispose();
                                    }
                                }
                            }
                        } );
                        ko.computed( function() {
                            var
                                buttonSave = modal.getButton( 'SAVE' ).button,
                                _isValid = catalogUsageModel._isValid(),
                                enable = false;

                            if( _isValid ) {
                                enable = true;
                            }

                            if( enable ) {
                                buttonSave.enable();
                            } else {
                                buttonSave.disable();
                            }
                        } );
                        ko.applyBindings( catalogUsageModel, node.getDOMNode().querySelector( '#catalogUsageEntry' ) );
                    }
                );
            }

            show();

        }

        function CatalogUsageAddModel( config ) {
            var self = this;
            CatalogUsageAddModel.superclass.constructor.call( self, config );
            self.initAddModel( config );
        }

        Y.extend( CatalogUsageAddModel, CatalogUsageEditModel, {
            /**
             * Contains all available catalogs
             * @property catalogList
             * @type {Array}
             */
            catalogList: null,
            /**
             * jsonrpc function which is used by code autocompleter
             * @property codeSearchFunction
             * @type {Function}
             */
            codeSearchFunction: Y.doccirrus.jsonrpc.api.catalog.read,
            /**
             * @property isMMICatalog
             * @type {ko.computed}
             */
            isMMICatalog: null,
            /**
             * property which is used for MMI catalog displaying
             * @property mmiCode
             * @type {ko.observable}
             */
            mmiCode: null,
            /**
             * * property which is used to store MMI entry to pass it to the server later
             * @property mmiEntry
             * @type {ko.observable}
             */
            mmiEntry: null,
            /**
             * @method initCatalogUsageAddModel
             * @param {Object} config
             * @param {Array} config.catalogShortList all available catalog short names
             */
            initAddModel: function( config ) {
                var self = this,
                    catalogShortList = config.catalogShortList || [],
                    filteredCatList;
                self.locationList = config.locationList || [];
                self.defaultMappings = config.defaultMappings || {};
                filteredCatList = catalogShortList.filter( function( catalog ) {
                    return 'HMV' !== catalog.short;
                } );


                self.select2Tags = {
                    data: self._addDisposable( ko.computed( {
                        read: function() {
                            var
                                tags = unwrap( self._tags );
                            return tags.map( self.select2TagMapper );
                        },
                        write: function( $event ) {
                            if( Y.Object.owns( $event, 'added' ) ) {
                                self._tags.push( $event.added.id );
                            }
                            if( Y.Object.owns( $event, 'removed' ) ) {
                                self._tags.remove( $event.removed.id );
                            }
                        }
                    } ) ),
                    placeholder: ko.observable( i18n( 'IncaseAdminMojit.incase_tab_catalogsJS.label.TAGS' ) ),
                    select2: {
                        multiple: true,
                        minimumInputLength: 1,
                        createSearchChoice: self.select2TagMapper,
                        formatSelection: function( item ) {
                            return item.text;
                        },
                        query: function( query ) {
                            Y.doccirrus.jsonrpc.api.tag.read( {
                                query: {
                                    type: Y.doccirrus.schemas.tag.tagTypes.CATALOG,
                                    catalogShort: self._catalog && self._catalog() && self._catalog().short,
                                    title: {
                                        $regex: query.term,
                                        $options: 'i'
                                    }
                                },
                                options: {
                                    itemsPerPage: 15
                                },
                                fields: [ 'title' ]
                            } ).done( function( response ) {
                                var data = response && response.data || [],
                                    mergedData = data.map(function( item ){
                                        return item.title;
                                    });
                                query.callback( {
                                    results: mergedData.map( self.select2TagMapper )
                                } );
                            } );
                        }
                    }
                };

                self.catalogList = filteredCatList;
                self.mmiCode = ko.observable();
                self.mmiEntry = ko.observable();

                self.initSelect2Catalog();
                self.initSelect2Code();
                self.initSelect2Location();
                self.mainTextI18n = i18n( 'IncaseAdminMojit.catalogusage_add_modal.text.MAIN_TEXT' );
                self.labelCatalogI18n = i18n( 'IncaseAdminMojit.catalogusage_add_modal.label.CATALOG' );
                self.labelCodesI18n = i18n( 'IncaseAdminMojit.catalogusage_add_modal.label.CODES' );
                self.labelTagsI18n = i18n( 'IncaseAdminMojit.incase_tab_catalogsJS.label.TAGS' );
                self.labelLocationI18n = i18n( 'IncaseAdminMojit.catalogusage_add_modal.label.LOCATION' );
                self.medicationSearchI18n = i18n( 'InCaseMojit.casefile_detail.button.OPEN_MEDICATION_SEARCH' );

                self.isMMICatalog = ko.computed( function() {
                    var
                        catalog = self._catalog && self._catalog();
                    return catalog && 'MMI' === catalog.short;
                } );

                self._openMedicationSearchEnable = ko.computed( function() {
                    return Y.doccirrus.auth.hasAdditionalService( "inScribe" );
                } );

                self._openMedicationSearch = function() {
                    var
                        defaultMappings = self.defaultMappings;
                    Y.doccirrus.modals.medicationModal.showDialog( defaultMappings, {
                            modalTitle: self.medicationSearchI18n
                        }, function( err, selected ) {
                            if( err ) {
                                return Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                            }
                            return new Promise( function( resolve ) {
                                if( selected && selected.package && selected.package.originalData && selected.product && selected.product.originalData ) {
                                    self.mmiCode( selected.package.originalData.phPZN + ' ' + selected.package.originalData.phNLabel );
                                    self.mmiEntry( selected );
                                }
                                resolve();
                            } );
                        }
                    );
                };
            },
            select2TagMapper: function( item ) {
                return {
                    id: item,
                    text: item
                };
            },
            /**
             * @method catalogShortMapper
             * @param {Object} catalog
             * @param {String} catalog.filename
             * @param {String} catalog.short short name
             * @return {Object}
             */
            catalogShortMapper: function( catalog ) {
                if( !catalog ) {
                    return catalog;
                }
                return {
                    filename: catalog.filename,
                    text: catalog.short,
                    id: catalog.short
                };
            },
            /**
             * @method locationMapper
             * @param {Object} location
             * @param {String} location._id
             * @param {String} location.locname
             * @return {Object}
             */
            locationMapper: function( location ) {
                if( !location ) {
                    return location;
                }
                return {
                    text: location.locname,
                    id: location._id,
                    locked: location._locked
                };
            },
            /**
             * init select2 for catalog
             * @method initSelect2Catalog
             */
            initSelect2Catalog: function() {
                var self = this,
                    catalogList = self.catalogList;
                self._catalog = ko.observable();

                self._select2Catalog = {
                    data: ko.computed( {
                        read: function() {
                            var catalog = self._catalog();
                            return self.catalogShortMapper( catalog );
                        },
                        write: function( $event ) {
                            self._catalog( {
                                short: $event.added.id,
                                filename: $event.added.filename
                            } );
                        }
                    } ),
                    select2: {
                        placeholder: SELECT_CATALOG,
                        data: catalogList.map( self.catalogShortMapper )
                    }
                };
                self._addDisposable( self._select2Catalog.data );
            },
            getLocationList: function() {
                return this.locationList.concat( [] );
            },
            /**
             * init select2 for catalog
             * @method initSelect2Catalog
             */
            initSelect2Location: function() {
                var self = this,
                    locationList = self.locationList;
                self.locations = ko.observableArray( self.getLocationList() );

                self.select2Location = {
                    data: self._addDisposable( ko.computed( {
                        read: function() {
                            var locations = unwrap( self.locations );
                            return locations.map( self.locationMapper );
                        },
                        write: function( $event ) {
                            if( Y.Object.owns( $event, 'added' ) ) {
                                self.locations.push( {
                                    _id: $event.added.id,
                                    locname: $event.added.text
                                } );
                            }
                            if( Y.Object.owns( $event, 'removed' ) ) {
                                self.locations.remove( function( item ) {
                                    return item._id === $event.removed.id;
                                } );
                            }
                        }
                    } ) ),
                    select2: {
                        placeholder: SELECT_LOCATION,
                        data: locationList.map( self.locationMapper ),
                        multiple: true
                    }
                };
            },
            /**
             * init select2 for code
             * @method initSelect2Code
             */
            initSelect2Code: function() {
                var self = this;
                self._codes = ko.observableArray();
                self._select2Code = {
                    data: self.select2CodeData(),
                    select2: {
                        placeholder: SELECT_CODE,
                        minimumInputLength: 1,
                        multiple: true,
                        formatResult: function( query ) {
                            return '<div class="dc-formatResult">' + query.text + ' (' + query.catalogShort + ') ' + query.title + '</div>';
                        },
                        query: self.select2CodeQueryFunction.bind( self ),
                        formatSelection: self.select2CodeFormatSelection
                    }
                };
                self._addDisposable( self._select2Code.data );
            },
            /**
             * @method select2CodeFormatSelection
             * @param {Object} code
             * @param {String} code.text
             * @param {String} code.catalogShort
             * @returns {string}
             */
            select2CodeFormatSelection: function( code ) {
                return code.text + ' (' + code.catalogShort + ')';
            },
            /**
             * Provides ko.computed for data property of code select2
             * @method select2CodeData
             * @returns {ko.computed}
             * @see CatalogUsageAddModel.initSelect2Code
             */
            select2CodeData: function() {
                var self = this;
                return ko.computed( {
                    read: function() {
                        var codes = self._codes();
                        return codes || [];
                    },
                    write: function( $event ) {
                        if( Y.Object.owns( $event, 'added' ) ) {
                            self._codes.push( $event.added );
                        }
                        if( Y.Object.owns( $event, 'removed' ) ) {
                            self._codes.remove( $event.removed );
                        }
                    }
                } );
            },
            /**
             * Maps filename to catalog short name
             * @method getShortByFilename
             * @param {String} filename
             * @returns {string}
             */
            getShortByFilename: function( filename ) {
                var
                    self = this,
                    catalogShort = '',
                    catalogList = self.catalogList || [];
                catalogList.some( function( catalogData ) {
                    if( filename === catalogData.filename ) {
                        catalogShort = catalogData.short;
                        return true;
                    }
                    return false;
                } );
                return catalogShort;
            },
            /**
             * Provides query function for code select2
             * @method select2CodeQueryFunction
             * @param {Object} query
             */
            select2CodeQueryFunction: function( query ) {
                var self = this,
                    catalogDesc = self._catalog(),
                    catalogShort = catalogDesc && catalogDesc.short,
                    catalogRef = catalogDesc && catalogDesc.filename,
                    dbQuery = {};
                try{
                    dbQuery = {
                        $or: [
                            {
                                seq: {
                                    $regex: '^' + query.term,
                                    $options: 'i'
                                }
                            },
                            {
                                title: {
                                    $regex: buildSearchRegExStr(query.term),
                                    $options: 'i'
                                }
                            }
                        ],
                        seq: {
                            $exists: true
                        },
                        catalog: catalogRef
                    };
                } catch(err) { //Means there was exception building a regexp due to invalid chars typed by user. Query normally
                    dbQuery = {
                        seq: {
                            $regex: '^' + query.term,
                            $options: 'i'
                        },
                        catalog: catalogRef
                    };
                }

                self.codeSearchFunction( {
                    query: dbQuery,
                    options: {
                        sort: {
                            unifiedSeq:1
                        }
                    }
                } ).done( function( response ) {
                    var results = response && response.data && response.data.map( function( entry ) {
                            return {
                                id: entry.seq + catalogShort,
                                text: entry.seq,
                                catalogShort: catalogShort || self.getShortByFilename( entry.catalog ),
                                filename: entry.catalog,
                                title: entry.title
                            };
                        } );
                    query.callback( {
                        results: results
                    } );
                } ).fail( function() {
                    query.callback( {
                        results: []
                    } );
                } );

            }
        } );

        function buildSearchRegExStr(term) {
            return "(?=.*"+term.trim().split(" ").join(")(?=.*")+")";
        }

        function showAddDialog( params, callback ) {
            function show() {
                var modal,
                    node = Y.Node.create( '<div></div>' ),
                    catalogUsageAddModel = new CatalogUsageAddModel( {
                        catalogShortList: params.catalogShortList,
                        locationList: params.locationList,
                        defaultMappings: params.defaultMappings
                    } );

                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'catalogusage_add_modal',
                    'IncaseAdminMojit',
                    {},
                    node,
                    function() {
                        modal = new Y.doccirrus.DCWindow( {
                            className: 'DCWindow-Appointment',
                            bodyContent: node,
                            title: ADD_MODAL_TITLE,
                            icleanMarkedActivitiescon: Y.doccirrus.DCWindow.ICON_LIST,
                            width: Y.doccirrus.DCWindow.SIZE_LARGE,
                            height: Y.doccirrus.DCWindow.SIZE_LARGE,
                            minHeight: Y.doccirrus.DCWindow.SIZE_LARGE,
                            minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                            centered: true,
                            modal: true,
                            render: document.body,
                            buttons: {
                                header: [ 'close' ],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                    Y.doccirrus.DCWindow.getButton( 'ADD', {
                                        label: BTN_ADD,
                                        isDefault: true,
                                        action: function() {
                                            var self = this;
                                            if( !catalogUsageAddModel._codes().length && !catalogUsageAddModel.mmiEntry() ) {
                                                self.close();
                                            }
                                            Y.doccirrus.jsonrpc.api.catalogusage.addCodeBatch( {
                                                data: {
                                                    codes: catalogUsageAddModel._codes().map( function( code ) {
                                                        return {
                                                            seq: code.text,
                                                            filename: code.filename
                                                        };
                                                    } ),
                                                    mmiEntry: catalogUsageAddModel.mmiEntry(),
                                                    tags: catalogUsageAddModel._tags(),
                                                    locations: peek( catalogUsageAddModel.locations ).map( function( item ) {
                                                        return item._id;
                                                    } )
                                                }
                                            } ).done( function() {
                                                callback();
                                            } ).fail( function( response ) {
                                                Y.log( 'Can not add entries to catalog usage. Error code:' + response.code + ', message: ' + response.data, 'error', NAME );
                                                Y.doccirrus.DCWindow.notice( {
                                                    type: 'error',
                                                    message: SAVE_ERROR,
                                                    window: {
                                                        width: 'medium'
                                                    }
                                                } );
                                            } ).always( function() {
                                                self.close();
                                            } );
                                        }
                                    } )
                                ]
                            },
                            after: {
                                destroy: function() {

                                    if( catalogUsageAddModel && catalogUsageAddModel._dispose ) {
                                        catalogUsageAddModel._dispose();
                                    }
                                }
                            }
                        } );
                        modal.set( 'focusOn', [] );
                        ko.applyBindings( catalogUsageAddModel, node.getDOMNode().querySelector( '#catalogUsageAdd' ) );
                    }
                );
            }

            show();

        }

        function CatalogUsageEditBatchModel( config ) {
            var self = this;
            Y.doccirrus.uam.ViewModel.mixDisposable( self );
            CatalogUsageEditBatchModel.superclass.constructor.call( self, config );
            self.initCatalogUsageEditBatchModel( config );
        }

        Y.extend( CatalogUsageEditBatchModel, CatalogUsageAddModel, {
            getLocationList: function() {
                return [];
            },
            initSelect2Catalog: function() {
            },
            mapCodeToSelect2Object: function( code ) {
                return {
                    id: code._id,
                    text: code.seq,
                    catalogShort: code.catalogShort
                };
            },
            initSelect2Tag: function() {
                var self = this;
                self._tags = ko.observableArray();
                (function() {
                    var _select2tags = new Y.doccirrus.uam.utils.CatalogUsageTagList( {
                        dataArray: self._tags,
                        tagMapper: function( tag ) {
                            var self = this;
                            self._data.push( {
                                id: tag,
                                text: tag,
                                codes: [],
                                common: true,
                                codesIds: []
                            } );
                        },
                        _select2Mapper: function( item ) {
                            return item;
                        },
                        _formatSelection: function( item ) {
                            var color = item.common ? '' : 'dc-grey',
                                codes = '';
                            if( item.codes && item.codes.length && !item.common ) {
                                codes = item.codes.map( self.select2CodeFormatSelection ).join( ', ' );
                            }
                            return '<span class=' + color + ' title="' + codes + '">' + item.text + '</span>';
                        },
                        _write: function( $event ) {
                            var dataArray = this.dataArray;
                            if( Y.Object.owns( $event, 'added' ) ) {
                                dataArray.push( $event.added );
                            }
                            if( Y.Object.owns( $event, 'removed' ) ) {
                                dataArray.remove( function( item ) {
                                    return $event.removed.id === item.id;
                                } );
                            }
                        },
                        _createSearchChoice: function( term ) {
                            return {
                                id: term,
                                text: term,
                                common: true,
                                codes: []
                            };
                        }
                    } );
                    self._select2tags = _select2tags;
                    self._addDisposable( _select2tags.data );
                })();
            },
            initCatalogUsageEditBatchModel: function( config ) {
                var self = this,
                    checkedCodes = config.checkedCodes,
                    tagsMap = {},
                    distinctLocations = [],
                    distinctCodes = [];
                self.codeEnabled = ko.observable( false );
                self.locationEnabled = ko.observable( false );

                self.editBatchTextI18n = i18n( 'IncaseAdminMojit.catalogusage_modal_clientJS.text.EDIT_BATCH_TEXT' );
                self.labelCodesI18n = i18n( 'IncaseAdminMojit.catalogusage_add_modal.label.CODES' );
                self.editBatchTagI18n = i18n( 'IncaseAdminMojit.catalogusage_modal_clientJS.text.EDIT_BATCH_TAG_TEXT' );
                self.labelTagsI18n = i18n( 'IncaseAdminMojit.incase_tab_catalogsJS.label.TAGS' );
                self.labelLocationI18n = i18n( 'IncaseAdminMojit.catalogusage_add_modal.label.LOCATION' );

                checkedCodes.forEach( function( code ) {
                    if( -1 === distinctLocations.indexOf( code.locationId ) ) {
                        distinctLocations.push( code.locationId );
                    }
                    if( distinctCodes.every( function( item ) {
                            return item.seq !== code.seq || code.catalogShort !== item.catalogShort;
                        } ) ) {
                        distinctCodes.push( code );
                    }
                    code.tags.forEach( function( tag ) {
                        if( !tagsMap[ tag ] ) {
                            tagsMap[ tag ] = {
                                id: tag,
                                text: tag,
                                codes: [],
                                codesIds: [],
                                common: false
                            };
                            self._tags.push( tagsMap[ tag ] );
                        }
                        if( tagsMap[ tag ].codes.every( function( item ) {
                                return item.text !== code.seq || code.catalogShort !== item.catalogShort;
                            } ) ) {
                            tagsMap[ tag ].codes.push( self.mapCodeToSelect2Object( code ) );
                        }

                        tagsMap[ tag ].codesIds.push( code._id );
                        if( checkedCodes.length === tagsMap[ tag ].codes.length ) {
                            tagsMap[ tag ].common = true;
                        }
                    } );

                } );
                self._codes( distinctCodes.map( self.mapCodeToSelect2Object ) );
                self.locationList.forEach( function( location ) {
                    if( -1 !== distinctLocations.indexOf( location._id ) ) {
                        self.locations.push( _.assign( { _locked: true }, location ) );
                    }
                } );

            }
        } );

        function showEditBatchDialog( params, callback ) {
            function show() {
                var modal,
                    node = Y.Node.create( '<div></div>' ),
                    catalogUsageEditBatchModel = new CatalogUsageEditBatchModel( {
                        checkedCodes: params.checkedCodes,
                        locationList: params.locationList
                    } );
                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'catalogusage_edit_batch_modal',
                    'IncaseAdminMojit',
                    {},
                    node,
                    function() {
                        modal = new Y.doccirrus.DCWindow( {
                            className: 'DCWindow-Appointment',
                            bodyContent: node,
                            title: EDIT_BATCH_MODAL_TITLE,
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            width: Y.doccirrus.DCWindow.SIZE_LARGE,
                            height: Y.doccirrus.DCWindow.SIZE_LARGE,
                            minHeight: Y.doccirrus.DCWindow.SIZE_LARGE,
                            minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                            centered: true,
                            modal: true,
                            render: document.body,
                            buttons: {
                                header: [ 'close' ],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                    Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                        label: BTN_ADD,
                                        isDefault: true,
                                        action: function() {
                                            var
                                                self = this,
                                                tags = peek( catalogUsageEditBatchModel._tags ),
                                                codesIds = [];
                                            params.checkedCodes.forEach( function( code ) {
                                                codesIds.push( code._id );
                                            } );
                                            Y.doccirrus.jsonrpc.api.catalogusage.changeTags( {
                                                query: {
                                                    codes: codesIds
                                                },
                                                data: {
                                                    tags: tags,
                                                    locations: peek( catalogUsageEditBatchModel.locations )
                                                }
                                            } ).done( function() {
                                                callback();
                                            } ).fail( function( response ) {
                                                Y.log( 'Can not change tags. Error code:' + response.code + ', message: ' + response.data, 'error', NAME );
                                                Y.doccirrus.DCWindow.notice( {
                                                    type: 'error',
                                                    message: SAVE_ERROR,
                                                    window: {
                                                        width: 'medium'
                                                    }
                                                } );
                                            } ).always( function() {
                                                self.close();
                                            } );
                                        }
                                    } )
                                ]
                            },
                            after: {
                                destroy: function() {

                                    if( catalogUsageEditBatchModel && catalogUsageEditBatchModel._dispose ) {
                                        catalogUsageEditBatchModel._dispose();
                                    }
                                }
                            }

                        } );
                        modal.set( 'focusOn', [] );
                        ko.applyBindings( catalogUsageEditBatchModel, node.getDOMNode().querySelector( '#catalogUsageEditBatch' ) );
                    }
                );
            }

            show();

        }

        function CatalogUsageCopyModel( config ) {
            var self = this;
            Y.doccirrus.uam.ViewModel.mixDisposable( self );
            CatalogUsageEditBatchModel.superclass.constructor.call( self, config );
            self.initCatalogUsageCopyModel( config );
        }

        Y.extend( CatalogUsageCopyModel, CatalogUsageAddModel, {
            getLocationList: function() {
                return [];
            },

            mapCodeToSelect2Object: function( code ) {
                return {
                    id: code._id,
                    text: code.seq,
                    catalogShort: code.catalogShort
                };
            },

            initCatalogUsageCopyModel: function( config ) {
                var self = this,
                    checkedCodes = config.checkedCodes,
                    distinctLocations = [];

                self.codeEnabled = ko.observable( false );
                self.locationEnabled = ko.observable( false );

                self.copyTextI18n = i18n( 'IncaseAdminMojit.catalogusage_modal_clientJS.text.COPY_TEXT' );
                self.labelCodesI18n = i18n( 'IncaseAdminMojit.catalogusage_add_modal.label.CODES' );
                self.labelLocationI18n = i18n( 'IncaseAdminMojit.catalogusage_add_modal.label.LOCATION' );

                checkedCodes.forEach( function( code ) {
                    if( -1 === distinctLocations.indexOf( code.locationId ) ) {
                        distinctLocations.push( code.locationId );
                    }
                } );
                self._codes( checkedCodes.map( self.mapCodeToSelect2Object ) );
                self.locationList.forEach( function( location ) {
                    if( -1 === distinctLocations.indexOf( location._id ) ) {
                        self.locations.push( location );
                    }
                } );

            }
        } );

        function showCopyDialog( params, callback ) {
            function show() {
                var modal,
                    node = Y.Node.create( '<div></div>' ),
                    catalogUsageCopyModel = new CatalogUsageCopyModel( {
                        checkedCodes: params.checkedCodes,
                        locationList: params.locationList
                    } );
                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'catalogusage_copy_modal',
                    'IncaseAdminMojit',
                    {},
                    node,
                    function() {
                        modal = new Y.doccirrus.DCWindow( {
                            className: 'DCWindow-Appointment',
                            bodyContent: node,
                            title: COPY_MODAL_TITLE,
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            width: Y.doccirrus.DCWindow.SIZE_LARGE,
                            height: Y.doccirrus.DCWindow.SIZE_LARGE,
                            minHeight: Y.doccirrus.DCWindow.SIZE_LARGE,
                            minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                            centered: true,
                            modal: true,
                            render: document.body,
                            buttons: {
                                header: ['close'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                    Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                        label: BTN_COPY,
                                        isDefault: true,
                                        action: function() {
                                            var
                                                self = this,
                                                codesIds = [],
                                                locationsIds = [],
                                                locations = (peek( catalogUsageCopyModel.locations ) || []),
                                                locationsObj = {},
                                                message;
                                            params.checkedCodes.forEach( function( code ) {
                                                codesIds.push( code._id );
                                            } );
                                            locations.forEach( function( location ) {
                                                locationsIds.push( location._id );
                                                locationsObj[location._id] = location.locname;
                                            } );
                                            Y.doccirrus.jsonrpc.api.catalogusage.copyBatch( {
                                                data: {
                                                    codeIds: codesIds,
                                                    locationIds: locationsIds
                                                }
                                            } ).done( function( result ) {
                                                if( result && result.data && result.data.exists && result.data.exists.length ) {
                                                    message = EXIST_INFO + '<br/><br/>';
                                                    result.data.exists.forEach( function( code ) {
                                                        message += Y.Lang.sub( code, locationsObj ) + '<br/>';
                                                    } );
                                                    Y.doccirrus.DCWindow.notice( {
                                                        type: 'info',
                                                        message: message,
                                                        window: {
                                                            width: 'medium'
                                                        }
                                                    } );
                                                }
                                                callback();
                                            } ).fail( function( response ) {
                                                Y.log( 'Can not copy catalogusages. Error code:' + response.code + ', message: ' + response.data, 'error', NAME );
                                                Y.doccirrus.DCWindow.notice( {
                                                    type: 'error',
                                                    message: COPY_ERROR,
                                                    window: {
                                                        width: 'medium'
                                                    }
                                                } );
                                            } ).always( function() {
                                                self.close();
                                            } );
                                        }
                                    } )
                                ]
                            },
                            after: {
                                destroy: function() {

                                    if( catalogUsageCopyModel && catalogUsageCopyModel._dispose ) {
                                        catalogUsageCopyModel._dispose();
                                    }
                                }
                            }

                        } );
                        modal.set( 'focusOn', [] );
                        ko.computed( function() {
                            var
                                buttonSave = modal.getButton( 'SAVE' ).button,
                                enable = (catalogUsageCopyModel.locations() || []).length;

                            if( enable ) {
                                buttonSave.enable();
                            } else {
                                buttonSave.disable();
                            }
                        } );
                        ko.applyBindings( catalogUsageCopyModel, node.getDOMNode().querySelector( '#catalogUsageCopy' ) );
                    }
                );
            }

            show();

        }


        function CatalogUsageModal() {

        }

        CatalogUsageModal.prototype = {
            showEditDialog: showEditDialog,
            showAddDialog: showAddDialog,
            showEditBatchDialog: showEditBatchDialog,
            showCopyDialog: showCopyDialog
        };

        Y.namespace( 'doccirrus.modals' ).catalogUsageModal = new CatalogUsageModal();

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'DCWindow'
        ]
    }
)
;
