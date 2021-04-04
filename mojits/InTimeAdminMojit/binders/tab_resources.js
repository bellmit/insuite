/*jslint anon:true, sloppy:true, nomen:true*/
/*global fun:true, ko, _, jQuery */ //eslint-disable-line
'use strict';

fun = function _fn( Y/*, NAME*/ ) {

    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        KoUI = Y.doccirrus.KoUI,
        KoViewModel = Y.doccirrus.KoViewModel,
        KoComponentManager = KoUI.KoComponentManager,
        i18n = Y.doccirrus.i18n,
        ALL_RESOURCES = i18n( 'InTimeAdminMojit.tab_resources.text.ALL_RESOURCES' ),
        viewModel = null;

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
     * ViewModel of each resource entry
     * @constructor
     */
    function ResourceModel( config ) {
        ResourceModel.superclass.constructor.call( this, config );
    }

    ResourceModel.ATTRS = {
        validatable: {
            value: true,
            lazyAdd: false
        }
    };

    Y.extend( ResourceModel, KoViewModel.getBase(), {

        initializer: function() {
        },
        destructor: function ResourceModel_destructor() {
        }
    }, {
        schemaName: 'resource',
        NAME: 'ResourceModel'
    } );

    /**
     * ViewModel of each calendar entry
     * @constructor
     */
    function CalendarResourceModel( config ) {
        CalendarResourceModel.superclass.constructor.call( this, config );
    }

    CalendarResourceModel.ATTRS = {
        validatable: {
            value: true,
            lazyAdd: false
        }
    };

    Y.extend( CalendarResourceModel, KoViewModel.getBase(), {

        initializer: function() {
            var self = this;
            self.name = ko.observable( self.get( 'data.name' ) );
            self.nameIsModified = ko.observable( false );

            self.name.hasError = ko.computed( function() {
                return !self.name();
            } );

            self.name.disabled = ko.observable();

            //change of calendar name in resource config is forbidden for now
            self.addDisposable( ko.computed( function() {
                var
                    id = unwrap( self._id );
                self.name.disabled( id );
            } ) );

            self.name.subscribe( function( newVal ) {
                if( newVal && newVal !== self.get( 'data.name' ) ) {
                    self.nameIsModified( true );
                } else {
                    self.nameIsModified( false );
                }
            } );
            self._isModified = ko.computed( function() {
                return self.isModified() || self.nameIsModified();
            } );

            self.resource.disabled = ko.observable();
            self.addDisposable( ko.computed( function() {
                var
                    resourceType = unwrap( self.resourceType );
                self.resource.disabled( !resourceType );
                if( ko.computedContext.isInitial() ) {
                    return;
                }
                self.resource( null ); //to prevent attaching resource with inappropriate type
            } ) );
        },
        destructor: function CalendarResourceModel_destructor() {
        }
    }, {
        schemaName: 'calendar.resources',
        NAME: 'CalendarResourceModel'
    } );

    /**
     * This views ViewModel
     * @constructor
     */
    function ViewModel() {
        ViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ViewModel, KoViewModel.getDisposable(), {
        initializer: function() {
            var
                self = this;

            self.initViewModel();
            //translates
            self.headlineI18n = i18n( 'InTimeAdminMojit.tab_resources.headline' );
            self.calendarsHeadlineI18n = i18n( 'InTimeAdminMojit.tab_resources.calendarsHeadline' );
            self.buttonAddI18n = i18n( 'general.button.ADD' );
            self.buttonSaveI18n = i18n( 'general.button.SAVE' );
            self.yesI18n = i18n( 'DCWindow.BUTTONS.YES' );
            self.noI18n = i18n( 'DCWindow.BUTTONS.NO' );
            self.resourceTypeI18n = i18n( 'InTimeAdminMojit.tab_resources.label.RESOURCE_TYPE' );
            self.resourceNameI18n = i18n( 'InTimeAdminMojit.tab_resources.label.RESOURCE_NAME' );
        },
        destructor: function() {

        },

        /**
         * resources objects to visualize
         */
        resources: null,
        calendars: null,
        resourceEditableTable: null,
        /**
         * Initializer
         */
        initViewModel: function() {
            var
                self = this;

            self.resources = ko.observableArray( [] );
            self.calendars = ko.observableArray( [] );
            self.pending = ko.observable( false );
            self.createdResources = [];
            self.updatedResources = [];
            self.deletedResources = [];
            self.createdCalendarConfig = [];
            self.updatedCalendarConfig = [];
            self.deletedCalendarConfig = [];
            self.numberOfResourcesRows = ko.observable( 0 );
            self.numberOfCalendarsRows = ko.observable( 0 );
            self.load();
            self.initLoadMask();
            self.initTables();
            self.initSaveButtons();
        },
        /**
         * busy flag
         */
        pending: null,
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
                } else {
                    Y.doccirrus.utils.hideLoadingMask( node );
                }
            } ) );
        },
        /**
         *
         * @param resourceType
         * @param currentResourceId
         * @returns {{componentType: string, componentConfig: {optionsText: string, optionsValue: string, options: *, select2Config: {multiple: boolean}}}}
         */
        getResourcesOptions: function( resourceType, currentResourceId ) {
            var
                self = this,
                ALL = {
                    id: 'ALL',
                    text: ALL_RESOURCES
                },
                options = [],
                resources = unwrap( self.resources ) || [],
                calendarTableRows = self.calendarEditableTable.rows(),
                currentTypeResources = resources.filter( function( resource ) {
                    return resource.type === resourceType;
                } ),
                resourcesWithAvailableCapacity = currentTypeResources.filter( function( resource ) {
                    var tmp = calendarTableRows.filter( function( row ) {
                        return row.resource() === resource.id || (row.resource() === 'ALL' && row.resourceType() === resource.type);
                    } );
                    return resource.capacity > tmp.length;
                } ),
                showAll,
                currentResource = currentResourceId && resources.find( function( resource ) {
                    return resource.id === currentResourceId;
                } ),
                rowsWithCurrentResourceType = calendarTableRows.filter( function( row ) {
                    return row.resourceType() === resourceType;
                } );

            if( [0, 1].includes( rowsWithCurrentResourceType.length ) ) {
                //means that we can show all possible resources of this type
                showAll = true;
            } else {
                showAll = false;
            }

            if( resourcesWithAvailableCapacity.length || 'ALL' === currentResourceId ) {
                if( (rowsWithCurrentResourceType.length <= 1) || 'ALL' === currentResourceId ) {
                    resourcesWithAvailableCapacity.unshift( ALL );
                }
                options = resourcesWithAvailableCapacity;
            }

            if( showAll ) {
                currentTypeResources.unshift( ALL );
                options = currentTypeResources;
            }

            return {
                componentType: 'KoFieldSelect2',
                componentConfig: {
                    options: options.length ? options : (currentResource && [currentResource] || []),
                    optionsText: 'text',
                    optionsValue: 'id',
                    select2Config: {
                        multiple: false
                    }
                }
            };
        },
        initTables: function() {
            var
                self = this;

            self.resourceEditableTable = KoComponentManager.createComponent( {
                componentType: 'KoEditableTable',
                stateId: 'resources-KoEditableTable',
                componentConfig: {
                    ViewModel: ResourceModel,
                    columns: [
                        /*{
                            componentType: 'KoEditableTableColumnDrag'
                        },*/
                        {
                            forPropertyName: 'name',
                            label: i18n( 'InTimeAdminMojit.tab_resources.label.RESOURCE_NAME' ),
                            title: i18n( 'InTimeAdminMojit.tab_resources.label.RESOURCE_NAME' )
                        },
                        {
                            forPropertyName: 'type',
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
                                        createSearchChoice: function( item ) {
                                            return {
                                                id: item,
                                                text: item
                                            };
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

                                        if( model._id() ) {
                                            self.deletedResources.push( model._id() );
                                            self.calendarEditableTable.rows().forEach( function( calendar ) {
                                                if( calendar.resource() === model._id() ) {
                                                    self.calendarEditableTable.removeRow( calendar );
                                                }
                                                return;
                                            } );
                                        }
                                        self.resourceEditableTable.removeRow( model );
                                    }
                                }
                            }
                        }
                    ]/*,
                    draggableRows: true*/
                }
            } );
            self.calendarEditableTable = KoComponentManager.createComponent( {
                componentType: 'KoEditableTable',
                stateId: 'calendars-KoEditableTable',
                componentConfig: {
                    ViewModel: CalendarResourceModel,
                    columns: [
                        {
                            forPropertyName: 'name',
                            label: i18n( 'InTimeAdminMojit.tab_resources.label.CALENDAR_NAME' ),
                            title: i18n( 'InTimeAdminMojit.tab_resources.label.CALENDAR_NAME' ),
                            inputField: {
                                componentType: 'KoFieldSelect2',
                                componentConfig: {
                                    select2Config: {
                                        multiple: false,
                                        quietMillis: 700,
                                        initSelection: function( element, callback ) {
                                            var data = {id: element.val(), text: element.val()};
                                            callback( data );
                                        },
                                        query: function( query ) {
                                            Y.doccirrus.jsonrpc.api.calendar
                                                .read( {
                                                    query: {
                                                        name: {
                                                            $regex: query.term,
                                                            $options: 'i'
                                                        },
                                                        type: 'PATIENTS'
                                                    },
                                                    fields: {_id: 1, name: 1}
                                                } ).done( function( response ) {
                                                // as we allow only one resource to be attached to a calendar now,
                                                // here we get already configured calendars
                                                var configuredCalendars = self.calendarEditableTable.rows().map( function( row ) {
                                                    return peek( row.name );
                                                } );

                                                query.callback( {
                                                    results: (response && response.data && response.data.filter( function( item ) {
                                                        return 0 > configuredCalendars.indexOf( item.name );
                                                    } ).map( function( item ) {
                                                        return {id: item.name, text: item.name, _data: item};
                                                    } )) || []
                                                } );
                                            } );
                                        }
                                    }
                                }
                            }
                        },
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
                            forPropertyName: 'resource',
                            label: i18n( 'InTimeAdminMojit.tab_resources.label.RESOURCE_NAME' ),
                            title: i18n( 'InTimeAdminMojit.tab_resources.label.RESOURCE_NAME' ),
                            getComponentForCell: function( meta ) {
                                var type = peek( meta.row.resourceType ),
                                    currentResource = peek( meta.row.resource );
                                return self.getResourcesOptions( type, currentResource );
                            },
                            renderer: function( meta ) {
                                var data = meta.row || {},
                                    availableResources = unwrap( self.resources ) || [],
                                    thisResource = availableResources.find( function( item ) {
                                        return item.id === peek( data.resource );
                                    } );

                                if( 'ALL' === peek( data.resource ) ) {
                                    return ALL_RESOURCES;
                                }
                                return thisResource && thisResource.text;
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

                                        var model = $context.$parent.row,
                                            allCalendars = peek( self.calendars );

                                        if( model._id() ) {
                                            self.deletedCalendarConfig.push( {
                                                resourceId: model._id(),
                                                calendarId: (allCalendars.find( function( item ) {
                                                    return item.name === peek( model.name );
                                                } ) || {})._id
                                            } );
                                        }
                                        self.calendarEditableTable.removeRow( model );
                                    }
                                }
                            }
                        }
                    ]
                }
            } );
        },
        initSaveButtons: function() {
            let
                self = this;

            self.saveResourcesButton = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'saveResources',
                    option: 'PRIMARY',
                    text: i18n( 'general.button.SAVE' ),
                    disabled: ko.computed( function() {
                        let
                            rows = unwrap( self.resourceEditableTable.rows ),
                            numberOfRows = unwrap( self.numberOfResourcesRows ),
                            isValid = true,
                            isModified = false;

                        rows.forEach( function( resource ) {
                            isValid = isValid && resource.isValid();
                            isModified = isModified || resource.isModified();
                        } );

                        if( rows.length !== numberOfRows ) {
                            isModified = true;
                            self.numberOfResourcesRows( rows.length );
                        }

                        return !isValid || !isModified;
                    } ),
                    click: function() {
                        const
                            rows = unwrap( self.resourceEditableTable.rows );
                        rows.forEach( function( resource ) {
                            if( !unwrap( resource._id ) ) {
                                self.createdResources.push( resource );
                            } else if( resource.isModified() ) {
                                self.updatedResources.push( resource );
                            }
                        } );

                        Y.doccirrus.jsonrpc.api.resource.updateCollection( {
                            created: self.createdResources,
                            updated: self.updatedResources,
                            deleted: self.deletedResources
                        } ).done( function( res ) {
                            const
                                addedResources = res && res.data && res.data.addedResources || [];

                            self.updatedResources.forEach( function( resource ) {
                                resource.setNotModified();
                            } );

                            self.createdResources.forEach( function( resource ) {
                                addedResources.forEach( function( addedResource ) {
                                    if( resource.name() === addedResource.name ) {
                                        resource.set( 'data._id', addedResource._id );
                                    }
                                    resource.setNotModified();
                                } );
                            } );

                            self.resources( self.resourceEditableTable.rows().map( function( item ) {
                                return {
                                    id: peek( item._id ),
                                    text: peek( item.name ),
                                    type: peek( item.type ),
                                    capacity: peek( item.capacity )
                                };
                            } ) );
                        } ).fail( function( error ) {
                            _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                        } ).always( function() {
                            self.numberOfResourcesRows.notifySubscribers();
                            self.createdResources = [];
                            self.updatedResources = [];
                            self.deletedResources = [];
                        } );
                    }
                }
            } );

            self.saveCalendarsButton = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'saveCalendars',
                    option: 'PRIMARY',
                    text: i18n( 'general.button.SAVE' ),
                    disabled: ko.computed( function() {
                        let
                            rows = unwrap( self.calendarEditableTable.rows ),
                            numberOfRows = unwrap( self.numberOfCalendarsRows ),
                            isValid = true,
                            isModified = false;

                        rows.forEach( function( calendar ) {
                            isValid = isValid && calendar.isValid() && !calendar.name.hasError();
                            isModified = isModified || calendar._isModified();
                        } );

                        if( rows.length !== numberOfRows ) {
                            isModified = true;
                            self.numberOfCalendarsRows( rows.length );
                        }

                        return !isValid || !isModified;
                    } ),
                    click: function() {
                        const
                            rows = unwrap( self.calendarEditableTable.rows );
                        rows.forEach( function( item ) {
                            if( !unwrap( item._id ) ) {
                                self.createdCalendarConfig.push( {
                                    data: item,
                                    calendarId: (self.calendars().find( function( cal ) {
                                        return item.name() === cal.name;
                                    } ) || {})._id
                                } );
                            } else if( item._isModified() ) {
                                self.updatedCalendarConfig.push( {
                                    data: item,
                                    calendarId: (self.calendars().find( function( cal ) {
                                        return item.name() === cal.name;
                                    } ) || {})._id
                                } );
                            }
                        } );

                        Y.doccirrus.jsonrpc.api.calendar.updateResources( {
                            created: self.createdCalendarConfig,
                            updated: self.updatedCalendarConfig,
                            deleted: self.deletedCalendarConfig
                        } ).done( function( response ) {
                            var addedConfigs = response && response.data && response.data.created;

                            self.updatedCalendarConfig.forEach( function( item ) {
                                item.data.setNotModified();
                                item.data.nameIsModified( false );
                            } );

                            self.createdCalendarConfig.forEach( function( config ) {
                                addedConfigs.forEach( function( addedConfig ) {
                                    if( config.data.resource() === addedConfig.resource ) {
                                        config.data.set( 'data._id', addedConfig._id );
                                    }
                                    config.data.setNotModified();
                                    config.data.nameIsModified( false );
                                } );
                            } );

                            self.calendarEditableTable.rows.notifySubscribers();
                        } ).fail( function( error ) {
                            _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                        } ).always( function() {
                            self.numberOfCalendarsRows.notifySubscribers();
                            self.createdCalendarConfig = [];
                            self.updatedCalendarConfig = [];
                            self.deletedCalendarConfig = [];
                        } );
                    }
                }
            } );
        },
        /**
         * load data for this view
         */
        load: function() {
            var
                self = this;

            self.pending( true );

            Y.doccirrus.jsonrpc.api.resource
                .getResourceList()
                .then( function( response ) {
                    var data = response && response.data || [];

                    data.forEach( function( item ) {
                        self.resourceEditableTable.addRow( {data: item} );
                    } );
                    self.numberOfResourcesRows( self.resourceEditableTable.rows().length || 0 );
                    self.resources( data.map( function( item ) {
                        return {
                            id: item._id,
                            text: item.name,
                            type: item.type,
                            capacity: item.capacity
                        };
                    } ) );
                } )
                .fail( fail )
                .then( function() {
                    return Y.doccirrus.jsonrpc.api.calendar
                        .read( {query: {type: 'PATIENTS'}} );
                } )
                .then( function( response ) {
                    var data = response && response.data || [],
                        calendarsWithResources = data.filter( function( item ) {
                            return item.resources && item.resources.length;
                        } );

                    calendarsWithResources.forEach( function( calendar ) {
                        calendar.resources.forEach( function( resource ) {
                            self.calendarEditableTable.addRow( {
                                data: {
                                    _id: resource._id,
                                    name: calendar.name,
                                    resourceType: resource.resourceType,
                                    resource: resource.resource
                                }
                            } );
                        } );
                    } );
                    self.numberOfCalendarsRows( self.calendarEditableTable.rows().length || 0 );
                    self.calendars( data );
                } )
                .fail( fail )
                .always( function() {
                    self.pending( false );
                } );

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
