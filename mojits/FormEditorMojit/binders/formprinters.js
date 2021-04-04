/**
 *  Form printer assignments
 *
 *  @author: strix
 *  @copyright: Doc Cirrus GmbH 2015
 */

/*jslint anon:true, sloppy:true, nomen:true, latedef:false */
/*global YUI, $, async, ko */

YUI.add( 'FormEditorMojitBinderFormPrinters', function( Y, NAME ) {
        /**
         * The FormEditorMojitBinderFormPrinters module.
         *
         * @module FormEditorMojitBinderFormPrinters
         */

        'use strict';

        var
            i18n = Y.doccirrus.i18n,

            DEFAULT_LOCATION_ID ='000000000000000000000001',

            KoViewModel = Y.doccirrus.KoViewModel,
            Disposable = KoViewModel.getDisposable();

        function ManageFormprintersViewModel( config ) {
            ManageFormprintersViewModel.superclass.constructor.call( this, config );
        }

        Y.extend( ManageFormprintersViewModel, Disposable, {

            //  plain data
            _forms: [],
            _formCats: [],
            _printers: [],
            _assignments: [],
            _useFilter: '',

            defaultUser: {
                _id: 'default',
                displayName: 'default',
                firstname: 'default',
                lastname: ''
            },
            defaultLocation: {
                _id: DEFAULT_LOCATION_ID,
                locname: 'loading...',
                enabledPrinters: []
            },

            //  observables bound in UI
            isLoading: null,
            randomReset: null,
            currentUser: null,
            users: null,

            currentLocation: null,
            locations: null,

            currentAssignments: null,

            tableCols: null,

            filterString: null,

            initializer: function( /* options */ ) {
                var
                    self = this;

                self.labelsTitleI18n = i18n( 'FormEditorMojit.formprinters.labels.TITLE' );

                self.filterString = ko.observable( '' );
                self.users = ko.observableArray( [ ] );
                self.currentUser = ko.observable( self.defaultUser );

                self.locations = ko.observableArray( [] );
                self.currentLocation = ko.observable( self.defaultLocation );

                self.currentAssignments = ko.observableArray( [ 'default' ] );
                self.isLoading = ko.observable( true );
                self.randomReset = ko.observable( 0 );

                self._loadFormCats( Y.dcforms.nullCallback );

                self._initFilter();
                self._initComputeds();
                self._loadAllData( onInitiaLoad );

                function onInitiaLoad( err ) {
                    self.isLoading( false );
                    if ( err ) {
                        //  TODO: pop a notice here
                        Y.log( 'Could not load assignments: ' + JSON.stringify( err ), 'warn', NAME );
                        return;
                    }
                    self.currentUser( self.defaultUser );

                    //  processNextTick()
                    window.setTimeout( function() { self.randomReset( self.randomReset() + 1 ); }, 30);
                }
            },

            /**
             *  UI state which depends on location, user, etc
             *  @private
             */

            _initComputeds: function() {
                var self = this;

                self.currentAssignments = ko.computed( function() {
                    var
                        currentUser = self.currentUser(),
                        currentLocation = self.currentLocation(),
                        assignments = self._assignments,
                        reset = self.randomReset(),
                        matching = [],
                        i;

                    Y.log( 'Updating current assignments in printer assignment pane: ' + reset, 'debug', NAME );

                    for ( i = 0; i < assignments.length; i++ ) {
                        if (
                            ( assignments[i].identityId === currentUser._id ) &&
                            ( assignments[i].locationId === currentLocation._id )
                        ) {
                            matching.push( assignments[i] );
                        }
                    }

                    return matching;
                } );

                self.tableCols = ko.computed( function _tableCols() {
                    var
                        currentLocation = self.currentLocation(),
                        assignments = self.currentAssignments(),
                        defaultPrinter,
                        cols = [],
                        i;

                    if ( !currentLocation || !currentLocation.defaultPrinter || '' === currentLocation.defaultPrinter ) {
                        return [];
                    }

                    defaultPrinter = currentLocation.defaultPrinter;

                    if ( !currentLocation.enabledPrinters ) {
                        currentLocation.enabledPrinters = [];
                    }

                    cols.push( {
                        title: defaultPrinter,
                        formCats: makeFormCatsForPrinter( defaultPrinter, assignments )
                    } );

                    for ( i = 0; i < currentLocation.enabledPrinters.length; i++ ) {
                        if ( currentLocation.enabledPrinters[i] !== defaultPrinter ) {
                            cols.push( {
                                title: currentLocation.enabledPrinters[i],
                                formCats: makeFormCatsForPrinter( currentLocation.enabledPrinters[i], assignments )
                            } );
                        }
                    }

                    function makeFormCatsForPrinter( printerName, assignments ) {
                        var categories = [], i;

                        if ( !self._formCats ) { self._formCats = []; }

                        for (i = 0; i < self._formCats.length; i++ ) {
                            categories.push( {
                                'printerName': printerName,
                                'canonical': self._formCats[i].canonical,
                                'forms': getFormsForCatAndPrinter( self._formCats[i].canonical, printerName, assignments ),
                                'locationId': currentLocation._id,
                                'dragGroup': 'ol_sort_' + printerName + '_cat_' + self._formCats[i].canonical
                            } );
                        }
                        return categories;
                    }

                    function getFormsForCatAndPrinter( canonical, printerName, assignments ) {
                        var matchforms = [], form, i, j;

                        for ( i = 0; i < self._forms.length; i++ ) {
                            form = self._forms[i];
                            form.unassigned = true;

                            for ( j = 0; j < assignments.length; j++ ) {

                                if ( form.formId === assignments[j].canonicalId ) {

                                    //  is has an assignment to some printer
                                    form.unassigned = false;

                                    if (
                                        (assignments[j].printerName === printerName) &&
                                        ( form.category === canonical )
                                    ) {
                                        //console.log( 'add in ' + printerName + ' column ' + printerName + ' d: ' + defaultPrinter + ': ', form.title.de );
                                        //console.log( 'assignment: ', assignments[j] );
                                        matchforms.push( form );
                                    }
                                }
                            }

                            if ( form.unassigned && printerName === defaultPrinter && form.category === canonical ) {
                                if ( passesFilter( form ) ) {
                                    matchforms.push( form );
                                }
                            }

                        }

                        return matchforms;
                    }

                    function passesFilter( form ) {
                        if ( '' === self._useFilter ) { return true; }
                        if ( -1 !== form.title.de.toLowerCase().indexOf( self._useFilter ) ) { return true; }
                        if ( -1 !== form.title.en.toLowerCase().indexOf( self._useFilter ) ) { return true; }
                        if ( -1 !== form.category.toLowerCase().indexOf( self._useFilter ) ) { return true; }
                        return false;
                    }

                    //window.setTimeout( function() { self._makeAllSortable(); }, 30 );
                    return cols;
                } );


            },

            _initFilter: function() {
                var self = this;
                self.filterString.subscribe( onFilterChanged );
                function onFilterChanged( newValue ) {
                    Y.log( 'Filtering form names: ' + newValue, 'debug', NAME );
                    self._useFilter = newValue.trim().toLowerCase();
                    self.randomReset( self.randomReset() + 1 );
                }
            },

            destructor: function() {
                var self = this;
                self.users.dispose();
                self.users = null;
                self.currentUser.dispose();
                self.currentUser = null;

                self.currentLocation.dispose();
                self.currentLocation = null;
                self.locations.dispose();
                self.locations = null;

                self.tableCols.dispose();
                self.tableCols = null;
            },

            /**
             *  Load all data needed by this view
             *  @param callback
             *  @private
             */

            _loadAllData: function( callback ) {
                var self = this;

                async.series(
                    [
                        function(itcb) { self._loadLocations(itcb); },
                        function(itcb) { self._loadIdentities(itcb); },
                        function(itcb) { self._loadFormCats(itcb); },
                        function(itcb) { self._loadFormList(itcb); },
                        function(itcb) { self._loadPrinters(itcb); },
                        function(itcb) { self._loadAssignments(itcb); }
                    ],
                    onAllDone
                );

                function onAllDone( err ) {
                    if ( err ) {
                        Y.log( 'Error initializing view: ' + JSON.stringify( err ) );
                        //alert( 'Error initializing view: ' + JSON.stringify( err ) );
                        return callback( err );
                    }
                    callback( null );
                }

            },

            _loadLocations: function( callback ) {
                var self = this;
                function onLocationsLoaded(err, result ) {
                    if ( err ) { return callback( err ); }

                    var
                        allLocations = result.data ? result.data : result,
                        i;

                    //  sets name of default location
                    for ( i = 0; i < allLocations.length; i++ ) {
                        if ( allLocations[i]._id === DEFAULT_LOCATION_ID ) {
                            self.currentLocation( allLocations[i] );
                        }
                        if ( !allLocations[i].locname ) { allLocations[i].locname = '(untitled)'; }
                    }

                    self.locations( allLocations );
                    callback( null );
                }
                //  TODO: limit just to _id, locname and printers field
                Y.doccirrus.comctl.privateGet( '/1/location/', {}, onLocationsLoaded );
            },

            _loadFormCats: function( callback ) {
                var
                    self = this,
                    i;

                self._formCats = JSON.parse( JSON.stringify( Y.dcforms.categories ) );

                for (i = 0; i < self._formCats.length; i++) {
                    self._formCats[i].canonicalClean = self._formCats[i].canonical.replace(' ', '-');
                }

                callback( null );
            },

            _loadFormList: function( callback ) {
                var self = this;

                //  Load list of forms
                Y.dcforms.getFormList('', true, onFormsLoaded);

                function onFormsLoaded(err, result) {
                    if ( err ) { return callback( err ); }

                    self._forms = result;
                    //alert(JSON.stringify(forms));

                    var i;
                    for (i = 0; i < self._forms.length; i++) {
                        if ( self._forms[i].category) {
                            self._forms[i].category = self._forms[i].category.replace(' ', '-');

                            if ('Archiv' === self._forms[i].category) {
                                self._forms[i].category = 'Hidden';
                            }
                        }
                    }

                    callback( err );
                }
            },

            _loadIdentities: function( callback ) {
                var self = this;

                Y.doccirrus.comctl.privateGet( '/1/identity/', { }, onIdentitiesLoaded );

                function onIdentitiesLoaded( err, response ) {
                    if ( err ) { return callback( err ); }
                    var allUsers = response.data ? response.data : response;
                    allUsers.unshift( self.defaultUser );
                    self.users( allUsers );
                    callback( null );
                }
            },

            _loadPrinters: function( callback ) {
                var self = this;
                function onPrintersLoaded(err) {
                    if ( err ) { return callback( err ); }
                    self._printers = Y.dcforms.getPrinterList();
                    callback( null );
                }
                Y.dcforms.loadPrinterList( onPrintersLoaded );
            },

            _loadAssignments: function( callback ) {
                var self = this;
                //  Load user printer mappings
                Y.doccirrus.comctl.privateGet( '/1/formprinter/', { }, onAssignmentsLoaded );
                function onAssignmentsLoaded( err, result ) {
                    if ( err ) { return callback( err ); }
                    self._assignments = result.data ? result.data : result;
                    callback( null );
                }
            },

            //  Called by data bindings

            _getLocName: function( location ) {
                return location.locname || '(untitled)';
            },

            _getUserName: function( identitiy ) {
                return identitiy.firstname + ' ' + identitiy.lastname;
            },

            _makeAllSortable: function () {
                var
                    self = this,
                    tableCols = self.tableCols(),
                    selector,
                    i, j;

                for ( i = 0; i < tableCols.length; i++ ) {
                    for ( j = 0; j < tableCols[i].formCats.length; j++ ) {
                        selector = '#' + tableCols[i].formCats[j].dragGroup;
                        self._makeSortable( selector );
                    }
                }

            },

            _makeSortable: function( selector ) {
                //$('.form_list_sortable').sortable();
                //$('.form_list_sortable').disableSelection();

                var
                    self = this,
                    adjustment;

                $(selector).sortable({
                    group: 'form_list_sortable',
                    pullPlaceholder: false,
                    tolerance: 10,
                    // animation on drop
                    onDrop: function ($item, container, _super) {
                        var
                            $clonedItem = $('<li/>').css({height: 0}),
                            printer,
                            formId;

                        $item.before($clonedItem);
                        $clonedItem.animate({'height': $item.height()});

                        $item.animate($clonedItem.position(), function () {
                            $clonedItem.detach();
                            _super($item, container);
                        });

                        printer = getPrinterName( container.el[0] );
                        formId = $( $item ).attr( 'dcformid' );

                        self._assignFormToPrinter( formId, printer );

                        Y.log( 'Assigning form ' + formId + ' to printer ' + printer, 'debug', NAME );
                        //console.log('drop', $item, container);
                    },

                    // set $item relative to cursor position
                    onDragStart: function ($item, container, _super) {
                        var offset = $item.offset(),
                            pointer = container.rootGroup.pointer;

                        adjustment = {
                            left: pointer.left - offset.left,
                            top: pointer.top - offset.top
                        };

                        _super($item, container);
                    },
                    onDrag: function ($item, position) {
                        $item.css({
                            left: position.left - adjustment.left,
                            top: position.top - adjustment.top
                        });
                    }
                });

                /*
                $(selector).sortable({
                    connectWith: ".form_list_sortable"
                }).disableSelection();
                */

                function getPrinterName( $el ) {

                    // dropped somewhere other than a printer
                    if ( !$el.parentElement || $el.parentElement === $el ) { return null; }

                    var printerAttr = $( $el ).attr( 'dcprintername' );
                    if ( printerAttr && '' !== printerAttr ) {
                        return printerAttr;
                    }
                    return getPrinterName( $el.parentElement );
                }
            },

            _onFormClick: function( self, formId, formTitle ) {

                Y.doccirrus.modals.assignFormPrinter.show( {
                    'userId': self.currentUser()._id,
                    'locationId': self.currentLocation()._id,
                    'formId': formId,
                    'formTitle': formTitle,
                    'printers': self.currentLocation().enabledPrinters,
                    'onAssigned': onFormAssigned
                } );

                function onFormAssigned() {
                    self._loadAssignments( onReloaded );
                    function onReloaded( err ) {
                        if ( err ) {
                            Y.log( 'Problem reloading assignments: ' + JSON.stringify( err ), 'warn', NAME );
                            return;
                        }

                        //  causes the UI to be redrawn with new assignments
                        self.randomReset( self.randomReset() + 1 );
                    }
                }

            },

            _assignFormToPrinter: function( formId, printerName ) {
                Y.log( 'Unused until drag-dop is fixed: ' + formId + ' ' + printerName, 'debug', NAME );
            }

        } );//-0--------------------------------------


        /**
         * Constructor for the FormEditorMojitBinderFormPrinters class.
         *
         * @class FormEditorMojitBinderForms
         * @constructor
         */

        Y.namespace( 'mojito.binders' )[NAME] = {

            /**
             *  Binder initialization method, invoked after all binders on the page
             *  have been constructed.
             */

            init: function( mojitProxy ) {
                this.mojitProxy = mojitProxy;
            },

            /**
             *  The binder method, invoked to allow the mojit to attach DOM event
             *  handlers.
             *
             *  @param node {Node} The DOM node to which this mojit is attached.
             */

            bind: function( node ) {

                Y.doccirrus.NavBarHeader.setActiveEntry( 'drop-admin' );
                this.node = node;

                this.mfpViewModel = new ManageFormprintersViewModel( {} );
                ko.applyBindings( this.mfpViewModel, this.node.getDOMNode() );

            }

        };

    },
    '0.0.1',
    {
        requires: [
            'NavBarHeader',
            'dcinfrastructs',
            'dc-comctl',
            'dcmedia',
            'dcforms-utils',
            'dcforms-categories',

            'node-event-simulate',
            'DCWindow',

            'event-mouseenter',
            'mojito-client',
            'intl',
            'mojito-intl-addon',
            'mojito-rest-lib',

            'assignformprinter-modal'
        ]
    }
);