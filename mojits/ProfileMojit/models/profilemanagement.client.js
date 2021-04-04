/*jslint anon:true, sloppy:true, nomen:true*/
/*jshint latedef:false */
/*global YUI, jQuery, _, ko, $, moment */
YUI.add( 'ProfileMojitProfileManager', function( Y, NAME ) {
    'use strict';

    /**
     * The ProfileMojitProfile module.
     *
     * @module ProfileMojitProfile
     */

    var
        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel;

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
     * @class LocalStorageDataViewModel
     */
    function LocalStorageDataViewModel() {
        LocalStorageDataViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( LocalStorageDataViewModel, KoViewModel.getDisposable(), {
        initializer: function() {
            var
                self = this;
            self.initLocalStorageDataViewModel();
        },
        destructor: function() {
        },
        initLocalStorageDataViewModel: function() {
            var self = this;

            self.selectedData = ko.observableArray();
            self.selectedPrinters = ko.observableArray();
            self.selectData = function(data) {
                switch(data.id) {
                    case 0 :
                        self.selectedPrinters(self.displayData[0].data);
                        self.selectedData([]);
                        break;
                    case 2 :
                        self.selectedPrinters([]);
                        self.selectedData(self.displayData[2].data);
                        break;
                    default:
                        self.selectedPrinters([]);
                        self.selectedData([]);
                }
            };

        }
    } );


    /**
     * @constructor
     * @class ProfileManagementViewModel
     */
    function ProfileManagementViewModel(  ) {
        ProfileManagementViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ProfileManagementViewModel, KoViewModel.getDisposable(), {
        /** @protected */
        initializer: function( options ) {
            var
                self = this;

            self.contentI18n = i18n('general.title.CONTENT');
            self.oldProfileI18n = i18n('ProfileMojit.ProfileManagementViewModel.oldProfile');

            self.storedProfiles = ko.observableArray( [] );
            self.selectedCommonProfile = ko.observable();
            self.commonProfiles = ko.observableArray( [] );
            self.defaultCommonProfile = ko.observable();

            self.fromProfile = ko.observable( options.fromProfile );
            self.fromSettings = ko.observable( options.fromSettings );

            self.profileLabel = ko.observable();
            self.workStation = ko.observable();
            self.workStations = ko.observableArray();
            self.workStationSelected = ko.observable(false);
            self.tiCardReaders = ko.observableArray();
            self.hasTiLicense = Y.doccirrus.auth.hasAdditionalService( 'inTi' );

            self.lastActivatedProfileText = ko.observable();
            self.activeProfileId = ko.observable();

            self.storeProfileDisabled = ko.pureComputed( function(){
                return Boolean( !(self.profileLabel() && self.workStation()) );
            });

            self.hasStoredData = ko.observable( false );

            self.initPending();
            self.initProfileManagementViewModel();

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
        initProfileManagementViewModel: function() {
            var
                self = this,
                query;
            if( self.fromProfile() ){
                query = {
                    userId: Y.doccirrus.auth.getUserId(),
                    $or: [
                        {commonProfile: {$exists: false}},
                        {commonProfile: false}
                    ]
                };
            } else {
                query = {
                    commonProfile: true
                };
            }

            Promise.all([
                Promise.resolve( Y.doccirrus.jsonrpc.api.profile.read({
                    query: query,
                    options: {
                        sort: {timestamp: -1},
                        fields: {_id: 1, profileLabel: 1, workStation: 1, config: 1, 'config.localStorage': 1}
                    }
                }) ),
                Promise.resolve( Y.doccirrus.jsonrpc.api.workstation.getWithTiCardReaders() )
            ]).then(function( res ) {
                var
                    profiles = res[0] && res[0].data || [];

                self.workStations( res[1] && res[1].data || [] );

                self.workStationsMap = self.workStations().reduce( function( obj, item ) {
                    obj[item._id] = item;
                    return obj;
                }, {} );

                if( profiles.length > 0 ) {
                    profiles.forEach( function( profile ) {
                        profile.workStationName = self.workStationsMap[profile.workStation] && self.workStationsMap[profile.workStation].name || '';
                    } );
                    self.hasStoredData( true );
                }

                if(self.fromProfile){
                    self.getCommonProfiles();
                }
                if(self.fromSettings){
                    self.getDefaultProfile();
                }

                self.storedProfiles( profiles );
                self.getLastProfile();
            }).catch( fail );

            self.initSelect2WorkStation();
            if( self.hasTiLicense ) {
                self.initSelect2TiCardReaders();
            }
        },

        initSelect2WorkStation: function() {
            var
                self = this;

            self.select2WorkStation = {
                data: self.addDisposable( ko.computed( {
                    read: function() {},
                    write: function( $event ) {
                        self.workStation( $event.val );
                        self.workStationSelected(true);
                    }
                }, self ) ),
                select2: {
                    width: '100%',
                    placeholder: i18n( 'ProfileMojit.ProfileManagementViewModel.profile.workStation' ),
                    data: function() {
                        return {
                            results: self.workStations().map(function ( workStation ) {
                                return {
                                    id: workStation._id,
                                    text: workStation.name
                                };
                            })
                        };
                    }
                }
            };
        },

        initSelect2TiCardReaders: function() {
            var
                self = this;

            self.select2TiCardReader = {
                data: self.addDisposable( ko.computed( {
                    read: function() {},
                    write: function( $event ) {
                        self.tiCardReaders( $event.val );
                    }
                }, self ) ),
                select2: {
                    width: '100%',
                    placeholder: i18n( 'ProfileMojit.ProfileManagementViewModel.profile.tiCardReader' ),
                    multiple: true,
                    data: function() {
                        if (!self.workStation()) {
                            return {results: []};
                        } else {
                            return {
                                results: self.workStationsMap[self.workStation()].tiCardReaders.map(function ( tiCardReader ) {
                                    return {
                                        id: tiCardReader._id,
                                        text: tiCardReader.name
                                    };
                                })
                            };
                        }
                    }
                }
            };
        },

        showCommonProfiles: function() {
            var self = this;
            return self.fromProfile() && self.commonProfiles().length;
        },

        /** @protected */
        getCommonProfiles: function() {
            var
                self = this;

            Y.doccirrus.jsonrpc.api.profile.read( {
                query: { commonProfile: true },
                options: {
                    sort: { timestamp: -1 },
                    fields: {_id: 1, profileLabel: 1, workStation: 1 }
                }
            } ).done( function( result ) {
                var profiles = ( result && result.data || [] );
                profiles = profiles.map( function( el ){
                    return {
                        val: el._id.toString(),
                        text: ( el.profileLabel || '' ) + ' / ' + ( el.workStation && self.workStationsMap[el.workStation] && self.workStationsMap[el.workStation].name || '' ),
                        profileLabel: el.profileLabel,
                        workStation: el.workStation
                    };
                } );
                self.commonProfiles( profiles );
            } ).fail( fail );

            self.getDefaultProfile();
        },

        getDefaultProfile: function() {
            var
                self = this,
                filteredCommon,
                defaultProfilesFiltered,
                foundProfile,
                resultText = '';
            Y.doccirrus.jsonrpc.api.profile.getDefaultProfile()
                .done( function( result ) {
                    var data = result && result.data && result.data[0] || {},
                        defaultProfile = data.defaultCommonProfile,
                        defaultCommonProfileDate = data.defaultCommonProfileDate;

                    self.defaultCommonProfile( defaultProfile );
                    if( defaultProfile && self.commonProfiles().length ){
                        filteredCommon = (self.commonProfiles() || []).filter(function(el){
                            return el.val === defaultProfile;
                        });
                        if( filteredCommon.length ) {
                            self.selectedCommonProfile( defaultProfile );
                        }
                    }

                    if( self.fromSettings() === true ) {
                        if(defaultProfile){
                            defaultProfilesFiltered = ( self.storedProfiles() || []).filter(function(el){
                                return el._id === defaultProfile;
                            });
                            if(defaultProfilesFiltered.length){
                                foundProfile = defaultProfilesFiltered[0];
                                resultText = i18n( 'ProfileMojit.ProfileManagementViewModel.default_profile' ) + ': "' + ( foundProfile.profileLabel || '' ) + ' / ' + ( foundProfile.workStationName || '' ) + '"';
                                if( defaultCommonProfileDate ){
                                    resultText = resultText + ' ' +  i18n( 'ProfileMojit.ProfileManagementViewModel.activated_at' ) + ' ' +
                                                 moment( defaultCommonProfileDate ).format( i18n( 'general.TIMESTAMP_FORMAT' ) );
                                }
                                defaultProfilesFiltered = ( self.storedProfiles() || []).filter(function(el){
                                    return el._id !== defaultProfile;
                                });
                                defaultProfilesFiltered.unshift(foundProfile);
                                self.storedProfiles( defaultProfilesFiltered );
                            }

                        }
                        self.lastActivatedProfileText( resultText );
                        self.activeProfileId(defaultProfile);
                    }
                } ).fail( fail );
        },

        /**
         * Get last activated profile for logged in user
         * @returns void
         */
        getLastProfile: function() {
            var
                self = this,
                storedProfiles = self.storedProfiles(),
                lastProfile,
                lastProfileText,
                lastActivatedProfileFound = null,
                localStorageProfile = Y.doccirrus.utils.localValueGet( 'activatedProfile' ) || null,
                lastActivatedProfile = localStorageProfile ? JSON.parse( localStorageProfile ) : null;

            if( self.fromProfile() === true ) {
                if ( lastActivatedProfile ) {
                    setLastActivatedProfile( lastActivatedProfile );
                } else {
                    Y.doccirrus.jsonrpc.api.identity.getLastActivatedProfile()
                        .done( function( lastActivated ) {
                            if( lastActivated && lastActivated.data && lastActivated.data && lastActivated.data[0] && lastActivated.data[0].profileLastActivated ) {
                                setLastActivatedProfile( lastActivated.data[0].profileLastActivated );
                            }
                        } )
                        .fail( fail );
                }
            }

            function setLastActivatedProfile( lastActivated ) {
                lastProfile = lastActivated;
                lastProfileText = lastProfile && Y.Lang.sub( i18n( 'ProfileMojit.ProfileManagementViewModel.restore_profile.last' ), {
                        profileLabel: lastProfile.profileLabel,
                        workStationName: self.workStationsMap[lastProfile.workStation] && self.workStationsMap[lastProfile.workStation].name || '',
                        timestamp: moment( lastProfile.timestamp ).format( i18n( 'general.TIMESTAMP_FORMAT' ) )
                    } );
                self.lastActivatedProfileText( lastProfileText );
                self.activeProfileId( lastProfile.profileId );

                if( storedProfiles && storedProfiles.length ) {
                    lastActivatedProfileFound = null;
                    storedProfiles = storedProfiles.filter( function( el ) {
                        if( el._id === lastProfile.profileId ) {
                            lastActivatedProfileFound = el;
                            return false;
                        }
                        return true;
                    } );
                    if( lastActivatedProfileFound ) {
                        storedProfiles.unshift( lastActivatedProfileFound );
                        self.storedProfiles( storedProfiles );
                    }
                }
            }
        },

        /**
         * Clear all localStorage values that are associated with the current user
         * @returns void
         */
        clearLocalStorage: function() {
            return Y.doccirrus.utils.localValueClear();
        },

        /**
         * Resets kotableconfiguration and applies preset if available for the current user
         * @returns jQuery.Deferred
         */
        resetTableConfigurationAndApplyPresetForUser: function() {
            return Y.doccirrus.jsonrpc.api.kotableconfiguration
                .resetTableConfigurationAndApplyPresetForUser( {
                    userId: Y.doccirrus.auth.getUserId()
                } );
        },
        /**
         * Resets InSight2 container configs
         * @returns jQuery.Deferred
         */
        resetInSight2ContainerConfigs: function() {
            return Y.doccirrus.jsonrpc.api.insight2containers
                .resetUserConfigs( {
                    userId: Y.doccirrus.auth.getUserId()
                } );
        },

        confirmProfileOperation: function( textPath, data, operationFn ) {
            Y.doccirrus.DCWindow.confirm( {
                message: [
                    Y.Lang.sub(i18n( textPath ), {
                        profileLabel: data.profileLabel,
                        workStationName: data.workStationName
                    } ),
                    '<br><br>',
                    i18n( 'general.message.ARE_YOU_SURE' )
                ].join( '' ),
                callback: function( dialog ) {
                    if( dialog.success ) {
                        operationFn();
                    }
                },
                window: {
                    width: 'medium'
                }
            } );
        },

        reStoreCommonProfile: function( self, data ){
            var selected = (data.commonProfiles() || []).filter( function(el){
                return el.val === data.selectedCommonProfile();
            });

            if(selected.length){
                data.reStoreProfile(data, {
                    _id: selected[0].val,
                    profileLabel: selected[0].profileLabel,
                    workStation: selected[0].workStation,
                    workStationName: data.workStationsMap[selected[0].workStation] && data.workStationsMap[selected[0].workStation].name
                });
            }
        },

        reStoreProfile: function( self, data ) {
            function onPrintersLoaded(printers ) {
                Y.doccirrus.utils.localValueSet( 'printers', JSON.stringify(printers.data ? printers.data : printers) );
                window.location.reload();
            }

            if( self.fromSettings()) {
                Y.doccirrus.jsonrpc.api.profile.setDefaultProfile( {
                    toSet: data._id
                } ).done( function() {
                    self.getDefaultProfile();
                } ).fail( fail );
            }

            if( self.fromProfile()) {
                self.confirmProfileOperation( 'ProfileMojit.ProfileManagementViewModel.restore_profile.confirm.message', data, function(){
                    Y.doccirrus.jsonrpc.api.profile.reStoreProfile( {
                        _id: data._id
                    } ).done( function( result ) {
                        var keys = result && result.data && Object.keys( result.data ) || [],
                        localStorageProfile = {
                            timestamp: new Date(),
                            profileId: data._id.toString(),
                            workStation: data.workStation,
                            tiCardReaders: data.tiCardReaders,
                            profileLabel: data. profileLabel
                        };

                        if( keys.length ) {
                            self.clearLocalStorage();
                            keys.forEach( function( key ) {
                                Y.doccirrus.utils.localValueSet( key.replace(/\{d\}/g, '.').replace( /^.*?\_/, '' ), result.data[key] );
                            } );
                        }
                        data.timestamp = new Date();
                        Y.doccirrus.utils.localValueSet( 'activatedProfile', JSON.stringify( localStorageProfile ) );
                        self.getLastProfile();
                        Y.doccirrus.jsonrpc.api.printer
                            .getPrinter()
                            .done( function( response ) {
                                onPrintersLoaded(response);
                            } )
                            .fail( function( error ) {
                                Y.log( 'getPrinter. Can not get printers. Error: ' + JSON.stringify( error ), 'debug', NAME );
                            } );
                    } ).fail( fail );
                });
            }
        },

        deleteProfile: function( self, data ){
            self.confirmProfileOperation( 'ProfileMojit.ProfileManagementViewModel.delete_profile.confirm.message', data, function(){
                Y.doccirrus.jsonrpc.api.profile.delete( {
                    _id: data._id
                } ).done( function() {
                    var storedProfiles = self.storedProfiles().filter( function( el ){ return el._id !== data._id; } );
                    self.storedProfiles( storedProfiles );
                } ).fail( fail );
            });
        },

        showLocalStoragePopup: function( context, data ) {
            var
                localStorageViewModel = new LocalStorageDataViewModel(),
                boundNode,
                aDCWindow,
                printers = JSON.parse(data.config.localStorage[Y.doccirrus.auth.getUserId() + '_printers'] || '[]'),
                printersName = '',
                defaultPrinter = JSON.parse(data.config.localStorage[Y.doccirrus.auth.getUserId() + '_defaultPrinter'] || '{}'),
                defaultPrintersName = [],
                canonicalIdList = [],
                args = {};

            args.originalParams = {};

            if (printers && printers.length > 0) {
                printers.forEach(function( i, idx ) {
                    if (idx === printers.length - 1) {
                        printersName += i.name;
                    } else {
                        printersName += i.name + ', ';
                    }
                });
            }

            if (defaultPrinter && Object.keys(defaultPrinter) && Object.keys(defaultPrinter).length > 0) {
                Object.keys(defaultPrinter).forEach(function( item ) {
                    Object.keys(defaultPrinter[item]).forEach(function( i ) {
                        if( i ) {
                            canonicalIdList.push(i);
                        }
                    });
                });
            }

            args.originalParams.canonicalIds = canonicalIdList;

            Y.doccirrus.jsonrpc.api.formtemplate
                .latestVersionMeta( args.originalParams )
                .done( function( result ) {
                    if ( result.data && result.data.length > 0 ) {
                        Object.keys(defaultPrinter).forEach(function( item ) {
                            Object.keys(defaultPrinter[item]).forEach(function( i ) {
                                if ( defaultPrinter[item][i] ) {
                                    Y.doccirrus.jsonrpc.api.location
                                        .read( {query: {_id: item}} )
                                        .done( function( response ) {
                                            var data = response && response.data[0],
                                            formName = result.data.filter(function( can ) {
                                                return i === can.canonicalId;
                                            });
                                            defaultPrintersName.push({
                                                location: data && data.locname,
                                                name: defaultPrinter[item][i].printerName,
                                                formName: (formName[0] && formName[0].jsonTemplate && formName[0].jsonTemplate.name.de)||(formName[0] && formName[0].title && formName[0].title.de)
                                            });
                                        } )
                                        .fail( fail );
                                }
                            });
                        });
                    }
                } ).fail( fail );

            localStorageViewModel.data = [
                {
                    name: 'Ausgewählte Drucker',
                    displaySub: '',
                    id: 0
                },
                {
                    name: 'Drucker',
                    displaySub: printersName,
                    id: 1
                },
                {
                    name: 'Details',
                    displaySub: '',
                    id: 2
                }
            ];

            localStorageViewModel.displayData = [
                {
                    data: defaultPrintersName,
                    id: 0
                },
                {
                    data: [],
                    id: 1
                },
                {
                    data: Object.entries(data.config.localStorage),
                    id: 2
                }
            ];


            aDCWindow = new Y.doccirrus.DCWindow( {
                className: 'DCWindow-Profiles-Localstorage',
                bodyContent: '<div data-bind="template: { name: \'template-localStorageInfo\' }"></div>',
                title: i18n( 'ProfileMojit.profile.title.PROFILE_CONTENT' ),
                icon: Y.doccirrus.DCWindow.ICON_LIST,
                width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                height: Y.doccirrus.DCWindow.SIZE_LARGE,
                minHeight: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                centered: true,
                maximizable: true,
                modal: true,
                render: document.body,
                buttons: {
                    header: ['close'],
                    footer: [
                        Y.doccirrus.DCWindow.getButton( 'OK' )
                    ]
                },
                after: {
                    visibleChange: function() {
                        localStorageViewModel.destroy();
                        ko.cleanNode( boundNode );
                    }
                }
            } );

            boundNode = aDCWindow.get( 'bodyContent' ).getDOMNodes()[0];

            ko.applyBindings( localStorageViewModel, boundNode );

            aDCWindow.show();
        },

        storeProfile: function(){
            var
                self = this,
                userId = Y.doccirrus.auth.getUserId();

            self.pending( true );
            jQuery
                .when(
                    Y.doccirrus.utils.localValueAll()
                )
                .then( function( result ) {
                    var
                        userValues = _.pick( (result || {}), (Object.keys(result || {})).filter( function(el){
                            return el.indexOf(userId + '_') === 0;
                        }) ),
                        userValuesSafeKeys = {};

                    Object.keys(userValues).forEach( function( oldKey ){
                        var newKey = oldKey.replace(/\./g, '{d}');
                        userValuesSafeKeys[newKey] = userValues[oldKey];
                    } );

                    return Y.doccirrus.jsonrpc.api.profile.storeProfile( {
                        userId: userId,
                        profileLabel: self.profileLabel(),
                        workStation: self.workStation(),
                        tiCardReaders: self.tiCardReaders(),
                        localStorage: userValuesSafeKeys,
                        commonProfile: ( self.fromSettings() === true )
                    } );

                } )
                .done( function() {
                    self.initProfileManagementViewModel();
                } )
                .fail( fail )
                .always( function() {
                    self.pending( false );
                } );
        },

        showExportImportDialog: function() {

            function mapEntryToTreeNode( entry ) {
                var isDirectory = Boolean( entry.totalCount || 0 === entry.totalCount );
                return {
                    id: entry._id,
                    text: isDirectory ? entry.workStationName : entry.profileLabel,
                    totalCount: entry.totalCount,
                    entry: entry,
                    children: isDirectory
                };
            }

            function createGetData( api ) {
                return function( node ) {
                    return new Promise( function( resolve, reject ) {
                        var
                            params = {};

                        params.options = {
                            fields: {
                                _id: 1, profileLabel: 1, timestamp: 1, userId: 1, workStation: 1, tiCardReaders: 1, workStationName: 1, profileHost: 1 // profileHost is kept here for backward compatibility
                            }
                        };
                        if( !node ) {
                            params.query = {
                                $or: [
                                    {userId: Y.doccirrus.auth.getUserId()},
                                    {commonProfile: true}
                                ]
                            };
                            params.options.sort = { workStationName: 1 };
                            params.workStation = null;
                        } else {
                            params.query = {
                                $and: [
                                    { $or: [ { userId: Y.doccirrus.auth.getUserId() }, { commonProfile: true } ] },
                                    { $or: [ { workStation: node.id }, { profileHose: node.id } ] }
                                ]
                            };
                            params.options.sort = { profileLabel: 1 };
                            params.workStation = node.id;
                        }

                        Promise.resolve( Y.doccirrus.jsonrpc.api.workstation.getWithTiCardReaders() )
                            .then( function(res) {
                                self.workStations( res && res.data || [] );

                                self.workStationsMap = self.workStations().reduce( function( obj, item ) {
                                    obj[item._id] = item;
                                    return obj;
                                }, {} );
                            })
                            .then( function() {
                                api( params )
                                    .then( function( response ) {
                                        var
                                            data = response && response.data || [];

                                        response.data.forEach( function( item ) {
                                            if ( !item.oldProfile ) {
                                                item.workStationName = self.workStationsMap[item._id] && self.workStationsMap[item._id].name || item.lastWorkStationName; // updates the name if no reference is found
                                            } else {
                                                item.workStationName = item.workStation + " - <b>[" + self.oldProfileI18n + "]</b>"; // no workStationName field exists for old profiles
                                            }
                                        } );
                                        return data.map( mapEntryToTreeNode );
                                    } )
                                    .then( resolve )
                                    .fail( reject ) ;
                            });

                    } );
                };
            }

            var
                self = this,
                node = Y.Node.create( '<div></div>' ),
                importExportModel = new Y.doccirrus.RuleImportExport.create( {
                    exportConfig: {
                        resolver: createGetData( Y.doccirrus.jsonrpc.api.profileimportexport.listSetOnDB ),
                        enableDragDrop: false
                    },
                    importConfig: {
                        resolver: createGetData( Y.doccirrus.jsonrpc.api.profileimportexport.listSetOnDisk ),
                        enableDragDrop: false
                    },
                    jsonRpcApiImportExport: Y.doccirrus.jsonrpc.api.profileimportexport,
                    metaDataFileName: 'profiles_meta.json',
                    fileNamePrefix: 'profiles-',
                    fromSettings: self.fromSettings()
                } ),
                importExportWindow = null,
                downloadDisabled; //eslint-disable-line no-unused-vars

            YUI.dcJadeRepository.loadNodeFromTemplate(
                'RuleImportExport',
                'IncaseAdminMojit',
                {},
                node,
                function templateLoaded() {
                    importExportWindow = new Y.doccirrus.DCWindow( {
                        className: 'DCWindow-CataloGUsage-Import-Export',
                        bodyContent: node,
                        title: i18n( 'ProfileMojit.profile.title.IMPORT_EXPORT_PROFILE' ),
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
                                self.initProfileManagementViewModel();
                            }
                        }
                    } );

                    // Since I can't found the possibility to create the buttons already with an icons, add the icons after the buttons are added.
                    var downloadRulesBtn = $( 'button[name=downloadRules]' ),
                        uploadRulesBtn = $( 'button[name=uploadRules]' );

                    downloadRulesBtn.html( '<i class="fa fa-chevron-circle-down"></i> ' + downloadRulesBtn.html() );
                    uploadRulesBtn.html( '<i class="fa fa-chevron-circle-up"></i> ' + uploadRulesBtn.html() );

                    downloadDisabled = ko.computed( function() {
                        if( !importExportWindow || !importExportWindow._ATTR_E_FACADE || importExportWindow._ATTR_E_FACADE.attrName === 'destroyed' ) {
                            return;
                        }

                        var
                            download = importExportWindow.getButton( 'downloadRules' ).button,
                            children = importExportModel.importTree.root.children();

                        if( 0 === children.length ) {
                            download.disable();
                        } else {
                            download.enable();
                        }
                    } );

                    ko.applyBindings( importExportModel, node.getDOMNode() );
                }
            );
        }
    } );

    Y.namespace( 'doccirrus' ).ProfileManagementViewModel = {

        name: NAME,

        create: function( options ) {
            return new ProfileManagementViewModel( options );
        }
    };

}, '0.0.1', {
    requires: [
        'KoUI-all',
        'KoViewModel',
        'dcRuleImportExport'
    ]
} );