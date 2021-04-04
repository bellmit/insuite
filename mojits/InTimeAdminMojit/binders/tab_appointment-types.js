/*jslint anon:true, sloppy:true, nomen:true*/
/*global fun:true, ko, _, jQuery */ //eslint-disable-line
'use strict';

fun = function _fn( Y/*, NAME*/ ) {

    var
        peek = ko.utils.peekObservable,
        unwrap = ko.unwrap,
        KoViewModel = Y.doccirrus.KoViewModel,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        i18n = Y.doccirrus.i18n,
        ScheduletypeModel = KoViewModel.getConstructor( 'ScheduletypeModel' ),
        REQUIRED_RESOURCES = i18n( 'scheduletype-schema.ScheduleType_T.requiredResources' ),
        RESOURCES_IN_GROUP_WARN = i18n( 'InTimeAdminMojit.tab_appointment-types.text.RESOURCES_IN_GROUP_WARN' ),
        viewModel = null,
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
     * read scheduletype objects from server
     * @param {Object} [parameters]
     * @return {jQuery.Deferred}
     */
    function readScheduletypeForEdit( parameters ) {
        return Y.doccirrus.jsonrpc.api.scheduletype
            .readScheduletypeForEdit( parameters )
            .then( function( response ) {
                return response && response.data || null;
            } );
    }

    /**
     * read scheduletype available calendars from server
     * @param {Object} [parameters]
     * @return {jQuery.Deferred}
     */
    function readCalendarForScheduletypeEdit( parameters ) {
        return Y.doccirrus.jsonrpc.api.scheduletype
            .readCalendarForScheduletypeEdit( parameters )
            .then( function( response ) {
                return response && response.data || null;
            } );
    }

    /**
     * sort scheduletype objects from server for visualization
     * @param {Array} scheduletypes
     * @return {Array}
     */
    function sortScheduletypeListView( scheduletypes ) {
        var
            first = [],
            items = [],
            standardId = Y.doccirrus.schemas.scheduletype.getStandardId();

        // stable sorting
        scheduletypes.forEach( function( scheduletype ) {
            scheduletype.numberOfSuggestedAppointments = typeof scheduletype.numberOfSuggestedAppointments === "number" ? scheduletype.numberOfSuggestedAppointments : 10;
            scheduletype.noPatientMessage = scheduletype.noPatientMessage || false;
            scheduletype.requiredResources = scheduletype.requiredResources || [];
            if( scheduletype._id === standardId ) {
                first.push( scheduletype );
            }
            else {
                items.push( scheduletype );
            }
        } );

        items.unshift.apply( items, first );

        return items;
    }

    /**
     * This views EditModel
     * @constructor
     */
    function EditModel() {
        EditModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( EditModel, ScheduletypeModel, {
        initializer: function() {
            var
                self = this;

            self.initViewModel();

            attachConfirmModifications();
        },
        destructor: function() {
            detachConfirmModifications();
        },
        /**
         * Initializer
         */
        initViewModel: function() {
            var
                self = this,
                requiredResources = self.get( 'data.requiredResources' ) || [];

            self.initCalendarRefs();


            self.noPatientMessageDisplay = ko.observable( !self.noPatientMessage() || false );
            self.isStandardType = ko.observable( Y.doccirrus.schemas.scheduletype.appointmentTypes.STANDARD === peek( self.type ) );
            self.requiredResourcesI18n = REQUIRED_RESOURCES;
            self.initEditableTable();
            self.initActions();
            self.initValidateDependencies();
            self.initTypeSelect2();

            self.addDisposable( ko.computed( function() {
                var
                    type = unwrap( self.type );

                if( Y.doccirrus.schemas.scheduletype.appointmentTypes.STANDARD === type ) {
                    self.isStandardType( true );
                } else {
                    self.isStandardType( false );
                }
            } ) );


            requiredResources.forEach( function( resource ) {
                self.requiredResourcesEditableTable.addRow( {
                    data: {
                        _id: resource._id,
                        resourceType: resource.resourceType
                    }
                } );
            } );
        },
        showTypesDescription: function() {
            var
                text = i18n('InTimeAdminMojit.tab_appointment-types.text.TYPES_DESCRIPTION'),
                bodyContent = Y.Node.create( '<div>' + text + '</div>' ),
                modal = new Y.doccirrus.DCWindow( {
                    className: 'DCWindow-Appointment',
                    bodyContent: bodyContent,
                    icon: Y.doccirrus.DCWindow.ICON_INFO,
                    width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                    title: i18n( 'DCWindow.notice.title.info' ),
                    height: Y.doccirrus.DCWindow.SIZE_LARGE,
                    minHeight: Y.doccirrus.DCWindow.SIZE_LARGE,
                    minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                    maximizable: true,
                    resizable: false,
                    focusOn: [],
                    centered: true,
                    modal: true,
                    render: document.body,
                    buttons: {
                        header: [ 'close' ],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'OK' )
                        ]
                    }
                } );
            return modal;
        },
        initTypeSelect2: function() {
            var
                self = this;
            self.typeSelect2 = {
                val: ko.computed( {
                    read: function() {
                        var
                            type = ko.unwrap( self.type );
                        return type;
                    },
                    write: function( $event ) {
                        self.type( $event.val );
                    }
                } ),
                select2: {
                    width: '100%',
                    allowClear: true,
                    data: Y.doccirrus.schemas.scheduletype.types.Type_E.list.map( function( item ) {
                        return {
                            id: item.val,
                            text: item.i18n
                        };
                    } )
                }
            };

        },
        initEditableTable: function () {
            var self = this;

            self.requiredResourcesEditableTable = KoComponentManager.createComponent( {
                componentType: 'KoEditableTable',
                stateId: 'requiredResources-KoEditableTable',
                componentConfig: {
                    ViewModel: RequiredResourceModel,
                    columns: [
                        {
                            forPropertyName: 'resourceType',
                            label: i18n( 'InTimeAdminMojit.tab_resources.label.RESOURCE_TYPE' ),
                            title: i18n( 'InTimeAdminMojit.tab_resources.label.RESOURCE_TYPE' ),
                            inputField: {
                                componentType: 'KoFieldSelect2',
                                componentConfig: {
                                    select2Config: {
                                        multiple: false,
                                        initSelection: function( element, callback ) {
                                            var data = {id: element.val(), text: element.val()};
                                            callback( data );
                                        },
                                        query: function( query ) {
                                            Y.doccirrus.jsonrpc.api.resource.getResourceTypes( {
                                                    query: {
                                                        type: {
                                                            $regex: query.term,
                                                            $options: 'i'
                                                        }
                                                    }
                                                }
                                            ).done( function( response ) {
                                                var
                                                    data = response && response.data || [],
                                                    uniqueTypes = _.uniq( data.map( function( item ) {
                                                        return item.type;
                                                    } ) );
                                                query.callback( {
                                                    results: uniqueTypes.map( function( item ) {
                                                        return {
                                                            id: item,
                                                            text: item
                                                        };
                                                    } )
                                                } );
                                            } );
                                        }
                                    }
                                }
                            },
                            renderer: function( meta ) {
                                var data = meta.row;
                                return peek( data.resourceType ) || '';
                            }
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
                                    title: Y.doccirrus.i18n( 'general.button.DELETE' ),
                                    icon: 'TRASH_O',
                                    click: function( button, $event, $context ) {
                                        var model = $context.$parent.row;

                                        if( model._id() && peek( self._id ) ) {
                                            Y.doccirrus.jsonrpc.api.scheduletype.deleteRequiredResource( {
                                                query: {
                                                    resourceId: model._id(),
                                                    scheduletypeId: peek( self._id )
                                                }
                                            } ).done( function() {
                                                self.requiredResourcesEditableTable.removeRow( model );
                                            } );
                                        } else {
                                            self.requiredResourcesEditableTable.removeRow( model );
                                        }
                                    }
                                }
                            }
                        }
                    ],
                    isAddRowButtonDisabled: function() {
                        return self.isPreconfigured();
                    }
                }
            } );
        },
        /**
         * select2 config object
         */
        select2CalendarRefs: null,
        /**
         * table for required resources
         */
        requiredResourcesEditableTable: null,
        // handle schema
        initCalendarRefs: function() {
            var
                self = this,
                calendarList = self.get( 'calendarList' ),
                calendarMap = {},
                calendarRefsMap = {};

            // "standardId" don't need to take care about "calendarRefs", because all are included
            if( self.get( 'standardId' ) === peek( self._id ) ) {
                return;
            }

            // build calendar lookup map
            calendarList.forEach( function( calendar ) {
                calendarMap[ calendar._id ] = calendar;
            } );

            // build calendarRef lookup map
            // (needed to cache and lookup existing entries)
            peek( self.calendarRefs ).forEach( function( calendarRef ) {
                var
                    calendarRefObject = calendarRef.toJSON();

                if( calendarRefObject._id ) {
                    calendarRefsMap[ calendarRefObject.calendarId ] = calendarRefObject;
                }
            } );

            // build select2 config
            self.select2CalendarRefs = {
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        var
                            calendarRefs = self.calendarRefs();

                        return calendarRefs.map( function( calendarRef ) {
                            var
                                calendarId = peek( calendarRef.calendarId );

                            return {
                                id: calendarId,
                                text: calendarMap[ calendarId ].name
                            };
                        } );
                    },
                    write: function( $event ) {
                        var
                            value = $event.val;

                        self.calendarRefs( Y.Array.map( value, function( calendarId ) {
                            // lookup existing entries
                            if( calendarId in calendarRefsMap ) {
                                return calendarRefsMap[ calendarId ];
                            }
                            // create non-existing entries
                            if( calendarId in calendarMap ) {
                                return {
                                    calendarId: calendarId
                                };
                            }
                        } ) );

                    }
                } ) ),
                select2: {
                    width: '100%',
                    allowClear: true,
                    placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                    multiple: true,
                    data: function() {
                        return {
                            // list of calendars to choose from
                            results: calendarList.map( function( calendarRef ) {
                                return {
                                    id: calendarRef._id,
                                    text: calendarRef.name
                                };
                            } )
                        };
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
         * init actions this view exposes
         */
        initActions: function() {
            var
                self = this;

            self.pending = ko.observable( false );
            self.saveDisabled = ko.computed( function() {
                var
                    pending = self.pending(),
                    requiredResources = self.requiredResourcesEditableTable.rows(),
                    allResourcesAreValid = requiredResources.every( function( item ) { return item.isValid(); } ),
                    valid = self._isValid() && allResourcesAreValid,
                    noMessageChanged = self.noPatientMessage() === self.noPatientMessageDisplay(),
                    someResourceIsModified = requiredResources.some( function( item ) { return item.isModified(); } ),
                    someResourceIsNew = requiredResources.some( function( item ) { return !item._id(); } ),
                    modified = self.isModified() || someResourceIsModified,
                    isNew = self.isNew() || someResourceIsNew;

                return pending || !(valid && ((modified || noMessageChanged) || isNew));
            } ).extend( { rateLimit: 0 } );
        },
        /**
         * validate those dependencies
         */
        initValidateDependencies: function() {
            var
                self = this;

            self.addDisposable( ko.computed( function() {
                self.isPreconfigured();
                self.capacity.validate();
            } ).extend( { rateLimit: ko.extenders.validate.VALIDATE_RATELIMIT_TIMEOUT } ) );
        },
        /**
         * save data for this view
         * @return {jQuery.Deferred}
         */
        save: function() {
            var
                self = this,
                requiredResources = self.requiredResourcesEditableTable.rows() || [],
                addedResources = requiredResources.filter( function( resource ) {
                    return !unwrap( resource._id );
                } ),
                updatedResources = requiredResources.filter( function( resource ) {
                    return unwrap( resource._id ) && resource.isModified();
                } ),
                data = self.toJSON(),
                typeIsStandard = Y.doccirrus.schemas.scheduletype.appointmentTypes.STANDARD === self.type(),
                calendarList = self.get( 'calendarList' ),
                calendarMap = {},
                calendarsWithoutEmployee = [],
                // fields that all scheduletype update
                fields = [ 'name', 'duration', 'isPublic', 'info', 'isPreconfigured', 'noPatientMessage', 'capacity', 'numberOfSuggestedAppointments', 'color', 'type' ],
                deferred;

            data.noPatientMessage = !self.noPatientMessageDisplay();

            // fields that non "standardId" update
            if( !viewModel.isStandardId( data._id ) ) {
                fields.push( 'calendarRefs' );
            }

            calendarList.forEach( function( calendar ) {
                calendarMap[ calendar._id ] = calendar;
            } );

            self.pending( true );

            // for non-standard public scheduleTypes we should check all calendarRefs
            // if each of them has assigned employee in case if this calendar is also reachable on PP
            if( 'STANDARD' !== data.type && data.isPublic ) {
                data.calendarRefs.forEach( function( ref ) {
                    if( calendarMap[ref.calendarId].isPublic && !calendarMap[ref.calendarId].employee ) {
                        calendarsWithoutEmployee.push( calendarMap[ref.calendarId].name );
                    }
                } );
                if( calendarsWithoutEmployee.length ) {
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: 'tab_appointment-types-save-warn',
                        content: i18n( 'InTimeAdminMojit.tab_appointment-types.text.NO_EMPLOYEE_WARN', {
                            data: {
                                calendars: calendarsWithoutEmployee.join( ', ' ),
                                type: Y.doccirrus.schemaloader.translateEnumValue( 'i18n', data.type, Y.doccirrus.schemas.scheduletype.types.Type_E.list, data.type )
                            }
                        } ),
                        level: 'WARNING'
                    } );
                }
            }
            if( requiredResources.length && data.isPreconfigured ) {
                return Y.doccirrus.DCWindow.notice( {
                    type: 'error',
                    message: RESOURCES_IN_GROUP_WARN,
                    window: {
                        width: 'auto',
                        buttons: {
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    isDefault: true,
                                    action: function() {
                                        self.pending( false );
                                        this.close();
                                    }
                                } )
                            ]
                        }
                    }
                } );
            }
            if( self.isNew() ) {
                if( addedResources.length && typeIsStandard ) {
                    data.requiredResources = addedResources;
                }
                deferred = Y.doccirrus.jsonrpc.api.scheduletype
                    .create( {
                        data: data
                    } );
            }
            else {
                if( !typeIsStandard ) {
                    fields.push( 'requiredResources' );
                    data.requiredResources = [];
                }
                deferred = Y.doccirrus.jsonrpc.api.scheduletype
                    .update( {
                        query: { _id: data._id },
                        data: data,
                        fields: fields
                    } );
            }

            return deferred
                .then( function( response ) {
                    if( !self.isNew() && typeIsStandard && ( addedResources.length || updatedResources.length ) ) {
                        Y.doccirrus.jsonrpc.api.scheduletype
                            .updateRequiredResources( {
                                query: {_id: data._id},
                                data: {
                                    created: addedResources,
                                    updated: updatedResources
                                }
                            } ).fail( fail );
                    }
                    return response;
                } )
                .done( function( response ) {
                    var
                        warnings = Y.doccirrus.errorTable.getWarningsFromResponse( response );

                    if( warnings.length ) {
                        Y.Array.invoke( warnings, 'display' );
                    }

                    if( response.data ) {
                        Y.doccirrus.DCSystemMessages.addMessage( {
                            messageId: 'tab_appointment-types-save',
                            content: i18n( 'general.message.CHANGES_SAVED' )
                        } );
                        if( viewModel ) {
                            viewModel.closeEditingItem( self );
                        }
                    }

                } )
                .fail( fail )
                .always( function() {
                    self.pending( false );
                } );
        }
    }, {
        schemaName: ScheduletypeModel.schemaName,
        ATTRS: {
            calendarList: {
                value: [],
                cloneDefaultValue: true,
                lazyAdd: false
            }
        }
    } );

    /**
     * ViewModel of each required resource
     * @constructor
     */
    function RequiredResourceModel( config ) {
        RequiredResourceModel.superclass.constructor.call( this, config );
    }

    RequiredResourceModel.ATTRS = {
        validatable: {
            value: true,
            lazyAdd: false
        }
    };

    Y.extend( RequiredResourceModel, KoViewModel.getBase(), {

        initializer: function() {
        },
        destructor: function() {
        }
    }, {
        schemaName: 'scheduletype.requiredResources',
        NAME: 'RequiredResourceModel'
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
            //translates
            self.requiredResourcesI18n = REQUIRED_RESOURCES;
            self.headlineI18n = i18n( 'InTimeAdminMojit.tab_appointment-types.headline' );
            self.buttonAddI18n = i18n( 'general.button.ADD' );
            self.buttonSaveI18n = i18n( 'general.button.SAVE' );
            self.yesI18n = i18n( 'DCWindow.BUTTONS.YES' );
            self.noI18n = i18n( 'DCWindow.BUTTONS.NO' );
            self.healthPortalI18n = i18n( 'InTimeAdminMojit.tab_appointment-types.label.HEALTH_PORTAL' );
            self.visibleTextI18n = i18n( 'InTimeAdminMojit.tab_appointment-types.text.VISIBLE' );
            self.notVisibleTextI18n = i18n( 'InTimeAdminMojit.tab_appointment-types.text.NOT_VISIBLE' );
            self.appointmentsDurationI18n = i18n( 'InTimeAdminMojit.tab_appointment-types.label.DURATION' );
            self.appointmentsMinutesI18n = i18n( 'InTimeAdminMojit.tab_appointment-types.text.MINUTES' );
            self.appointmentsInformationI18n = i18n( 'InTimeAdminMojit.tab_appointment-types.label.INFORMATION' );
            self.appointmentsTypeI18n = i18n( 'InTimeAdminMojit.tab_appointment-types.label.TYPE' );
            self.appointmentsCapacityI18n = i18n( 'InTimeAdminMojit.tab_appointment-types.label.CAPACITY' );
            self.numberOfSuggestedAppointmentsI18n = i18n( 'InTimeAdminMojit.tab_appointment-types.label.NUMBER_OF_SUGGESTED_APPOINTMENTS' );
            self.appointmentsPreconfiguredI18n = i18n( 'InTimeAdminMojit.tab_appointment-types.text.PRECONFIGURED' );
            self.appointmentsACalI18n = i18n( 'InTimeAdminMojit.tab_appointment-types.label.ASS_CAL' );
            self.appointmentsValidAllI18n = i18n( 'InTimeAdminMojit.tab_appointment-types.text.VALID_ALL' );
            self.appointmentsAppTypeI18n = i18n( 'InTimeAdminMojit.tab_appointment-types.title_attribute.APP_TYPE' );
            self.appointmentsIsPublicTrueI18n = i18n( 'InTimeAdminMojit.tab_appointment-types.isPublic.true' );
            self.appointmentsIsPublicFalseI18n = i18n( 'InTimeAdminMojit.tab_appointment-types.isPublic.false' );
            self.appointmentsDurationInMinutesI18n = i18n( 'InTimeAdminMojit.tab_appointment-types.label.DURATION_IN_MINUTES' );
            self.appointmentsAutoDurationI18n = i18n( 'InTimeAdminMojit.tab_appointment-types.title_attribute.AUTO_DURATION' );
            self.appointmentsNoCapacityI18n = i18n( 'InTimeAdminMojit.tab_appointment-types.text.NO_CAPACITY' );
            self.appointmentsOnlyPreconI18n = i18n( 'InTimeAdminMojit.tab_appointment-types.title_attribute.ONLY_PRECON' );
            self.appointmentsPatientInfoI18n = i18n( 'InTimeAdminMojit.tab_appointment-types.label.PATIENT_INFO' );
            self.appointmentsAddInfoI18n = i18n( 'InTimeAdminMojit.tab_appointment-types.title_attribute.ADD_INFO' );
            self.appointmentsWhichCalendarI18n = i18n( 'InTimeAdminMojit.tab_appointment-types.title_attribute.WHICH_CALENDAR' );
            self.appointmentsLabelColorI18n = i18n( 'InTimeAdminMojit.tab_calendars.label.COLOR' );
            self.appointmentsNamePlaceholderI18n = i18n( 'scheduletype-schema.ScheduleType_T.name.placeholder' );
            self.noPatientMessageI18n = i18n( 'InTimeAdminMojit.tab_appointment-types.text.NO_PATIENT_MESSAGE' );
            self.noPatientMessageShortI18n = i18n( 'InTimeAdminMojit.tab_appointment-types.text.NO_PATIENT_MESSAGE_SHORT' );
        },
        destructor: function() {
            var
                self = this,
                editing = peek( self.editing );

            if( editing ) {
                editing.destroy();
            }
        },

        practice: ko.observable( null ),

        getPractice: function() {
            return Y.doccirrus.jsonrpc.api.practice
                .read()
                .then( function( response ) {
                    return response && response.data && response.data[ 0 ] || null;
                } );
        },

        getForegroundColor: function( colorParam ) {
            var
                practice = ko.unwrap( this.practice ),
                color = ko.unwrap( colorParam );

            if( practice ) {
                return 'MEETING' === practice.colorMode && color ? Y.doccirrus.schemas.calendar.getContrastColor( color ) : '';
            } else {
                return '';
            }
        },
        /**
         * scheduletype objects to visualize
         */
        items: null,
        /**
         * current scheduletype EditModel for editing view
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

            self.pending = ko.observable( false );

            self.editItem = Y.bind( self.editItem, self );
            self.confirmDeleteItem = Y.bind( self.confirmDeleteItem, self );
            self.closeEditingItem = Y.bind( self.closeEditingItem, self );

        },
        getTypeForItem: function( item ){
            var
                type = item.type || Y.doccirrus.schemas.scheduletype.types.Type_E.default;
            return Y.doccirrus.schemaloader.translateEnumValue( 'i18n', type, Y.doccirrus.schemas.scheduletype.types.Type_E.list, type );
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
         * check id for standard scheduletype
         * @param id
         * @return {boolean}
         */
        isStandardId: function( id ) {
            return id === Y.doccirrus.schemas.scheduletype.getStandardId();
        },
        /**
         * compute display of belonging calendar names
         * @param calendarRefs
         * @return {String}
         */
        displayCalendarNames: function( calendarRefs ) {
            return Y.Array.map( calendarRefs, function( calendarRef ) {
                return calendarRef.name;
            } ).join( ', ' );
        },
        /**
         * Computes resources
         */
        displayResourcesComputed: function( resources ) {
            return ( resources && resources.map( function( resourceItem ) { return resourceItem.resourceType; } ).join( ', ' ) ) || '';
        },
        /**
         * load data for this view
         */
        load: function() {
            var
                self = this;

            self.pending( true );

            jQuery.when(
                readScheduletypeForEdit(),
                self.getPractice() )
                .done( function( scheduletypes, practice ) {
                    self.items( sortScheduletypeListView( scheduletypes ) );
                    self.practice( practice );
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

        getBackgroundImage: function() {
            var
                practice = ko.unwrap( this.practice );

            if( practice ) {
                return 'MEETING' === practice.colorMode ? 'none' : '';
            } else {
                return '';
            }
        },
        /**
         * add an item by switching into edit-mode with an an empty EditModel
         */
        addItem: function() {
            var
                self = this;

            self.pending( true );

            jQuery.when(
                readCalendarForScheduletypeEdit()
            )
                .done( function( calendarList ) {
                    self.editing( new EditModel( {
                        data: {
                            calendarRefs: Y.Array.map( calendarList, function( calendar ) {
                                return {
                                    calendarId: calendar._id,
                                    name: calendar.name
                                };
                            } ),
                            requiredResources: []
                        },
                        calendarList: calendarList,
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
                self = this;

            self.pending( true );

            jQuery.when(
                readCalendarForScheduletypeEdit(),
                readScheduletypeForEdit( { query: { _id: item._id } } )
                    .then( function( scheduletypes ) {
                        return scheduletypes[ 0 ] || null;
                    } )
            )
                .done( function( calendarList, scheduletype ) {
                    self.editing( new EditModel( {
                        data: scheduletype,
                        calendarList: calendarList,
                        validatable: true
                    } ) );
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
                self = this;

            self.pending( true );

            Y.doccirrus.jsonrpc.api.scheduletype
                .delete( {
                    query: { _id: item._id }
                } )
                .done( function( response ) {
                    var
                        warnings = Y.doccirrus.errorTable.getWarningsFromResponse( response );

                    if( warnings.length ) {
                        Y.Array.invoke( warnings, 'display' );
                    }

                    if( response.data ) {
                        self.items.remove( item );
                        Y.doccirrus.DCSystemMessages.addMessage( {
                            messageId: 'tab_appointment-types-deleteItem',
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
                message: i18n( 'scheduletype-api.confirmDeleteItem.message' ),
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
            self.reload();
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
