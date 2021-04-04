/*jslint anon:true, sloppy:true, nomen:true*/

/* global YUI, ko */

YUI.add( 'ContactsMojitBinder', function( Y, NAME ) {
    'use strict';

    var
        peek = ko.utils.peekObservable,
        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        Disposable = KoViewModel.getDisposable(),
        KoUI = Y.doccirrus.KoUI,
        viewModel = null,
        beforeUnloadView = null,
        KoComponentManager = KoUI.KoComponentManager,
        SupportBaseContactModel = KoViewModel.getConstructor( 'SupportBaseContactModel' ),
        PhysicianBaseContactModel = KoViewModel.getConstructor( 'PhysicianBaseContactModel' ),
        InstitutionBaseContactModel = KoViewModel.getConstructor( 'InstitutionBaseContactModel' ),
        VIEW_STATE_INITIAL = null,
        VIEW_STATE_OVERVIEW = 'overview',
        VIEW_STATE_DETAIL = 'detail',

        baseContactTypes = Y.doccirrus.schemas.basecontact.types.BaseContactType_E.list;

    function baseContactTypeExists( type ) {
        return baseContactTypes.some( function( entry ) {
            return entry.val === type;
        } );
    }

    function getBaseContactById( id ) {
        return Y.doccirrus.jsonrpc.api.basecontact.getFullContactData( {
            query: {
                _id: id
            }
        } );
    }

    /**
     * default error notifier
     */
    function fail( response ) {
        var
            errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

        if( errors.length ) {
            Y.Array.invoke( errors, 'display' );
        }

    }

    /**
     *
     * error in DCWindow
     */
    function showError( response ) {
        var errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );
        Y.doccirrus.DCWindow.notice( {
            type: 'error',
            window: {width: 'small'},
            message: errors.join( '<br>' )
        } );
    }

    /**
     * handle ViewEditModel modifications when leaving view
     */
    function attachConfirmModifications( binder ) {
        beforeUnloadView = binder.router.on( 'beforeUnloadView', function( yEvent, event ) {
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
     * clear handle ViewEditModel modifications when leaving view
     */
    function detachConfirmModifications() {
        if( beforeUnloadView ) {
            beforeUnloadView.detach();
            beforeUnloadView = null;
        }
    }

    /**
     * This views ViewEditModel, used for the detail view
     * @constructor
     */
    function ViewEditModel() {
        ViewEditModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ViewEditModel, KoViewModel.getDisposable(), {

        saveDisabled: null,

        initializer: function() {
            var self = this,
                data = self.get( 'data' ),
                contactsObj = self.get( 'contactsObj' );

            attachConfirmModifications( self.get( 'mojitoBinder' ) );

            if( Y.doccirrus.schemas.basecontact.isMedicalPersonType( data.baseContactType ) ) {
                self.contact = new PhysicianBaseContactModel( {
                    data: data,
                    contactsObj: contactsObj,
                    specialitiesList: self.get( 'specialitiesList' ),
                    availableInstitutionTypes: 'PHYSICIAN' === data.baseContactType ? Y.doccirrus.schemas.v_physician.types.InstitutionContactType_E.list : Y.doccirrus.schemas.v_therapistcontact.types.InstitutionContactType_E.list
                } );
            } else if( Y.doccirrus.schemas.basecontact.isOrganizationType( data.baseContactType ) ) {
                self.contact = new InstitutionBaseContactModel( {
                    data: data,
                    contactsObj: contactsObj
                } );
            } else {
                self.contact = new SupportBaseContactModel( {data: data} );
            }

            self.saveDisabled = ko.computed( self.saveDisabledComputed, self );

        },
        destructor: function() {
            detachConfirmModifications();
        },
        isNew: function() {
            return this.contact.isNew();
        },
        // overwrite
        isModified: function() {
            return this.contact.isModified();
        },
        save: function() {
            var self = this,
                data = self.contact.toJSON(),
                wasNew = self.contact.isNew(),
                deferred;
            if( wasNew ) {
                deferred = Y.doccirrus.jsonrpc.api.basecontact
                    .create( {
                        data: data
                    } )
                    .then( function( response ) {
                        var
                            warnings = Y.doccirrus.errorTable.getWarningsFromResponse( response );

                        if( warnings.length ) {
                            Y.Array.invoke( warnings, 'display' );
                        }

                        return response && response.data && response.data[0] || null;
                    } );
            } else {
                data.fields_ = Object.keys( data );
                deferred = Y.doccirrus.jsonrpc.api.basecontact
                    .update( {
                        query: {_id: data._id},
                        data: data
                    } )
                    .then( function( response ) {
                        var warnings = Y.doccirrus.errorTable.getWarningsFromResponse( response );

                        if( warnings.length ) {
                            Y.Array.invoke( warnings, 'display' );
                        }
                    } );
            }

            return deferred
                .then( function() {
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: 'tab_contacts-save',
                        content: i18n( 'general.message.CHANGES_SAVED' )
                    } );

                    if( viewModel ) {
                        viewModel.unsetEditing();
                        viewModel.visitOverview();
                    }

                } )
                .fail( fail );
        },
        /**
         * Computes if the "save" action is disabled
         */
        saveDisabledComputed: function() {
            var
                self = this,
                contact = self.contact,
                valid = contact._isValid(),
                modified = contact.isModified(),
                isNew = contact.isNew(),
                validationNumber = (contact._glnNumber && contact._glnNumber.hasError() || contact._zsrNumber && contact._zsrNumber.hasError()) || false;
            
            return !(valid && (modified || isNew) && !validationNumber);
        }
    }, {
        ATTRS: {
            data: {
                value: null,
                lazyAdd: false
            },
            contactsObj: {
                value: [],
                lazyAdd: false
            },
            specialitiesList: {
                value: [],
                cloneDefaultValue: true,
                lazyAdd: false
            },
            mojitoBinder: {
                value: null,
                lazyAdd: false
            }
        }
    } );

    function BinderViewModel() {
        BinderViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( BinderViewModel, Disposable, {
            router: null,

            initializer: function() {
                var
                    self = this;

                self.initEditing();
                self.initStateListener();
                self.initContactTypes();
                self.createContact = self.createContact.bind( self );
                self.template = {
                    name: ko.observable( null ),
                    data: self
                };
                self.initSerialEMailCreateComponent();
                Y.doccirrus.DCBinder.initToggleFullScreen();
            },

            /**
             *  @method initSerialLetterCreateComponent
             */
            initSerialEMailCreateComponent: function ContactViewModel_initSerialEMailCreateComponent() {
                var
                    self = this,
                    location = function() {
                        return Promise.resolve( Y.doccirrus.jsonrpc.api.location
                            .read()
                            .then( function( response ) {
                                return Y.Lang.isArray( response.data ) && response.data || [];
                            } ) );
                    };

                location().then( function( response ) {
                    self.locations = response;
                } );

                Y.doccirrus.jsonrpc.api.employee
                    .getEmployeeForUsername( {username: Y.doccirrus.auth.getUserId()} )
                    .done( function( response ) {
                        self.currentEmployee = (response && response.data) ? response.data : null;
                    } );

                self.createSerialEMail = KoComponentManager.createComponent( {
                    componentType: 'KoButton',
                    componentConfig: {
                        name: 'BTN_CREATE_SERIAL_EMAIL',
                        text: i18n( 'InSuiteAdminMojit.tab_contacts.overview.button.CREATE_SERIAL_EMAIL' ),
                        click: function() {
                            var
                                componentColumnCheckbox = self.contactsTable.getComponentColumnCheckbox(),
                                checked = componentColumnCheckbox.checked(),
                                selectedContactsIds = [];

                            if( checked && checked.length ) {
                                selectedContactsIds = checked.map( function( selected ) {
                                    return selected._id;
                                } );
                            }

                            // TODO: explanatory notice here
                            if( 0 === selectedContactsIds.length ) {
                                return;
                            }

                            Y.doccirrus.modals.serialEMailAssistantModal.show( {
                                origin: "CONTACTS",
                                selectedContactsIds: selectedContactsIds,
                                selectedContacts: checked,
                                locations: self.locations,
                                employee: self.currentEmployee,
                                specialitiesList: self.get( 'specialitiesList' )
                            } );
                        }
                    }
                } );
            },
            destructor: function() {
                var
                    self = this;

                self.destroyStateListener();
                self.destroyEditing();
            },
            toggleFullScreenHandler() {
                Y.doccirrus.DCBinder.toggleFullScreen();
    
            },
            /**
             * The current "ViewEditModel" being edited
             * @type {null|ko.observable}
             */
            editing: null,
            /**
             * contains the baseContactType enum
             */
            baseContactTypes: null,
            /**
             * @private
             */
            initialisedOverview: false,
            initStateListener: function() {
                var
                    self = this;

                self.view = ko.observable( VIEW_STATE_INITIAL );

                self.eventStateListener = Y.after( 'tab_contacts-state', self.eventStateListenerHandler, self );

            },
            /**
             * Determines if the overview was initialised
             * @return {boolean}
             */
            isOverviewInitialised: function() {
                var
                    self = this;

                return Boolean( self.initialisedOverview );
            },
            /**
             * Initialises the overview
             */
            initOverview: function() {
                var
                    self = this;

                if( !self.isBaseContactTableInitialized() ) {
                    self.initBaseContactTable();
                }

                self.initialisedOverview = true;
            },
            /**
             * Forwards the User to the overview by using the Y.Router
             */
            visitOverview: function() {
                var
                    mojitoBinder = this.get( 'mojitoBinder' );
                mojitoBinder.router.save( '/contacts' );
            },
            /**
             * Destroys "eventStateListener" Y.EventHandle
             */
            destroyStateListener: function() {
                var
                    self = this;

                if( self.eventStateListener ) {
                    self.eventStateListener.detach();
                    self.eventStateListener = null;
                }
            },
            /**
             * Handles fired "tab_contacts-state" events and make the appropriate action
             * @param {Y.EventFacade} yEvent
             * @param {Object} state
             * @param {String} state.view
             * @param {Object} state.params
             */
            eventStateListenerHandler: function( yEvent, state ) {
                var
                    self = this,
                    id = state.params.id,
                    type = state.params.type;

                self.unsetEditing();

                switch( state.view ) {
                    case VIEW_STATE_OVERVIEW:
                        //if( !self.isOverviewInitialised() ) {
                        self.initOverview();
                        //}
                        self.template.name( 'TabContactsOverview' );
                        break;
                    case VIEW_STATE_DETAIL:
                        if( id ) {
                            getBaseContactById( id ).done( function( response ) {
                                var data = response.data;

                                if( !data.contact ) {
                                    Y.doccirrus.DCWindow.notice( {
                                        message: i18n( 'InSuiteAdminMojit.tab_contacts.detail.message.NOT_FOUND' ),
                                        callback: function() {
                                            self.visitOverview();
                                        }
                                    } );
                                    return;
                                }

                                self.editing( new ViewEditModel( {
                                    data: data.contact,
                                    contactsObj: data.contactsObj,
                                    specialitiesList: self.get( 'specialitiesList' ),
                                    mojitoBinder: self.get( 'mojitoBinder' )
                                } ) );
                                viewModel = self;
                            } ).fail( fail );

                        } else {
                            type = type && type.toUpperCase();
                            if( !type || !baseContactTypeExists( type ) ) {
                                Y.doccirrus.DCWindow.notice( {
                                    message: i18n( 'InSuiteAdminMojit.tab_contacts.detail.message.CONTACT_TYPE_NOT_FOUND' ),
                                    callback: function() {
                                        self.visitOverview();
                                    }
                                } );

                                return;
                            }
                            self.editing( new ViewEditModel( {
                                data: {baseContactType: type},
                                specialitiesList: self.get( 'specialitiesList' ),
                                mojitoBinder: self.get( 'mojitoBinder' )
                            } ) );
                            viewModel = self;
                        }
                        self.template.name( 'TabContactsDetail' );
                        break;
                }

                self.view( state.view );

            },
            /**
             * May hold contacts table
             * @type {null|KoTable}
             */
            contactsTable: null,
            /**
             * Determines if the "employeesTable" was initialised
             */
            isBaseContactTableInitialized: function() {
                var
                    self = this;

                return Boolean( self.contactsTable );
            },
            initContactTypes: function() {
                var self = this;

                self.menuitemContactsI18n = i18n( 'InSuiteAdminMojit.insuiteadmin.menuitem.CONTACTS' );
                self.viewPortBtnI18n = Y.doccirrus.DCBinder.viewPortBtnI18n;
                self.buttonDeleteI18n = i18n( 'InSuiteAdminMojit.tab_contacts.overview.button.DELETE' );
                self.buttonCreateI18n = i18n( 'InSuiteAdminMojit.tab_contacts.overview.button.CREATE' );
                self.buttonSaveI18n = i18n( 'InSuiteAdminMojit.tab_employees.detail.button.SAVE' );
                self.buttonBackI18n = i18n( 'InSuiteAdminMojit.tab_employees.detail.button.BACK' );

                self.baseContactTypes = baseContactTypes.map( function( entry ) {
                    if( 'PHYSICIAN' === entry.val ) {
                        return {id: entry.val, text: entry['-de'], style: {'border-top': '1px solid black'}};
                    } else {
                        return {id: entry.val, text: entry['-de'], style: {}};
                    }

                } );
            },
            /**
             * Initialises contacts table
             */
            initBaseContactTable: function() {
                var
                    self = this;

                self.contactsTable = KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        formRole: 'casefile-ko-insuite-table',
                        pdfTitle: i18n( 'InSuiteAdminMojit.tab_contacts.pdfTitle' ),
                        stateId: 'InSuiteAdminMojit-contactsTable',
                        states: ['limit'],
                        fillRowsToLimit: true,
                        limit: 10,
                        remote: true,
                        proxy: Y.doccirrus.jsonrpc.api.basecontact.read,
                        baseParams: {forContactsTable: true},
                        columns: [
                            {
                                componentType: 'KoTableColumnCheckbox',
                                forPropertyName: 'checked',
                                label: ''
                            },
                            {
                                forPropertyName: 'baseContactType',
                                label: i18n( 'basecontact-schema.BaseContact_T.baseContactType.i18n' ),
                                title: i18n( 'basecontact-schema.BaseContact_T.baseContactType.i18n' ),
                                width: '160px',
                                visible: true,
                                renderer: function( meta ) {
                                    var
                                        value = meta.value;

                                    if( !value ) {
                                        return '';
                                    }

                                    return Y.doccirrus.schemaloader.translateEnumValue( '-de', value, Y.doccirrus.schemas.basecontact.types.BaseContactType_E.list, value );
                                },
                                isFilterable: true,
                                isSortable: true,
                                queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    options: Y.doccirrus.schemas.basecontact.types.BaseContactType_E.list,
                                    optionsText: 'i18n',
                                    optionsValue: 'val'
                                }
                            },
                            {
                                forPropertyName: 'institutionType',
                                label: i18n( 'basecontact-schema.InstitutionContact_T.institutionType.i18n' ),
                                title: i18n( 'basecontact-schema.InstitutionContact_T.institutionType.i18n' ),
                                width: '160px',
                                visible: false,
                                renderer: function( meta ) {
                                    var
                                        value = meta.value;

                                    if( !value ) {
                                        return '';
                                    }

                                    return Y.doccirrus.schemaloader.translateEnumValue( '-de', value, Y.doccirrus.schemas.basecontact.types.InstitutionContactType_E.list, value );
                                },
                                isFilterable: true,
                                isSortable: true,
                                queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    options: Y.doccirrus.schemas.basecontact.types.InstitutionContactType_E.list,
                                    optionsText: 'i18n',
                                    optionsValue: 'val'
                                }
                            },
                            {
                                forPropertyName: 'content',
                                label: i18n( 'basecontact-schema.BaseContact_T.content.i18n' ),
                                title: i18n( 'basecontact-schema.BaseContact_T.content.i18n' ),
                                isFilterable: true,
                                visible: true,
                                isSortable: true
                            },
                            {
                                forPropertyName: 'contacts',
                                label: i18n( 'PhysicianBaseContactModel_clientJS.title.CONTACTS' ),
                                title: i18n( 'PhysicianBaseContactModel_clientJS.title.CONTACTS' ),
                                visible: true,
                                isFilterable: true,
                                isSortable: false,
                                renderer: function( meta ) {
                                    var contacts = meta.value;
                                    return contacts && contacts.filter( function( item ) {
                                        return '' !== item.trim();
                                    } ).join( ', ' );
                                }
                            },
                            {
                                forPropertyName: 'addresses.0.addon',
                                label: i18n( 'person-schema.Address_T.addon' ),
                                title: i18n( 'person-schema.Address_T.addon' ),
                                isFilterable: true,
                                isSortable: true,
                                visible: false,
                                width: '120px',
                                pdfRenderer: function( meta ) {
                                    var exists = (meta.row.addresses && meta.row.addresses[0] && meta.row.addresses[0].addon);
                                    return exists ? meta.row.addresses[0].addon : '';
                                }
                            },
                            {
                                forPropertyName: 'addresses.0.city',
                                label: i18n( 'person-schema.Address_T.city' ),
                                title: i18n( 'person-schema.Address_T.city' ),
                                isFilterable: true,
                                isSortable: true,
                                visible: true,
                                pdfRenderer: function( meta ) {
                                    var exists = (meta.row.addresses && meta.row.addresses[0] && meta.row.addresses[0].city);
                                    return exists ? meta.row.addresses[0].city : '';
                                }
                            },
                            {
                                forPropertyName: 'addresses.0.zip',
                                label: i18n( 'person-schema.Address_T.zip' ),
                                title: i18n( 'person-schema.Address_T.zip' ),
                                isFilterable: true,
                                isSortable: true,
                                visible: true,
                                pdfRenderer: function( meta ) {
                                    var exists = (meta.row.addresses && meta.row.addresses[0] && meta.row.addresses[0].zip);
                                    return exists ? meta.row.addresses[0].zip : '';
                                }
                            },
                            {
                                forPropertyName: 'addresses.0.houseno',
                                label: i18n( 'person-schema.Address_T.houseno' ),
                                title: i18n( 'person-schema.Address_T.houseno' ),
                                isFilterable: true,
                                isSortable: true,
                                visible: true,
                                pdfRenderer: function( meta ) {
                                    var exists = (meta.row.addresses && meta.row.addresses[0] && meta.row.addresses[0].houseno);
                                    return exists ? meta.row.addresses[0].houseno : '';
                                }
                            },
                            {
                                forPropertyName: 'addresses.0.street',
                                label: i18n( 'person-schema.Address_T.street' ),
                                title: i18n( 'person-schema.Address_T.street' ),
                                isFilterable: true,
                                isSortable: true,
                                visible: true,
                                pdfRenderer: function( meta ) {
                                    var exists = (meta.row.addresses && meta.row.addresses[0] && meta.row.addresses[0].street);
                                    return exists ? meta.row.addresses[0].street : '';
                                }
                            },
                            {
                                forPropertyName: 'communications.value',
                                label: i18n( 'basecontact-schema.BaseContact_T.communications.i18n' ),
                                title: i18n( 'basecontact-schema.BaseContact_T.communications.i18n' ),
                                visible: true,
                                isFilterable: true,
                                isSortable: false,
                                renderer: function( meta ) {
                                    var communications,
                                        result,
                                        communicationHtml,
                                        i;
                                    if( meta.row && meta.row.communications ) {
                                        communications = meta.row.communications;
                                        result = communications.filter( function( item ) {
                                            return item.preferred;
                                        } );
                                        if( result && result[0] ) {
                                            return result[0].value || '';
                                        } else {
                                            communicationHtml = '';
                                            for( i = 0; i < communications.length; i++ ) {
                                                communicationHtml += communications[i].value ? '<span>' + (communications[i].value) + '</span><br/>' : '';
                                            }
                                            return communicationHtml;
                                        }
                                    } else {
                                        return '';
                                    }
                                }
                            },
                            {
                                forPropertyName: 'bsnrs.0',
                                label: i18n( 'physician-schema.Physician_T.bsnrs.i18n' ),
                                title: i18n( 'physician-schema.Physician_T.bsnrs.i18n' ),
                                isFilterable: true,
                                isSortable: true,
                                visible: false,
                                pdfRenderer: function( meta ) {
                                    var exists = (meta.row.bsnrs && meta.row.bsnrs[0]);
                                    return exists ? meta.row.bsnrs[0] : '';
                                }
                            },
                            {
                                forPropertyName: 'officialNo',
                                label: i18n( 'physician-schema.Physician_T.officialNo.i18n' ),
                                title: i18n( 'physician-schema.Physician_T.officialNo.i18n' ),
                                isFilterable: true,
                                isSortable: true,
                                visible: false
                            },
                            {
                                forPropertyName: 'expertise',
                                label: i18n( 'physician-schema.Physician_T.expertise.i18n' ),
                                title: i18n( 'physician-schema.Physician_T.expertise.i18n' ),
                                visible: true,
                                isFilterable: true,
                                width: '140px',
                                isSortable: true,
                                renderer: function( meta ) {
                                    var expertise = meta.value,
                                        specialitiesList = (self.get( 'specialitiesList' )).slice(),
                                        oldExpertiseList = Y.doccirrus.schemas.basecontact.types.Expert_E.list,
                                        expertiseValues = [],
                                        result;
                                    oldExpertiseList.forEach( function( oldExpertise ) {
                                        specialitiesList.push( {id: oldExpertise.val, text: oldExpertise.i18n} );
                                    } );
                                    if( Array.isArray( expertise ) && expertise[0] ) {
                                        expertise.forEach( function( entry ) {
                                            expertiseValues.push( specialitiesList.find( function( item ) {
                                                return item.id === entry;
                                            } ) );
                                        } );
                                    }
                                    if( Array.isArray( expertiseValues ) && expertiseValues.length ) {
                                        result = expertiseValues.filter( function( expertise ) {
                                            return Boolean( expertise && expertise.text );
                                        } ).map( function( expertise ) {
                                            return expertise.text;
                                        } );
                                        return result.join( ',<br>' );
                                    }
                                    return Y.doccirrus.schemaloader.getEnumListTranslation( 'basecontact', 'Expert_E', expertise, 'i18n', '' );
                                }
                            },
                            {
                                forPropertyName: 'firstname',
                                label: i18n( 'person-schema.Person_T.firstname.i18n' ),
                                title: i18n( 'person-schema.Person_T.firstname.i18n' ),
                                isFilterable: true,
                                isSortable: true,
                                visible: true
                            },
                            {
                                forPropertyName: 'lastname',
                                label: i18n( 'person-schema.Person_T.lastname.i18n' ),
                                title: i18n( 'person-schema.Person_T.lastname.i18n' ),
                                isFilterable: true,
                                isSortable: true,
                                visible: true
                            },
                            {
                                forPropertyName: 'talk',
                                label: i18n( 'physician-schema.Physician_T.talk.i18n' ),
                                title: i18n( 'physician-schema.Physician_T.talk.i18n' ),
                                isFilterable: true,
                                isSortable: true,
                                visible: true,
                                queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    options: Y.doccirrus.schemas.person.types.Talk_E.list,
                                    optionsText: 'i18n',
                                    optionsValue: 'val'
                                },
                                renderer: function( meta ) {
                                    return Y.doccirrus.schemaloader.getEnumListTranslation( 'person', 'Talk_E', meta.value, 'i18n', '' );
                                }
                            },
                            {
                                forPropertyName: 'status',
                                label: i18n( 'InSuiteAdminMojit.tab_employees.employeesTable.label.ACTIVE' ),
                                width: '60px',
                                css: {'text-center': true},
                                renderer: function( meta ) {
                                    var
                                        value = meta.value;

                                    if( value === 'ACTIVE' ) {
                                        return '<span class="glyphicon glyphicon-ok"></span>';
                                    } else if( value === 'INACTIVE' ) {
                                        return '<span class="glyphicon glyphicon-remove"></span>';
                                    }

                                    return '';
                                }
                            }
                        ],
                        onRowClick: function( meta ) {
                            var
                                data = meta.row;
                            self.showContactDetail( data );

                            return false;
                        }
                    }
                } );

                self.deleteContactDisabled = ko.computed( self.deleteContactDisabledComputed, self );
                self.isTaskSelected = ko.pureComputed( function() {
                    return this.contactsTable.getComponentColumnCheckbox().checked().length;
                }, this );
            },
            /**
             * create new contact
             */
            createContact: function( data ) {
                var id = data.id || '',
                    mojitoBinder = this.get( 'mojitoBinder' );
                mojitoBinder.router.save( '/new/' + id.toLowerCase() );

            },
            createContactDisabled: false,
            /**
             * delete contact
             */
            deleteBaseContact: function( checked ) {
                var
                    self = this,
                    contacts = checked.map( function( item ) {
                        return item._id;
                    } );
                Y.doccirrus.DCWindow.confirm( {
                    message: i18n( 'InSuiteAdminMojit.tab_contacts.overview.message.CONFIRM', {data: {count: checked.length}} ),
                    callback: function( result ) {
                        if( result.success ) {

                            Y.doccirrus.jsonrpc.api.basecontact
                                .delete( {
                                    query: {_id: {$in: contacts}}
                                } )
                                .done( function() {
                                    self.contactsTable.reload();

                                    Y.doccirrus.DCSystemMessages.addMessage( {
                                        messageId: 'tab_contacts-deleteContact',
                                        content: i18n( 'general.message.CHANGES_SAVED' )
                                    } );
                                } )
                                .fail( function( response ) {
                                    showError( response );
                                } );
                        }
                    }
                } );
            },
            deactivateVendor: function( contact ) {
                var
                    self = this;
                Y.doccirrus.DCWindow.confirm( {
                    message: i18n( 'InSuiteAdminMojit.tab_contacts.overview.message.DEACTIVATE', {data: {name: contact.institutionName}} ),
                    callback: function( result ) {
                        if( result.success ) {
                            Y.doccirrus.jsonrpc.api.basecontact
                                .update( {
                                    query: {_id: contact._id},
                                    data: {
                                        fields_: ['status'],
                                        status: "INACTIVE"
                                    }
                                } )
                                .done( function() {
                                    self.contactsTable.reload();
                                    Y.doccirrus.DCSystemMessages.addMessage( {
                                        messageId: 'tab_contacts-deleteContact',
                                        content: i18n( 'general.message.CHANGES_SAVED' )
                                    } );
                                } )
                                .fail( function( error ) {
                                    showError( error );
                                } );
                        }
                    }
                } );
            },
            baseContactHasOrdersDeliveries: function( contact ) {
                return new Promise( function( resolve ) {
                    Y.doccirrus.jsonrpc.api.basecontact.doesVendorHaveOrdersOrDeliveries( {
                        query: {basecontactId: contact._id}
                    } ).done( function( result ) {
                        if( result ) {
                            resolve( result );
                        }
                    } );
                } );
            },
            deleteContact: function() {
                var
                    self = this,
                    checked = self.contactsTable
                        .getComponentColumnCheckbox()
                        .checked()
                        .map( function( item ) {
                            return {
                                _id: item._id,
                                baseContactType: item.baseContactType,
                                institutionName: item.institutionName
                            };
                        } );
                if( !checked.length ) {
                    Y.doccirrus.DCWindow.notice( {
                        message: i18n( 'InSuiteAdminMojit.tab_contacts.overview.message.CONFIRM' )
                    } );
                } else {
                    // If has inStock license and type is VENDOR we check if any associated orders/deliveries exist
                    // We only expect one item in array
                    if( Y.doccirrus.auth && Y.doccirrus.auth.hasLicense( 'additionalServices', 'inStock' ) && checked[0].baseContactType && checked[0].baseContactType === 'VENDOR' ) {
                        self.baseContactHasOrdersDeliveries( checked[0] )
                            .then( function( result ) {
                                if( result && result.data && result.data.hasOrdersOrDeliveries ) {
                                    self.deactivateVendor( checked[0] );
                                } else {
                                    // If no deliveries then set status of VENDOR to deactivated
                                    self.deleteBaseContact( checked );
                                }
                            } );
                    } else {
                        self.deleteBaseContact( checked );
                    }
                }

            },
            deleteContactDisabled: false,
            deleteContactDisabledComputed: function() {
                var
                    self = this,
                    checkedDeactivated,
                    checked = self.contactsTable
                        .getComponentColumnCheckbox()
                        .checked();
                // inStock: delete only one basecontact at a time
                if( Y.doccirrus.auth && Y.doccirrus.auth.hasLicense( 'additionalServices', 'inStock' ) ) {
                    checkedDeactivated = checked.find( function( element ) {
                        return element.hasOwnProperty( 'status' ) && element.status === "INACTIVE";
                    } );
                    return !checked.length || checked.length > 1 || checked.length === 1 && checkedDeactivated;
                }

                return !checked.length;
            },
            /**
             * Forwards the User to the contact detail by using the Y.Router
             */
            showContactDetail: function( contact ) {
                var mojitoBinder = this.get( 'mojitoBinder' );
                mojitoBinder.router.save( '/' + contact._id + '/' );
            },

            /**
             * Initialises "editing" ko.observable
             */
            initEditing: function() {
                var
                    self = this;

                self.editing = ko.observable( null );
                viewModel = self;
            },
            /**
             * Unset "editing" ko.observable
             */
            unsetEditing: function() {
                var
                    self = this,
                    currentEditing = peek( self.editing );

                if( currentEditing ) {
                    self.editing( null );
                    currentEditing.destroy();
                }
            },
            /**
             * Destroy "editing" ko.observable
             */
            destroyEditing: function() {
                var
                    self = this;

                self.unsetEditing();
                self.editing = null;
            }
        },
        {
            ATTRS: {
                specialitiesList: {
                    value: [],
                    cloneDefaultValue: true,
                    lazyAdd: false
                },
                mojitoBinder: {
                    value: null,
                    lazyAdd: false
                }
            }
        }
    );

    Y.namespace( 'mojito.binders' )[NAME] = {

        /*        jaderef: 'InSuiteAdminMojit',*/
        jaderef: 'InSuiteAdmin',

        init: function( mojitProxy ) {
            this.mojitProxy = mojitProxy;
        },

        bind: function( node ) {
            var
                self = this;

            Y.doccirrus.NavBarHeader.setActiveEntry( 'contacts' );

            Promise.props( {
                specialitiesList: Y.doccirrus.jsonrpc.api.kbv.fachgruppe().then( function( response ) {
                    return (response && response.data && response.data[0].kvValue || []).map( function( entry ) {
                        return {id: entry.key, text: entry.value};
                    } );
                } ),
                catalogDescriptors: Y.doccirrus.jsonrpc.api.catalog
                    .getCatalogDescriptorsByActType()
                    .then( function( response ) {
                        return response.data;
                    } )
                    .then( function( data ) {
                        Y.doccirrus.catalogmap.init( data );
                    } )
            } ).then( function( result ) {
                self.binderViewModel = new BinderViewModel( {
                    specialitiesList: result.specialitiesList,
                    mojitoBinder: self
                } );
                self.initNavigation();

                setTimeout( function() {
                    ko.applyBindings( self.binderViewModel, node.getDOMNode() );
                }, 1 );
            } ).catch( fail );

        },

        initNavigation: function() {
            var self = this;
            self.router = new Y.doccirrus.DCRouter( {
                root: Y.doccirrus.utils.getUrl( 'contacts' ),
                routes: [
                    {
                        // path: '/',
                        path: /([^\/]*)*\/([^\/]*)?$/,
                        callbacks: function( req ) {

                            var
                                id = req.params[1] || null,
                                type = req.params[2] || null;

                            function publishState() {
                                var
                                    view = 'overview',
                                    params = {type: type};

                                if( id ) {
                                    view = 'detail';
                                    if( 'new' !== id ) {
                                        params.id = id;
                                    }
                                }

                                Y.fire( 'tab_contacts-state', {}, {
                                    view: view,
                                    params: params
                                } );
                            }

                            publishState();
                        }

                    }]
            } );

            var routeTo = location.href.split( 'contacts#' );
            routeTo = (routeTo.length < 2) ? '/' : routeTo[1];

            Y.log( 'Initial YUI router path: ' + routeTo, 'debug', NAME );
            self.router.save( routeTo );

            //  update - YUI router may have refused the route which was set
            routeTo = self.router.getPath();
            Y.log( 'Parsed router path: ' + routeTo, 'debug', NAME );
        }
    };

}, '0.0.1', {
    requires: [
        "DCBinder",
        'mojito-client',
        'SerialLetterAssistantModal',
        'SerialEMailAssistantModal',
        'NavBarHeader',
        'doccirrus',
        'JsonRpcReflection-doccirrus',
        'dcerrortable',
        'dc-comctl',
        'dcutils',
        'dcauth',
        'dcauthpub',
        'DCRouter',
        'DCWindow',
        'DCSystemMessages',
        'KoUI-all',
        'KoViewModel',
        'dccatalogmap',
        'PracticeModel',
        'audit-schema',
        'dccommunication-client',
        'dcinfrastructs',
        'dcsettingsmodel',
        'dcschemaloader',
        'person-schema',
        'identity-schema',
        'employee-schema',
        'IdentityModel',
        'EmployeeModel',
        'simpleperson-schema',
        'LocationModel',
        'WeeklyTimeModel',
        'basecontact-schema',
        'BaseContactModel',
        'dcforms-utils',
        'RoleModel',
        'SettingsModel',
        'auditDiffDialog',
        'SupportBaseContactModel',
        'ContactModel',
        'PhysicianBaseContactModel',
        'InstitutionBaseContactModel',
        'AddContactModal',
        'v_therapistcontact-schema',
        'v_physician-schema',
        'ItemsTabFactory',
        'DCcliDialogs'
    ]
} );
