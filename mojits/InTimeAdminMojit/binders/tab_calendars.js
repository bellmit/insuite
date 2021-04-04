/*jslint anon:true, sloppy:true, nomen:true*/
/*exported fun */
/*global fun:true, ko, jQuery, $, moment */
fun = function _fn( Y/*, NAME*/ ) {
    'use strict';

    var
        peek = ko.utils.peekObservable,
        KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n,
        CalendarModel = KoViewModel.getConstructor( 'CalendarModel' ),
        WeeklyTimeModel = KoViewModel.getConstructor( 'WeeklyTimeModel' ),

        INFORMAL = 'INFORMAL',
        PATIENTS = 'PATIENTS',

        viewModel = null,
        unwrap = ko.unwrap,
        beforeUnloadView = null;

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
     * helper to raise a fail in jQuery.then
     * @param message
     * @return {*}
     */
    function thenFail( message ) {
        return jQuery.Deferred( function( d ) {
            return d.reject( message );
        } ).promise();
    }

    /**
     * clear handle PanelEditCalendar modifications when leaving view
     */
    function detachConfirmModifications() {
        if( beforeUnloadView ) {
            beforeUnloadView.detach();
            beforeUnloadView = null;
        }
    }

    /**
     * handle PanelEditCalendar modifications when leaving view
     */
    function attachConfirmModifications() {
        beforeUnloadView = Y.doccirrus.utils.getMojitBinderByType( 'InTimeAdminMojit' ).router.on( 'beforeUnloadView', function( yEvent, event ) {
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
     * read calendar objects of overview from server
     * @param {Object} [parameters]
     * @return {jQuery.Deferred}
     */
    function readCalendarAdminOverview( parameters ) {
        return Y.doccirrus.jsonrpc.api.calendar
            .readCalendarAdminOverview( parameters )
            .then( function( response ) {
                return response && response.data || null;
            } );
    }

    /**
     * read a calendar object from server
     * @param {Object} [parameters]
     * @return {jQuery.Deferred}
     */
    function readCalendar( parameters ) {

        var
            _id = parameters._id,
            data;

        return Y.doccirrus.jsonrpc.api.calendar
            .read( {
                query: { _id: _id }
            } )
            .then( function( response ) {
                data = response && response.data && response.data[ 0 ] || null;
                if( data ) {
                    if( data.specificConsultTimes && data.specificConsultTimes[0] ){
                        data.specificConsultTimes = data.specificConsultTimes.filter( function( time ) {
                            return time && moment( time.range[1], "DD-MM-YYYY" ).add( 1, 'day' ).isAfter( moment() );
                        } );
                    }
                }
                return data;
            } );
    }

    /**
     * write a calendar object to server
     * @param {Object} parameters
     * @param {Object} parameters.data
     * @return {Promise}
     */
    function writeCalendar( parameters ) {

        var
            data = parameters.data || {},
            _id = data._id,
            promise;

        // update
        if( _id ) {

            if( ( data.type === INFORMAL ) ) {
                data.fields_ = 'name,color';
            }
            else {
                data.fields_ = 'name,color,consultTimes,specificConsultTimes,isPublic,employee,calGroup,locationId,isShared,isRandomMode';
            }
            promise = Promise.resolve( Y.doccirrus.jsonrpc.api.calendar.update( {
                query: {
                    _id: _id
                },
                data: data
            } ) )
                .then( function( body ) {
                    var
                        calendar = body && body.data;
                    return calendar;
                } );
        }
        // create
        else {

            if( ( data.type === INFORMAL ) ) {
                data._id = Y.doccirrus.schemas.calendar.getNewInfoCalId();
            }
            promise = Promise.resolve( Y.doccirrus.jsonrpc.api.calendar.create( {
                data: data
            } ) )
            // receive Array of Id
                .then( function( body ) {
                    var
                        responseData = body && body.data;
                    if( Array.isArray( responseData ) && Y.Lang.isString( responseData[ 0 ] ) && responseData[ 0 ] ) {
                        return responseData[ 0 ];
                    }
                    return thenFail( 'writeCalendar: no response id' );
                } )
                // get the calendar data to be consistent with update
                .then( function( responseId ) {
                    return readCalendar( { _id: responseId } );
                } );
        }
        return promise;
    }

    /**
     * read calendar available locations from server
     * @return {jQuery.Deferred}
     */
    function readLocations() {
        return Y.doccirrus.jsonrpc.api.location
            .read()
            .then( function( response ) {
                return response && response.data || null;
            } );
    }

    /**
     * read calendar available employees from server
     * @return {jQuery.Deferred}
     */
    function readEmployees() {
        return Y.doccirrus.jsonrpc.api.employee
            .read( {
                query: {
                    type: !Y.doccirrus.auth.hasAdditionalService( Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTORAPO ) ? "PHYSICIAN" : { $in: ["PHYSICIAN", "PHARMACIST"] }
                }
            } )
            .then( function( response ) {
                return response && response.data || null;
            } );
    }

    /**
     * Reads scheduletypes for this calendar
     * @param {String} calendarId - id of current calendar
     * @returns {jQuery.Deferred}
     */
    function readScheduletypes( calendarId ) {
        return Y.doccirrus.jsonrpc.api.scheduletype
            .readScheduletypesForCalendarId( {
                    calendarId: calendarId
            } )
            .then( function( response ) {
                return response && response.data || null;
            } );
    }

    /**
     * sort calendar objects from server for visualization
     * - place type === "INFORMAL" to top
     * @param {Array} calendars
     * @return {Array}
     */
    function sortCalendarListView( calendars ) {
        var
            first = [],
            items = [];

        // stable sorting
        calendars.forEach( function( calendar ) {
            if( calendar.type === INFORMAL ) {
                first.push( calendar );
            }
            else {
                items.push( calendar );
            }
        } );

        items.unshift.apply( items, first );

        return items;
    }

    /**
     * ViewModel of each Overview entry
     * @constructor
     */
    function PanelCalendar() {
        PanelCalendar.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PanelCalendar, CalendarModel, {
        initializer: function() {
        },
        destructor: function() {
        },
        // overwrite
        getTypeName: function PanelCalendar_getTypeName( /*typeName, propertyName, schemaFullPath*/ ) {
            var
                self = this,
                getTypeName = PanelCalendar.superclass.getTypeName.apply( self, arguments );


            return getTypeName;
        },
        // overwrite
        _getBoilerplateDefinition: function() {
            var
                definition = PanelCalendar.superclass._getBoilerplateDefinition.apply( this, arguments );

            return definition;
        },
        /**
         * Determines if this is an informal calendar
         */
        isInformal: null,
        /**
         * Compute if this is an informal calendar
         */
        isInformalComputed: function() {
            var
                self = this;
            return ko.unwrap( self.type ) === INFORMAL;
        },
        /**
         * Determines if this calendar is deleteable
         */
        deleteable: null,
        /**
         * Computes if this calendar is deleteable
         */
        deleteableComputed: function() {
            var
                self = this,
                _id = ko.unwrap( self._id );

            if( _id === Y.doccirrus.schemas.calendar.getStandardCalendarId() || _id === Y.doccirrus.schemas.calendar.getDefaultCalendarId() ) {
                return false;
            }

            return true;
        },
        /**
         * Determines if the panel is collapsible
         */
        collapsible: null,
        /**
         * Computes if the panel is collapsible
         */
        collapsibleComputed: function() {
            var
                self = this;
            return !ko.unwrap( self.isInformal );
        },
        /**
         * Panel collapse binding config
         */
        collapseBinding: null,
        /**
         * Determines the contrast color
         */
        foregroundColor: null,
        /**
         * Computes the contrast color
         */
        foregroundColorComputed: function() {
            var
                self = this;

            return Y.doccirrus.schemas.calendar.getContrastColor( ko.unwrap( self.color ) );
        },
        /**
         * Determines location name
         */
        displayLocationName: null,
        /**
         * Computes location name
         */
        displayLocationNameComputed: function() {
            var
                self = this,
                locationId = ko.unwrap( self.locationId );

            if( Y.Lang.isObject( locationId ) ) {
                return Y.doccirrus.utils.getObject( 'locname', false, locationId ) || '';
            }
            return '';
        },
        /**
         * Determines group name
         */
        displayGroupName: null,
        /**
         * Computes group name
         */
        displayGroupNameComputed: function() {
            var
                self = this,
                groups = ko.unwrap( self.calGroup ) || [];

                return groups.join( ', ' );
        },
        /**
         * Determines employee name
         */
        displayEmployeeName: null,
        /**
         * Computes employee name
         */
        displayEmployeeNameComputed: function() {
            var
                self = this,
                employee = ko.unwrap( self.employee );

            if( Y.Lang.isObject( employee ) ) {
                return Y.doccirrus.schemas.person.personDisplay( employee );
            }
            return '';
        },
        /**
         * Determines consult times
         */
        displayConsultTimes: null,
        /**
         * Prevent spamming displayConsultTimesComputed during edit
         */
        lastConsultTimeResult: null,
        /**
         * Computes consult times
         */
        displayConsultTimesComputed: function() {

            //  performance issue if the calendars display is constantly updating in the background while editing
            //  consultation times, MOJ-13856
            if ( peek( viewModel.editing ) ) {
                return this.lastConsultTimeResult;
            }

            var
                self = this,
                times = ko.toJS( self.consultTimes ),
                result = [],
                resultMap = {};

            Y.each( WeeklyTimeModel.ATTRS.dayAliasMap.value, function aliasDayMapping( alias, day ) {
                result.push( {
                    alias: alias,
                    day: day,
                    times: []
                } );
            } );

            if( !(Array.isArray( times ) && times.length) ) {
                return result;
            }

            result.forEach( function itemDayMap( item ) {
                resultMap[ item.day ] = item;
            } );

            times.forEach( function forEachTime( time ) {
                time.days.forEach( function forEachDay( day ) {

                    resultMap[ day ].times.push( { start: time.formattedStart, end: time.formattedEnd } );
                } );
            } );

            result.forEach( function foreachResult( item ) {
                if( item.times.length ) {
                    item.times.sort( function sortTimes( a, b ) {
                        return Y.ArraySort.naturalCompare( a.start, b.start );
                    } );
                }
                else {
                    item.times.push( i18n( 'InTimeAdminMojit.tab_calendars.text.NO_VISITING_HOUR' ) );
                }
            } );


            //  cache for use when editing
            self.lastConsultTimeResult = result;

            return result;
        },
        /**
         * Determines specific consult times
         */
        displaySpecificConsultTimes: null,
        /**
         * Computes consult times
         */
        displaySpecificConsultTimesComputed: function() {

            var
                self = this,
                times = [].concat( self.get( 'specificConsultList' ) ),
                weeklyTimeDayAlias = Y.doccirrus.schemas.location.getWeeklyTimeDayAlias(),
                result = [],
                dayIndx, i, j,
                chunk = 7,
                separatedResult = [];

            times.forEach( function( time ) {
                dayIndx = moment( time.start ).days();
                if( 0 === dayIndx ) {
                    dayIndx = 7;
                }

                result.push( {
                    date: moment( time.start ).format( 'DD.MM.YYYY' ),
                    day: weeklyTimeDayAlias[dayIndx],
                    start: moment( time.start ).format( 'HH:mm' ),
                    end: moment( time.end ).format( 'HH:mm' )
                } );
            } );

            for( i = 0, j = result.length; i < j; i += chunk ) {
                separatedResult.push( { chunk: result.slice( i, i + chunk ) } );
            }
            return separatedResult;
        },
        // overwrite
        _initSubscriptions: function() {
            var
                self = this;

            PanelCalendar.superclass._initSubscriptions.apply( self, arguments );

            self.isInformal = ko.computed( self.isInformalComputed, self );

            self.deleteable = ko.computed( self.deleteableComputed, self );

            self.collapsible = ko.observable( false );

            self.collapseBinding = {
                expanded: ko.observable( true ),
                disabled: self.addDisposable( ko.computed( function() {
                    return !ko.unwrap( self.collapsible );
                } ) ),
                toggler: '> .panel-heading .collapse-toggler',
                toggles: '> .panel-collapse'
            };

            self.foregroundColor = ko.computed( self.foregroundColorComputed, self );

            self.displayLocationName = ko.computed( self.displayLocationNameComputed, self );

            self.displayGroupName = ko.computed( self.displayGroupNameComputed, self );

            self.displayEmployeeName = ko.computed( self.displayEmployeeNameComputed, self );

            self.displayConsultTimes = ko.computed( self.displayConsultTimesComputed, self );

            self.displaySpecificConsultTimes = ko.computed( self.displaySpecificConsultTimesComputed, self );

        },
        /**
         * Determines if a consultTimes day entry has no consult times
         */
        displayNonConsultTimes: function( $data ) {
            return 'string' === typeof $data.times[ 0 ];
        }
    }, {
        schemaName: CalendarModel.schemaName,
        ATTRS: {
            specificConsultList: {
                value: [],
                lazyAdd: false
            }
        }
    } );

    /**
     * ViewModel, which handles editing of a "PanelCalendar"
     * @constructor
     */
    function PanelEditCalendar() {
        PanelEditCalendar.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PanelEditCalendar, PanelCalendar, {
        initializer: function() {

            var
                self = this;

            attachConfirmModifications();

            self.initType();
            self.initLocationId();
            self.initEmployee();
            self.initSelect2Groups();

            // bind these
            self.deleteConsultTime = Y.bind( self.deleteConsultTime, self );
            self.openRepetitionsModal = Y.bind( self.openRepetitionsModal, self );
            self.scheduleTypesList = ko.observableArray( [].concat( self.get( 'scheduleTypesObjects' ) ) );
            self.deleteSpecificConsultTimes = Y.bind( self.deleteSpecificConsultTimes, self );
            self.calendarsButtonDeleteI18n = ' ' + i18n( 'general.button.DELETE' );
            self.calendarsSpecificConsultTimesRangeI18n = i18n( 'location-schema.SpecificConsultTime_T.range' );
            self.repetitionsI18n = i18n( 'InTimeAdminMojit.tab_calendars.label.REPETITIONS' );
        },

        destructor: function() {

            detachConfirmModifications();
        },

        // overwrite
        getTypeName: function PanelEditCalendar_getTypeName( /*typeName, propertyName, schemaFullPath*/ ) {
            var
                self = this,
                getTypeName = PanelEditCalendar.superclass.getTypeName.apply( self, arguments );

            if( 'WeeklyTimeModel' === getTypeName ) {
                getTypeName = 'WeeklyTimeEditModel';
            }

            if( 'SpecificConsultTimeModel' === getTypeName ) {
                getTypeName = 'SpecificConsultTimeEditModel';
            }

            return getTypeName;
        },
        /**
         * Handles "type" field
         */
        initType: function() {
            var
                self = this,
                availableTypes = [ PATIENTS, INFORMAL ],
                typeList = peek( self.type.list );

            typeList = Y.Array.filter( typeList, function( typeItem ) {
                return availableTypes.indexOf( typeItem.val ) > -1;
            } );

            typeList.sort( function( a, b ) {
                return availableTypes.indexOf( a.val ) > availableTypes.indexOf( b.val );
            } );

            // set a default value, because we can't rely on schema
            if( self.isNew() ) {
                self.type( PATIENTS );
            }

            // build select2 config
            self.select2Type = {
                val: self.addDisposable( ko.computed( {
                    read: function() {
                        var
                            type = self.type() || null;

                        return type;

                    },
                    write: function( $event ) {
                        var
                            value = $event.val;

                        if( value === INFORMAL ) {
                            self.resetNonTypeInformalFields();
                        }

                        self.type( value );

                    }
                } ) ),
                select2: {
                    width: '100%',
                    placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                    data: function() {
                        return {
                            // list of types to choose from
                            results: typeList.map( function( typeItem ) {
                                return {
                                    id: typeItem.val,
                                    text: typeItem.i18n
                                };
                            } )
                        };
                    }
                }
            };

        },
        /**
         * reset fields that are not considered belonging to type = "INFORMAL"
         */
        resetNonTypeInformalFields: function() {
            var
                self = this;

            self.employee( '' );
            self.locationId( '' );
            self.consultTimes( [] );
            self.specificConsultTimes( [] );
        },
        select2LocationId: null,
        /**
         * Handles "locationId" field
         */
        initLocationId: function() {

            var
                self = this,
                locationIdList = [].concat( self.get( 'locationIdList' ) );

            locationIdList.sort( function( a, b ) {
                return Y.ArraySort.naturalCompare( a.locname, b.locname );
            } );

            // build select2 config
            self.select2LocationId = {
                val: self.addDisposable( ko.computed( {
                    read: function() {
                        var
                            locationId = self.locationId() || null;

                        return locationId;

                    },
                    write: function( $event ) {
                        var
                            value = $event.val;

                        self.locationId( value || '' );

                    }
                } ) ),
                select2: {
                    width: '100%',
                    placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                    data: function() {
                        return {
                            // list of locationIds to choose from
                            results: locationIdList.map( function( locationId ) {
                                return {
                                    id: locationId._id,
                                    text: locationId.locname
                                };
                            } )
                        };
                    }
                }
            };
        },
        select2Employee: null,
        /**
         * Handles "employee" field
         */
        initEmployee: function() {

            var
                self = this,
                employeeList = [].concat( self.get( 'employeeList' ) );

            employeeList.sort( function( a, b ) {
                return Y.ArraySort.naturalCompare( a.lastname, b.lastname );
            } );

            // build select2 config
            self.select2Employee = {
                val: self.addDisposable( ko.computed( {
                    read: function() {
                        var
                            employee = self.employee() || null;

                        return employee;

                    },
                    write: function( $event ) {
                        var
                            value = $event.val;

                        self.employee( value || '' );

                    }
                } ) ),
                select2: {
                    width: '100%',
                    allowClear: true,
                    placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                    data: function() {
                        return {
                            // list of employees to choose from
                            results: employeeList.map( function( employee ) {
                                return {
                                    id: employee._id,
                                    text: Y.doccirrus.schemas.person.personDisplay( employee )
                                };
                            } )
                        };
                    }
                }
            };
        },
        select2Group: null,

        select2GroupMapper: function( item ) {
            return {
                id: item,
                text: item
            };
        },
        /**
         * Handles "group" field
         */
        initSelect2Groups: function() {
            var
                self = this,
                GROUPS = Y.doccirrus.i18n( 'InTimeAdminMojit.tab_calendars.label.GROUP_PLACEHOLDER' );

            self.select2Group = {
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        var
                            groups = unwrap( self.calGroup );
                        return groups.map( self.select2GroupMapper );
                    },
                    write: function( $event ) {
                        if( Y.Object.owns( $event, 'added' ) ) {
                            self.calGroup.push( $event.added.id );
                        }
                        if( Y.Object.owns( $event, 'removed' ) ) {
                            self.calGroup.remove( $event.removed.id );
                        }
                    }
                } ) ),
                placeholder: ko.observable( GROUPS ),
                select2: {
                    multiple: true,
                    createSearchChoice: self.select2GroupMapper,
                    formatSelection: function( item ) {
                        return item.text;
                    },
                    query: function( query ) {
                        Y.doccirrus.jsonrpc.api.calendar.getAllCalGroups( {
                                query: {
                                    calGroup: {
                                        $regex: query.term,
                                        $options: 'i'
                                    }
                                }
                            }
                        ).done( function( response ) {
                            var data = response && response.data || [],
                                mergedData = data.map( function( item ) {
                                    return item;
                                } );
                            query.callback( {
                                results: mergedData.map( self.select2GroupMapper )
                            } );
                        } );
                    }
                }
            };
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
         * Computes if save is disabled
         */
        saveDisabledComputed: function() {
            var
                self = this,
                pending = self.pending(),
                valid = self._isValid() && !ko.unwrap( self.specificConsultTimesAreInvalid ),
                modified = self.isModified(),
                isNew = self.isNew();

            return pending || !(valid && (modified || isNew));
        },
        /**
         * Determines if any general fields are invalid
         */
        generalIsInvalid: null,
        /**
         * Computes if any general fields are invalid
         */
        generalIsInvalidComputed: function() {
            var
                self = this,
                colorHasError = ko.unwrap( self.color.hasError );

            return colorHasError;
        },
        /**
         * Determines if any consultTime is invalid
         */
        consultTimesAreInvalid: null,
        /**
         * Determines if any specificConsultTimes is invalid
         */
        specificConsultTimesAreInvalid: null,
        /**
         * Determines if any specificConsultTimes or consultTime is invalid
         */
        tabIsInvalid: null,
        /**
         * Computes if any consultTime is invalid
         */
        consultTimesAreInvalidComputed: function() {
            var
                self = this,
                consultTimes = ko.unwrap( self.consultTimes );

            return Y.Array.some( consultTimes, function( weeklyTimeEditModel ) {
                var
                    daysHasError = ko.unwrap( weeklyTimeEditModel.days.hasError ),
                    startHasError = ko.unwrap( weeklyTimeEditModel.start.hasError ),
                    endHasError = ko.unwrap( weeklyTimeEditModel.end.hasError );

                return daysHasError || startHasError || endHasError;
            } );
        },
        /**
         * Computes if any specificConsultTime is invalid
         */
        specificConsultTimesAreInvalidComputed: function() {
            var
                self = this,
                specificConsultTimes = ko.unwrap( self.specificConsultTimes );

            return Y.Array.some( specificConsultTimes, function( specificConsultTimeEditModel ) {
                var
                    daysHasError = ko.unwrap( specificConsultTimeEditModel.days.hasError ),
                    startHasError = ko.unwrap( specificConsultTimeEditModel.start.hasError ),
                    endHasError = ko.unwrap( specificConsultTimeEditModel.end.hasError ),
                    rangeHasError = ko.unwrap( specificConsultTimeEditModel.range.hasError );

                return daysHasError || startHasError || endHasError || rangeHasError;
            } );
        },
        // overwrite
        _initSubscriptions: function() {
            var
                self = this;

            PanelEditCalendar.superclass._initSubscriptions.apply( self, arguments );

            self.pending = ko.observable( false );

            self.saveDisabled = ko.computed( self.saveDisabledComputed, self ).extend( { rateLimit: 0 } );

            self.generalIsInvalid = ko.computed( self.generalIsInvalidComputed, self );

            self.consultTimesAreInvalid = ko.computed( self.consultTimesAreInvalidComputed, self );

            self.specificConsultTimesAreInvalid = ko.computed( self.specificConsultTimesAreInvalidComputed, self );

            self.tabIsInvalid = ko.computed( function() {
                return unwrap( self.consultTimesAreInvalid ) || unwrap( self.specificConsultTimesAreInvalid );
            }, self );
        },

        /**
         * Opens modal window to configure repetition settings for consultTime
         *
         * @param {Object} consultTime - current consultTime to change
         */
        openRepetitionsModal: function( consultTime ) {
            var self = this;

            Y.doccirrus.modals.repetitionConfigModal.show( consultTime.repetitionSettings() && consultTime.repetitionSettings()[0] && consultTime.repetitionSettings()[0].readBoilerplate() || {}, function( configuration ) {
                var
                    currentConsultTime = self.consultTimes().find( function( item ) {
                        return consultTime._id === item._id || consultTime.clientId === item.clientId;
                    } );

                currentConsultTime.repetitionSettings.removeAll();
                if( configuration ) {
                    if( 'WEEKLY' !== configuration.freq ) {
                        currentConsultTime.days.removeAll();
                    }
                }
                currentConsultTime.repetitionSettings.push( configuration );
            } );
        },
        /**
         * Add a new "consultTimes"
         */
        addConsultTime: function() {
            var
                self = this,
                scheduleTypesForThisCalendar = unwrap( self.scheduleTypesList );

            self.consultTimes.push( {
                publicInsurance: true,
                scheduleTypesObjects: scheduleTypesForThisCalendar,
                privateInsurance: true
            } );
        },
        /**
         * Delete a "consultTimes"
         */
        deleteConsultTime: function( model ) {
            var
                self = this;

            self.consultTimes.remove( model );
        },
        /**
         * Add a new "specificConsultTimes"
         */
        addSpecificConsultTimes: function() {
            var
                self = this,
                scheduleTypesForThisCalendar = unwrap( self.scheduleTypesList );

            self.specificConsultTimes.push( {
                publicInsurance: true,
                scheduleTypesObjects: scheduleTypesForThisCalendar,
                privateInsurance: true
            } );
        },
        /**
         * Delete a "specificConsultTimes"
         */
        deleteSpecificConsultTimes: function( model ) {
            var
                self = this;

            self.specificConsultTimes.remove( model );
        },
        /**
         * save this model
         * @return {jQuery.Defferred}
         */
        save: function() {
            var
                self = this,
                data = self.toJSON();

            self.pending( true );

            function write() {
                return writeCalendar( { data: data } )
                    .then( function() {
                        self.setNotModified();
                        Y.doccirrus.DCSystemMessages.addMessage( {
                            messageId: 'tab_calendars-save',
                            content: i18n( 'general.message.CHANGES_SAVED' )
                        } );
                        if( viewModel ) {
                            viewModel.closeEditingItem( self );
                        }
                    } )
                    .catch( fail )
                    .finally( function() { //always
                        self.pending( false );
                    } );
            }


            if( self.isNew() ) {
                //check if there are some HOLIDAYS to save into new calendar
                Y.doccirrus.jsonrpc.api
                    .calevent.count( {
                    query: {
                        closeTime: true,
                        closeDayType: 'HOLIDAY',
                        end: {$gte: moment().startOf( 'day' ).toDate()}
                    },
                    eventType: 'closeTime'
                } ).then( function( response ) {
                    var
                        items = response.data;

                    if( !isNaN( parseInt( items, 10 ) ) && parseInt( items, 10 ) > 0 ) {
                        Y.doccirrus.DCWindow.notice( {
                            icon: '',
                            title: i18n( 'InTimeAdminMojit.tab_calendars.confirmSave.title' ),
                            message: i18n( 'InTimeAdminMojit.tab_calendars.confirmSave.message' ),
                            window: {
                                width: Y.doccirrus.DCWindow.SIZE_SMALL,
                                buttons: {
                                    footer: [
                                        Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                        {
                                            label: i18n( 'DCWindow.BUTTONS.NO' ),
                                            name: 'no',
                                            action: function( e ) {
                                                e.target.button.disable();
                                                this.close( e );
                                                write();
                                            }
                                        },
                                        {
                                            label: i18n( 'DCWindow.BUTTONS.YES' ),
                                            name: 'yes',
                                            isDefault: true,
                                            action: function( e ) {
                                                e.target.button.disable();
                                                this.close( e );

                                                return writeCalendar( {data: data} )
                                                    .then( function( response ) {
                                                        Y.doccirrus.jsonrpc.api.calevent.addCloseTimeEventsToNewCalendar( {
                                                            data: {
                                                                calendarId: response._id,
                                                                calendarType: data.type
                                                            }
                                                        } ).then( function() {
                                                            self.setNotModified();
                                                            Y.doccirrus.DCSystemMessages.addMessage( {
                                                                messageId: 'tab_calendars-save',
                                                                content: i18n( 'general.message.CHANGES_SAVED' )
                                                            } );
                                                            if( viewModel ) {
                                                                viewModel.closeEditingItem( self );
                                                            }
                                                        } );
                                                    } )
                                                    .catch( fail )
                                                    .finally( function() { //always
                                                        self.pending( false );
                                                    } );
                                            }
                                        }
                                    ]
                                },
                                after: {
                                    visibleChange: function() {
                                        self.pending( false );
                                    }
                                }
                            }
                        } );
                    } else {
                        write();
                    }
                } );
            } else {
                write();
            }
        }
    }, {
        schemaName: CalendarModel.schemaName,
        /**
         * Generates a random color
         * @return {string}
         */
        randomColor: function() {
            // jshint  bitwise:false
            //return '#' + ('00000' + (Math.random() * 16777216 << 0).toString( 16 )).substr( -6 ); // just random
            // pastel style
            return Y.Color.toHex( Y.Color.fromArray( [ Math.floor( 360 * Math.random() ), 100, 82 ], Y.Color.TYPES.HSL ) ).toLowerCase();
        },
        ATTRS: {
            /**
             * Serves the list for "locationId" to pick from
             */
            locationIdList: {
                value: [],
                cloneDefaultValue: true,
                lazyAdd: false
            },
            /**
             * Serves the list for "employee" to pick from
             */
            employeeList: {
                value: [],
                cloneDefaultValue: true,
                lazyAdd: false
            },
            /**
             * Serves the list for "scheduleTypes" to pick from
             */
            scheduleTypesObjects: {
                value: [],
                cloneDefaultValue: true,
                lazyAdd: false
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

    Y.extend( ViewModel, KoViewModel.getBase(), {
        initializer: function() {
            var
                self = this;

            self.initViewModel();
            self.load();
            //translations
            self.calendarsHeadLineI18n = i18n( 'InTimeAdminMojit.tab_calendars.headline' );
            self.calendarsButtonAddI18n = ' ' + i18n( 'general.button.ADD' );
            self.calendarsButtonSaveI18n = i18n( 'general.button.SAVE' );
            self.calendarsHealthPortalI18n = i18n( 'InTimeAdminMojit.tab_calendars.label.HEALTH_PORTAL' );
            self.calendarsVisibleI18n = ' ' + i18n( 'InTimeAdminMojit.tab_calendars.text.VISIBLE' );
            self.calendarsNotVisibleI18n = ' ' + i18n( 'InTimeAdminMojit.tab_calendars.text.NOT_VISIBLE' );
            self.calendarsPartnerPortalI18n = i18n( 'InTimeAdminMojit.tab_calendars.label.PARTNER_PORTAL' );
            self.calendarsIsSharedTrueI18n = ' ' + i18n( 'InTimeAdminMojit.tab_calendars.isShared.true' );
            self.calendarsIsSharedFalseI18n = ' ' + i18n( 'InTimeAdminMojit.tab_calendars.isShared.false' );
            self.calendarsIsPublicTrueI18n = ' ' + i18n( 'InTimeAdminMojit.tab_calendars.isPublic.true' );
            self.calendarsIsPublicFalseI18n = ' ' + i18n( 'InTimeAdminMojit.tab_calendars.isPublic.false' );
            self.calendarsLabelEstablishmentI18n = i18n( 'InTimeAdminMojit.tab_calendars.label.ESTABLISHMENT' );
            self.calendarsLabelGroupI18n = i18n( 'InTimeAdminMojit.tab_calendars.label.GROUP' );
            self.calendarsLabelEmployeeI18n = i18n( 'InTimeAdminMojit.tab_calendars.label.EMPLOYEE' );
            self.calendarsLabelRandomModeI18n = i18n( 'InTimeAdminMojit.tab_calendars.label.RANDOM_MODE' );
            self.calendarsConsultTimesI18n = i18n( 'calendar-schema.Calendar_T.consultTimes' );
            self.calendarsSpecificConsultTimesI18n = i18n( 'calendar-schema.Calendar_T.specificConsultTimes' );
            self.calendarsNameI18n = i18n( 'calendar-schema.Calendar_T.name' );
            self.calendarsTypeI18n = i18n( 'calendar-schema.Calendar_T.type' ) + ':';
            self.calendarsLabelColorI18n = i18n( 'InTimeAdminMojit.tab_calendars.label.COLOR' );
            self.calendarsSubmenuTextI18n = i18n( 'InTimeAdminMojit.tab_calendars.submenu.general.text' );
            self.calendarsNoVisitingHoursI18n = i18n( 'InTimeAdminMojit.tab_calendars.text.NO_VISITING_HOURS' );
            self.daysI18n = i18n( 'location-schema.WeeklyTime_T.days.i18n' );
            self.startI18n = i18n( 'location-schema.WeeklyTime_T.start.i18n' );
            self.endI18n = i18n( 'location-schema.WeeklyTime_T.end.i18n' );
            self.colorI18n = i18n( 'calendar-schema.CalView_T.color.i18n' );
            self.scheduleTypesI18n = i18n( 'location-schema.WeeklyTime_T.scheduleTypes.i18n' );

        },
        destructor: function() {
            var
                self = this,
                editing = peek( self.editing ),
                items = peek( self.items );

            if( editing ) {
                editing.destroy();
                self.editing = null;
            }

            if( items.length ) {
                Y.Array.invoke( items, 'destroy' );
                self.items = null;
            }

        },
        /**
         * current calendar PanelEditCalendar for editing view
         */
        editing: null,
        /**
         * The Overview
         * - an Array of PanelCalendar
         */
        items: null,
        /**
         * Initializer
         */
        initViewModel: function() {
            var
                self = this;

            self.pending = ko.observable( false );

            self.editing = ko.observable( null );
            self.items = ko.observableArray( [] );
            self.expanded = ko.computed( function() {
                var
                    items = self.items(),
                    result = [];

                items.forEach( function( item ) {
                    if( item.collapseBinding && item.collapseBinding.expanded() ) {
                        result.push( peek( item._id ) );
                    }
                } );

                return result;
            } );

            self.initActions();
            self.initLoadMask();

        },
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

            readCalendarAdminOverview({
                query: {
                    mirrorCalendarId: {$exists: false}
                }
            })
                .done( function( calendars ) {

                    var
                        expanded = peek( self.expanded );

                    calendars = sortCalendarListView( calendars ).map( function( data ) {

                        if( data.specificConsultTimes && data.specificConsultTimes[0] ){
                            data.specificConsultTimes = data.specificConsultTimes.filter( function( time ) {
                                  return time && moment( time.range[1], "DD-MM-YYYY" ).add( 1, 'day' ).isAfter( moment() );
                            } );
                        }

                        if( data.specificConsultList && data.specificConsultList[0] ){
                            data.specificConsultList = data.specificConsultList.filter( function( time ) {
                                return time && moment( time.end ).isAfter( moment() );
                            } );
                        }

                        var
                            panel = new PanelCalendar( {
                                data: data,
                                specificConsultList: data.specificConsultList
                            } );

                        // expand previously expanded
                        if( expanded.indexOf( data._id ) > -1 ) {
                            panel.collapseBinding.expanded( true );
                        }

                        return panel;

                    } );

                    self.items( calendars );

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
         * add an item by switching into edit-mode with an an empty PanelEditCalendar
         */
        addItem: function() {
            var
                self = this;

            self.pending( true );

            jQuery.when(
                readLocations(),
                readEmployees()
            )
                .done( function( locations, employees ) {

                    self.editing( new PanelEditCalendar( {
                        data: {
                            isPublic: true,
                            color: PanelEditCalendar.randomColor(),
                            consultTimes: Y.doccirrus.schemas.calendar.getDefaultConsultTimes(),
                            specificConsultTimes: []
                        },
                        locationIdList: locations,
                        employeeList: employees,
                        validatable: true
                    } ) );
                } )
                .fail( fail )
                .always( function() {

                    self.pending( false );
                } );
        },
        /**
         * edit an existing item by switching it into edit-mode
         * @param {Object} item
         */
        editItem: function( item ) {
            var
                self = this,
                _id = peek( item._id );

            self.pending( true );

            jQuery.when(
                readCalendar( { _id: _id } ),
                readLocations(),
                readEmployees(),
                readScheduletypes( _id )
            )
                .done( function( calendar, locations, employees, scheduleTypes ) {

                    var
                        data = Y.merge( Y.clone( calendar, true ) ),
                        editModel;

                    if( data.consultTimes && data.consultTimes[0] ) {
                        data.consultTimes.forEach( function( item ) {
                            item.scheduleTypesObjects = scheduleTypes;
                        } );
                    }

                    if( data.specificConsultTimes && data.specificConsultTimes[0] ) {
                        data.specificConsultTimes.forEach( function( item ) {
                            item.scheduleTypesObjects = scheduleTypes;
                        } );
                    }

                    editModel = new PanelEditCalendar( {
                        data: data,
                        scheduleTypesObjects: scheduleTypes,
                        locationIdList: locations,
                        employeeList: employees,
                        validatable: true
                    } );

                    self.editing( editModel );
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
                id = peek( item._id );

            self.pending( true );
            jQuery
                .ajax( {
                    url: Y.doccirrus.infras.getPrivateURL( '/1/calendar/' + id ),
                    type: 'DELETE',
                    xhrFields: { withCredentials: true }
                } )
                .done( function() {

                    self.items.remove( item );
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: 'tab_appointment-types-deleteItem',
                        content: i18n( 'general.message.CHANGES_SAVED' )
                    } );

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
                message: i18n( 'calendar-api.confirmDeleteItem.message' ),
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
         * @param {PanelEditCalendar} editModel
         */
        closeEditingItem: function( editModel ) {
            var
                self = this;

            self.editing( null );
            editModel.destroy();
            self.reload();
        },

        templateReady: function() {
            //  change minicolor default theme to Bootstrap, enable RGB format and opacity
            $.minicolors = {
                defaults: {
                    opacity: true,
                    format: 'hex',
                    theme: 'bootstrap'
                }
            };
        }
    }, {
        ATTRS: {
            node: {
                value: null,
                lazyAdd: false
            }
        }
    } );

    return {

        registerNode: function( node ) {

            // set viewModel
            viewModel = new ViewModel( {
                node: node.getDOMNode()
            } );

            ko.applyBindings( viewModel, node.getDOMNode() );

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
};
