/**
 * User: do
 * Date: 02/03/15  15:11
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/*global YUI, ko, _, $ */

'use strict';

YUI.add( 'cdpartnereditmodal', function( Y ) {

        var
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager,
            KoViewModel = Y.doccirrus.KoViewModel,
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,
            i18n = Y.doccirrus.i18n,
            CANCEL = i18n( 'general.button.CANCEL' ),
            SAVE = i18n( 'general.button.SAVE' ),
            SEND = i18n( 'UserMgmtMojit.partner_invitation_modal.SEND' ),
            DEFAULT_CONFIGURATION = [ {
                '_id': '000000000000000000000001',
                'automaticProcessing': false,
                'subTypes': [],
                'caseFolders': [ 'ALL' ],
                'condition': '',
                'actStatuses': [ 'APPROVED' ],
                'actTypes': [ 'ALL' ]
            } ];

        function showError( errors ) {

            if( errors && errors[0] ) {
                Y.Array.invoke( errors, 'display', 'error' );
            } else {
                Y.doccirrus.DCWindow.notice( {
                    message: 'Ein Fehler ist aufgetreten.'
                } );
            }
        }

        // customise partner model
        function getMyVM() {
            var
                myVM = new Y.doccirrus.uam.PartnerModel( {
                    pin: '12345678', // just for validation
                    name: '?',
                    phone: '?',
                    dcId: '?'
                } ),
                $myTextArea = $( '#emailText' ),
                text, pos,
                myOption = {val: null, "i18n": i18n( 'general.message.PLEASE_SELECT' ) },
                PART1 = i18n( 'UserMgmtMojit.partner_invitation_modal.TEMPLATE_TEXT_PART1' ),
                PART2 = i18n( 'UserMgmtMojit.partner_invitation_modal.TEMPLATE_TEXT_PART2' );

            myVM._partnerTypeList = [myOption].concat( myVM._partnerTypeList );
            text = PART1 + '\n' + '                              <PIN>' + '\n' + PART2 + ' ';
            text = Y.Lang.sub( text, {fullName: Y.doccirrus.auth.getUserName()} );
            myVM.content = ko.observable( text );

            Y.doccirrus.ajax.send( {
                type: 'GET',
                xhrFields: { withCredentials: true },
                url: Y.doccirrus.infras.getPrivateURL( '/1/practice' ),
                success: function( body ) {
                    var
                        myPractice = body && body.data && body.data[0];
                    myVM.content( Y.Lang.sub( myVM.content(), {coName: myPractice.coname} ) );
                }
            } );

            // prevent user from removing the placeholder
            myVM.content.subscribe( function( val ) {
                if( /<PIN>/.test( val ) ) {
                    text = val;
                } else { // undo the last change and restore cursor position
                    pos = $myTextArea.prop( "selectionStart" );
                    myVM.content( text );
                    $myTextArea.prop( "selectionStart", pos - 1 );
                    $myTextArea.prop( "selectionEnd", pos - 1 );
                }
            } );

            return myVM;
        }

        function loadPartnerData( partnerModel, editableTable ) {
            Y.doccirrus.ajax.send( {
                type: 'POST',
                xhrFields: { withCredentials: true },
                url: Y.doccirrus.infras.getPrivateURL( '/1/partner/:getPartnerDetails' ),
                data: {pin: partnerModel.pin()},
                success: function( body ) {
                    var
                        errors = Y.doccirrus.errorTable.getErrorsFromResponse( body ),
                        data = body.data,
                        licensed;

                    if( errors && errors[0] ) {
                        Y.Array.invoke( errors, 'display', 'error' );
                        return;
                    }
                    if( data && data.fingerprint ) {
                        partnerModel.name( data.name );
                        partnerModel.dcId( data.dcId );
                        partnerModel.phone( data.phone );
                        partnerModel.email( data.email );
                        partnerModel.city( data.city );
                        partnerModel.publicKey( data.publicKey );
                        partnerModel.fingerprint( data.fingerprint );
                        partnerModel.verified( true );
                        partnerModel.signature( false );
                        partnerModel.configuration( data.configuration );
                        partnerModel.bidirectional( data.bidirectional );
                        partnerModel.anonymizing( data.anonymizing );
                        partnerModel.anonymizeKeepFields( data.anonymizeKeepFields );
                        partnerModel.pseudonym( data.pseudonym );
                        partnerModel.unlock( data.unlock );
                        partnerModel.preserveCaseFolder( data.preserveCaseFolder );
                        partnerModel.partnerConfiguration = data.configuration;
                        partnerModel.showChooseButtons( Boolean( data.configuration && data.configuration.length ) );

                        if(editableTable && editableTable.componentConfig && 'function' === typeof editableTable.componentConfig.data){
                            licensed = peek( partnerModel.licensed );
                            editableTable.componentConfig.data( (Y.clone(data.configuration) || []).map( function( el ){
                                el.licensed = licensed;
                                return el;
                            }) );
                        }
                    }
                },
                error: function( err ) {
                    Y.log( 'error from getByPin' + err, 'error' );
                }
            } );
        }

        function createModal( partnerModel, tableObj, saveCb, editMode, inviteMode, callback ) {
            var
                node = Y.Node.create( '<div></div>' ),
                myModal,
                configurationI18n,
                myData,
                rows;

            YUI.dcJadeRepository.loadNodeFromTemplate(
                'partner_edit_modal',
                'UserMgmtMojit',
                {},
                node,
                function() {
                    myModal = new Y.doccirrus.DCWindow( {
                        id: 'partner_edit_modal',
                        className: 'DCWindow-Partner-Edit',
                        bodyContent: node,
                        title: inviteMode ? i18n( 'UserMgmtMojit.partner_invitation_modal.TITLE' ) : i18n( 'UserMgmtMojit.partner_edit_modal.TITLE' ),
                        icon: inviteMode ? null : 'glyphicon glyphicon-' + (editMode ? 'pencil' : 'plus'),
                        centered: true,
                        width: '60%',
                        focusOn: [],
                        modal: true,
                        dragable: true,
                        maximizable: true,
                        resizeable: true,
                        render: document.body,
                        buttons: {
                            header: ['close', 'maximize'],
                            footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                        label: CANCEL
                                    } ),
                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    name: "save",
                                    isDefault: true,
                                    label: inviteMode ? SEND : SAVE,
                                    action: function() {
                                        rows = unwrap( tableObj.rows );
                                        partnerModel.configuration( [] );
                                        (rows || []).forEach( function(row){
                                            partnerModel.configuration.push( row.toJSON() );
                                        });

                                        if(inviteMode){
                                            myData = Y.mix( {
                                                content: partnerModel.content(),
                                                configuration: partnerModel.configuration(),
                                                anonymizing: partnerModel.anonymizing(),
                                                preserveCaseFolder: partnerModel.preserveCaseFolder(),
                                                bidirectional: partnerModel.bidirectional(),
                                                anonymizeKeepFields: partnerModel.anonymizeKeepFields(),
                                                pseudonym: partnerModel.pseudonym(),
                                                unlock: partnerModel.unlock()
                                            }, ko.toJS( partnerModel._getBoilerplateFields() ) );

                                            myData.content = myData.content.replace( /\n/g, '</br>' ); // replace line breaks with html breaks
                                            Y.doccirrus.jsonrpc.api.partner.sendInvitation( {
                                                data: myData
                                            } )
                                            .done( function() {
                                                saveCb();
                                                myModal.close();
                                            } )
                                            .fail( function( error ) {
                                                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                            } );
                                        } else {
                                            if( 'UNCONFIRMED' === partnerModel.status() ) {
                                                if( partnerModel.signature() ) {
                                                    partnerModel.status( 'CONFIRMED' );
                                                } else {
                                                    return;
                                                }
                                            }

                                            partnerModel._save( null, function( response ) {
                                                var
                                                    errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

                                                this.close();
                                                if( errors && errors.length ) {
                                                    showError( errors );
                                                } else {
                                                    saveCb();
                                                }
                                            }.bind( this ), function() {
                                                this.close();
                                                showError();
                                            } );
                                        }
                                    }
                                } )
                            ]
                        },
                        after: {
                            visibleChange: function( yEvent ) {
                                if( !yEvent.newVal ) {
                                    tableObj.removeAllRows();
                                    tableObj.dispose();
                                }
                            }
                        }
                    } );

                    partnerModel.pinI18n = i18n( 'partner-schema.Partner_T.PIN' );
                    partnerModel.verifyPinI18n = i18n( 'UserMgmtMojit.partner_edit_modal.VERIFY_PIN' );
                    partnerModel.nameI18n = i18n('partner-schema.Partner_T.NAME');
                    partnerModel.dcidI18n = i18n( 'partner-schema.Partner_T.DCID' );
                    partnerModel.partnerTypeI18n = i18n( 'partner-schema.PartnerType_E.i18n' );
                    partnerModel.commentI18n = i18n( 'partner-schema.Partner_T.COMMENT' );
                    partnerModel.telI18n = i18n( 'UserMgmtMojit.partner_edit_modal.TEL' );
                    partnerModel.emailI18n = i18n( 'UserMgmtMojit.partner_edit_modal.EMAIL' );
                    partnerModel.emailI18nIvite = i18n('UserMgmtMojit.partner_invitation_modal.EMAIL');
                    partnerModel.keyI18n = i18n( 'partner-schema.Partner_T.KEY' );
                    partnerModel.noticeI18n = i18n( 'UserMgmtMojit.partner_edit_modal.NOTICE' );
                    partnerModel.configurationI18n = i18n( 'UserMgmtMojit.partner_edit_modal.CONFIG' );
                    partnerModel.systemTypeI18n = i18n( 'partner-schema.Partner_T.systemType.i18n' );
                    partnerModel.statusI18n = i18n( 'partner-schema.Partner_T.status.i18n' );
                    configurationI18n = i18n( 'partner-schema.Partner_T.configuration.i18n' );
                    partnerModel.emailPHI18n = i18n('UserMgmtMojit.partner_invitation_modal.EMAIL_PH');
                    partnerModel.textI18n = i18n('UserMgmtMojit.partner_invitation_modal.TEXT');

                    partnerModel.chooseConfigurationsI18n = '';
                    partnerModel.useDefaultI18n = i18n('UserMgmtMojit.partner_invitation_modal.DEFAULT');
                    partnerModel.usePartnersI18n = i18n('UserMgmtMojit.partner_invitation_modal.PARTNER');
                    var localLicensed = peek( partnerModel.licensed );
                    partnerModel.useDefault = function(){
                        tableObj.data( Y.clone( DEFAULT_CONFIGURATION ).map( function( el ){
                            el.licensed = localLicensed;
                            return el;
                        }) );
                    };
                    partnerModel.usePartners = function(){
                        tableObj.data( Y.clone( partnerModel.partnerConfiguration ).map( function( el ){
                            el.licensed = localLicensed;
                            return el;
                        }) );
                    };
                    partnerModel.showAnonymizeSettings = function(){
                        var pseudonym = partnerModel.pseudonym(),
                            dcid = peek(partnerModel.dcId);

                        if( dcid ){
                            dcid = ( dcid === 'INCARE' ) ? 'CareID' : ( dcid === 'DOQUVIDE') ? 'DoquvideID' : ( dcid === 'DQS') ? 'DqsID' : null;
                        }
                        if( peek(partnerModel.status) === 'LICENSED' && dcid ){
                            pseudonym =  [ {pseudonymType: 'careData', pseudonymIdentifier: dcid} ];
                        }

                        Y.doccirrus.modals.anonymizeModal.showDialog( {
                            readOnly: peek( partnerModel.licensed ),
                            anonymizeKeepFields: partnerModel.anonymizeKeepFields(),
                            pseudonym: pseudonym
                        }, function( configuration ){
                            partnerModel.anonymizeKeepFields( configuration.anonymizeKeepFields );
                            partnerModel.pseudonym( configuration.pseudonym );
                        } );
                    };

                    ko.applyBindings( partnerModel, node.getDOMNode().querySelector( '#partner-edit' ) );

                    tableObj.bidirectional = tableObj.addDisposable( ko.computed( function(){
                        return partnerModel.bidirectional();
                    } ) );
                    tableObj.activeActive = tableObj.addDisposable( ko.computed( function(){
                        return partnerModel.activeActive();
                    } ) );
                    ko.applyBindings( {
                        aEditableTable: tableObj,
                        configurationI18n: configurationI18n
                    }, node.getDOMNode().querySelector( '#partner-config-edit' ) );

                    callback( myModal );
                }
            );
        }


        function ConfigViewModel( config ) {
            ConfigViewModel.superclass.constructor.call( this, config );
        }

        Y.extend( ConfigViewModel, KoViewModel.getDisposable(), {
            initializer: function( config ) {
                var
                    self = this,
                    licensed = config && config.licensed || false;

                self._id = config && config._id;
                self.actTypes = ko.observableArray( config && config.actTypes || [] );
                self.actTypes.disabled = licensed;
                self.actTypes.hasError = ko.pureComputed( function() {
                    return !unwrap( self.actTypes ).length;
                } );

                self.actStatuses = ko.observableArray( config && config.actStatuses || [] );
                self.actStatuses.disabled = licensed;
                self.actStatuses.hasError = ko.pureComputed( function() {
                    return !unwrap( self.actStatuses ).length;
                } );

                self.caseFolders = ko.observableArray( config && config.caseFolders || [] );
                self.caseFolders.disabled = licensed;
                self.caseFolders.hasError = ko.pureComputed( function() {
                    return !unwrap( self.caseFolders ).length;
                } );

                self.condition = ko.observable(config && config.condition || "");
                self.condition.disabled = licensed;

                self.automaticProcessing = ko.observable( config && config.automaticProcessing || false );
                self.automaticProcessing.disabled = licensed;
                self.subTypes = ko.observable( (config && config.subTypes || []).join(', ') );

                self.isValid = function() {
                    return !self.actTypes.hasError() && !self.actStatuses.hasError() && !self.caseFolders.hasError();
                };
            },
            destructor: function(){},
            toJSON: function(){
                var
                    self = this;

                return {
                    _id: peek( self._id ),
                    actTypes: peek( self.actTypes ),
                    actStatuses: peek( self.actStatuses ),
                    caseFolders: peek( self.caseFolders ),
                    condition: peek( self.condition ),
                    automaticProcessing: peek( self.automaticProcessing ),
                    subTypes: _.uniq( peek( self.subTypes ).split(',').map( function(el){ return el.trim(); } ).filter( function(el){ return el;} ))
                 };
            }
        } );

        function multiSelectWithAll( propertyName, label, selectList, translationFn, filterFn ){
            var extendedList = selectList.concat({val: 'ALL', i18n: 'Alle'});

            return {
                forPropertyName: propertyName,
                label: label,
                title: label,
                inputField: {
                    componentType: 'KoFieldSelect2',
                    componentConfig: {
                        useSelect2Data: true,
                        select2Read: function( value ) {
                            if( !value ) {
                                return value;
                            } else {
                                return extendedList.filter( 'function' === typeof filterFn ? filterFn : function(){return true; } ).filter( function( el ) {
                                    return value.includes( el.val );
                                } ).map( function( entry ) {
                                    return {
                                        id: entry.val,
                                        text: entry.i18n,
                                        data: entry
                                    };
                                } );
                            }
                        },
                        select2Write: function( $event, observable ) {
                            if( $event.added ) {
                                observable.push( $event.added.id );
                            }
                            if( $event.removed ) {
                                observable.remove( function( item ) {
                                    return item === $event.removed.id;
                                } );
                            }
                        },
                        select2Config: {
                            query: function( options ) {
                                var list = options.element.context.value,
                                    data = extendedList.filter( 'function' === typeof filterFn ? filterFn : function(){return true; } ).filter( function( entry ) {
                                        return options.term === '' || entry.i18n.toLowerCase().indexOf( options.term.toLowerCase() ) > -1;
                                    } ).map( function( entry ) {
                                        return {
                                            id: entry.val,
                                            text: entry.i18n,
                                            disabled: ('ALL' === entry.val && list.length > 0 ) ||
                                                      ('ALL' !== entry.val && _.includes( list, 'ALL' )) || false
                                        };
                                    } );
                                return options.callback( {results: data} );
                            },
                            initSelection: undefined,
                            data: function() {
                                return {
                                    results: extendedList.map( function( item ) {
                                        return {
                                            id: item.val,
                                            text: item.i18n,
                                            data: item,
                                            disabled: false
                                        };
                                    } )
                                };
                            },
                            multiple: true
                        }
                    }
                },
                renderer: function( meta ) {
                    var arr = (meta.row[propertyName]() || []).map( function( el ) {
                        if( 'ALL' === el ) {
                            return 'Alle';
                        }
                        return translationFn(el);
                    } );
                    return arr.join( ', ' );
                }
            };
        }

        function show( data, invitePartner, saveCb ) {

            var
                editMode = Boolean( data ),
                partnerModel,
                configuration,
                configLicensed,
                licensed;


            data = data || {};
            invitePartner  = invitePartner|| false;

            if( invitePartner){
                partnerModel = getMyVM();
                partnerModel.bidirectional( true );
                configuration = DEFAULT_CONFIGURATION;
            } else {
                partnerModel = new Y.doccirrus.uam.PartnerModel( data );
                configuration = (data.configuration || []);
            }

            configLicensed = 'LICENSED' === peek(partnerModel.status);
            licensed =  configLicensed || !Y.doccirrus.auth.hasAdditionalService( 'inTouchPlus' );
            partnerModel.anonymizeKeepFields( data.anonymizeKeepFields );
            partnerModel.pseudonym( data.pseudonym );
            partnerModel.unlock( data.unlock );
            partnerModel.licensed = ko.observable( licensed );
            partnerModel.configuration( configuration.map( function(el){ el.licensed = licensed; return el; } ) );
            partnerModel.invite = ko.observable( invitePartner );

            partnerModel.licensedType = ( 'LICENSED' === peek(partnerModel.status) );

            partnerModel.verified = ko.observable();
            partnerModel.pinVisible = ko.observable();
            partnerModel.signatureVisible = ko.observable();
            partnerModel.signature = ko.observable();
            partnerModel.verified = ko.observable();
            partnerModel.enableBidirectional = ko.computed( function(){
                return partnerModel.verified() && !configLicensed;
            } );

            partnerModel.saveDisabled = ko.observable();

            partnerModel.statusTranslated = ko.pureComputed( function(){
                var status = partnerModel.status();
                return status ? i18n( 'partner-schema.Status_E.' + partnerModel.status() ) : '';
            } );

            if( editMode || invitePartner ) {
                partnerModel.verified( true );
                partnerModel.pinVisible( false );
            } else {
                partnerModel.verified( false );
                partnerModel.pinVisible( true );
            }

            var
                disabledTable = peek( partnerModel.licensed ),
                editableTable = {
                    componentType: 'KoEditableTable',
                    stateId: 'configPartner-KoEditableTable',
                    componentConfig: {
                        ViewModel: ConfigViewModel,
                        data: ko.observableArray( Y.clone(configuration) ),
                        columns: [
                            multiSelectWithAll( 'actTypes', i18n('partner-schema.Partner_T.configuration.actTypes'),
                                Y.doccirrus.schemas.activity.types.Activity_E.list,
                                function( el ) {
                                    return Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', el, 'i18n', '' );
                                }
                            ),
                            multiSelectWithAll( 'actStatuses', i18n('partner-schema.Partner_T.configuration.actStatuses'),
                                Y.doccirrus.schemas.activity.types.ActStatus_E.list,
                                function( el ) {
                                    return Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'ActStatus_E', el, 'i18n', '' );
                                }
                            ),
                            multiSelectWithAll( 'caseFolders', i18n('partner-schema.Partner_T.configuration.caseFolders'),
                                Y.doccirrus.schemas.person.types.Insurance_E.list.concat( Y.doccirrus.schemas.casefolder.types.Additional_E.list ),
                                function( el ) {
                                    return Y.doccirrus.schemaloader.getEnumListTranslation( 'person', 'Insurance_E', el, 'i18n', null ) ||
                                           Y.doccirrus.schemaloader.getEnumListTranslation( 'casefolder', 'Additional_E', el, 'i18n', '' );
                                },
                                function filterList( el ) {
                                    var preserved = unwrap( partnerModel.preserveCaseFolder );
                                    if( true === preserved ){
                                        return  _.includes( Y.doccirrus.schemas.casefolder.types.Additional_E.list, el );
                                    } else {
                                        return true;
                                    }
                                }
                            ),
                            {
                                forPropertyName: 'subTypes',
                                label: i18n('partner-schema.Partner_T.configuration.subTypes'),
                                title: i18n('partner-schema.Partner_T.configuration.subTypes'),
                                inputField: {
                                    componentType: 'KoField',
                                    componentConfig: {
                                        disabled: disabledTable,
                                        placeholder: 'SubType1, SubType2, ...',
                                        fieldType: 'String',
                                        showLabel: false
                                    }
                                },
                                css: {warning: false, 'text-right': true, 'text-warning': false}
                            },
                            {
                                forPropertyName: 'condition',
                                label: i18n('partner-schema.Partner_T.configuration.condition'),
                                title: i18n('partner-schema.Partner_T.configuration.condition'),
                                headerTooltip: i18n( 'UserMgmtMojit.partner_edit_modal.CONDITION_COLUMN_TOOLTIP' ),
                                inputField: {
                                    componentType: 'KoFieldSelect2',
                                    componentConfig: {
                                        useSelect2Data: true,
                                        select2Read: function( value ) {
                                            return {
                                                id: value,
                                                text: Y.doccirrus.schemaloader.getEnumListTranslation( 'partner', 'Condition_E', value, 'i18n', '' )
                                            };
                                        },
                                        select2Write: function( $event, observable ) {
                                            observable($event.val);
                                        },
                                        select2Config: {
                                            query: function( options ) {
                                                var
                                                    data = Y.doccirrus.schemas.partner.types.Condition_E.list
                                                        .map( function( entry ) {
                                                        return {
                                                            id: entry.val,
                                                            text: entry.i18n
                                                        };
                                                    } ).concat({ id: "", text: "" });
                                                return options.callback( {results: data} );
                                            },
                                            initSelection: undefined,
                                            data: function() {
                                                return {
                                                    results: Y.doccirrus.schemas.partner.types.Condition_E.list.map( function( item ) {
                                                        return {
                                                            id: item.val,
                                                            text: item.i18n,
                                                            data: item,
                                                            disabled: false
                                                        };
                                                    } ).concat({ id: "", text: "" })
                                                };
                                            },
                                            multiple: false
                                        }
                                    }
                                },
                                renderer: function( meta ) {
                                    var el = peek( meta.value );
                                    return Y.doccirrus.schemaloader.getEnumListTranslation( 'partner', 'Condition_E', el, 'i18n', '' );
                                }
                            },
                            {
                                componentType: 'KoEditableTableCheckboxColumn',
                                forPropertyName: 'automaticProcessing',
                                utilityColumn: false,
                                width: '85px',
                                css: {
                                    'text-center': 1
                                },
                                selectAllCheckbox: false,
                                label: i18n('partner-schema.Partner_T.configuration.automatic'),
                                title: i18n('partner-schema.Partner_T.configuration.automatic')

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
                                        disabled: disabledTable,
                                        click: function( button, $event, $context ) {
                                            var
                                                rowModel = $context.$parent.row;
                                            $context.$root.aEditableTable.removeRow( rowModel );
                                        }
                                    }
                                }
                            }
                        ]
                    }
                };

            if( disabledTable ){
                editableTable.componentConfig.isAddRowButtonVisible = function(){ return false; };
            }

            var table = KoComponentManager.createComponent( editableTable );

            partnerModel.showChooseButtons = ko.observable( false );
            partnerModel.verifyPin = function() {
                loadPartnerData( partnerModel, editableTable );
            };

            createModal( partnerModel, table, saveCb, editMode, invitePartner, function( myModal ) {
                var saveButton = myModal.getButton( 'save' ),
                    signed = 'CONFIRMED' === partnerModel.status(),
                    rows;

                if( invitePartner) {
                    partnerModel._isValid.subscribe( function( valid ) {
                        myModal.getButton( 'save' ).set( 'disabled', !valid );
                    } );
                }

                if(!partnerModel.licensedType) {
                    partnerModel.signature.subscribe( function( checked ) {
                        if( checked ) {
                            saveButton.set( 'disabled', false );
                            partnerModel.saveDisabled(false);
                        } else if( 'INVITED' !== partnerModel.status() ) {
                            saveButton.set( 'disabled', true );
                            partnerModel.signatureVisible( true );
                            partnerModel.saveDisabled(true);
                        }
                    } );


                    partnerModel.preserveCaseFolder.subscribe( function( value ) {
                        if( true === value ) {
                            rows = unwrap( table.rows );
                            rows.every( function( rowModel ){
                                return rowModel.caseFolders( [] );
                            } );
                        }
                    } );
                } else {
                    saveButton.set( 'disabled', true );
                }

                if( invitePartner || !partnerModel.licensedType) {
                    ko.computed( function() {
                        var
                            rows = unwrap( table.rows ) || [],
                            valid;

                        unwrap( table.activeRow );
                        valid = 0 === rows.length || rows.every( function( rowModel ) {
                                return rowModel.isValid();
                            } );
                        if(!partnerModel.saveDisabled() || invitePartner){
                            saveButton.set( 'disabled', !valid );
                        }
                    } );
                }


                partnerModel.signature( signed );

            } );
        }

        Y.namespace( 'doccirrus.modals' ).partnerEditModal = {
            show: show
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'dcpartnermodel',
            'KoViewModel',
            'KoComponentManager',
            'KoEditableTable'
        ]
    }
);
