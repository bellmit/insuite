/*jslint anon:true, sloppy:true, nomen:true*/
/*jshint latedef:false */
/*global YUI, jQuery, ko */
YUI.add( 'ProfileMojitProfile', function( Y, NAME ) {
    'use strict';

    /**
     * The ProfileMojitProfile module.
     *
     * @module ProfileMojitProfile
     */

    var
        i18n = Y.doccirrus.i18n,
        peek = ko.utils.peekObservable,
        KoViewModel = Y.doccirrus.KoViewModel,
        viewModel = null;

    /**
     * @for ProfileMojitProfile
     * @event localStorageClearForUser
     * @description Fires to notify about that the user specific localStorage was cleared
     * @param {EventFacade} eventFacade The EventFacade, if any
     * @param {Object} eventData Event data, if any
     * @type Event.Custom
     */
    Y.publish( 'localStorageClearForUser', {
        preventable: false
    } );

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
     * @constructor
     * @class OnlineStatusViewModel
     */
    function OnlineStatusViewModel() {
        OnlineStatusViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( OnlineStatusViewModel, KoViewModel.getDisposable(), {
        /** @protected */
        initializer: function() {
            var
                self = this;

            self.initPending();
            self.initOnlineStatusViewModel();
        },
        /** @protected */
        destructor: function() {
        },
        /**
         * busy flag
         */
        pending: null,
        /** @protected */
        initPending: function() {
            var
                self = this;

            self.pending = ko.observable( false );

        },
        /** @protected */
        initOnlineStatusViewModel: function() {
            var
                self = this;

            self.onlineEmployees = ko.observable( false );
            self.onlinePatients = ko.observable( false );
            self.onlinePartners = ko.observable( false );
            self.signaling = ko.observable( false );

            self.explainerFirstI18n = i18n( 'ProfileMojit.OnlineStatusViewModel.explainer.FIRST' );
            self.labelEmployeesI18n = i18n( 'ProfileMojit.OnlineStatusViewModel.label.EMPLOYEES' );
            self.labelPatientsI18n = i18n( 'ProfileMojit.OnlineStatusViewModel.label.PATIENTS' );
            self.labelPartnersI18n = i18n( 'ProfileMojit.OnlineStatusViewModel.label.PARTNERS' );
            self.signalingI18n = i18n('person-schema.Communication_T.signaling');

        },
        /**
         * Load data for this view model
         */
        load: function() {
            var
                self = this;

            self.pending( true );

            return Y.doccirrus.jsonrpc.api.identity.getOnlineStatus()
                .then( function( response ) {
                    return response && Array.isArray( response.data ) && response.data[0] || {
                            onlineEmp: false,
                            onlinePat: false,
                            onlinePartner: false,
                            signaling: false
                        };
                } )
                .done( function( onlineStatus ) {
                    self.onlineEmployees( onlineStatus.onlineEmp );
                    self.onlinePatients( onlineStatus.onlinePat );
                    self.onlinePartners( onlineStatus.onlinePartner );
                    self.signaling( onlineStatus.signaling );
                } )
                .fail( fail )
                .always( function() {
                    self.pending( false );
                } );
        },
        /**
         * Reload data for this view model
         */
        reload: function() {
            var
                self = this;

            return self.load();
        },
        /**
         * Save data for this view model
         */
        save: function() {
            var
                self = this,
                data = {
                    onlineEmp: peek( self.onlineEmployees ),
                    onlinePat: peek( self.onlinePatients ),
                    onlinePartner: peek( self.onlinePartners ),
                    signaling: peek( self.signaling )
                };

            self.pending( true );

            return Y.doccirrus.jsonrpc.api.identity
                .updateOnlineStatus( {query: data} )
                .fail( fail )
                .always( function() {
                    self.pending( false );
                } );
        }
    } );

    /**
     * @constructor
     * @class UserDetailsViewModel
     */
    function UserDetailsViewModel() {
        UserDetailsViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( UserDetailsViewModel, KoViewModel.getDisposable(), {
        _localStorageClearForUser: null,
        /** @protected */
        initializer: function( ) {
            var
                self = this;

            self.initPending();
            self.initUserDetailsViewModel();

            self._localStorageClearForUser = Y.after( 'localStorageClearForUser', function() {
                self.reload();
            } );

        },
        /** @protected */
        destructor: function() {
            var
                self = this;

            if( self._localStorageClearForUser ) {
                self._localStorageClearForUser.detach();
                self._localStorageClearForUser = null;
            }
        },
        /**
         * busy flag
         */
        pending: null,
        /** @protected */
        initPending: function() {
            var
                self = this;

            self.pending = ko.observable( false );

        },

        locationFilterId: null,
        employeeLocations: null,
        employeeLocationsSelect2: null,
        select2LocationsConfig: null,
        displayNoLocations: null,
        displayLocationSelect: null,
        noLocationsMessage: null,
        arztstempel: null,

        /** @protected */
        initUserDetailsViewModel: function() {
            var
                self = this;


            self.userDetailsHeadlineI18n = i18n( 'ProfileMojit.UserDetailsViewModel.headline' );
            self.userLocationLabelFilterI18n = i18n( 'ProfileMojit.UserDetailsViewModel.userLocationsFilter.label' );
            self.emailHeadlineI18n = i18n( 'ProfileMojit.UserDetailsViewModel.emailHeadline' );
            self.emailNotificationTextI18n = i18n( 'ProfileMojit.UserDetailsViewModel.text.EMAIL_NOTIFICATION_TEXT' );
            self.emailNotificationI18n = i18n( 'ProfileMojit.UserDetailsViewModel.emailNotification' );
            self.preferredLanguageI18n = i18n( 'ProfileMojit.profile.title.PREFERRED_LANGUAGE' );
            self.browserDefinedI18n = i18n( 'ProfileMojit.profile.title.BROWSER_DEFINED' );
            self.englishI18n = i18n( 'ProfileMojit.profile.title.ENGLISH' );
            self.germanI18n = i18n( 'ProfileMojit.profile.title.GERMAN' );
            self.arztstempelI18n = i18n( 'ProfileMojit.arztstempel.headline' );
            self.arztstempelDescriptionI18n = i18n( 'ProfileMojit.arztstempel.description' );

            self.emailNotification = ko.observable();
            self.employeeId = null;
            self.employeeIdDebug = ko.observable( 'loading...' );
            self.preferredLanguage = ko.observable();
            self.labdataSortOrder = ko.observable( '' );
            self.displayNoLocations = ko.observable( false );
            self.displayLocationSelect = ko.observable( false );
            self.currentLocationObj = ko.observable();

            self.noLocationsMessage = ko.observable( '' );
            self.arztstempel = ko.observable();

            if ( !self.currentLocation ) {
                self.currentLocation = ko.observable();
            }

            self.updateLocationListener = self.currentLocationObj.subscribe( function( newLocation ) {
                self.currentLocation( ko.unwrap( newLocation._id ) );
            } );

            self._updateLocationId = self.currentLocationObj.subscribe( self.onLocationChanged );

            self.locationFilterId = ko.observable();
            self.employeeLocations = ko.observableArray();
            self.employeeLocationsSelect2 = ko.computed( function() {
                var
                    employeeLocations = ko.unwrap( self.employeeLocations ),
                    results = [
                        {
                            id: '',
                            text: i18n( 'ProfileMojit.UserDetailsViewModel.userLocationsFilter.value.ALL' )
                        }
                    ].concat( employeeLocations.map( self.locationToSelect2Object ) );

                return results;
            } );

            self.select2LocationsConfig = {
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        var
                            employeeLocations = ko.unwrap( self.employeeLocationsSelect2 ),
                            locationFilterId = ko.unwrap( self.locationFilterId ),
                            result = Y.Array.find( employeeLocations, function( entry ) {
                                return entry.id === locationFilterId;
                            } );
                        return result;

                    },
                    write: function( $event ) {
                        self.locationFilterId( $event.val );
                    }
                }, self ) ),
                select2: {
                    width: '100%',
                    placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                    data: function() {
                        // console.log(self.employeeLocationsSelect2())
                        return {results: peek( self.employeeLocationsSelect2 )};
                    }
                }
            };

        },



        /**
         *  Called after profile is loaded from server, to update the 'current location' checkbox
         */

        setLocation: function( newLocationId ) {
            var
                self = this,
                availableLocations = self.employeeLocations(),
                i;

            self.currentLocation(newLocationId);
            for ( i = 0; i < availableLocations.length; i++ ) {
                if ( availableLocations[i]._id === newLocationId ) {
                    self.currentLocationObj( availableLocations[i] );
                }
            }
        },

        /**
         *  Raised when the user selects a different location in the dropdown
         */

        onLocationChanged: function( newLocationObj ) {
            if ( !newLocationObj || !newLocationObj._id ) {
                Y.log( 'Could not set current location for user, no _id', 'warn', NAME );
                return;
            }
            var self = this;
            if ( !self.currentLocation ) {
                self.currentLocation = ko.observable();
            }
            if ( self.currentLocation() !== newLocationObj._id ) {
                self.currentLocation( newLocationObj._id );
            }
        },

        /**
         * Map a location object to a select2 item object
         * @param {Object} location
         * @return Object
         */
        locationToSelect2Object: function( location ) {
            return {
                id: location._id,
                text: location.locname
            };
        },
        /**
         * Load data for this view model
         */
        load: function() {
            var
                self = this;

            self.pending( true );
            self.locationFilterId( Y.doccirrus.utils.getFilter().location || '' );

            Y.doccirrus.jsonrpc.api.employee
                .getEmployeeForUsername( {username: Y.doccirrus.auth.getUserId()} )
                .then( function( response ) {
                    var
                        data = response && response.data;

                    if( data && data.notifications ) {
                        data.notifications.forEach( function( notification ) {
                            if( Y.doccirrus.schemas.employee.notificationTypeList.EMAIL === notification.type ) {
                                self.emailNotification( notification.active );
                            }
                        } );
                    }

                    //  available printers will depend on current location
                    self.setLocation( data.currentLocation || '' );

                    //  is set when user arranges rows in Tabelle tab of LABDATA activities
                    self.labdataSortOrder( data.labdataSortOrder || '' );

                    self.preferredLanguage( data.preferredLanguage || Y.Cookie.get( 'preferredLanguage' ) );
                    self.employeeId = data && data._id && data._id.toString();
                    self.employeeIdDebug( 'Employee: ' + self.employeeId );

                    self.arztstempel( data.arztstempel || '' );

                    return data && Array.isArray( response.data.locations ) && response.data.locations || [];
                } )
                .done( function( locations ) {
                    var currentLocationId, i;

                    self.employeeLocations( locations );
                    self.displayLocationSelect( locations.length > 0 );
                    self.displayNoLocations( locations.length === 0 );

                    //  initialize the 'select current location' dropdown
                    currentLocationId = ko.unwrap( self.currentLocation );

                    for ( i = 0; i < locations.length; i++ ) {
                        if ( currentLocationId === locations[i]._id ) {
                            self.currentLocationObj( locations[i] );
                        }
                    }

                } )
                .done( function() {
                    var
                        urlPlaceholder = '%%locationUrl%%',
                        profileUrl = Y.doccirrus.infras.getPrivateURL( 'admin/insuite#/employee/' + self.employeeId ),
                        msgHtml = i18n( 'ProfileMojit.UserDetailsViewModel.userLocationsFilter.noLocations' );
                    self.noLocationsMessage( msgHtml.replace( urlPlaceholder, profileUrl ) );
                } )
                .fail( fail )
                .always( function() {
                    self.pending( false );
                } );
        },
        /**
         * Reload data for this view model
         */
        reload: function() {
            var
                self = this;

            self.load();
        },
        /**
         * Save data for this view model
         */
        save: function() {
            var
                self = this,
                notifications = [
                    {
                        type: Y.doccirrus.schemas.employee.notificationTypeList.EMAIL,
                        active: ko.unwrap( self.emailNotification )
                    }];

            Y.doccirrus.utils.localValueSet( 'filter', JSON.stringify( {
                location: peek( self.locationFilterId )
            } ) );

            Y.Cookie.set( 'preferredLanguage', ko.unwrap( self.preferredLanguage ), {expires: new Date( 'January 01, 2025' )} );

            return Y.doccirrus.jsonrpc.api.employee.updateOnlyEmployee( {
                query: {
                    _id: self.employeeId
                },
                fields: [
                    'notifications',
                    'preferredLanguage',
                    'currentLocation',
                    'arztstempel'
                ],
                data: {
                    notifications: notifications,
                    preferredLanguage: ko.unwrap( self.preferredLanguage ),
                    currentLocation: ko.unwrap( self.currentLocation ),
                    arztstempel: ko.unwrap( self.arztstempel )
                }
            } );

        }
    } );

    /**
     * @constructor
     * @class ClientDebugViewModel
     */
    function ClientDebugViewModel() {
        ClientDebugViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ClientDebugViewModel, KoViewModel.getDisposable(), {
        _localStorageClearForUser: null,
        /** @protected */
        initializer: function() {
            var
                self = this;

            self.initPending();
            self.initClientDebugViewModel();

            self._localStorageClearForUser = Y.after( 'localStorageClearForUser', function() {
                self.clientDebug( false );
                self.save();
            } );

        },
        /** @protected */
        destructor: function() {
            var
                self = this;

            if( self._localStorageClearForUser ) {
                self._localStorageClearForUser.detach();
                self._localStorageClearForUser = null;
            }
        },
        /**
         * busy flag
         */
        pending: null,
        /** @protected */
        initPending: function() {
            var
                self = this;

            self.pending = ko.observable( false );

        },
        clientDebug: null,
        /** @protected */
        initClientDebugViewModel: function() {
            var
                self = this;

            self.clientDebug = ko.observable();

            self.enableClientDebugInfoI18n = i18n( 'ProfileMojit.ClientDebugViewModel.enableClientDebugInfo' );
            self.enableClientDebugYesI18n = i18n( 'ProfileMojit.ClientDebugViewModel.enableClientDebugYes' );
            self.enableClientDebugNoI18n = i18n( 'ProfileMojit.ClientDebugViewModel.enableClientDebugNo' );

        },
        /**
         * Load data for this view model
         */
        load: function() {
            var
                self = this,
                value = JSON.parse( localStorage.getItem( 'initialClientDebugValue' ) );

            self.clientDebug( value );
        },
        /**
         * Reload data for this view model
         */
        reload: function() {
            var
                self = this;

            self.load();
        },
        /**
         * Save data for this view model
         */
        save: function() {
            var
                self = this,
                clientDebug = ko.unwrap( self.clientDebug );

            localStorage.setItem( 'initialClientDebugValue', JSON.stringify( clientDebug ) );

            if( clientDebug ) {
                Y.config.debug = YUI.GlobalConfig.debug;
                Y.config.logLevel = YUI.GlobalConfig.logLevel;
            }
            else {
                Y.config.debug = false;
                Y.config.logLevel = 'none';
            }
        }
    } );


    /**
     * This views ViewModel
     * @constructor
     */
    function ViewModel() {
        ViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ViewModel, KoViewModel.getDisposable(), {
        /** @protected */
        initializer: function() {
            var
                self = this;

            self.initViewModel();
        },
        /** @protected */
        destructor: function() {
        },
        /**
         * Initializer
         */
        initViewModel: function() {
            var
                self = this;

            self.initOnlineStatus();
            self.initUserDetails();
            self.initClientDebug();
            self.initPresettings();
            self.initActions();
            self.initLoadMask();

            self.headLineI18n = i18n( 'ProfileMojit.OnlineStatusViewModel.headline' );
            self.phoneHeadlineI18n = i18n('ProfileMojit.PhoneStatusViewModel.headline');
            self.debugHeadlineI18n = i18n( 'ProfileMojit.ClientDebugViewModel.headline' );
            self.headlineTextI18n = i18n( 'ProfileMojit.ProfileManagementViewModel.headline.text' );
            self.changePwI18n = i18n( 'ProfileMojit.button.CHANGE_PW' );
            self.buttonSaveI18n = i18n( 'general.button.SAVE' );
            self.buttonClearMyProfileI18n = i18n('ProfileMojit.button.CLEAR_LOCAL_STORAGE');
        },
        // handle view
        /**
         * bound node
         */
        node: null,
        /**
         * busy flag
         */
        pending: null,
        /**
         * init actions this view exposes
         */
        initActions: function() {
            var
                self = this;

            self.node = ko.observable( null );
            self.pending = ko.observable( false );

        },
        /**
         * init the loading mask
         */
        initLoadMask: function() {
            var
                self = this;

            self.addDisposable( ko.computed( function() {
                var
                    pending = [
                        self.pending(),
                        self.onlineStatus.pending(),
                        self.userDetails.pending(),
                        self.clientDebug.pending(),
                        self.presettings.pending()
                    ].some( function( value ) {
                        return value;
                    } ),
                    node = self.node();

                if( !node ) {
                    return;
                }

                if( pending ) {
                    Y.doccirrus.utils.showLoadingMask( node );
                }
                else {
                    Y.doccirrus.utils.hideLoadingMask( node );
                }

            } ).extend( {rateLimit: 0} ) );
        },
        onlineStatus: null,
        /** @protected */
        initOnlineStatus: function() {
            var
                self = this;

            self.onlineStatus = new OnlineStatusViewModel();
            self.onlineStatus.load();

        },
        userDetails: null,
        /** @protected */
        initUserDetails: function() {
            var
                self = this;

            self.userDetails = new UserDetailsViewModel();
            self.userDetails.load();

        },
        clientDebug: null,
        /** @protected */
        initClientDebug: function() {
            var
                self = this;

            self.clientDebug = new ClientDebugViewModel();
            self.clientDebug.load();
        },
        presettings: null,
        /** @protected */
        initPresettings: function() {
            var
                self = this;

            self.presettings = new Y.doccirrus.ProfileManagementViewModel.create({ fromProfile: true });
            self.presettings.infoCommonI18n = i18n( 'ProfileMojit.ProfileManagementViewModel.info.common' );
            self.presettings.infoStoreI18n = i18n( 'ProfileMojit.ProfileManagementViewModel.info.store' );
            self.presettings.profileLabelI18n = i18n( 'ProfileMojit.ProfileManagementViewModel.profile.label' );
            self.presettings.buttonRestoreProfileI18n = i18n( 'ProfileMojit.ProfileManagementViewModel.button.RESTORE_Profile' );
            self.presettings.buttonStoreProfileI18n = i18n( 'ProfileMojit.ProfileManagementViewModel.button.STORE_Profile' );
            self.presettings.configureWorkStationI18n = i18n( 'ProfileMojit.configureWorkStation' );
        },
        /**
         * Handles the changePassword click-event
         */
        changePasswordClick: function() {

            Y.doccirrus.jsonrpc.api.employee
                .doResetUserPw( {} )
                .done( function() {
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: 'PasswordResetDialog-success',
                        content: i18n( 'employee-api.doResetEmployeePw.success' )
                    } );
                } )
                .fail( function() {
                    Y.doccirrus.DCWindow.notice( {
                        type: 'error',
                        message: i18n( 'employee-api.doResetEmployeePw.failure' ),
                        window: {width: 'medium'}
                    } );
                } );
        },

        clearLocalStorageForUser: function(){
            var self = this;
            Y.doccirrus.utils.localValueClearAll();

            Y.doccirrus.DCSystemMessages.addMessage( {
                messageId: 'profile-clear',
                content: i18n( 'general.message.LOCALSTORAGE_CLEARED' )
            } );
            return self.reload;
        },

        /**
         * Handles the primarySave click-event
         */
        primarySaveClick: function() {
            var
                self = this;

            jQuery.when(
                self.onlineStatus.save(),
                self.userDetails.save(),
                self.clientDebug.save()
            )
                .done( function() {

                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: 'profile-save',
                        content: i18n( 'general.message.CHANGES_SAVED' )
                    } );
                } );
        }
    } );

    viewModel = new ViewModel();

    /**
     * Constructor for the ProfileMojitProfile class.
     *
     * @class ProfileMojitProfile
     * @constructor
     */
    Y.namespace( 'mojito.binders' )[NAME] = {

        /**
         * Binder initialization method, invoked after all binders on the page
         * have been constructed.
         */
        init: function( mojitProxy ) {
            this.mojitProxy = mojitProxy;
        },

        /**
         * The binder method, invoked to allow the mojit to attach DOM event
         * handlers.
         *
         * @param node {Node} The DOM node to which this mojit is attached.
         */
        bind: function( node ) {
            var
                self = this;

            self.node = node;
            viewModel.node( node );
            ko.applyBindings( viewModel, node.getDOMNode() );

        },

        /**
         * After refreshView has been called and the DOM has been refreshed, an event is triggered that calls the hook method onRefreshView.
         * You can use onRefreshView to do things such as detach an event or prepare for another user action by re-attaching an event.
         * @method onRefreshView
         * @param node {Node} The DOM node to which this mojit is attached.
         */

        onRefreshView: function( node ) {
            var
                self = this;

            viewModel.node( null );
            ko.cleanNode( node.getDOMNode() );

            self.bind.apply( self, arguments );
        }

    };

}, '0.0.1', {
    requires: [
        'oop',
        'router',
        'mojito-client',
        'employee-schema',
        'dcutils',
        'doccirrus',
        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'dcerrortable',
        'dc-comctl',
        'dcutils',
        'dcauth',
        'dcauthpub',
        'DCWindow',
        'DCSystemMessages',
        'KoViewModel',
        'cookie',
        'ProfileMojitProfileManager'
    ]
} );