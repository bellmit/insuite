/*eslint prefer-template: 0 */
/*global YUI, ko, jQuery, moment */
'use strict';


YUI.add( 'ActivitySidebarViewModel', function( Y, NAME ) {

    var
        i18n = Y.doccirrus.i18n,
        TIME_FORMAT = i18n( 'general.TIME_FORMAT' ),
        peek = ko.utils.peekObservable,
        unwrap = ko.unwrap,
        ignoreDependencies = ko.ignoreDependencies,
        KoViewModel = Y.doccirrus.KoViewModel;

    /**
     * @constructor
     * @class KrwStatusViewModel
     */
    function KrwStatusViewModel() {
        KrwStatusViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( KrwStatusViewModel, KoViewModel.getDisposable(), {
        /** @protected */
        initializer: function() {
            var
                self = this;

            self.initKrwStatusViewModel();
        },
        /** @protected */
        destructor: function() {
        },

        initKrwStatusViewModel: function() {
            var
                self = this;
            self._krwValidationStatus = ko.observable( Y.doccirrus.utils.localValueGet( 'krwvalidationfilter' ) || 'ALL' );

            self.dropDownFieldAllI18n = i18n( 'InCaseMojit.casefile_detail.dropdown_field.ALL' );
            self.dropDownFieldErrorsI18n =  i18n( 'InCaseMojit.casefile_detail.dropdown_field.ERRORS' );

            self.addDisposable( self._krwValidationStatus.subscribe( function( val ) {
                Y.doccirrus.utils.localValueSet( 'krwvalidationfilter', val );
            } ) );

            self._krwValidationStatusList = [
                {
                    value: 'ALL',
                    '-de': 'Alle Meldungen',
                    '-en': 'All Notifications'
                },
                {
                    value: 'ERRORS',
                    '-de': 'Nur Fehler',
                    '-en': 'Only Errors'
                }
            ];

        }

    } );

    /**
     * @constructor
     * @class ActivitySidebarViewModel
     */
    function ActivitySidebarViewModel() {
        ActivitySidebarViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ActivitySidebarViewModel, KoViewModel.getDisposable(), {
        /** @protected */
        initializer: function() {
            var
                self = this;

            self.initActivitySidebarViewModel();
        },
        /** @protected */
        destructor: function() {
            var
                self = this;

            self.destroyActivitySidebarViewModel();
        },
        _id: null,
        actType: null,
        timestamp: null,
        daySeparation: null,
        locationId: null,
        employeeId: null,
        orgEmployeeId: null,
        apkState: null,
        comment: null,

        initObservables: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = binder.currentActivity();

            /**
             * Mix properties from "currentActivity" - this is not really considered MVVM, but for now it saves time
             */
            Y.mix( self, currentActivity, true, [
                '_id',
                'actType',
                'daySeparation',
                'locationId',
                'employeeId',
                'apkState',
                'comment',
                'time',
                'subType'
            ] );

            self.orgEmployeeId = unwrap( self.employeeId );

            self.timestampChanged = ko.computed(
                function() {
                    return unwrap( currentActivity.timestamp );
                }
            ).extend( { rateLimit: 100 } );

            self.timestamp = ko.pureComputed( {
                read: function() {
                    return unwrap( currentActivity.timestamp );
                },
                write: function( value ) {
                    var
                        currentDate = moment(),
                        selectedDate = moment( value );
                    if( peek( currentActivity.time ) ) {
                        currentActivity.timestamp( value );
                    } else {
                        currentActivity.timestamp( selectedDate.set( {
                            seconds: currentDate.get( 'seconds' ),
                            minute: currentDate.get( 'minute' ),
                            hour: currentDate.get( 'hour' )
                        } ).toISOString() );
                    }

                },
                owner: self
            } ).extend( { rateLimit: 10 } );

            self.timestamp.hasError = ko.computed( function() {
                return unwrap( currentActivity.timestamp.hasError );
            } );
            self.timestamp.validationMessages = ko.computed( function() {
                return unwrap( currentActivity.timestamp.validationMessages );
            } );
            self.timestamp.readOnly = ko.computed( function() {
                return unwrap( currentActivity.timestamp.readOnly );
            } );

        },
        initActivitySidebarViewModel: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = binder.currentActivity();

            self.initObservables();

            self.initSelect2actType();
            self.initSubTypeEdit();
            self.initDaySeparation();
            self.initTimePicker();
            self.initLocation();
            self.initEmployee();
            self.initApkState();
            self.initKrwStatusViewModel();

            self.placeholderTimeStampI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.TIMESTAMP' );
            self.activityButtonBackI18n = i18n( 'general.button.BACK' );
            self.placeholderDaySeparationI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.DAY_SEPERATION' );
            self.placeholderSelectLocationI18n = i18n('InCaseMojit.casefile_detail.placeholder.SELECT_LOCATION');
            self.textAreaNoteI18n = i18n( 'InCaseMojit.casefile_detail.textarea.NOTE' );
            self.disableDayDivider = ko.observable( false );

            if( 'PREPARED' === currentActivity.status() ) {
                currentActivity.timestamp( new Date() );
                currentActivity.timestamp.readOnly( true );
                self.disableDayDivider( true );
                currentActivity.setNotModified();
            }
        },
        destroyActivitySidebarViewModel: function() {
            var
                self = this;

            self.destroyKrwStatusViewModel();
        },
        _select2actType: null,

        select2SubType: null,

        initSubTypeEdit: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                icc = binder.getInitialData( 'incaseconfiguration' ),
                allowOwnSubtypes = icc.hasOwnProperty( 'allowOwnSubtypes' ) ? icc.allowOwnSubtypes : true,
                configuredSubTypes = [],
                noConfiguredSubTypes = false,

                tagsQuery = {
                    query: {
                        type: Y.doccirrus.schemas.tag.tagTypes.SUBTYPE,
                        title: {
                            $regex: '',
                            $options: 'i'
                        }
                    },
                    options: {
                        sort: { title: 1 }
                    },
                    fields: { title: 1 }
                };

            //  SubType picker should be disabled if we do not yet know the activity type (ie, cannot check configured subtypes)

            self.hasNoActType = ko.computed( function() {
                return !self.actType();
            } );

            //  Try to get configured subtypes from the activity settings

            configuredSubTypes = getSubTypesForActivity();

            //  Create the select2 options

            self.select2SubType = {
                val: ko.computed( {
                    read: function() {
                        return self.subType();
                    },
                    write: function( $event ) {
                        self.subType( $event.val );
                    }
                } ),
                select2: {
                    placeholder: i18n( 'InCaseMojit.activity_model_clientJS.placeholder.SELECT_SUBTYPE' ),
                    allowClear: true,
                    quietMillis: 700,
                    initSelection: function( element, callback ) {
                        var data = { id: element.val(), text: element.val() };
                        callback( data );
                    },
                    query: function( query ) {
                        if ( noConfiguredSubTypes ) {
                            //  user can choose any subType for this activity, from the tags collection
                            querySubTypesUnrestricted( query );
                        } else {
                            //  user is limited to pre-configured subTypes from the activity settings
                            querySubTypesRestricted( query );
                        }
                    },
                    sortResults: function( data ) {
                        return data.sort( function( a, b ) {
                            return a.text.toLowerCase() < b.text.toLowerCase() ? -1 : a.text.toLowerCase() > b.text.toLowerCase() ? 1 : 0;
                        } );
                    },
                    createSearchChoice: function( term ) {
                        return {
                            id: term,
                            text: term
                        };
                    }
                }
            };

            //  Disallow creation of tags if restricted, MOJ-13232

            if ( !allowOwnSubtypes ) {
                //  select2 version at time of writing
                self.select2SubType.select2.createSearchChoice = function() { return null; };
                //  newer versions of select 2 change the function name
                self.select2SubType.select2.createTag = function() { return null; };
            }

            //  Search subTypes from the tags collection

            function querySubTypesUnrestricted( query ) {
                tagsQuery.query.title.$regex = query.term;

                Y.doccirrus.jsonrpc.api.tag.read( tagsQuery ).done( onQuerySubtypes ).fail( onQueryFailed );

                function onQuerySubtypes( response ) {
                    var
                        data = response && response.data ? response.data : [],
                        formatResponse = data.map( function( item ) { return { id: item.title, text: item.title }; } );

                    query.callback( { results: formatResponse } );
                }

                function onQueryFailed( err ){
                    Y.log( 'Could not load subTypes: ' + JSON.stringify( err ), 'warn', NAME );
                    query.callback( { results: [] } );
                }
            }

            //  Limit to pre-configured subTypes from the activitysettings, MOJ-13232

            function querySubTypesRestricted( query ) {
                var
                    filteredSubTypes = [],
                    queryRegEx = Y.doccirrus.commonutils.$regexLikeUmlaut( query.term, { onlyRegExp: true, noRegexEscape: true } ),
                    i;

                if ( '' === query.term ) {
                    return query.callback( { results: configuredSubTypes.slice( 0 ) } );
                }

                for ( i = 0; i < configuredSubTypes.length; i++ ) {
                    if ( configuredSubTypes[i].text.match( queryRegEx ) ) {
                        filteredSubTypes.push( configuredSubTypes[i] );
                    }
                }

                query.callback( { results: filteredSubTypes } );
            }

            //  Get configured subtypes from activity settings, include existing activity subtype if not in list
            //  Only used if 'restrict subtypes' option is set in inCase configuration, MOJ-13232

            function getSubTypesForActivity() {
                var
                    activitySettings = binder.getInitialData( 'activitySettings' ),
                    actType = self.actType(),
                    extantSubType = self.subType(),
                    subTypes = [],
                    formatSubTypes = [],
                    found,
                    i;

                //  get configured subTypes for this activity
                for ( i = 0; i < activitySettings.length; i++ ) {
                    if ( actType === activitySettings[i].actType ) {
                        subTypes = activitySettings[i].subTypes || [];
                    }
                }

                noConfiguredSubTypes = ( 0 === subTypes.length );

                //  format for select2
                for ( i = 0; i < subTypes.length; i++ ) {
                    if ( subTypes[i] === extantSubType ) {
                        found = true;
                    }
                    formatSubTypes.push( { id: subTypes[i], text: subTypes[i] } );
                }


                //  add pre-existing subType if not on the list
                if ( !found && extantSubType ) {
                    formatSubTypes.push( { id: extantSubType, text: extantSubType, isLegacy: true } );
                }

                return formatSubTypes;
            }
        },


        initSelect2actType: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                activityTypeList = binder.getInitialData( 'activityTypes' ).list,
                userLang = Y.doccirrus.comctl.getUserLang(),
                lang = '-' + userLang,
                defaultLang = "-de",
                actGroups = i18n('InCaseMojit.activity_model_clientJS.actGroups'),
                groupI18n = {
                    'CASEHISTORY': { '-de': actGroups.CASEHISTORY, '-en': actGroups.CASEHISTORY },
                    'ASSESSMENT': { '-de': actGroups.ASSESSMENT, '-en': actGroups.ASSESSMENT },
                    'THERAPY': { '-de':  actGroups.THERAPY, '-en': actGroups.THERAPY },
                    'PROCESSES': { '-de': actGroups.PROCESSES, '-en': actGroups.PROCESSES },
                    'OPHTHALMOLOGY': { '-de': actGroups.OPHTHALMOLOGY, '-en':  actGroups.OPHTHALMOLOGY }
                };

            self._actTypeList = ko.observableArray( activityTypeList );

            //  MOJ-6386 actTypeProxy can be changed without changing the currentActivity actType
            //  This is to allow cancel of act type change by 'Unsaved changes' modal without triggering remap, etc

            self.actTypeProxy = ko.observable( '' );
            self._actTypeProxyComputed = ko.computed( function() {
                var actType = peek( self.actType ) + '';
                self.actTypeProxy( actType );
                return actType;
            } );

            self._select2actType = {
                val: self.addDisposable( ko.computed( {
                    read: function() {
                        return ko.unwrap( self.actTypeProxy ) || null;
                    },
                    write: function( $event ) {
                        var
                            actType = peek( self.actType ),
                            newActType = ( $event && $event.val ) ? $event.val : null,
                            currentActivity = peek( binder.currentActivity ),
                            actTypeConfig = Y.doccirrus.schemas.activity.getActTypeClientConfig();

                        //  Prevent infinite loop on changing programatically
                        if( !$event.val ) {
                            return;
                        }

                        //  Check that this activity type can be created by inCase
                        if( actTypeConfig[$event.val] && actTypeConfig[$event.val].blockCreation ) {
                            Y.log( 'Not changing act type, cannot create from inCase: ' + $event.val, 'debug', NAME );
                            self.actTypeProxy( '' );
                            self.actTypeProxy( actType );
                            return;
                        }

                        //  New entry with no activity type, just do it
                        if( !actType || '' === actType ) {
                            binder.set( 'preLinkedActivities', currentActivity && currentActivity.get( 'activitiesObj' ) );
                            Y.doccirrus.inCaseUtils.createActivity( { actType: $event.val } );
                            return;
                        }

                        //  Form type activity without a form, just change it
                        if( 'FORM' === actType ) {
                            if( !unwrap( currentActivity.formId ) || '' === unwrap( currentActivity.formId ) ) {
                                Y.doccirrus.inCaseUtils.createActivity( { actType: newActType } );
                                return;
                            }
                        }

                        //  MOJ-6386 Change select2 value back in case act type change is cancelled
                        self.actTypeProxy( '' );
                        self.actTypeProxy( actType );

                        //  Entry has existing activity type, changing will cause a confirmation dialog
                        Y.log( 'Recreating activity as: ' + newActType, 'debug', NAME );
                        Y.doccirrus.inCaseUtils.createActivity( { actType: newActType } );
                    }
                } ) ),
                placeholder: ko.observable( i18n( 'InCaseMojit.activity_model_clientJS.placeholder.SELECT_TYPE' ) ),
                select2: {
                    allowClear: true,
                    data: (function() {
                        var
                            groups = {},
                            data = [],
                            activeTab = self.get( 'currentPatient' )().caseFolderCollection.getActiveTab(),
                            currentCaseFolderType = activeTab && activeTab.type,
                            isGermany = Y.doccirrus.commonutils.doesCountryModeIncludeGermany(),
                            actTypeProxy = peek( self.actTypeProxy ),
                            isSwitz = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland(),
                            specialModKinds = Y.doccirrus.schemas.settings.specialModuleKinds,
                            hasQDocuLicense = Y.doccirrus.auth.hasSpecialModule( specialModKinds.QDOCU ),
                            _actTypeList = self._actTypeList(), excludedEntry;

                        function findActTypeProxy( entry ) {
                            return entry.val === actTypeProxy;
                        }

                        if( actTypeProxy && actTypeProxy !== 'undefined' && !_actTypeList.find( findActTypeProxy ) ) {
                            excludedEntry = Y.doccirrus.schemas.activity.types.Activity_E.list.find( findActTypeProxy );
                            return excludedEntry && [{id: excludedEntry.val, text: excludedEntry.i18n}] || [];
                        }

                        _actTypeList.forEach( function( item ) {
                            var
                                group = item.group,
                                blockItemForCurrentCaseFolder = Array.isArray( item.blockForCaseFolderTypes ) && item.blockForCaseFolderTypes.indexOf( currentCaseFolderType ) > -1;

                            //skip country specific prescriptions;
                            if( ['LONGPRESCR'].indexOf( item.val ) !== -1 && isGermany ){
                                return;
                            }
                            if( ['PUBPRESCR', 'PRESCRBTM', 'PRESCRG', 'PRESCRT', 'PRESASSISTIVE'].indexOf( item.val ) !== -1 && isSwitz ){
                                return;
                            }

                            if( !item.visible || blockItemForCurrentCaseFolder || item.val === "QDOCU" && !hasQDocuLicense ) {
                                return;
                            }
                            if( !(group in groups) ) {
                                groups[group] = { text: (groupI18n[group][lang] || groupI18n[group][defaultLang]), children: [] };
                                data.push( groups[group] );
                            }

                            groups[group].children.push( { id: item.val, text: (item[lang] || item.i18n || item[defaultLang])} );
                        } );

                        return data;
                    })()
                },
                init: function( el ) {
                    var
                        select2 = jQuery( el ).data( 'select2' ),
                        currentActivity = peek( binder.currentActivity );

                    if( select2 && currentActivity && !peek( currentActivity.actType ) ) {
                        setTimeout( function() {
                            select2.open();
                        }, 20 ); // delay for layout changes unknown for select2
                    }

                }
            };
        },
        isDaySeparationAvailable: function() {
            var
                self = this;

            return 'TREATMENT' === unwrap( self.actType );
        },
        _daySeparationInputVisible: null,
        /**
         * shows placeholder 'Tagtrennung' or 'daySeparation' value
         * @type {null|ko.computed}
         */
        _daySeparationText: null,
        _toggleDaySeparationInputVisible: null,
        toggleTimePickerVisible: null,
        initDaySeparation: function() {
            var
                self = this;

            self._daySeparationInputVisible = ko.observable( false );

            self._daySeparationText = ko.computed( function() {
                var
                    daySeparation = unwrap( self.daySeparation );

                return daySeparation || i18n( 'InCaseMojit.activity_model_clientJS.placeholder.DAY_SEPERATION' );
            } );

            self._toggleDaySeparationInputVisible = ko.computed( {
                read: function() {
                    var
                        hasError = unwrap( self.daySeparation.hasError ),
                        visible = unwrap( self._daySeparationInputVisible );

                    if( hasError ) {
                        return true;
                    }

                    return visible;

                },
                write: self._daySeparationInputVisible
            } );

        },
        initTimePicker: function() {
            var
                self = this;

            self.timePickerVisible = ko.observable( false );

            self.timePickerText = ko.computed( function() {
                var
                    time = unwrap( self.time );

                return time || i18n( 'InCaseMojit.activity_model_clientJS.placeholder.TIME' );
            } );

            self.toggleTimePickerVisible = ko.computed( {
                read: function() {
                    var
                        hasError = unwrap( self.time.hasError ),
                        visible = unwrap( self.timePickerVisible );

                    if( hasError ) {
                        return true;
                    }

                    return visible;

                },
                write: self.timePickerVisible
            } );

            self.addDisposable( ko.computed( function() {
                var
                    time = unwrap( self.time ),
                    binder = self.get( 'binder' ),
                    currentActivity = binder.currentActivity(),
                    timeMoment = moment( time, TIME_FORMAT );
                if( time && !ko.computedContext.isInitial() && timeMoment.isValid() && !unwrap( self.time.hasError ) ) {
                    timeMoment = moment( time, TIME_FORMAT );
                    currentActivity.timestamp( moment( peek( self.timestamp ) ).set( {
                        hours: timeMoment.hours(),
                        minutes: timeMoment.minutes(),
                        seconds: 0
                    } ).toISOString() );
                }
            } ) );

        },
        _toggleDaySeparation: function() {
            var
                self = this;

            self._toggleDaySeparationInputVisible( !peek( self._toggleDaySeparationInputVisible ) );
        },
        toggleTimePicker: function() {
            var
                self = this;

            self.toggleTimePickerVisible( !peek( self.toggleTimePickerVisible ) );
        },
        setDaySeparationToNow: function() {
            var
                self = this;
            self.daySeparation( moment().format( TIME_FORMAT ) );
        },
        setTimeToNow: function() {
            var
                self = this;
            self.time( moment().format( TIME_FORMAT ) );
        },
        _locationList: null,
        initLocation: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity ),
                actStatus = unwrap( currentActivity.status ),
                currentUser = binder.getInitialData( 'currentUser' ),
                caseFolder = currentActivity.get( 'caseFolder' ),
                isASV = Y.doccirrus.schemas.casefolder.additionalTypes.ASV === (caseFolder && caseFolder.additionalType),
                tenantSettings = binder.getInitialData( 'tenantSettings' ),
                location = [].concat( binder.getInitialData( 'location' ) ),
                locationId = peek( currentActivity.locationId ),
                userHasLocation,
                currentUserLocations = currentUser.locations.map( function( _location ) {
                    return _location._id;
                } ),
                urlPlaceholder = '%%locationUrl%%',
                profileUrl = Y.doccirrus.infras.getPrivateURL( 'admin/insuite#/employee' ),
                msgHtml = i18n( 'ProfileMojit.UserDetailsViewModel.userLocationsFilter.noLocations' );

            if( !location.length && !currentUserLocations.length ) {
                Y.doccirrus.DCWindow.notice( {
                    type: 'info',
                    message: msgHtml.replace( urlPlaceholder, profileUrl ),
                    window: {
                        width: 'auto',
                        buttons: {
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    isDefault: true,
                                    action: function() {
                                        this.close();
                                    }
                                } )
                            ]
                        }
                    }
                } );
            }
            userHasLocation = -1 !== currentUserLocations.indexOf( locationId );

            if( (true === (tenantSettings && tenantSettings.noCrossLocationAccess)) && !userHasLocation && locationId ) {
                // get missing location from foreignLocations
                // activity should be readOnly in this state anyway
                (binder.getInitialData( 'foreignLocations' ) || []).some( function( fLoc ) {
                    if( fLoc._id === locationId ) {
                        location.push( fLoc );
                        return true;
                    }
                } );
            } else if( isASV && ('CREATED' === actStatus || 'VALID' === actStatus || !actStatus) && userHasLocation ) {
                /**
                 * if user has location we need to filter location list,
                 * if not - activity will become read only, do not need to filter location list
                 */
                location = location.filter( function( _location ) {
                    return -1 !== currentUserLocations.indexOf( _location._id );
                } );
            }

            location.sort( function( a, b ) {
                return a.locname.toLocaleLowerCase() > b.locname.toLocaleLowerCase();
            } );

            self._locationList = ko.observableArray( location );

        },
        _employeeList: null,
        _employeeListGrouped: null,
        initEmployee: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = peek( binder.currentActivity ),
                currentPatient = peek( self.get( 'currentPatient' ) );

            self._employeeList = ko.observable( [] );

            /**
             * a list of employees grouped by type
             * - currently only PHYSICIANs and PHARMACISTs
             */
            self._employeeListGrouped = ko.computed( function() {
                var
                    list = self._employeeList(),
                    activityIsReadOnly = unwrap( currentActivity._isModelReadOnly ),
                    currentEmployeeId = peek( currentActivity.employeeId ),
                    physicians,
                    others = [],
                    pharmacists,
                    grouped = [],
                    PHARMACIST = Y.doccirrus.schemas.employee.userGroups.PHARMACIST,
                    PHYSICIAN = Y.doccirrus.schemas.employee.userGroups.PHYSICIAN;

                pharmacists = list.filter( function( item ) {
                    var showPharmacist = item.type === PHARMACIST && (activityIsReadOnly || item.status === 'ACTIVE' || self.orgEmployeeId === item._id );

                    if( self.orgEmployeeId === item._id && item.status !== 'ACTIVE') {
                        item.disabled = true;
                    }

                    if ( activityIsReadOnly && item._id !== currentEmployeeId ) {
                        return false;
                    }

                    return showPharmacist;
                } );

                physicians = list.filter( function( item ) {
                    // only show active doctors if model  editable
                    var showPhysician = item.type === PHYSICIAN && (activityIsReadOnly || item.status === 'ACTIVE' || self.orgEmployeeId === item._id );
                    // disable physician in list if he/she is deactivated
                    // main purpose: too keep deactivated author, but disallow use it again after change
                    if( self.orgEmployeeId === item._id && item.status !== 'ACTIVE') {
                        item.disabled = true;
                    }

                    if ( activityIsReadOnly && item._id !== currentEmployeeId ) {
                        //  after approval return only the selected employee, or the list reset can cause the
                        //  dropdown to show the wrong value, MOJ-11511
                        return false;
                    }

                    return showPhysician;
                } );

                if( pharmacists.length ) {
                    pharmacists.sort( function( a, b ) {
                        return a.lastname.toLocaleLowerCase() > b.lastname.toLocaleLowerCase();
                    } );
                    grouped.push( {
                        i18n: i18n( 'InCaseMojit.activity_model_clientJS.label.PHARMACISTS' ),
                        items: pharmacists
                    } );
                }

                if( physicians.length ) {
                    physicians.sort( function( a, b ) {
                        return a.lastname.toLocaleLowerCase() > b.lastname.toLocaleLowerCase();
                    } );
                    grouped.push( {
                        i18n: i18n( 'InCaseMojit.activity_model_clientJS.label.PHYSICIANS' ),
                        items: physicians
                    } );
                }

                if( others.length ) {
                    others.sort( function( a, b ) {
                        return a.lastname.toLocaleLowerCase() > b.lastname.toLocaleLowerCase();
                    } );
                    grouped.push( { i18n: i18n( 'InCaseMojit.activity_model_clientJS.label.OTHERS' ), items: others } );
                }

                return grouped;
            } );

            self.addDisposable( ko.computed( function() {
                var location,
                    locList = self._locationList(),
                    locId = ko.unwrap( self.locationId ); // set a default here

                location = locList.find( function( loc ) {
                    return loc._id === locId;
                } );

                if( location ) {
                    // see MOJ-5481
                    if( !ko.computedContext.isInitial() ) {
                        self.employeeId( null );
                    }
                    self._employeeList( location.employees );
                } else {
                    self.employeeId( null );
                }

            } ) );

            // try to the set the current logged in user (if it is a PHYSICIAN or PHARMACIST) as default employee
            self.addDisposable( ko.computed( function() {
                var

                    foundEmployee,
                    lastSchein = currentActivity.get( 'lastSchein' ),
                    lastScheinEmployeeId = lastSchein && lastSchein.employeeId,
                    currentCaseFolder = currentPatient.caseFolderCollection.getActiveTab(),
                    _initialEmployeeId = unwrap( binder.currentActivity ).get( 'data.employeeId' ),
                    _defaultEmployee = binder.getInitialData( 'currentUser' ),
                    _patientInsuranceStatus = currentCaseFolder ? currentPatient.getInsuranceByType( currentCaseFolder.type ) : null,
                    _defaultEmployeeIdFromInsuranceStatus = _patientInsuranceStatus && unwrap( _patientInsuranceStatus.employeeId ),
                    _employeeList = self._employeeList(),
                    computedInitial = ko.computedContext.isInitial(),
                    PHARMACIST = Y.doccirrus.schemas.employee.userGroups.PHARMACIST,
                    PHYSICIAN = Y.doccirrus.schemas.employee.userGroups.PHYSICIAN;

                if( _initialEmployeeId && computedInitial ) { // why initialEmployee check???
                    return;
                }

                // if activity has been saved and already has an employee, don't override it
                if ( unwrap( currentActivity._id ) && currentActivity.employeeId() ) {
                    return;
                }

                if( lastScheinEmployeeId && !Y.doccirrus.schemas.activity.isScheinActType( peek( currentActivity.actType ) ) ) {
                    foundEmployee = _employeeList.find( function( employee ) {
                        return -1 !== [PHYSICIAN, PHARMACIST].indexOf( employee.type ) && lastScheinEmployeeId === employee._id;
                    } );
                }

                if( !foundEmployee && _defaultEmployeeIdFromInsuranceStatus ) {
                    foundEmployee = _employeeList.find( function( employee ) {
                        return -1 !== [PHYSICIAN, PHARMACIST].indexOf( employee.type ) && _defaultEmployeeIdFromInsuranceStatus === employee._id;
                    } );
                }

                if( !foundEmployee && _defaultEmployee ) {
                    foundEmployee = _employeeList.find( function( employee ) {
                        return -1 !== [PHYSICIAN, PHARMACIST].indexOf( employee.type ) && _defaultEmployee && _defaultEmployee.specifiedBy === employee._id;
                    } );
                }

                if( !foundEmployee ) {
                    foundEmployee = _employeeList.find( function( employee ) {
                        return -1 !== [PHYSICIAN, PHARMACIST].indexOf( employee.type );
                    } );
                }

                self.employeeId( foundEmployee && foundEmployee._id || null );

            } ).extend( { rateLimit: 0 } ) );

        },
        initApkState: function() {
            var
                self = this,
                binder = self.get( 'binder' );

            self._apkStateBtnText = ko.computed( function() {
                var
                    state = unwrap( self.apkState ),
                    text = '';

                switch( state ) {
                    case 'IN_PROGRESS':
                        text = i18n( 'InCaseMojit.activity_model_clientJS.button.APK_IN_PROGRESS' );
                        break;
                    case 'DOCUMENTED':
                        text = i18n( 'InCaseMojit.activity_model_clientJS.button.APK_DOCUMENTED' );
                        break;
                    case 'VALIDATED':
                        text = i18n( 'InCaseMojit.activity_model_clientJS.button.APK_VALIDATED' );
                        break;
                }

                return text;
            } );

            self._apkStateBtnCss = ko.computed( function() {
                var
                    state = unwrap( self.apkState ),
                    cssclass = '',
                    editable = binder.currentActivity()._isEditable();

                if( !editable ) {
                    cssclass = 'disabled ';
                }

                switch( state ) {
                    case 'IN_PROGRESS':
                        cssclass += 'btn-danger';
                        break;
                    case 'DOCUMENTED':
                        cssclass += 'btn-warning';
                        break;
                    case 'VALIDATED':
                        cssclass += 'btn-success';
                        break;
                }

                return cssclass;
            } );
        },
        onApkStateBtnClicked: function() {
            var
                self = this,
                state = unwrap( self.apkState ),
                canToggleAllStates = ['PHYSICIAN', 'CONTROLLER', 'ADMIN'].some( Y.doccirrus.auth.memberOf ),
                states = ['IN_PROGRESS', 'DOCUMENTED', 'VALIDATED'], currentIndex;

            if( !state ) {
                state = states[0];
            }

            currentIndex = states.indexOf( state );

            // this user is now allowed to change state back from "VALIDATED"
            if( !canToggleAllStates && currentIndex === states.length - 1 ) {
                return;
            }

            // this user can only toggle first two states
            if( !canToggleAllStates ) {
                states.pop();
            }

            self.apkState( states[currentIndex === states.length - 1 ? 0 : ++currentIndex] );
        },
        _krwValidationStatusList: null,
        initKrwStatusViewModel: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = unwrap( self.get( 'currentPatient' ) );

            if( !self.krwStatusViewModel ) {
                self.krwStatusViewModel = ko.computed( function() {
                    var
                        currentActivity = unwrap( binder.currentActivity ),
                        actType = currentActivity && unwrap( currentActivity.actType ),
                        caseFolderId = unwrap( currentActivity.caseFolderId ),
                        applicableActType = 'DIAGNOSIS' === actType,
                        available = false,
                        lastKrwStatusViewModel,
                        invoiceconfiguration,
                        caseFolder;

                    if( applicableActType ) {
                        invoiceconfiguration = binder.getInitialData( 'invoiceconfiguration' );
                        caseFolder = currentPatient.caseFolderCollection.getTabById( caseFolderId );

                        // MOJ-14319: [OK]
                        available = invoiceconfiguration && invoiceconfiguration.kbvFocusFunctionalityKRW && caseFolder && Y.doccirrus.schemas.patient.isPublicInsurance( caseFolder );
                    }

                    return ignoreDependencies( function() {

                        lastKrwStatusViewModel = peek( self.krwStatusViewModel );

                        if( available ) {
                            if( lastKrwStatusViewModel ) {
                                return lastKrwStatusViewModel;
                            }
                            return new KrwStatusViewModel();
                        }
                        else {
                            if( lastKrwStatusViewModel ) {
                                lastKrwStatusViewModel.destroy();
                            }
                            return null;
                        }
                    } );

                } );
            }

        },
        destroyKrwStatusViewModel: function() {
            var
                self = this,
                krwStatusViewModel;

            if( self.krwStatusViewModel ) {
                self.krwStatusViewModel.dispose();
                krwStatusViewModel = peek( self.krwStatusViewModel );
                if( krwStatusViewModel ) {
                    krwStatusViewModel.destroy();
                }
                self.krwStatusViewModel = null;
            }

        },
        /**
         * shows 'comment' if not empty in a notice window
         * @private
         */
        showComment: function() {
            var
                self = this,
                message = unwrap( self.comment );

            if( message ) {
                Y.use( 'DCWindow', function() {
                    Y.doccirrus.DCWindow.notice( {
                        message: message,
                        window: { width: 'medium', dragable: true, modal: false }
                    } );
                } );
            }
        },
        showActivityActtypeNeeded: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity ) || null,
                currentActivityActType = currentActivity && currentActivity.actType ? unwrap( currentActivity.actType ) : null;

            return !currentActivityActType;
        }
    }, {
        NAME: 'ActivitySidebarViewModel',
        ATTRS: {
            binder: {
                valueFn: function() {
                    return Y.doccirrus.utils.getMojitBinderByType( 'InCaseMojit' ) || Y.doccirrus.utils.getMojitBinderByType( 'MirrorPatientMojit' );
                }
            },
            caseFolders: {
                valueFn: function() {
                    var viewModel = KoViewModel.getViewModel( 'CaseFileViewModel' ) || KoViewModel.getViewModel( 'MirrorCaseFileViewModel' );
                    return viewModel.caseFolders;
                }
            },
            currentPatient: {
                valueFn: function() {
                    return this.get( 'binder' ).currentPatient;
                },
                lazyAdd: false
            }
        }
    } );

    KoViewModel.registerConstructor( ActivitySidebarViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'dcutils',
        'dc-comctl',
        'casefolder-schema',
        'inCaseUtils'
    ]
} );
