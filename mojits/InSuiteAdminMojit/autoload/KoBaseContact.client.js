/**
 * User: do
 * Date: 07/09/15  20:28
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*eslint prefer-template:0, strict:0 */
/*global YUI, ko, $, async */
'use strict';
YUI.add( 'KoBaseContact', function( Y, NAME ) {

    /**
     * Widget to select basecontacts via select2. Selected basecontacts can be edited in a modal window.
     * New basecontacts can also created in a modal window.
     *
     * @module KoBaseContact
     */
    Y.namespace( 'doccirrus.uam' ).KoBaseContact = KoBaseContact;

    var
        cid = 0,
        i18n = Y.doccirrus.i18n,
        catchUnhandled = Y.doccirrus.promise.catchUnhandled,
        KoViewModel = Y.doccirrus.KoViewModel,
        PhysicianBaseContactModel = KoViewModel.getConstructor( 'PhysicianBaseContactModel' ),
        InstitutionBaseContactModel = KoViewModel.getConstructor( 'InstitutionBaseContactModel' ),
        DEFAULT_LOCATION = '000000000000000000000001',

        peek = ko.utils.peekObservable,

        NOOP = function() {

        },
        extend = function( target, source ) {
            var i;
            for( i in source ) {
                if( source.hasOwnProperty( i ) ) {
                    target[i] = source[i];
                }
            }
        },
        defaults = {
            type: null,
            onSelect: NOOP
        };

    function select2Mapper( item ) {
        var text = item.content;
        if( item.officialNo ){
            text += ' ' + item.officialNo;
        }
        return {
            id: item._id,
            text: text,
            data: item
        };
    }

    function getSpecialities() {
        return Promise.resolve( Y.doccirrus.jsonrpc.api.kbv.fachgruppe() ).then( function( response ) {
            return (response && response.data && response.data[0].kvValue || []).map( function( entry ) {
                return {id: entry.key, text: entry.value};
            } );
        } );
    }

    function showWarnings( response ) {
        var
            warnings = Y.doccirrus.errorTable.getWarningsFromResponse( response );

        if( warnings.length ) {
            Y.Array.invoke( warnings, 'display' );
        }

        return response && response.data || null;

    }

    function saved() {
        Y.doccirrus.DCSystemMessages.addMessage( {
            messageId: 'KoBaseContact-saved',
            content: i18n( 'general.message.CHANGES_SAVED' )
        } );
    }

    function fail( response ) {
        var
            errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

        if( errors.length ) {
            Y.Array.invoke( errors, 'display' );
        }

    }

    /**
     * Widget constructor
     *
     * @param   {Object}    options
     * @param   {String}    options.type            basecontact type
     * @param   {String}    options.subType         see basecontact-schema
     * @param   {String}    options.initialValue    id of basecontact that should be selected on instantiation
     * @param   {Function}  options.onSelect        function that will be called with id of selected basecontact
     * @constructor
     */
    function KoBaseContact( options ) {
        var self = this,
            initialValue;

        self.options = {
            readOnly: false
        };

        self.cid = 'KoBaseContact_' + (++cid);
        extend( self.options, defaults );

        if( options ) {
            extend( this.options, options );
        }

        initialValue = self.options.initialValue;

        self.value = ko.observable( initialValue );
        self.nameText = ko.observable( '' );
        self.triggerValueChange = ko.observable();
        self.readOnly = ko.observable( this.options.readOnly );

        if( options.label ){
            self.label = options.label;
        } else if( this.options.type ) {
            self.label = Y.doccirrus.schemaloader.translateEnumValue(
                '-de',
                self.options.type,
                Y.doccirrus.schemas.basecontact.types.BaseContactType_E.list,
                self.options.type
            );
        } else {
            this.label = i18n( 'InSuiteAdminMojit.tab_contacts.contact' );
        }

        self.value.subscribe( this.options.onSelect );

        self.isEditable = ko.computed( function() {
            var value = self.value();
            return Boolean( value );
        } );

        self.canPrintEnvelope = ko.computed( function() {
            var value = self.value();
            return Boolean( value );
        } );

        self.contactType = ko.observable( self.options.type );

        self.createContactMenuDisabled = ko.computed( function() {
            return ( self.contactType() ) ? true : false;
        } );

        self.createContactMenuVisible = ko.computed( function() {
            return !self.createContactMenuDisabled();
        } );

        self.createContact = function( evt ) {
            if ( !evt || !evt.id ) { return; }
            //self.contactType( evt.id );   //  allowing change of types for now
            self.options.type = evt.id;
            self.create();
        };

        self.baseContactTypes = ko.computed( function() {
            var
                disallowTypes = [ 'PRACTICE', 'CLINIC', 'PHARMACY', 'CARE', 'TRANSPORT', 'VENDOR', 'OTHER', 'SUPPORT' ],
                baseContactTypes = Y.doccirrus.schemas.basecontact.types.BaseContactType_E.list,
                uiBaseContactTypes = baseContactTypes.filter( checkTypeAllowed ).map( formatForMenu );

            function checkTypeAllowed( entry ) {
                return ( -1 === disallowTypes.indexOf( entry.val ) )? true : false;
            }

            function formatForMenu( entry ) {
                if( 'PHYSICIAN' === entry.val ){
                    return {id: entry.val, text: entry['-de'], style: {'border-top': '1px solid black'}};
                } else {
                    return {id: entry.val, text: entry['-de'], style: {}};
                }

            }

            return uiBaseContactTypes;
        } );

        self.select2Config = {
            val: ko.computed( {
                read: function() {
                    var
                        value = self.value.peek();
                    ko.unwrap( self.triggerValueChange );
                    return value;
                },
                write: function( $event ) {
                    self.value( $event.val );
                    self.nameText( ($event.added && $event.added.text) || '' );
                    if( !$event.val ) {
                        self.triggerValueChange.valueHasMutated();
                    }
                }
            } ),
            select2: {
                width: '100%',
                allowClear: true,
                placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                initSelection: function( element, callback ) {
                    var
                        value = peek( self.value );

                    if( !value ) {
                        return callback();
                    }

                    Y.doccirrus.jsonrpc.api.basecontact.read( {
                        query: {
                            _id: value
                        }
                    } ).done( function( response ) {
                        var data = response.data;
                        if( !data || !data.length ) {
                            Y.doccirrus.DCWindow.notice( {
                                message: i18n( 'InSuiteAdminMojit.tab_contacts.detail.message.NOT_FOUND' )
                            } );
                            return;
                        }

                        callback( select2Mapper( data[0] ) );
                    } ).fail( fail );

                },
                query: function( query ) {
                    var
                        data = {results: []},
                        rpcQuery = {};

                    function done( response ) {

                        var entries = response.data, results;

                        if( entries ) {
                            results = entries.map( select2Mapper );
                            data.results = results;
                        }

                        query.callback( data );
                    }

                    if( query.term ) {

                        query.term = query.term.replace(/\+|\*|\?|\^|\\|\$|\)|\[|\(|\|/gi, '.');

                        if( query.term.match( /^\d+$/ ) ) {
                            rpcQuery.officialNo = {iregex: query.term};
                        } else {
                            rpcQuery.content = {iregex: query.term};
                        }

                        if( self.options.type ) {
                            rpcQuery.baseContactType = self.options.type;
                        }
                        if( self.options.subType ) {
                            rpcQuery.institutionType = self.options.subType;
                        }

                        Y.doccirrus.jsonrpc.api.basecontact.read( {
                            query: rpcQuery
                        } ).done( done ).fail( fail );

                    } else {
                        query.callback( data );
                    }
                }
            }
        };

    }

    KoBaseContact.prototype.setDataById = function( id ) {
        var self = this;
        if( !id ) {
            Y.log( 'KoBaseContact.prototype.setDataById missing argument "id"', 'error', NAME );
            return;
        }
        Y.doccirrus.jsonrpc.api.basecontact.read( {
            query: {
                _id: id
            }
        } ).done( function( response ) {
            var data = response.data;
            if( !data || !data.length ) {
                Y.doccirrus.DCWindow.notice( {
                    message: i18n( 'InSuiteAdminMojit.tab_contacts.detail.message.NOT_FOUND' )
                } );
                return;
            }
            $( '#' + self.cid ).select2( 'data', select2Mapper( data[0] ) );
            self.value( id );
            self.nameText( data[0].content );

        } ).fail( fail );

    };

    KoBaseContact.prototype.create = function() {
        var self = this,
            type = self.options.type,
            subType = self.options.subType;

        function done( result ) {
            if( 'canceled' === result.status ) {
                return;
            }

            function changeSelection( data ) {
                if( data && data.length ) {
                    self.setDataById( data[0] );
                }
            }

            Y.doccirrus.jsonrpc.api.basecontact
                .create( {
                    data: result.data
                } )
                .then( showWarnings )
                .then( changeSelection )
                .done( saved )
                .fail( fail );
        }

        if( !type ) {
            // show type selection tbd
            throw Error( 'KoBaseContact: creation without type is not implemented yet!' );
        }

        self.openEditModal( { contact: { baseContactType: type, institutionType: subType } }, done );
    };

    KoBaseContact.prototype.edit = function() {
        var self = this;

        function done( result ) {

            function updated( data ) {
                self.setDataById( data._id );
            }

            if( 'canceled' === result.status ) {
                return;
            }

            result.data.fields_ = Object.keys( result.data );
            Y.doccirrus.jsonrpc.api.basecontact
                .update( {
                    query: {_id: result.data._id},
                    data: result.data
                } )
                .then( showWarnings )
                .then( updated )
                .done( saved )
                .fail( fail );
        }

        Y.doccirrus.jsonrpc.api.basecontact.getFullContactData( {
            query: {
                _id: self.value.peek()
            }
        } ).done( function( response ) {
            var data = response.data;
            if( !data.contact ) {
                Y.doccirrus.DCWindow.notice( {
                    message: i18n( 'InSuiteAdminMojit.tab_contacts.detail.message.NOT_FOUND' )
                } );
                return;
            }

            self.openEditModal( data, done );
        } ).fail( fail );

    };

    KoBaseContact.prototype.printEnvelopeC6 = function() { this.printEnvelope( 'c6' ); };
    KoBaseContact.prototype.printEnvelopeC5 = function() { this.printEnvelope( 'c5' ); };
    KoBaseContact.prototype.printEnvelopeC4 = function() { this.printEnvelope( 'c4' ); };
    KoBaseContact.prototype.printEnvelopeDL = function() { this.printEnvelope( 'dl' ); };

    KoBaseContact.prototype.printEnvelope = function( envelopeSize ) {
        var
            self = this,
            employeeProfile,

            formData = {
                senderName: '',
                senderAddress: '',
                senderTalk: '',
                patientName: '',
                postAddress: '',
                patientTalk: ''
            };

        async.series( [ readBaseContact, getEmployeeProfile, getCurrentLocation ], onAllDone );

        function readBaseContact( itcb ) {
            Y.doccirrus.jsonrpc.api.basecontact
                .read( { query: { _id: peek( self.value ) } } )
                .done( onBaseContactSuccess )
                .fail( itcb );

            function onBaseContactSuccess( response ) {
                var
                    data = ( response.data && response.data[0] ? response.data[0] : null ),
                    tempAddress,
                    i;

                //  should never happen
                if( !data ) { return; }
                
                //  get contact name
                formData.patientName = data.title + ' ' + data.firstname + ' ' + data.lastname;
                formData.patientName = formData.patientName.trim().replace( '  ', ' ' );

                //formData.patientTalk = data.talk;
                formData.patientTalk = Y.doccirrus.schemaloader.translateEnumValue( '-de', data.talk, Y.doccirrus.schemas.person.types.Talk_E.list, 'k.A.' );

                //  Special case, German grammatical rule changes the salutation of the receipient, MOJ-8830
                //  see: https://www.rocketlanguages.com/forum/german-grammar/difference-between-herr-and-herrn-in-german/
                formData.patientTalk = formData.patientTalk.replace( 'Herr', 'Herrn' );

                //  get contact address, prefer BILLING, then OFFICIAL address
                for ( i = 0; i < data.addresses.length; i++ ) {
                    if ( data.addresses[i].kind === 'OFFICIAL' && !tempAddress ) { tempAddress = data.addresses[i]; }
                    if ( data.addresses[i].kind === 'BILLING' ) { tempAddress = data.addresses[i]; }
                }

                if ( tempAddress ) {
                    formData.postAddress = '' +
                        ( tempAddress.street || '' ) + ' ' + ( tempAddress.houseno || '' ) + '<br/>' +
                        ( tempAddress.zip || '' ) + ' ' + ( tempAddress.city || '' );
                }

                itcb( null );
            }
        }

        function getEmployeeProfile( itcb ) {
            Y.doccirrus.jsonrpc.api.employee
                .getEmployeeForUsername( { username: Y.doccirrus.auth.getUserId() }  )
                .done( onEmployeeProfileSuccess )
                .fail( itcb  );

            function onEmployeeProfileSuccess( response ) {
                employeeProfile = response && response.data ? response.data : {};
                formData.senderName = employeeProfile.firstname + ' ' + employeeProfile.lastname;
                formData.senderTalk = employeeProfile.talk;
                formData.senderTalk = Y.doccirrus.schemaloader.translateEnumValue( '-de', employeeProfile.talk, Y.doccirrus.schemas.person.types.Talk_E.list, 'k.A.' );
                if ( employeeProfile && !employeeProfile.currentLocation ) {
                    if ( employeeProfile.locations && 1 === employeeProfile.locations.length ) {
                        Y.log( 'Employee has only a single location, setting as current location.', 'debug', NAME );
                        employeeProfile.currentLocation = employeeProfile.locations[0]._id;
                    } else {
                        employeeProfile.currentLocation = DEFAULT_LOCATION;
                    }
                }
                itcb( null );
            }
        }

        function getCurrentLocation( itcb ) {
            var
                hasNoLocation = (
                    !employeeProfile ||
                    !employeeProfile.locations ||
                    0 === employeeProfile.locations.length ||
                    !employeeProfile.currentLocation ||
                    '' === employeeProfile.currentLocation
                );

            if ( hasNoLocation ) {
                Y.doccirrus.DCWindow.notice( {
                    type: 'info',
                    message: i18n('FormEditorMojit.formprinters.notice.NO_LOCATION'),
                    window: {
                        buttons: {
                            footer: [
                                {
                                    label: i18n( 'KoUI.KoPrintButton.NO_LOCATIONS' ),
                                    name: 'CONFIGURE_PRINTERS',
                                    action: function () {
                                        window.location = '/admin/insuite#/location';
                                    }
                                }
                            ]
                        }
                    }
                } );

                return itcb( 'Could not find current location for sender address.' );
            }

            Y.doccirrus.jsonrpc.api.location
                .read( { query: { _id: employeeProfile.currentLocation }  } )
                .then( onLocationSuccess )
                .fail( itcb  );

            function onLocationSuccess( response ) {
                var currentLocation = response && response.data && response.data[0] ? response.data[0] : response;

                if ( !currentLocation || !currentLocation._id ) { return itcb( 'Could not load current location.' ); }

                //  TODO: standard utility for serializing addresses

                formData.senderAddress = '' +
                    ( currentLocation.addon ? currentLocation.addon + '\n' : '') +
                    currentLocation.street + ' ' +
                    currentLocation.houseno + '\n' +
                    currentLocation.zip + ' ' +
                    currentLocation.city;

                itcb( null );
            }
        }

        function onAllDone( err ) {
            if ( err ) {
                Y.log( 'Could not get data for envelope: ' + JSON.stringify( err ), 'warn', NAME );
                return;
            }

            Y.doccirrus.modals.envelope.show( {
                formRole: 'envelope-' + envelopeSize,
                sizeLabel: envelopeSize.toUpperCase(),
                formData: formData
            } );
        }
    };

    KoBaseContact.prototype.setNewValue = function( value ) {
        var self = this;
        self.value( value );
        self.triggerValueChange.valueHasMutated();
    };

    KoBaseContact.prototype.openEditModal = function( data, callback ) {
        var
            model;

        getSpecialities().then( function( specialitiesList ) {
            if( Y.doccirrus.schemas.basecontact.baseContactTypes.INSTITUTION === data.contact.baseContactType ) {
                model = new InstitutionBaseContactModel( {
                    data: data.contact,
                    contactsObj: data.contactsObj,
                    specialitiesList: specialitiesList
                } );
            } else {
                model = new PhysicianBaseContactModel( {
                    data: data.contact,
                    contactsObj: data.contactsObj,
                    specialitiesList: specialitiesList
                } );
            }

            return Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                .renderFile( {path: 'InSuiteAdminMojit/views/contact_detail'} )
            )
                .then( function( response ) {
                    return response && response.data;
                } )
                .then( function( template ) {
                    var
                        bodyContent = Y.Node.create( template ),
                        modal;
                    modal = new Y.doccirrus.DCWindow( {
                            className: 'DCWindow-edit_basecontact',
                            bodyContent: bodyContent,
                            title: i18n( 'audit-schema.ModelMeta_E.contact' ),
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            width: (window.innerWidth * 95) / 100,
                            height: (window.innerHeight * 93) / 100,
                            minHeight: 600,
                            minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                            centered: true,
                            modal: true,
                            dragable: true,
                            maximizable: true,
                            resizeable: true,
                            render: document.body,
                            focusOn: [],
                            buttons: {
                                header: ['close', 'maximize'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                        action: function() {
                                            modal.close();
                                            callback( {status: 'canceled'} );
                                        }
                                    } ),
                                    Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                        isDefault: true,
                                        action: function() {
                                            modal.close();
                                            callback( {status: 'saved', data: model.toJSON()} );
                                        }
                                    } )
                                ]
                            }
                        }
                    );
                    ko.applyBindings( model, bodyContent.getDOMNode() );
                } );

        } ).catch( catchUnhandled );
    };

}, '0.0.1', {
    requires: [
        'basecontact-schema',
        'v_therapistcontact-schema',
        'v_physician-schema',
        'BaseContactModel',
        'PhysicianBaseContactModel',
        'InstitutionBaseContactModel',
        'dcerrortable',
        'AddressModel'
    ]
} );
