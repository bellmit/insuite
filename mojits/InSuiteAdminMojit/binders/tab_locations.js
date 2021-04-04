/*global ko, jQuery, $ */

function _fn( Y, NAME ) {
    'use strict';

    var
        peek = ko.utils.peekObservable,
        unwrap = ko.unwrap,
        KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n,
        LocationEditModel = KoViewModel.getConstructor( 'LocationEditModel' ),
        WeeklyTimeModel = KoViewModel.getConstructor( 'WeeklyTimeModel' ),
        viewModel = null,
        beforeUnloadView = null,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager;

    function getSchemaDefaults( schema ) {
        return Object.keys(schema.schema).reduce( function( defaults, key ) {
            var item = schema.schema[key];

            defaults[key] = undefined;

            if( Array.isArray( item ) ) {
                defaults[key] = [];
            } else if( item && item.default ) {
                defaults[key] = item.default;
            }

            return defaults;
        }, {} );
    }

    /**
     * default error notifier
     * @param {Object} response response object with meta
     */
    function fail( response ) {
        var
            errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

        if( errors.length ) {
            Y.Array.invoke( errors, 'display' );
        }

    }

    /**
     * clear handle EditModel modifications when leaving view
     */
    function detachConfirmModifications() {
        if( beforeUnloadView ) {
            beforeUnloadView.detach();
            beforeUnloadView = null;
        }
    }

    /**
     * handle EditModel modifications when leaving view
     */
    function attachConfirmModifications() {
        beforeUnloadView = Y.doccirrus.utils.getMojitBinderByType( 'InSuiteAdminMojit' ).router.on( 'beforeUnloadView', function( yEvent, event ) {
            var
                modifications,
                editing = viewModel && peek( viewModel.editing ),
                isTypeRouter,
                isTypeAppHref;

            if( !(editing && (editing.isNew() || editing.isModified())) ) {
                return;
            }

            isTypeRouter = (event.type === Y.doccirrus.DCRouter.beforeUnloadView.type.router);
            isTypeAppHref = (event.type === Y.doccirrus.DCRouter.beforeUnloadView.type.appHref);

            yEvent.halt( true );

            // no further handling for other kinds
            if( !(isTypeRouter || isTypeAppHref) ) {
                return;
            }

            modifications = Y.doccirrus.utils.confirmModificationsDialog( {
                saveButton: !peek( editing.saveDisabled )
            } );

            modifications.on( 'discard', function() {

                viewModel.editing( null );
                editing.destroy();

                detachConfirmModifications();

                if( isTypeRouter ) {
                    event.router.goRoute();
                }
                if( isTypeAppHref ) {
                    event.appHref.goHref();
                }

            } );

            modifications.on( 'save', function() {

                editing.save().done( function() {

                    detachConfirmModifications();

                    if( isTypeRouter ) {
                        event.router.goRoute();
                    }
                    if( isTypeAppHref ) {
                        event.appHref.goHref();
                    }

                } );

            } );

        } );
    }

    /**
     * read location objects from server
     * @param  {Object[]} parameters location parameters
     * @return {jQuery.Deferred}
     */
    function readLocations( parameters ) {
        parameters.isAdminPanel = true;
        return Y.doccirrus.jsonrpc.api.location
            .read( parameters )
            .then( function( response ) {
                return response && response.data || null;
            } );
    }

    /**
     * This views EditModel
     * @constructor
     */
    function EditModel() {
        EditModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( EditModel, LocationEditModel, {
        initializer: function( config ) {
            var
                self = this,
                stockLocationsData = [],
                SettingsModel = Y.doccirrus.KoViewModel.getConstructor( 'SettingsModel' ),
                countriesList = [{id: 'CH', text: 'Schweiz'}, {id: 'D', text: 'Deutschland'}];


            self.stockLocationTableLoaded = ko.observable( false );
            self.specialitiesList = config.specialitiesList;
            ( peek( self.budgets ) || []).filter( function(el){ return peek( el.type ) === 'MEDICATION'; }).map( function(medBudget){
                self.setSpecialitiesAutocomplete( medBudget, self.specialitiesList );
            } );

            self.initViewModel();

            attachConfirmModifications();
            self.deleteOpenTime = Y.bind( self.deleteOpenTime, self );
            self.deleteOpenTimeDisabled = Y.bind( self.deleteOpenTimeDisabled, self );
            self.initProfilePicture();
            self.showStockLocationsTab = Y.doccirrus.auth.hasAdditionalService( 'inStock' );
            self.isSwitz = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();

            if ( self.showStockLocationsTab ) {
                Y.doccirrus.jsonrpc.api.stocklocation.get({
                    query: {
                        _id: {
                            $in: unwrap( self.stockLocations ) || []
                        }
                    }
                }).done(function ( response ) {
                    stockLocationsData = response.data || [];
                }).fail( fail )
                  .always( function() {
                    self.initStockLocationTable( stockLocationsData );
                });
            }

            //translations
            self.submenuTextI18n = i18n( 'InSuiteAdminMojit.tab_locations.submenu.general.text' );
            self.submenuEmployeesTextI18n = i18n( 'InSuiteAdminMojit.tab_locations.submenu.employees.text' );
            self.submenuBudgetTextI18n = i18n( 'InSuiteAdminMojit.tab_locations.submenu.budget.text' );
            self.submenuOpenTimesTextI18n = i18n( 'InSuiteAdminMojit.tab_locations.submenu.openTimes.text' );
            self.submenuPrintersTextI18n = i18n( 'InSuiteAdminMojit.tab_locations.submenu.printers.text' );
            self.submenuEmailAndFaxTextI18n = i18n( 'InSuiteAdminMojit.tab_locations.submenu.emailAndFax.text' );
            self.submenuStockLocationsI18n = i18n( 'InSuiteAdminMojit.tab_locations.submenu.stockLocations.text' );
            self.addressStreetI18n = i18n( 'person-schema.Address_T.street' );
            self.addressStreetPlaceholderI18n = i18n( 'InSuiteAdminMojit.tab_locations.placeholder.STREET' );
            self.addressHouseNoI18n = i18n( 'person-schema.Address_T.houseno' );
            self.addressHouseNoPlaceholderI18n = i18n( 'InSuiteAdminMojit.tab_locations.placeholder.HOUSE_NO' );
            self.addressZipI18n = i18n( 'person-schema.Address_T.zip' );
            self.addressZipPlaceholderI18n = i18n( 'InSuiteAdminMojit.tab_locations.placeholder.ZIP' );
            self.addressKvbZipI18n = i18n( 'location-schema.Location_T.kbvZip.i18n' );
            self.addressCityI18n = i18n( 'InSuiteAdminMojit.tab_locations.placeholder.CITY' );
            self.addressCityPlaceholderI18n = i18n( 'person-schema.Address_T.city' );
            self.addressTkvI18n = i18n( 'location-schema.Location_T.KV.i18n' );
            self.addressKvPlaceholderI18n = i18n( 'InSuiteAdminMojit.tab_locations.placeholder.KV' );
            self.addressCountryI18n = i18n( 'person-schema.Address_T.country' );
            self.bankAccountI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.BANK_ACCOUNT' );
            self.bankNameI18n = i18n( 'person-schema.BankAccount_T.bankName' );
            self.bankIbanI18n = i18n( 'person-schema.BankAccount_T.bankIBAN' );
            self.bankIbanLabelI18n = i18n( 'person-schema.BankAccount_T.bankIBANLabel' );
            self.bankBicI18n = i18n( 'person-schema.BankAccount_T.bankBIC' );
            self.bankBicLabelI18n = i18n( 'person-schema.BankAccount_T.bankBICLabel' );
            self.bankBsnrI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.BSNR' );
            self.esrNumberI18n = i18n( 'person-schema.BankAccount_CH_T.esrNumber.i18n' );
            self.esrNumberLabelI18n = i18n( 'person-schema.BankAccount_CH_T.esrNumberLabel' );
            self.bankNbsI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.NBS' );
            self.bankHbsI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.HBS' );
            self.otherDataI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.OTHER_DATA' );
            self.phonePlaceholderI18n = i18n( 'InSuiteAdminMojit.tab_locations.placeholder.PHONE' );
            self.faxPlaceholderI18n = i18n( 'InSuiteAdminMojit.tab_locations.placeholder.FAX' );
            self.emailPlaceholderI18n = i18n( 'InSuiteAdminMojit.tab_locations.placeholder.EMAIL' );
            self.websitePlaceholderI18n = i18n( 'InSuiteAdminMojit.tab_locations.placeholder.WEBSITE' );
            self.testEmailI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.testEmail' );
            self.buttonAddI18n = i18n( 'general.button.ADD' );
            self.buttonDeleteI18n = i18n( 'general.button.DELETE' );
            self.buttonSaveI18n = i18n( 'general.button.SAVE' );
            self.dInLI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.D_IN_L' );
            self.oInLI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.O_IN_L' );
            self.startBudgetFromI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.START_BUDGET_FROM' );
            self.startBudgetI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.START_BUDGET' );
            self.startBudgetPlaceholderI18n = i18n( 'InSuiteAdminMojit.tab_locations.placeholder.START_BUDGET' );
            self.medBudgetI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.MED_BUDGET' );
            self.utBudgetI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.UT_BUDGET' );
            self.insuranceBudgetPlaceholderI18n = i18n( 'InSuiteAdminMojit.tab_locations.placeholder.INSURANCEKIND_BUDGET' );
            self.enabledPrintersI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.ENABLED_PRINTERS' );
            self.settingsPrintersI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.PRINTER_SETTINGS' );
            self.formsPrintersI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.FORMS' );
            self.emailToFaxI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.EMAIL_TO_FAX' );
            self.emailToFaxPlaceholderI18n = i18n( 'InSuiteAdminMojit.tab_locations.placeholder.EMAIL_TO_FAX' );
            self.emailLogoI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.EMAIL_LOGO' );
            self.emailFooterI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.EMAIL_FOOTER' );
            self.emailFooterPlaceholderI18n = i18n( 'InSuiteAdminMojit.tab_locations.placeholder.EMAIL_FOOTER' );
            self.addressLabelI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.ADDRESS' );
            self.gkvInvoiceReceiverI18n = i18n( 'location-schema.Location_T.gkvInvoiceReceiver.i18n' );
            self.settingsEmailEncriptionI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.ENCRYPTION' );
            self.settingsEmailSettingsClearI18n = i18n( 'InSuiteAdminMojit.tab_settings.email_settings.SETTINGS_CLEAR' );

            self.settingsEmailPortI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.EMAIL_PORT' );
            self.settingsEmailLabelSSLI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.SSL' );
            self.settingsSMTPEmailLabelUserI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.SMTP_USER' );
            self.settingsEmailLabelUserNameI18n = i18n( 'InSuiteAdminMojit.tab_locations.placeholder.USER_NAME' );
            self.settingsSMTPEmailLabelPasswordI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.SMTP_PASSWORD' );
            self.settingsEmailServerOutcomeI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.EMAIL_SERVER_OUTCOME' );
            self.personSpacialiesI18n = i18n( 'employee-schema.Employee_T.specialities' );
            self.slMainI18n = i18n( 'location-schema.SuperLocation_T.slMain' );
            self.slMainInfoI18n = i18n( 'InSuiteAdminMojit.tab_locations.text.SL_MAIN' );

            self.smtpDirtyCheckString = SettingsModel.buildSmtpDirtyCheckString( self );
            self.forceUpdate = ko.observable( "" );
            self.saveButtonEnabled = ko.computed( function() {
                return self.smtpDirtyCheckString === (SettingsModel.buildSmtpDirtyCheckString( self, true ) + self.forceUpdate());
            } );
            self.addingUtBudgetAllowed = ko.computed( function() {
                var UtBudgets = ( unwrap( self.budgets ) || []).filter( function(el){ return peek( el.type ) === 'KBVUTILITY'; });
                return UtBudgets.length !== 1;
            } );

            self.cantonI18n = i18n( 'person-schema.Address_CH_T.cantonCode' );
            self.isDCPRC = Y.doccirrus.auth.isDCPRC();
            self.select2Country = {
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        var
                            countryCode = self.countryCode && self.countryCode(),
                            country = self.country && self.country();

                        if( countryCode && country ) {
                            return {id: countryCode, text: country};
                        }
                        else {
                            return null;
                        }
                    },
                    write: function( $event ) {
                        var choice;
                        if( $event.added ) {
                            choice = $event.added;
                            self.countryCode( choice.id );
                            self.country( choice.text );

                        }

                    }
                } ) ),
                select2: {
                    width: '100%',
                    placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                    data: function() {
                        return {
                            // list of available days to choose from
                            results: countriesList
                        };
                    }
                }
            };


            self.reloadPrinters = function() {
                Y.doccirrus.jsonrpc.api.printer.refreshPrinterList().then( onPrintersReloaded ).fail( onPrintersFail );

                function onPrintersReloaded( result ) {
                    result = result.data ? result.data : result;

                    Y.log( 'Reloaded printer list from CUPS: ' + result.length, 'info', NAME );

                    Y.doccirrus.cachePrinters = result;

                    self.printers( result );
                    self.initPrintersList();
                }

                function onPrintersFail( err ) {
                    Y.log( 'Could not reload printers: ' + JSON.stringify( err ), 'error', NAME );
                }
            };

            self.getCantonBySelectedZip = function( cantonText ) {
                var isSwiss = false;
                if( peek( self.countryCode ) === 'CH' ) {
                    isSwiss = true;
                }
                Promise.resolve( Y.doccirrus.jsonrpc.api.catalog.searchTarmedCantonsByCodeOrName( {
                    searchTerm: cantonText,
                    isSwiss: isSwiss
                } ) ).then( function( response ) {
                    var results = response.data.map( function( item ) {
                        return {
                            id: item.code,
                            text: item.text
                        };
                    } );
                    self.cantonWithText( results[0] );
                    self.cantonCode( results[0] && results[0].id || null );
                } ).catch( function( err ) {
                    return Y.doccirrus.DCWindow.notice( {
                        message: Y.doccirrus.errorTable.getMessage( err )
                    } );
                } );
            };

            setTimeout( function() {
                $( '[data-toggle="popover"]' ).popover().on( "show.bs.popover", function() {
                    $( this ).data( "bs.popover" ).tip().css( 'width', "300px" );
                } );
            }, 200 );

        },
        destructor: function() {
            detachConfirmModifications();
        },

        /**
         * Add a new "openTimes"
         */
        addOpenTime: function() {
            var
                self = this;

            self.openTimes.push( {
                publicInsurance: true,
                privateInsurance: true
            } );
        },

        addMedBudget: function(){
            var newMedBudget = KoViewModel.createViewModel( { schemaName: 'location.budgets', config: { validatable: true, data: {type: 'MEDICATION'} } } );
            this.setSpecialitiesAutocomplete(newMedBudget, this.specialitiesList);
            this.budgets.push( newMedBudget );
        },

        addUtBudget: function(){
            var newUtBudget = KoViewModel.createViewModel( { schemaName: 'location.budgets', config: { validatable: true, data: {type: 'KBVUTILITY'} } } );
            this.budgets.push( newUtBudget );
        },

        removeBudget: function( item ){
            this.budgets.remove( item );
        },

        setSpecialitiesAutocomplete: function( self, specialityList ){
            self.select2Specialities = {
                val: self.addDisposable( ko.computed( {
                    read: function() {
                        var
                            value = self.specialities() || null;

                        return value;

                    },
                    write: function( $event ) {
                        var
                            value = $event.val;

                        self.specialities( value );

                    }
                } ) ),
                select2: {
                    placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                    width: '100%',
                    multiple: true,
                    data: function() {
                        return { results: specialityList };
                    }
                }
            };
        },

        /**
         * Delete an "openTimes"
         */
        deleteOpenTime: function( model ) {
            var
                self = this;

            self.openTimes.remove( model );
        },
        deleteOpenTimeDisabled: function() {
            var
                self = this;

            if( unwrap( self.openTimes ).length === 1 ) {
                return true;
            }

            return false;
        },
        /**
         * Initializer
         */
        initViewModel: function() {
            var
                self = this;
            self.superLocation = false;

            self.initActions();

        },
        /**
         * busy flag
         */
        pending: null,
        /**
         * save disabled computed
         */
        saveDisabled: null,
        /**
         * used to note if there are unsaved printer assignments
         */
        printerAssignmentsDirty: null,
        savePrinterAssignments: null,
        mediaSetImgFromDefaultProfilePicture: null,
        mediaAddEditorProfilePicture: null,
        initProfilePicture: function() {
            var
                self = this,
                imageSettings = {
                    ownerCollection: 'location',
                    ownerId: self.addDisposable( ko.computed( {
                        read: function() {
                            var
                                currentPatientId = self.toJSON()._id,
                                randomTempId = Y.doccirrus.comctl.getRandId();

                            if( currentPatientId ) {
                                return currentPatientId;
                            }
                            else {
                                return randomTempId;
                            }
                        }
                    } ) ),
                    label: 'logo',
                    widthPx: 200,
                    heightPx: "",
                    _fixAspect: true,

                    thumbWidth: 200,
                    thumbHeight: "",
                    single: true,
                    uploadCallback: function( error, idArray ) {
                        if( error ) {
                            return;
                        }

                        if( idArray && idArray[ 0 ] ) {
                            Y.log( 'Added patient profile picture before save, will need to be claimed after save of profile from provisional owner ', 'info', NAME );
                        }
                    }
                };

            self.mediaSetImgFromDefaultProfilePicture = imageSettings;
            self.mediaAddEditorProfilePicture = { settings: imageSettings };
        },
        /**
         * init actions this view exposes
         */
        initActions: function() {
            var
                self = this;

            self.pending = ko.observable( false );
            self.printerAssignmentsDirty = ko.observable( false );
            self.stockLocationsValid = ko.observable( true );

            self.stockLocationTableModified = ko.computed( function() {
                var rowsModified;
                if( unwrap( self.stockLocationTableLoaded ) && unwrap( self.stockLocationTable ) ) {
                    rowsModified = unwrap( self.stockLocationTable.rows ).some( function( row ) {
                        return row.isModified();
                    } );
                    return rowsModified || unwrap( self.stockLocationTable.rows ).length !== unwrap( self.stockLocations ).length;
                }
            } );

            self.saveDisabled = ko.computed( function() {
                var
                    pending = self.pending(),
                    valid = self._isValid(),
                    budgets = unwrap( self.budgets ),
                    modified = self.isModified(),
                    isNew = self.isNew(),
                    stockLocationsModified = unwrap( self.stockLocationTableModified ),
                    stockLocationsValid = unwrap( self.stockLocationsValid ),
                    formprinters = self.printerAssignmentsDirty();

                if( self.commercialNo ){
                    valid = valid && !self.commercialNo.hasError();
                }

                if( budgets && budgets.length ) {
                    valid = valid && budgets.every( function( el ) {
                        return el._isValid();
                    } );
                }

                valid = valid && stockLocationsValid;
                return pending || !(valid && (modified || isNew || formprinters || stockLocationsModified));
            } ).extend( {rateLimit: 0} );

            self.generalFieldsAreInvalid = ko.computed( self.generalFieldsAreInvalidComputed, self );
            self.openTimesFieldsAreInvalid = ko.computed( self.openTimesFieldsAreInvalidComputed, self );
        },
        verifySmtpConfiguration: function(){
            var
                self = this,
                SettingsModel = Y.doccirrus.KoViewModel.getConstructor( 'SettingsModel' );
            SettingsModel.verifySmtpConfiguration( this, function(){
                self.smtpDirtyCheckString = SettingsModel.buildSmtpDirtyCheckString( self );
                self.forceUpdate.notifySubscribers( "" );
            } );
        },
        clearSmtpConfiguration: function(){
            var SettingsModel = Y.doccirrus.KoViewModel.getConstructor( 'SettingsModel' );
            SettingsModel.clearSmtpConfiguration( this );
        },
        initStockLocationTable: function( data ) {
            var
                self = this,
                rowSubscriptions,
                invalidRows = [];

            self.stockLocationTable = null;
            self.stockLocationList = ko.observableArray( [] );

            data.forEach( function( item ) {
                self.stockLocationList.push( new StockLocationViewModel( {
                    data: item
                } ) );
            } );

            self.stockLocationTable = KoComponentManager.createComponent( {
                componentType: "KoEditableTable",
                componentConfig: {
                    stateId: 'locations-stock-locations',
                    data: self.stockLocationList,
                    ViewModel: StockLocationViewModel,
                    responsive: false,
                    fillRowsToLimit: false,
                    limit: 10,
                    limitList: [10, 20, 30, 40, 50, 100],
                    columns: [
                        {
                            forPropertyName: 'title',
                            label: i18n( 'location-schema.StockLocation_T.title' ),
                            title: i18n( 'location-schema.StockLocation_T.title' ),
                            width: '15%',
                            inputField: {
                                componentType: 'KoFieldSelect2',
                                componentConfig: {
                                    useSelect2Data: true,
                                    minimumInputLength: 1,
                                    select2Read: function( value ) {
                                        return value;
                                    },
                                    select2Write: function( $event, observable ) {
                                        if( $event.added ) {
                                            if( $event.removed && $event.added.title ) {
                                                observable( $event.added.title );
                                            } else {
                                                observable( $event.added );
                                            }
                                        }
                                    },
                                    select2Config: {
                                        formatSelection: function( el ) {
                                            return typeof el === 'string' ? el : el.title;
                                        },
                                        formatResult: function( el ) {
                                            return el.title;
                                        },
                                        query: function( query ) {
                                            var stockLocationIds = unwrap( self.stockLocationList ).map( function( item ) {
                                                    return unwrap( item._id );
                                                } ),
                                                stockLocationTitles = unwrap( self.stockLocationList ).map( function( item ) {
                                                    return unwrap( item.title );
                                                } );

                                            Y.doccirrus.jsonrpc.api.stocklocation.get( {
                                                query: {
                                                    title: {
                                                        $regex: query.term,
                                                        $options: 'i'
                                                    },
                                                    _id: {
                                                        $nin: stockLocationIds
                                                    }
                                                },
                                                options: {
                                                    itemsPerPage: 15
                                                }
                                            } ).done( function( response ) {
                                                var data = response && response.data || [],
                                                    isMatchedWithData = data.find( function( item ) {
                                                        return item.title === query.term;
                                                    } ),
                                                    isMatchedWithLocal = stockLocationTitles.find( function( item ) {
                                                        return item === query.term;
                                                    } );

                                                if( query.term && query.term.length > 0 && !isMatchedWithData && !isMatchedWithLocal ) {
                                                    data.unshift( {
                                                        _id: new Y.doccirrus.mongo.ObjectId().toString(),
                                                        title: query.term,
                                                        description: ''
                                                    } );
                                                }
                                                query.callback( {
                                                    results: data.map( function( item ) {
                                                        return {
                                                            id: item._id,
                                                            title: item.title,
                                                            description: item.description
                                                        };
                                                    } )
                                                } );
                                            } );
                                        },
                                        multiple: false
                                    }
                                }
                            },
                            renderer: function( meta ) {
                                return unwrap( meta.value ) || '';
                            }
                        },
                        {
                            forPropertyName: 'description',
                            label: i18n( 'location-schema.StockLocation_T.description' ),
                            title: i18n( 'location-schema.StockLocation_T.description' ),
                            width: '15%'
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
                                        var
                                            rowModel = $context.$parent.row;
                                        invalidRows.splice(invalidRows.indexOf(rowModel), 1);
                                        self.stockLocationTable.removeRow( rowModel );
                                        self.stockLocationList.remove( rowModel );
                                    }
                                }
                            }
                        }
                    ],
                    isAddRowButtonVisible: function() {
                        return true;
                    },
                    onAddButtonClick: function() {
                        self.stockLocationList.push( new StockLocationViewModel( {
                            data: {
                                _id: undefined,
                                title: '',
                                description: ''
                            }
                        } ) );

                        return false;
                    }
                }

            } );
            self.stockLocationTableLoaded( true );

            subscribeRowValidation(ko.unwrap(self.stockLocationTable.rows));

            self.stockLocationTable.rows.subscribe(function( rows ) {
                validateStockLocations();
                subscribeRowValidation(rows);
            });

            function  subscribeRowValidation( rows  ) {
                rowSubscriptions = [];
                rows.forEach(function( row ) {
                    rowSubscriptions.push( row._isValid.subscribe(function( value ) {
                        var index = invalidRows.indexOf(row);

                        if (!value && index !== -1 ) {
                            return;
                        } else if (!value && index === -1) {
                            invalidRows.push(row);
                        } else if (value && index !== -1 ) {
                            invalidRows.splice(index, 1);
                        }

                        validateStockLocations();
                    }));
                });
            }

            function validateStockLocations(  ) {
                if (!self.showStockLocationsTab) {
                    return self.stockLocationsValid(true);
                }

                if (invalidRows.length) {
                    self.stockLocationsValid( false );
                } else {
                    self.stockLocationsValid( true );
                }
            }
        },
        /**
         * save data for this view
         * @return {jQuery.Deferred}
         */
        save: function() {
            var
                self = this,
                data = self.toJSON(),
                fields = [
                    'commercialNo',
                    'locname',
                    'street',
                    'houseno',
                    'city',
                    'country',
                    'zip',
                    'kbvZip',
                    'phone',
                    'fax',
                    'email',
                    'esrNumber',
                    'website',
                    'openTimes',
                    'countryCode',
                    'employees',
                    'isAdditionalLocation',
                    'mainLocationId',
                    'institutionCode',
                    'emailFooter',
                    'smtpEmailFrom',
                    'smtpHost',
                    'smtpPort',
                    'smtpSsl',
                    'smtpUserName',
                    'smtpPassword',
                    'stockLocations',
                    'enabledPrinters',
                    'defaultPrinter',
                    'glnNumber',
                    'zsrNumber',
                    'vatNumber',
                    'bankName',
                    'bankIBAN',
                    'bankBIC',
                    'slName',
                    'slMain',
                    'slMembers'
                ],
                promise = Promise.resolve(),
                SettingsModel = Y.doccirrus.KoViewModel.getConstructor( 'SettingsModel' );

            self.pending( true );

            function doSave() {
                var stockLocationList = unwrap( self.stockLocationList );

                // save canton for Swiss
                if( 'CH' === data.countryCode ) {
                    fields.push( 'cantonCode' );
                }

                if( data.slMain === false ){
                    data.slName = '';
                    data.slMembers = [];
                }

                if( self.showStockLocationsTab ) {
                    promise = Promise.resolve( Y.doccirrus.jsonrpc.api.location
                        .saveWithStockLocations( {
                            query: { _id: data._id },
                            data: data,
                            fields: fields,
                            stockLocationList: stockLocationList
                        } ) );
                } else if( self.isNew() ) {
                    promise = Promise.resolve(Y.doccirrus.jsonrpc.api.location
                        .create( {
                            data: data
                        } ));
                } else {
                    promise = Promise.resolve(Y.doccirrus.jsonrpc.api.location
                        .update( {
                            query: { _id: data._id },
                            data: data,
                            fields: fields
                        } ));
                }
                promise
                    .then( function( response ) {
                        var
                            warnings = Y.doccirrus.errorTable.getWarningsFromResponse( response );

                        if( warnings.length ) {
                            Y.Array.invoke( warnings, 'display' );
                        }

                        function onChownTempMedia( err ) {
                            if( err ) {
                                Y.log( 'Could not move location logo to new id: ' + response.data[ 0 ], 'warn', NAME );
                            }
                        }

                        function onPrinterAssignmentsSaved( err ) {
                            var messageContent;

                            if( err ) {
                                Y.log( 'Error saving printer assignments: ' + JSON.stringify( err ), 'debug', NAME );
                            }

                            if( response.data ) {
                                if( self.isNew() ) {
                                    if( self.mediaSetImgFromDefaultProfilePicture.ownerId() !== response.data[ 0 ] ) {
                                        Y.doccirrus.media.chownAllMR( '', 'location', self.mediaSetImgFromDefaultProfilePicture.ownerId(), 'location', response.data[ 0 ], onChownTempMedia );
                                    }
                                }

                                if(warnings.length) {
                                    messageContent = i18n( 'general.message.CHANGES_SAVED_WITH_WARNINGS' );
                                } else {
                                    messageContent = i18n( 'general.message.CHANGES_SAVED' );
                                }

                                Y.doccirrus.DCSystemMessages.addMessage( {
                                    messageId: 'tab_appointment-types-save',
                                    content: messageContent
                                } );
                                if( viewModel ) {
                                    viewModel.closeEditingItem( self );
                                }
                            }

                        }

                        if( self.savePrinterAssignments && true === self.printerAssignmentsDirty() ) {
                            self.savePrinterAssignments( onPrinterAssignmentsSaved );
                        } else {
                            onPrinterAssignmentsSaved();
                        }

                    } )
                    .then( function() {
                        return viewModel.load();
                    } )
                    .catch( fail );
            }

            if( !self.saveButtonEnabled() && !SettingsModel.checkIfSmtpSettingsAreRemoved( self ) ) {
                Y.doccirrus.DCWindow.notice( {
                    type: 'error',
                    message: i18n( 'InSuiteAdminMojit.tab_settings.email_settings.SETTINGS_SAVE_WARN' ),
                    window: { width: 'medium' }
                } );
            } else if( self.smtpDirtyCheckString && SettingsModel.checkIfSmtpSettingsAreRemoved( self ) ) {
                SettingsModel.showConfirmBox( null, i18n( 'InSuiteAdminMojit.tab_settings.email_settings.SETTINGS_USE_DEFAULT_CONFIRM' ), doSave );
            } else {
                doSave();
            }
            return promise.finally( function(){
                self.pending( false );
            });
        },
        /**
         * Determines if any general fields are invalid
         */
        generalFieldsAreInvalid: null,
        /**
         * Determines if any openTimes fields are invalid
         */
        openTimesFieldsAreInvalid: null,
        /**
         * Computes if any general fields are invalid
         * @returns {boolean}
         */
        generalFieldsAreInvalidComputed: function() {
            var
                self = this,
                streetHasError = unwrap( self.street.hasError ),
                housenoHasError = unwrap( self.houseno.hasError ),
                zipHasError = unwrap( self.zip.hasError ),
                cityHasError = unwrap( self.city.hasError ),
                countryCodeHasError = unwrap( self.countryCode.hasError );

            return streetHasError || housenoHasError || zipHasError || cityHasError || countryCodeHasError;
        },
        /**
         * Computes if any openTimes fields are invalid
         */
        openTimesFieldsAreInvalidComputed: function() {
            var
                self = this,
                openTimes = unwrap( self.openTimes );

            return openTimes.some( function( weeklyTimeEditModel ) {
                var
                    daysHasError = unwrap( weeklyTimeEditModel.days.hasError ),
                    startHasError = unwrap( weeklyTimeEditModel.start.hasError ),
                    endHasError = unwrap( weeklyTimeEditModel.end.hasError );

                return daysHasError || startHasError || endHasError;
            } );
        },
        /**
         * Click handler of the test e-mail button.
         */
        testEmailHandler: function() {
            var
                self = this,
                email = unwrap( self.email );

            if( email ) {
                Y.doccirrus.jsonrpc.api.location
                    .testEmail( { email: email } )
                    .done( function() {
                        Y.doccirrus.DCWindow.notice( {
                            message: i18n( 'location-api.testEmail.success.message', { data: { email: email } } )
                        } );
                    } )
                    .fail( function() {
                        Y.doccirrus.DCWindow.notice( {
                            type: 'error',
                            message: i18n( 'location-api.testEmail.failure.message' )
                        } );
                    } );
            }

        },

        testEmailToFaxGateway: function() {
            var
                self = this,
                email = unwrap( self.emailFaxGateway );

            if( email ) {
                Y.doccirrus.jsonrpc.api.location
                    .testEmail( { email: email } )
                    .done( function() {
                        Y.doccirrus.DCWindow.notice( {
                            message: i18n( 'location-api.testEmail.success.message', { data: { email: email } } )
                        } );
                    } )
                    .fail( function() {
                        Y.doccirrus.DCWindow.notice( {
                            type: 'error',
                            message: i18n( 'location-api.testEmail.failure.message' )
                        } );
                    } );
            }
        },
        /**
         * Determines disabled state of the test e-mail button.
         * @returns {boolean}
         */
        testEmailDisabled: function() {
            var
                self = this,
                hasError = unwrap( self.email.hasError ),
                email = unwrap( self.email );

            return hasError || !email;
        }
    }, {
        schemaName: LocationEditModel.schemaName,
        NAME: 'EditModel',
        ATTRS: {}
    } );

    /**
     * This views EditModel special case for virtual Super Location
     * @constructor
     */
    function EditSLModel() {
        EditSLModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( EditSLModel, LocationEditModel, {
        initializer: function( config ) {
            var
                self = this;

            self.initViewModel( config );

            self.submenuTextI18n = i18n( 'InSuiteAdminMojit.tab_locations.submenu.general.text' );
            self.buttonSaveI18n = i18n( 'general.button.SAVE' );
            self.slMainI18n = i18n( 'location-schema.SuperLocation_T.slMain' );
            self.slMembersI18n = i18n( 'location-schema.SuperLocation_T.slMembers' );
        },
        destructor: function() {
        },

        /**
         * Initializer
         *
         * @param {Object} config - model configuration
         */
        initViewModel: function( config ) {
            var
                self = this;
            self.superLocation = true;
            self.slName(  Y.doccirrus.schemas.kbvlog.getSuperLocationName( self.slName(), self.locname() ) );

            self.locations = config.locations || [];
            self.membersOfSuperLocations = (config.membersOfSuperLocations || []).filter( function( locId ){
                var ownLocations = self.slMembers() || [];
                return !ownLocations.includes( locId );
            } );

            self.select2Members = {
                val: self.addDisposable( ko.computed( {
                    read: function() {
                        return self.slMembers();
                    },
                    write: function( $event ) {
                        self.slMembers( $event.val );
                    }
                } ) ),
                select2: {
                    width: '100%',
                    multiple: true,
                    allowClear: true,
                    data: function() {
                        return {
                            results: self.locations.filter( function(loc){
                                return !self.membersOfSuperLocations.includes( loc._id );
                            } ).map( function( loc ) {
                                return {id: loc._id, text: loc.locname};
                            } )
                        };
                    }
                }
            };

            self.setNotModified();
            self.initActions();

        },
        /**
         * busy flag
         */
        pending: null,
        /**
         * save disabled computed
         */
        saveDisabled: null,
        /**
         * init actions this view exposes
         */
        initActions: function() {
            var
                self = this;

            self.pending = ko.observable( false );

            self.saveDisabled = ko.computed( function() {
                var
                    modified = self.isModified();

                return !modified;
            } ).extend( {rateLimit: 0} );
        },
        /**
         * save data for this view
         * @return {jQuery.Deferred}
         */
        save: function() {
            var
                self = this,
                data = self.toJSON(),
                fields = [
                    'slName',
                    'slMain',
                    'slMembers'
                ],
                promise = Promise.resolve();

            self.pending( true );

            function doSave() {
                if( self.isNew() ) {
                    promise = Promise.resolve(Y.doccirrus.jsonrpc.api.location
                        .create( {
                            data: data
                        } ));
                } else {
                    promise = Promise.resolve(Y.doccirrus.jsonrpc.api.location
                        .update( {
                            query: { _id: data._id },
                            data: data,
                            fields: fields
                        } ));
                }
                promise
                    .then( function( response ) {
                        var
                            warnings = Y.doccirrus.errorTable.getWarningsFromResponse( response );

                        if( warnings.length ) {
                            Y.Array.invoke( warnings, 'display' );
                        }

                    } )
                    .then( function() {
                        if( viewModel ) {
                            viewModel.load();
                            viewModel.closeEditingItem( self );
                        }
                    } )
                    .catch( fail );
            }

            doSave();
            return promise.finally( function(){
                self.pending( false );
            });
        }
    }, {
        schemaName: LocationEditModel.schemaName,
        NAME: 'EditSLModel',
        ATTRS: {}
    } );

    /**
     * This views ViewModel
     * @constructor
     */
    function ViewModel() {
        ViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ViewModel, KoViewModel.getBase(), {
        initializer: function() {
            var
                self = this;

            self.initViewModel();
            self.load();

            self.eventStateListener = Y.after( 'tab_locations-state', self.eventStateListenerHandler, self );
            //translations
            self.locationsButtonAddI18n = i18n( 'general.button.ADD' );
            self.locationsAddressI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.ADDRESS' );
            self.locationsLabelNbsnrI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.NBSNR' );
            self.locationsLabelBsnrI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.BSNR' );
            self.locationsLabelHbsI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.HBS' );
            self.locationsLabelInstitutionCodeI18n = i18n( 'location-schema.Location_T.institutionCode.i18n' );
            self.locationsOtherDataI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.OTHER_DATA' );
            self.locationsDepartamentI18n = i18n( 'location-schema.Location_T.department.i18n' );
            self.locationsEmailI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.E_MAIL' );
            self.locationsTelI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.TEL' );
            self.locationsFaxI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.FAX' );
            self.locationsWebsiteI18n = i18n( 'InSuiteAdminMojit.tab_locations.placeholder.WEBSITE' );
            self.locationsNoEntriesI18n = i18n( 'InSuiteAdminMojit.tab_locations.text.NO_ENTRIES' );
            self.locationsOInLI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.O_IN_L' );
            self.locationsDInLI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.D_IN_L' );
            self.stockLocationsI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.STOCK_LOCATIONS' );

            self.showStockLocationsTab = Y.doccirrus.auth.hasAdditionalService( 'inStock' );
            self.slMainI18n = i18n( 'location-schema.SuperLocation_T.slMain' );
            self.slMembersI18n = i18n( 'location-schema.SuperLocation_T.slMembers' );
        },
        eventStateListenerHandler: function( yEvent, state ) {
            this.editItem( { _id: state.params.id } );
        },
        destructor: function() {

            var
                self = this,
                editing = peek( self.editing );

            if( self.eventStateListener ) {
                self.eventStateListener.detach();
                self.eventStateListener = null;
            }

            Y.doccirrus.communication.off( 'stockLocationMessage', 'stockLocationMessageListener');

            if( editing ) {
                editing.destroy();
            }
        },
        /**
         * location objects to visualize
         */
        items: null,
        /**
         * current location EditModel for editing view
         */
        editing: null,
        /**
         * Initializer
         */
        initViewModel: function() {
            var
                self = this;

            self.items = ko.observableArray( [] );
            self.editing = ko.observable( null );

            self.initActions();
            self.initLoadMask();

        },
        formatTime: function( arrayOfNumbers ) {
            var
                hours, minutes;

            if( Array.isArray( arrayOfNumbers ) && arrayOfNumbers.length ) {
                hours = String( arrayOfNumbers[ 0 ] );
                minutes = String( arrayOfNumbers[ 1 ] || 0 );

                hours = hours.length < 2 ? '0' + hours : hours;
                minutes = minutes.length < 2 ? '0' + minutes : minutes;

                return hours + ':' + minutes;
            }
            return '';
        },
        computeOpenTimesDisplay: function( openTimes ) {
            var
                self = this,
                times = openTimes,
                result = [],
                resultMap = {};

            Y.each( WeeklyTimeModel.ATTRS.dayAliasMap.value, function( alias, day ) {
                result.push( {
                    alias: alias,
                    day: day,
                    times: []
                } );
            } );

            if( !(Array.isArray( times ) && times.length) ) {
                return result;
            }

            result.forEach( function( item ) {
                resultMap[ item.day ] = item;
            } );

            times.forEach( function( time ) {
                time.days.forEach( function( day ) {
                    var
                        formattedStart = self.formatTime( time.start ),
                        formattedEnd = self.formatTime( time.end );

                    resultMap[ day ].times.push( { start: formattedStart, end: formattedEnd } );
                } );
            } );

            result.forEach( function( item ) {
                if( item.times.length ) {
                    item.times.sort( function( a, b ) {
                        return Y.ArraySort.naturalCompare( a.start, b.start );
                    } );
                }
                else {
                    item.times.push( i18n( 'InSuiteAdminMojit.tab_locations.text.NO_VISITING_HOUR' ) );
                }
            } );

            return result;
        },
        /**
         * Determines if a consultTimes day entry has no consult times
         */
        displayNonOpenTime: function( $data ) {
            return 'string' === typeof $data.times[ 0 ];
        },
        getLocationDisplay: function( location ) {
            return Y.Lang.sub( '<a href="{href}">{text}</a>', {
                text: Y.Escape.html( location.locname ),
                href: '#/location/' + location._id
            } );
        },
        /**
         * check id for main location
         * @return {boolean}
         */
        isMainLocation: function( id ) {

            return id === Y.doccirrus.schemas.location.getMainLocationId();
        },
        getEmployeeDisplay: function( employee ) {

            return Y.Lang.sub( '<a href="{href}" title="{title}">{text}</a>', {
                text: Y.Escape.html(
                    Y.doccirrus.schemas.person.personDisplay( employee )
                ),
                title: i18n( 'InSuiteAdminMojit.tab_locations.getEmployeeDisplay.title' ),
                href: '#/employee/' + employee._id
            } );

        },
        /**
         * busy flag
         */
        pending: null,
        /**
         * init actions this view exposes
         */
        initActions: function() {
            var self = this;

            self.pending = ko.observable( false );

            self.editItem = Y.bind( self.editItem, self );
            self.confirmDeleteItem = Y.bind( self.confirmDeleteItem, self );
            self.closeEditingItem = Y.bind( self.closeEditingItem, self );
        },
        /**
         * init the loading mask
         */
        initLoadMask: function() {
            var
                self = this,
                node = self.get( 'node' );

            self.addDisposable( ko.computed( function() {

                if( self.pending() ) {
                    Y.doccirrus.utils.showLoadingMask( node );
                }
                else {
                    Y.doccirrus.utils.hideLoadingMask( node );
                }

            } ) );
        },
        /**
         * load data for this view
         */
        load: function() {
            var
                self = this;

            self.pending( true );

            readLocations( { sort: { _id: 1 } } )
                .then( function ensureSchemaFields( locations ) {
                    var locationDefaults = getSchemaDefaults( Y.doccirrus.schemas.location ),
                        employeeDefaults = getSchemaDefaults( Y.doccirrus.schemas.employee ),
                        ensuredSchemaFieldsOnLocations;

                    locationDefaults.employees = [];

                    ensuredSchemaFieldsOnLocations = locations.map( function( item ) {
                        item.employees = item.employees.map( function( employee ) {
                            return Y.merge( employeeDefaults, employee );
                        } );

                        return Y.merge( locationDefaults, item );
                    } );

                    return ensuredSchemaFieldsOnLocations;
                } )
                .then( function enhanceForTemplate( locations ) {
                    locations.forEach( function( location ) {
                        var
                            mainLocation;

                        // find display text for main location
                        location.mainLocationDisplay = location.mainLocationId;
                        location.superLocation = false;
                        if( location.mainLocationId ) {
                            //
                            mainLocation = locations.find( function( item ) {
                                return item._id === location.mainLocationId;
                            } );
                            if( mainLocation ) {
                                location.mainLocationDisplay = mainLocation.locname;
                            }
                        }

                        // cache these results
                        location.employeesPhysicians = location.employees.filter( function( employee ) {
                            return employee.type === "PHYSICIAN";
                        } );
                        location.employeesOthers = location.employees.filter( function( employee ) {
                            return employee.type !== "PHYSICIAN";
                        } );
                        location.openTimesDisplay = self.computeOpenTimesDisplay( location.openTimes );
                        location.stockLocationsLoaded = ko.observable( false );
                        Y.doccirrus.jsonrpc.api.stocklocation.get({
                            query: {
                                _id: {
                                    $in: location.stockLocations
                                }
                            }
                        }).done(function (response) {
                            var data = response.data || [];
                            location.stockLocationList = ko.observableArray( data );
                            location.stockLocationsLoaded( true );
                        });
                    } );

                    return locations;
                } )
                .then( function insertVirtualSuperLocations( locations ) {
                    var extendedLocations = [];
                    locations.forEach( function( location ) {
                        if( location.slMain ){
                            extendedLocations.push( Object.assign({}, location, {
                                superLocation: true,
                                locname:  Y.doccirrus.schemas.kbvlog.getSuperLocationName( location.slName, location.locname ),
                                mainLocation: {
                                    _id: location._id,
                                    locname: location.locname
                                },
                                slMemberLocations: locations.filter( function( loc ){
                                    return (location.slMembers || []).includes( loc._id.toString() );
                                } ).map( function( loc ){
                                    return {
                                        _id: loc._id,
                                        locname: loc.locname
                                    };
                                } )
                            }) );
                        }
                        extendedLocations.push( location );
                    } );

                    return extendedLocations;
                } )
                .done( function( locations ) {
                    self.items( locations );
                } )
                .fail( fail )
                .always( function() {

                    self.pending( false );
                } );
        },
        /**
         * reload data for this view
         */
        reload: function() {
            var
                self = this;

            self.load();

        },
        /**
         * add an item by switching into edit-mode with an an empty EditModel
         */
        addItem: function() {
            var
                self = this;

            self.pending( true );
            self.editing( new EditModel( {
                data: {
                    openTimes: [ { "end": [ 17, 0 ], "start": [ 9, 0 ], "days": [ 1, 2, 3, 4, 5 ] } ]
                }
            } ) );
            self.pending( false );
        },
        /**
         * Determines if the "addItem" action is disabled
         * @type {boolean}
         */
        addItemDisabled: false,
        editItemHandler: function( $data ) {
            Y.doccirrus.utils.getMojitBinderByType( 'InSuiteAdminMojit' ).router.save( '/location/' + $data._id + ( $data.superLocation ? '?sl' : '' ) );
        },

        getSpecialities: function getSpecialities() {
            return Promise.resolve( Y.doccirrus.jsonrpc.api.kbv.fachgruppe() ).then( function( response ) {
                return (response && response.data && response.data[0].kvValue || []).map( function( entry ) {
                    return {id: entry.key, text: entry.value};
                } );
            } );
        },

        /**
         * edit an existing item by switching it into edit-mode
         * @param {Object} item
         */
        editItem: function( item ) {
            var
                self = this;

            self.pending( true );

            readLocations( { query: { _id: item._id } } )
                .then( function( locations ) {
                    return locations[ 0 ] || null;
                } )
                .done( function( location ) {
                    var defaultPrinter = location.defaultPrinter;

                    self.getSpecialities().then( function(specialitiesList){
                        var newEditModel,
                            notSuperLocations = (self.items() || []).filter( function( loc ){
                                //filter out all virtual super locations and all main locations
                                //here possible to filter only current slMain and allow chain of super locations
                                return !loc.superLocation && !loc.slMain;
                            } ),
                            membersOfSuperLocations = (self.items() || []).filter( function( loc ){
                                //filter out all virtual super locations and all main locations
                                //here possible to filter only current slMain and allow chain of super locations
                                return !loc.superLocation && loc.slMain;
                            } ).reduce( function( acc, curr){
                                acc = acc.concat( curr.slMembers || [] );
                                return acc;
                            }, [] );
                        if( window.location.hash.indexOf( '?sl' ) !== -1 ){
                            newEditModel = new EditSLModel( { data: location, locations: notSuperLocations, membersOfSuperLocations: membersOfSuperLocations } );
                        } else {
                            newEditModel = new EditModel( { data: location, specialitiesList: specialitiesList, membersOfSuperLocations: membersOfSuperLocations } );
                        }

                        self.editing( newEditModel );
                        newEditModel.initFormPrinterAssignment();

                        //  set default printer to prevent event ordering knot with select2 MOJ-7516
                        newEditModel.defaultPrinter( defaultPrinter );
                    } );

                } )
                .fail( fail )
                .always( function() {
                    self.pending( false );
                } );
        },
        /**
         * delete an existing item
         * @param {Object} item
         */
        deleteItem: function( item ) {
            var
                self = this,
                stockLocationList,
                promise;

            self.pending( true );

            if( item.superLocation ){
                promise =Y.doccirrus.jsonrpc.api.location.update( {
                    query: { _id: item._id },
                    data: { slName: '', slMain: false, slMembers: [], employees: item.employees },
                    fields: [ 'slName', 'slMain', 'slMembers', 'employees' ]
                } );
            } else if(Y.doccirrus.auth.hasAdditionalService( 'inStock' )) {
                stockLocationList = unwrap(item.stockLocationList);
                promise = Y.doccirrus.jsonrpc.api.location.deleteWithStockLocations({
                    query: {
                        _id: item._id
                    },
                    data: item,
                    stockLocationList: stockLocationList
                });
            } else {
                promise = jQuery
                    .ajax( {
                        xhrFields: { withCredentials: true },
                        type: 'DELETE',
                        url: Y.doccirrus.infras.getPrivateURL( '/1/location/' + item._id )
                    } );
            }
                // TODO MOJ-4161
            promise.done( function( response ) {
                    var
                        warnings = Y.doccirrus.errorTable.getWarningsFromResponse( response ),
                        errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

                    if( warnings.length ) {
                        Y.Array.invoke( warnings, 'display' );
                    }
                    if( errors.length ) {
                        Y.Array.invoke( errors, 'display', 'info' );
                    }

                    if( !errors.length ) {
                        self.items.remove( item );
                        Y.doccirrus.DCSystemMessages.addMessage( {
                            messageId: 'tab_locations-deleteItem',
                            content: i18n( 'general.message.CHANGES_SAVED' )
                        } );
                    }

                } )
                .fail( fail )
                .always( function() {
                    self.pending( false );
                } );

        },
        /**
         * delete an existing item confirmed by the user
         * @param {Object} item
         */
        confirmDeleteItem: function( item ) {
            var
                self = this;

            Y.doccirrus.DCWindow.confirm( {
                message: i18n( 'location-api.confirmDeleteItem.' + (item.superLocation ? 'messageSuperLocation' : 'message') ),
                callback: function( result ) {

                    if( !result.success ) {
                        return;
                    }

                    self.deleteItem( item );

                }
            } );

        },
        /**
         * close the edit-mode
         * @param {EditModel} editModel
         */
        closeEditingItem: function( editModel ) {
            var
                self = this;

            self.editing( null );
            editModel.destroy();
            Y.doccirrus.utils.getMojitBinderByType( 'InSuiteAdminMojit' ).router.save( '/location' );
        }
    }, {
        ATTRS: {
            node: {
                value: null,
                lazyAdd: false
            }
        }
    } );

    /**
     * StockLocationViewModel for KoEditableTable
     * @param config
     * @constructor
     */
    function StockLocationViewModel( config ) {
        StockLocationViewModel.superclass.constructor.call( this, config );
    }

    StockLocationViewModel.ATTRS = {
        validatable: {
            value: true,
            lazyAdd: false
        }
    };

    Y.extend( StockLocationViewModel, KoViewModel.getBase(), {
            initializer: function( ) {
                var
                    self = this;
                    /*Schema definition  contains multiple stockLocations*/

                self._isValid = ko.computed( function() {
                    var titleError = self.title && self.title.hasError(),
                        descriptionError = self.description && self.description.hasError();

                    return !titleError && !descriptionError;
                } );
                self.title.subscribe(function(newValue) {
                    if(typeof newValue === 'object') {
                        self._id(newValue.id);
                        self.title(newValue.title);
                        self.description(newValue.description);
                    }
                });
            },
            setDefaultValues: function( data ) {
                this.set( 'data', data );
            },
            destructor: function() {
            }
        },
        {
            schemaName: 'stocklocation',
            NAME: 'StockLocationViewModel'
        }
    );
    KoViewModel.registerConstructor( StockLocationViewModel );

    return {

        registerNode: function( node ) {
            //  first get printers
            //  TODO: more elegant way to have this run before viewModels initialize
            Y.use( ['kbvlog-schema','SettingsModel'], function() {
                if( !Y.doccirrus.cachePrinters ) {
                    //  preload printers for edit panel before binding
                    Y.doccirrus.jsonrpc.api.printer.getPrinter().then( onPrintersLoaded ).fail( onPrintersFail );
                } else {
                    //  preload printers already cached
                    onPrintersLoaded( Y.doccirrus.cachePrinters );
                }

                function onPrintersLoaded( printers ) {
                    Y.doccirrus.cachePrinters = printers.data ? printers.data : printers;
                    applyBindings();
                }

                function onPrintersFail( err ) {
                    Y.log( 'Error loading printers: ' + JSON.stringify( err ), 'warn', NAME );
                    Y.doccirrus.cachePrinters = [];
                    applyBindings();
                }

                function applyBindings() {
                    // set viewModel
                    viewModel = new ViewModel( {
                        node: node.getDOMNode()
                    } );

                    ko.applyBindings( viewModel, node.getDOMNode() );
                }

            } );

        },

        deregisterNode: function( node ) {

            ko.cleanNode( node.getDOMNode() );

            // clear the viewModel
            if( viewModel ) {
                viewModel.destroy();
                viewModel = null;
            }
        }
    };
}
