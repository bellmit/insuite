/*jslint anon:true, sloppy:true, nomen:true*/
/*global fun:true, YUI, ko, jQuery */
/*exported fun */
fun = function _fn( Y/*, NAME*/ ) {
    'use strict';

    var
        peek = ko.utils.peekObservable,
        i18n = Y.doccirrus.i18n,
        USERNAME_CHANGED = i18n('InSuiteAdminMojit.tab_employees.text.USERNAME_CHANGED'),
        binder = Y.doccirrus.utils.getMojitBinderByType( 'InSuiteAdminMojit' ),
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        KoViewModel = Y.doccirrus.KoViewModel,
        EmployeeEditModel = KoViewModel.getConstructor( 'EmployeeEditModel' ),
        IdentityModel = KoViewModel.getConstructor( 'IdentityModel' ),
        viewModel = null,
        beforeUnloadView = null,
        VIEW_STATE_INITIAL = null,
        VIEW_STATE_OVERVIEW = 'overview',
        VIEW_STATE_DETAIL = 'detail',
        RoleModel = KoViewModel.getConstructor('RoleModel');


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
     * clear handle ViewEditModel modifications when leaving view
     */
    function detachConfirmModifications() {
        if( beforeUnloadView ) {
            beforeUnloadView.detach();
            beforeUnloadView = null;
        }
    }

    /**
     * handle ViewEditModel modifications when leaving view
     */
    function attachConfirmModifications() {
        beforeUnloadView = Y.doccirrus.utils.getMojitBinderByType( 'InSuiteAdminMojit' ).router.on( 'beforeUnloadView', function( yEvent, event ) {
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
     * read specialities objects from server
     * @return {jQuery.Deferred}
     */
    function readSpecialities() {
        return Y.doccirrus.jsonrpc.api.kbv
            .fachgruppe()
            .then( function( response ) {
                var
                    data = response.data;

                return data[0] && data[0].kvValue || null;
            } );
    }

    /**
     * read location objects from server
     * @return {jQuery.Deferred}
     */
    function readLocations() {
        return Y.doccirrus.jsonrpc.api.location
            .read({
                isAdminPanel: true
            })
            .then( function( response ) {
                var
                    data = response.data;

                return data || [];
            } );
    }

    function showConfirmBox( type, message, method ) {
        Y.doccirrus.DCWindow.notice( {
            type: type,
            message: message,
            window: {
                width: 'medium',
                buttons: {
                    footer: [
                        Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                            action: function() {
                                this.close();
                            }
                        } ),
                        Y.doccirrus.DCWindow.getButton( 'OK', {
                            isDefault: true,
                            action: function() {
                                this.close();
                                method( );
                            }
                        } )
                    ]
                }
            }
        } );
    }

    /**
     * translate a role
     * @param {String} role
     * @return {String}
     */
    function translateGroup( group ) {
        return Y.doccirrus.schemaloader.translateEnumValue( 'i18n', group, Y.doccirrus.schemas.employee.types.Group_E.list, group );
    }

    /**
     * This views ViewEditModel, used for the detail view
     * @constructor
     */
    function ViewEditModel() {
        ViewEditModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ViewEditModel, KoViewModel.getBase(), {
        /**
         * Employee data
         * @type {null|ko.observable}
         */
        employee: null,
        /**
         * Identity data
         * @type {null|ko.observable}
         */
        identity: null,
        /**
         * An array of identity groups to pick from
         * @type {null|ko.observableArray}
         */
        identityGroups: null,
        /**
         * An array of roles to pick from
         * @type {null|ko.observableArray}
         */
        roles: null,
        /**
         * Card Key reset computed
         * @type {null|ko.observableArray}
         */
        cardKeyResetDisabled: null,
        /**
         * Show ASV panel if licence is enabled
         */
        isAsvSectionVisible: Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.ASV ),
        initializer: function() {
            var
                self = this;

            attachConfirmModifications();

            self.addEmployeeCommunication = Y.bind( self.addEmployeeCommunication, self );
            self.removeEmployeeCommunication = Y.bind( self.removeEmployeeCommunication, self );
            self.addNewRole = Y.bind(self.addNewRole, self);
            self.deleteRole = Y.bind(self.deleteRole, self);
            self.buttonBackI18n = i18n( 'InSuiteAdminMojit.tab_employees.detail.button.BACK' );
            self.buttonPWI18n = i18n( 'InSuiteAdminMojit.tab_employees.detail.button.PW' );
            self.buttonSaveI18n = i18n( 'InSuiteAdminMojit.tab_employees.detail.button.SAVE' );
            self.employee = new EmployeeEditModel( {
                data: self.get( 'data.employee' ),
                specialitiesList: self.get( 'specialitiesList' ),
                locationsList: self.get( 'locationsList' )
            } );

            //trnaslations
            self.employee.personHeaderI18n = i18n( 'InSuiteAdminMojit.tab_employees.detail.headline.PERSON' );
            self.employee.personTalkI18n = i18n( 'employee-schema.Employee_T.talk' );
            self.employee.personPleaseSelectI18n = i18n( 'general.message.PLEASE_SELECT' );
            self.employee.personTitlePlaceholderI18n = i18n( 'person-schema.Person_T.title.placeholder' );
            self.employee.personFirstNamePlaceholderI18n = i18n( 'person-schema.Person_T.firstname.placeholder' );
            self.employee.personLastNamePlaceholderI18n = i18n( 'person-schema.Person_T.lastname.placeholder' );
            self.employee.personSpacialiesI18n = i18n( 'employee-schema.Employee_T.specialities' );
            self.employee.personSpecialisationTextI18n = i18n( 'employee-schema.Employee_T.specialisationText.placeholder' );
            self.employee.personBelongingI18n = i18n( 'InSuiteAdminMojit.tab_employees.detail.headline.BELONGING' );
            self.employee.personFromI18n = i18n( 'employee-schema.Employee_T.from' );
            self.employee.personToI18n = i18n( 'employee-schema.Employee_T.to' );
            self.employee.personNoPlaceholderI18n = i18n( 'employee-schema.Employee_T.employeeNo.placeholder' );
            self.employee.personLocationsI18n = i18n( 'employee-schema.Employee_T.locations' );
            self.employee.personDepartmentPlaceholderI18n = i18n( 'employee-schema.Employee_T.department.placeholder' );
            self.employee.personTypeI18n = i18n( 'employee-schema.Employee_T.type' );
            self.employee.personBGI18n = i18n( 'InSuiteAdminMojit.tab_employees.detail.headline.BG' );
            self.employee.personCommunicationI18n = i18n( 'InSuiteAdminMojit.tab_employees.detail.headline.COMMUNICATION' );
            self.employee.physicianInQualificationLabelI18n = i18n( 'employee-schema.Employee_T.physicianInQualification.i18n' );
            self.employee.phoneJobI18n = i18n( 'person-schema.Communication_E.PHONEJOB' );
            self.employee.communicationPlaceholderI18n = i18n( 'person-schema.Communication_T.value.placeholder' ) + ':';
            self.employee.mobilePrivateI18n = i18n( 'person-schema.Communication_E.MOBILEPRIV' );
            self.employee.phonePrivateI18n = i18n( 'person-schema.Communication_E.PHONEPRIV' );
            self.employee.faxJobI18n = i18n( 'person-schema.Communication_E.FAXJOB' );
            self.employee.emailJobI18n = i18n( 'person-schema.Communication_E.EMAILJOB' );
            self.employee.emailPrivI18n = i18n( 'person-schema.Communication_E.EMAILPRIV' );
            self.employee.phoneExtI18n = i18n( 'person-schema.Communication_E.PHONEEXT' );
            self.employee.preferedI18n = i18n( 'person-schema.Communication_T.preferred' );
            self.employee.signalingTI18n = i18n( 'person-schema.Communication_T.signaling' );
            self.employee.buttonDeleteI18n = i18n( 'general.button.DELETE' );
            self.employee.asvOfficialNoI18n = i18n( 'InSuiteAdminMojit.tab_employees.detail.help.ASV_OFFICIAL_NO' );

            self.identity = new IdentityModel( {
                validatable: true,
                data: self.get( 'data.identity' )
            } );
            //translations
            self.identity.headlinePermissionI18n = i18n( 'InSuiteAdminMojit.tab_employees.detail.headline.PERMISSIONS' );
            self.identity.userNameI18n = i18n( 'identity-schema.Identity_T.username' );
            self.identity.memberOfHeaderI18n = i18n( 'identity-schema.Identity_T.memberOf' );
            self.identity.roleHeaderI18n = i18n( 'role-schema.Role_T.value.i18n' );
            self.identity.cardLoginI18n = i18n( 'InSuiteAdminMojit.tab_employees.detail.headline.CARD_LOGIN' );
            self.identity.cardResetI18n = i18n( 'InSuiteAdminMojit.tab_employees.detail.button.CARD_RESET' );

            self.identityGroups = ko.observableArray();
            self.roles = ko.observableArray();
            self.updateIdentityGroups();
            self.updateRolesGroups();
            self.addDisposable( ko.computed( self.identityNeededMemberOfComputed, self ) );
            self.addDisposable( ko.computed( self.syncIdentityValidDurationWithEmployee, self ) );
            self.addDisposable( ko.computed( self.updateStatusAndUsernameByIdentity, self ) );

            self.saveDisabled = ko.computed( self.saveDisabledComputed, self );

            self.showEmployeePasswordResetDialogDisabled = ko.computed( self.showEmployeePasswordResetDialogDisabledComputed, self );

            self.cardKeyResetClick = Y.bind( self.cardKeyResetClick, self );
            self.cardKeyResetDisabled = ko.computed( self.cardKeyDisabledComputed, self );
        },
        destructor: function() {
            var
                self = this;

            detachConfirmModifications();
            self.employee.destroy();
            self.employee = null;
            self.identity.destroy();
            self.identity = null;
        },
        // overwrite
        isNew: function() {
            var self = this,
                isEmployeeNew = self.employee.isNew(),
                isIdentityNew = self.identity.isNew();

            return isEmployeeNew || isIdentityNew;
        },
        // overwrite
        isModified: function() {
            var self = this,
                isEmployeeModified = self.employee.isModified(),
                isIdentityModified = self.identity.isModified();

            return isEmployeeModified || isIdentityModified;
        },
        // overwrite
        toJSON: function() {
            var
                self = this;

            return {
                employee: self.employee.toJSON(),
                identity: self.identity.toJSON()
            };
        },
        /**
         * Checks if the employee and the identity are valid
         * @return {boolean}
         */
        isValid: function() {
            var
                self = this,
                isEmployeeValid = self.employee._isValid(),
                isIdentityValid = self.identity._isValid();

            return isEmployeeValid && isIdentityValid;
        },
        /**
         * save this model
         * @return {jQuery.Defferred}
         */
        save: function() {
            var
                self = this,
                data = self.toJSON(),
                wasNew = self.isNew(),
                deferred,
                showConfirmBoxProm = Promise.promisify(showConfirmBox),
                oldEmployeeData = self.employee.get( 'data' ),
                cachedLocationsIds = oldEmployeeData.locations && oldEmployeeData.locations.map( function( l ) {
                        return l._id;
                    } );


            if( data && data.employee && !data.employee.initials ) {
                data.employee.initials = data.employee.firstname.charAt( 0 ) + data.employee.lastname.charAt( 0 );
            }

            if( data && data.employee && data.employee.initials ) {
                Promise.resolve(
                    Y.doccirrus.jsonrpc.api.employee.checkIfInitialsAreAvailable({
                        data: {
                            initials: data.employee.initials,
                            employeeId: data.employee._id
                        }
                    })
                )
                .then( function( response ) {
                    if( !response || !response.data || !response.data.available ) {
                        return showConfirmBoxProm( 'warn', i18n( 'InSuiteAdminMojit.tab_employees.messages.DUPLICATE_INITIALS').replace("$MAPPING", data.employee.initials) );
                    }
                } )
                .then( function() {
                    createOrUpdateEmployee();
                } )
                .catch( fail );
            } else {
                createOrUpdateEmployee();
            }

            function createOrUpdateEmployee() {
                if( wasNew ) {
                    deferred = Y.doccirrus.jsonrpc.api.employee
                        .create( {
                            data: data
                        } )
                        .then( function( response ) {
                            var
                                warnings = Y.doccirrus.errorTable.getWarningsFromResponse( response );

                            if( warnings.length ) {
                                Y.Array.invoke( warnings, 'display' );
                            }

                            return { employeeId: response && response.data && response.data[ 0 ] || null };
                        } );
                }
                else {
                    deferred = Y.doccirrus.jsonrpc.api.employee
                        .updateEmployee( {
                            query: {_id: data.employee._id},
                            data: data
                            //,fields: [] - handled server side
                        } )
                        .then( function( response ) {
                            var
                                warnings = Y.doccirrus.errorTable.getWarningsFromResponse( response ),
                                data = (response && response.data) || {};

                            if( warnings.length ) {
                                Y.Array.invoke( warnings, 'display' );
                            }

                            return { employeeId: data._id || null, newUsername: data.newUsername || null };
                        } );
                }

                return deferred
                    .then( function( data ) {
                        var
                            employeeId = data.employeeId;
                        return Y.doccirrus.jsonrpc.api.employee
                            .readEmployeeForAdminDetail( {_id: employeeId} )
                            .then( function( response ) {
                                return { detail: response && response.data || null, newUsername: data.newUsername };
                            } );
                    } )
                    .then( function( data ) {

                        var
                            newLocationsIds = data.detail.employee.locations.map( function( l ) {
                                return l._id;
                            } ),
                            isLocationsChanged = false;

                        Y.doccirrus.DCSystemMessages.addMessage( {
                            messageId: 'tab_employees-save',
                            content: i18n( 'general.message.CHANGES_SAVED' )
                        } );

                        if ( cachedLocationsIds && newLocationsIds ) {
                            if ( cachedLocationsIds.length > newLocationsIds.length ) {

                                isLocationsChanged = !cachedLocationsIds.every( function( loc ) {
                                    return newLocationsIds.some( function( l ) {
                                        return l === loc;
                                    } );
                                } );

                            } else {

                                isLocationsChanged = !newLocationsIds.every( function( loc ) {
                                    return cachedLocationsIds.some( function( l ) {
                                        return l === loc;
                                    } );
                                } );

                            }
                        }

                        if ( isLocationsChanged ) {
                            Y.doccirrus.DCWindow.notice( {
                                message: i18n( 'InSuiteAdminMojit.tab_employees.messages.LOCATIONS_AT_EMPLOYEE_CHANGED' )
                            } );
                        }

                        if( viewModel ) {
                            viewModel.unsetEditing();
                            viewModel.visitOverview();
                        }
                        if( data.newUsername ) {
                            Y.doccirrus.DCWindow.notice( {
                                type: 'info',
                                message: USERNAME_CHANGED,
                                window: {
                                    width: Y.doccirrus.DCWindow.SIZE_MEDIUM
                                }
                            } ).on( 'visibleChange', function( event ) {
                                var path,
                                    hash,
                                    fullPath;
                                if( false === event.newVal ) {
                                    path = document.location.pathname || '';
                                    hash = document.location.hash || '';
                                    fullPath = path + hash;
                                    fullPath = ('/' === fullPath[0]) ? fullPath.substr( 1 ) : fullPath;
                                    document.location = '/logout?redirectTo=' + fullPath;
                                }
                            } );
                        }
                    } )
                    .fail( fail );
            }
        },
        /**
         * Determines if the "save" action is disabled
         * @type {null|ko.computed}
         */
        saveDisabled: null,
        /**
         * Computes if the "save" action is disabled
         */
        saveDisabledComputed: function() {
            var
                self = this,
                valid = self.isValid(),
                modified = self.isModified(),
                isNew = self.isNew();

            return !(valid && (modified || isNew));
        },
        /**
         * Forces mandatory identity "memberOf" entries under certain circumstances
         */
        identityNeededMemberOfComputed: function() {
            var
                self = this,
                memberOf = self.identity.memberOf;

            // force selection of group "PHYSICIAN" when employee is "PHYSICIAN"
            if( 'PHYSICIAN' === self.employee.type() ) {
                if( !(Y.Array.find( peek( memberOf ), function( item ) {
                        return 'PHYSICIAN' === peek( item.group );
                    } )) ) {
                    self.identity.memberOf.push( Y.Array.find( peek( self.identityGroups ), function( item ) {
                        return 'PHYSICIAN' === peek( item.group );
                    } ) );
                }
            }

            // force selection of group "PHARMACIST" when employee is "PHARMACIST"
            if( 'PHARMACIST' === self.employee.type() ) {
                if( !(Y.Array.find( peek( memberOf ), function( item ) {
                        return Y.doccirrus.schemas.employee.userGroups.PHARMACIST === peek( item.group );
                    } )) ) {
                    self.identity.memberOf.push( Y.Array.find( peek( self.identityGroups ), function( item ) {
                        return Y.doccirrus.schemas.employee.userGroups.PHARMACIST === peek( item.group );
                    } ) );
                }
            }

            // force selection of group "PHARMACY_STAFF" when employee is "PHARMACY_STAFF"
            if( 'PHARMACY_STAFF' === self.employee.type() ) {
                if( !(Y.Array.find( peek( memberOf ), function( item ) {
                        return Y.doccirrus.schemas.employee.userGroups.PHARMACY_STAFF === peek( item.group );
                    } )) ) {
                    self.identity.memberOf.push( Y.Array.find( peek( self.identityGroups ), function( item ) {
                        return Y.doccirrus.schemas.employee.userGroups.PHARMACY_STAFF === peek( item.group );
                    } ) );
                }
            }

            // force selection of group "USER" when "memberOf" is empty
            if( !memberOf().length ) {
                memberOf.push( Y.Array.find( peek( self.identityGroups ), function( item ) {
                    return 'USER' === peek( item.group ) || 'PHARMACY_STAFF' === peek( item.group ) ;
                } ) );
            }

        },
        /**
         * updates "identityGroups" with appropriate "memberOf" models
         */
        updateIdentityGroups: function() {
            var
                self = this,
                groupList = Y.doccirrus.schemas.employee.types.Group_E.list;

            self.identityGroups.removeAll();

            if( !Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.ASV ) ) {
                groupList = groupList.filter( function( item ) {
                    return Y.doccirrus.schemas.employee.userGroups.PARTNER !== item.val;
                } );
            }

            if( Y.doccirrus.auth.hasAdditionalService( Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTORAPO ) && !Y.doccirrus.auth.isDCPRC() ) {
                groupList = groupList.filter( function( item ) {
                    return -1 === [
                        Y.doccirrus.schemas.employee.userGroups.USER,
                        Y.doccirrus.schemas.employee.userGroups.REDUCED_USER,
                        Y.doccirrus.schemas.employee.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.employee.userGroups.PARTNER,
                        Y.doccirrus.schemas.employee.userGroups.CONTROLLER
                    ].indexOf(item.val);
                } );
            } else {
                groupList = groupList.filter( function( item ) {
                    return -1 === [
                        Y.doccirrus.schemas.employee.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.employee.userGroups.PHARMACY_STAFF
                    ].indexOf(item.val);
                } );
            }
            self.identityGroups( groupList.map( function( item ) {
                var
                    group = item.val,
                    memberOf = Y.Array.find( self.identity.memberOf(), function( member ) {
                            return group === member.group();
                        } ) || new KoViewModel.createViewModel( ( {
                            config: {
                                schemaName: 'employee.memberOf',
                                data: {group: group},
                                parent: self.identity
                            }
                        } ) );

                memberOf.i18n = item.i18n;
                memberOf.set( 'destroyOnArrayRemoval', false );

                return memberOf;
            } ) );
        },

        updateRolesGroups: function() {
            var
                self = this;

            self.roles.removeAll();

            Y.doccirrus.jsonrpc.api.role.get().done(function (result) {
                result.data.forEach(function (r) {
                    self.roles.push(new RoleModel({data: r}));
                });
            });
        },

        /**
         * Add new role by showing dialog where
         */
        addNewRole: function() {
            var
                self = this, // jshint ignore:line
                node = Y.Node.create('<div></div>'),
                modal = null,
                roleModel = new RoleModel(),
                buttons = [
                    Y.doccirrus.DCWindow.getButton('CANCEL'),
                    Y.doccirrus.DCWindow.getButton('SAVE', {
                        isDefault: true,
                        action: function (e) {
                            var parentEvent = e,
                                parentContext = this;
                            e.target.button.disable();
                            roleModel.save().done(function (result) {
                                roleModel._id(result.data[0]);
                                self.roles.push(roleModel);
                                parentContext.close(parentEvent);
                            }).fail(fail);
                        }
                    })
                ];

            YUI.dcJadeRepository.loadNodeFromTemplate(
                'add_new_role_dialog',
                'InSuiteAdminMojit',
                {},
                node,
                function templateLoaded() {
                    modal = new Y.doccirrus.DCWindow( {
                        className: 'DCWindow-tab_roles',
                        bodyContent: node,
                        title: i18n('InSuiteAdminMojit.tab_employees.addRoleDialog.title'),
                        width: Y.doccirrus.DCWindow.SIZE_SMALL,
                        height: Y.doccirrus.DCWindow.SIZE_SMALL,
                        minHeight: Y.doccirrus.DCWindow.SIZE_SMALL,
                        minWidth: Y.doccirrus.DCWindow.SIZE_SMALL,
                        centered: true,
                        modal: true,
                        render: document.body,
                        buttons: {
                            header: [ 'close' ],
                            footer: buttons
                        }
                    } );

                    roleModel.addDisposable(ko.computed(function () {
                        var
                            modelValid = roleModel._isValid(),
                            okBtn = modal.getButton('SAVE').button;
                        if (modelValid) {
                            okBtn.enable();
                        } else {
                            okBtn.disable();
                        }
                    }));
                    roleModel.labelNameI18n = i18n( 'InSuiteAdminMojit.tab_employees.addRoleDialog.label.NAME' );
                    roleModel.roleNamePlaceholderI18n = i18n( 'InSuiteAdminMojit.tab_employees.addRoleDialog.label.ROLE_NAME_PLACEHOLDER' );
                    roleModel.labelDescriptionI18n = i18n( 'InSuiteAdminMojit.tab_employees.addRoleDialog.label.DESCRIPTION' );

                    ko.applyBindings(roleModel, node.getDOMNode());
                }
            );
        },

        /**
         * Delete role by showing dialog with all roles dropdown
         */
        deleteRole: function() {
            var
                self = this,
                node = Y.Node.create('<div></div>'),
                modal = null,
                rolesModel = {
                    roles: self.roles().filter(function (role) {
                        return (role.value() !== Y.doccirrus.schemas.role.DEFAULT_ROLE.EMPFANG && role.value() !== Y.doccirrus.schemas.role.DEFAULT_ROLE.INSTOCK);
                    }),
                    selectedRole: ko.observable(null)
                },
                buttons = [
                    Y.doccirrus.DCWindow.getButton('CANCEL'),
                    Y.doccirrus.DCWindow.getButton('SAVE', {
                        isDefault: true,
                        action: function (e) {
                            var parentEvent = e,
                                parentContext = this;
                            e.target.button.disable();
                            rolesModel.selectedRole().remove().done(function () {
                                self.roles.remove(rolesModel.selectedRole());
                                parentContext.close(parentEvent);
                            });
                        }
                    })
                ];

            rolesModel.selectedRole.subscribe(function (checked) {
                if (checked) {
                    modal.getButton('SAVE').set('disabled', false);
                } else {
                    modal.getButton('SAVE').set('disabled', true);
                }
            });

            YUI.dcJadeRepository.loadNodeFromTemplate(
                'delete_role_dialog',
                'InSuiteAdminMojit',
                {},
                node,
                function templateLoaded() {
                    modal = new Y.doccirrus.DCWindow( {
                        className: 'DCWindow-tab_roles',
                        bodyContent: node,
                        title: i18n( 'InSuiteAdminMojit.tab_employees.deleteRoleDialog.title' ),
                        width: Y.doccirrus.DCWindow.SIZE_SMALL,
                        height: Y.doccirrus.DCWindow.SIZE_SMALL,
                        minHeight: Y.doccirrus.DCWindow.SIZE_SMALL,
                        minWidth: Y.doccirrus.DCWindow.SIZE_SMALL,
                        centered: true,
                        modal: true,
                        render: document.body,
                        buttons: {
                            header: [ 'close' ],
                            footer: buttons
                        }
                    } );
                    ko.applyBindings(rolesModel, node.getDOMNode());
                });

        },

        /**
         * Compute disabled "identityGroups" entries
         * @param {KoViewModel} identity
         * @return {boolean}
         */
        computeIdentityGroupDisabled: function( identity ) {
            var
                self = this,
                group = peek( identity.group ),
                memberOf = self.identity.memberOf,
                type = self.employee.type();

            if( 'SUPPORT' === group ) {
                return !Y.doccirrus.auth.memberOf( 'SUPPORT' );
            }
            // disable deselection of group "PHYSICIAN" when employee is "PHYSICIAN"
            if( 'PHYSICIAN' === group && 'PHYSICIAN' === type ) {

                return true;
            }

            // disable deselection of group "PHARMACIST" when employee is "PHARMACIST"
            if( Y.doccirrus.schemas.employee.userGroups.PHARMACIST === group && 'PHARMACIST' === type ) {

                return true;
            }

            // disable deselection of group "PHARMACY_STAFF" when employee is "PHARMACY_STAFF"
            if( Y.doccirrus.schemas.employee.userGroups.PHARMACY_STAFF === group && 'PHARMACY_STAFF' === type ) {

                return true;
            }

            // disable deselection of group "USER" when there is only "USER"
            if( 'USER' === group && 1 === memberOf().length && Y.Array.find( peek( memberOf ), function( item ) {
                    return 'USER' === peek( item.group );
                } ) ) {

                return true;
            }

            return false;
        },
        /**
         * Keep the valid duration of employee and identity in sync
         */
        syncIdentityValidDurationWithEmployee: function() {
            var
                self = this,
                from = ko.unwrap( self.employee.from ),
                to = ko.unwrap( self.employee.to );

            self.identity.validFrom( from );
            self.identity.validTo( to );
        },
        /**
         * Add an employee communication
         */
        addEmployeeCommunication: function() {
            var
                self = this;

            self.employee.communications.push( {preferred: false} );
        },
        /**
         * Remove an employee communication
         */
        removeEmployeeCommunication: function( communication ) {
            var
                self = this;

            self.employee.communications.remove( communication );
        },
        /**
         * Shows the identity information's dialog
         */
        showIdentityInfoDialog: function() {

            new Y.doccirrus.DCWindow( { // eslint-disable-line
                className: 'DCWindow-tab_employees-info',
                bodyContent: [
                    i18n( 'InSuiteAdminMojit.tab_employees.showIdentityInfoDialog.INFO_INTRO' ) + '</br>',
                    i18n( 'InSuiteAdminMojit.tab_employees.showIdentityInfoDialog.INFO_REDUCED_USER_TITLE' ),
                    i18n( 'InSuiteAdminMojit.tab_employees.showIdentityInfoDialog.INFO_REDUCED_USER_TEXT' ) + '</br>',
                    i18n( 'InSuiteAdminMojit.tab_employees.showIdentityInfoDialog.INFO_USER_TITLE' ),
                    i18n( 'InSuiteAdminMojit.tab_employees.showIdentityInfoDialog.INFO_USER_TEXT' ) + '</br>',
                    i18n( 'InSuiteAdminMojit.tab_employees.showIdentityInfoDialog.INFO_PHYSICIAN_TITLE' ),
                    i18n( 'InSuiteAdminMojit.tab_employees.showIdentityInfoDialog.INFO_PHYSICIAN_TEXT' ) + '</br>',
                    i18n( 'InSuiteAdminMojit.tab_employees.showIdentityInfoDialog.INFO_SUPERUSER_TITLE' ),
                    i18n( 'InSuiteAdminMojit.tab_employees.showIdentityInfoDialog.INFO_SUPERUSER_TEXT' ) + '</br>',
                    i18n( 'InSuiteAdminMojit.tab_employees.showIdentityInfoDialog.INFO_CONTROLLER_TITLE' ),
                    i18n( 'InSuiteAdminMojit.tab_employees.showIdentityInfoDialog.INFO_CONTROLLER_TEXT' ) + '</br>',
                    i18n( 'InSuiteAdminMojit.tab_employees.showIdentityInfoDialog.INFO_ADMIN_TITLE' ),
                    i18n( 'InSuiteAdminMojit.tab_employees.showIdentityInfoDialog.INFO_ADMIN_TEXT' ) + '</br>',
                    i18n( 'InSuiteAdminMojit.tab_employees.showIdentityInfoDialog.INFO_SUPPORT_TITLE' ),
                    i18n( 'InSuiteAdminMojit.tab_employees.showIdentityInfoDialog.INFO_SUPPORT_TEXT' ) + '</br>',
                    i18n( 'InSuiteAdminMojit.tab_employees.showIdentityInfoDialog.INFO_ENDING' )
                ].join( '</br>' ),
                title: i18n( 'InSuiteAdminMojit.tab_employees.showIdentityInfoDialog.INFO_TITLE' ),
                icon: Y.doccirrus.DCWindow.ICON_LIST,
                width: Y.doccirrus.DCWindow.SIZE_LARGE,
                height: Y.doccirrus.DCWindow.SIZE_LARGE,
                minHeight: Y.doccirrus.DCWindow.SIZE_LARGE,
                minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                centered: true,
                modal: true,
                render: document.body,
                buttons: {
                    header: ['close'],
                    footer: [
                        Y.doccirrus.DCWindow.getButton( 'OK', {
                            isDefault: true,
                            action: function( e ) {
                                e.target.button.disable();
                                this.close( e );
                            }
                        } )
                    ]
                }
            } );

        },
        /**
         * Shows the role information's dialog
         */
        showRoleInfoDialog: function() {

            new Y.doccirrus.DCWindow( { // eslint-disable-line
                className: 'DCWindow-tab_employees-info',
                bodyContent: i18n( 'InSuiteAdminMojit.tab_employees.showRoleInfoDialog.INFO_TEXT' ),
                title: i18n( 'InSuiteAdminMojit.tab_employees.showRoleInfoDialog.INFO_TITLE' ),
                icon: Y.doccirrus.DCWindow.ICON_LIST,
                width: Y.doccirrus.DCWindow.SIZE_LARGE,
                height: Y.doccirrus.DCWindow.SIZE_SMALL,
                minHeight: Y.doccirrus.DCWindow.SIZE_SMALL,
                minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                centered: true,
                modal: true,
                render: document.body,
                buttons: {
                    header: ['close'],
                    footer: [
                        Y.doccirrus.DCWindow.getButton( 'OK', {
                            isDefault: true,
                            action: function( e ) {
                                e.target.button.disable();
                                this.close( e );
                            }
                        } )
                    ]
                }
            } );

        },
        /**
         * Shows the employee password reset dialog
         */
        showEmployeePasswordResetDialog: function() {

            var
                self = this,
                employee = self.employee.toJSON();

            function showModal() {

                new Y.doccirrus.DCWindow( { // eslint-disable-line
                    className: 'DCWindow-EmployeePasswordResetDialog',
                    title: i18n( 'InSuiteAdminMojit.tab_employees.showEmployeePasswordResetDialog.title' ),
                    icon: Y.doccirrus.DCWindow.ICON_WARN,
                    bodyContent: i18n( 'InSuiteAdminMojit.tab_employees.showEmployeePasswordResetDialog.message', {data: employee} ),
                    width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                    minWidth: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                    centered: true,
                    resizeable: false,
                    modal: true,
                    render: document.body,
                    buttons: {
                        header: ['close'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                            {
                                label: i18n( 'InSuiteAdminMojit.tab_employees.showEmployeePasswordResetDialog.button.recover' ),
                                isDefault: true,
                                name: 'RECOVER',
                                action: function( e ) {
                                    e.target.button.disable();
                                    this.close( e );

                                    Y.doccirrus.jsonrpc.api.employee
                                        .doResetEmployeePw( {id: employee._id} )
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

                                }
                            }
                        ]
                    }
                } );

            }

            // check if the user has an own email
            Y.doccirrus.jsonrpc.api.employee
                .getEmployeeForUsername( {username: Y.doccirrus.auth.getUserId()} )
                .then( function( response ) {
                    return response.data || null;
                } )
                .then( function( data ) {
                    var
                        entry = data && Y.doccirrus.schemas.simpleperson.getEmail( data.communications );

                    if( entry && entry.value ) {
                        showModal();
                    } else {
                        Y.doccirrus.DCWindow.notice( {
                            message: i18n( 'InSuiteAdminMojit.tab_employees.showEmployeePasswordResetDialog.MUST_HAVE_EMAIL' )
                        } );
                    }
                } )
                .fail( fail );

        },
        /**
         * Determines if the "showEmployeePasswordResetDialog" action is disabled
         * @type {null|ko.computed}
         */
        showEmployeePasswordResetDialogDisabled: null,
        /**
         * Computes if the "showEmployeePasswordResetDialog" action is disabled
         */
        showEmployeePasswordResetDialogDisabledComputed: function() {
            var
                self = this;

            return self.isNew();
        },
        /**
         * Click-Handler for the "cardKeyReset" action
         */
        cardKeyResetClick: function() {
            var
                self = this;

            self.identity.cardKey( '' );
        },
        /**
         * Computes if the "cardKeyReset" action is disabled
         */
        cardKeyDisabledComputed: function() {
            var
                self = this;

            if( ko.unwrap( self.identity.cardKey ) ) {
                return false;
            }

            return true;
        },
        updateStatusAndUsernameByIdentity: function() {
            var
                self = this,
                username = ko.unwrap( self.identity.username ),
                status = ko.unwrap( self.identity.status );

            self.employee.username( username ).status( status );

        }
    }, {
        ATTRS: {
            specialitiesList: {
                value: [],
                cloneDefaultValue: true,
                lazyAdd: false
            },
            locationsList: {
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

            self.initEditing();
            self.initStateListener();
        },
        destructor: function() {
            var
                self = this;

            self.destroyStateListener();
            self.destroyEditing();
        },
        /**
         * The view to display
         * @type {null|ko.observable}
         */
        view: null,
        /**
         * May hold the "tab_employees-state" event listener
         * @type {null|Y.EventHandle}
         */
        eventStateListener: null,
        /**
         * May hold the specialities jQuery.Defferred
         * @type {null|jQuery.Defferred}
         */
        readSpecialities: null,
        /**
         * Handles fired "tab_employees-state" events and make the appropriate action
         * @param {Y.EventFacade} yEvent
         * @param {Object} state
         * @param {String} state.view
         * @param {Object} state.params
         */
        eventStateListenerHandler: function( yEvent, state ) {
            var
                self = this;

            self.unsetEditing();

            switch( state.view ) {
                case VIEW_STATE_OVERVIEW:
                    if( !self.isOverviewInitialised() ) {
                        self.initOverview();
                    }
                    break;
                case VIEW_STATE_DETAIL:

                    // user isn't allowed to create
                    if( !state.params.id && peek( self.createEmployeeDisabled ) ) {
                        self.visitOverview();
                        return;
                    }

                    if( !self.readSpecialities ) {
                        self.readSpecialities = readSpecialities();
                    }

                    // modify existing employee detail
                    if( state.params.id ) {

                        jQuery.when(
                            readLocations(),
                            self.readSpecialities,
                            Y.doccirrus.jsonrpc.api.employee
                                .readEmployeeForAdminDetail( {_id: state.params.id} )
                                .then( function( response ) {
                                    return response && response.data || null;
                                } )
                        )
                            .then( function( locations, specialities, detail ) {
                                self.editing( new ViewEditModel( {
                                    data: detail,
                                    specialitiesList: specialities,
                                    locationsList: locations
                                } ) );
                            } )
                            .fail( fail );
                    }
                    // create new employee detail
                    else {

                        jQuery.when(
                            readLocations(),
                            self.readSpecialities
                        )
                            .then( function( locations, specialities ) {
                                self.editing( new ViewEditModel( {
                                    data: {
                                        identity: {
                                            status: 'ACTIVE'
                                        },
                                        employee: {
                                            communications: [
                                                {type: 'EMAILJOB', value: '', preferred: false}
                                            ],
                                            roles: [
                                                Y.doccirrus.schemas.role.DEFAULT_ROLE.EMPFANG
                                            ]
                                        }
                                    },
                                    specialitiesList: specialities,
                                    locationsList: locations
                                } ) );
                            } )
                            .fail( fail );
                    }

                    break;
            }

            self.view( state.view );

        },
        /**
         * Initialises "eventStateListener" Y.EventHandle
         */
        initStateListener: function() {
            var
                self = this;

            self.view = ko.observable( VIEW_STATE_INITIAL );

            self.eventStateListener = Y.after( 'tab_employees-state', self.eventStateListenerHandler, self );

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
         * The current "ViewEditModel" being edited
         * @type {null|ko.observable}
         */
        editing: null,
        /**
         * Initialises "editing" ko.observable
         */
        initEditing: function() {
            var
                self = this;

            self.editing = ko.observable( null );
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
         * @private
         */
        initialisedOverview: false,
        /**
         * Initialises the overview
         */
        initOverview: function() {
            var
                self = this;

            if( !self.isEmployeesTableInitialized() ) {
                self.initEmployeesTable();
            }

            self.initialisedOverview = true;
        },
        /**
         * Forwards the User to the overview by using the Y.Router
         */
        visitOverview: function() {
            binder.router.save( '/employee' );
        },
        /**
         * May hold employees table
         * @type {null|KoTable}
         */
        employeesTable: null,
        /**
         * Determines if the "employeesTable" was initialised
         */
        isEmployeesTableInitialized: function() {
            var
                self = this;

            return Boolean( self.employeesTable );
        },
        /**
         * Initialises employees table
         */
        initEmployeesTable: function() {
            var
                self = this;

            self.employeesTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    formRole: 'casefile-ko-insuite-table',
                    pdfTitle: i18n( 'InSuiteAdminMojit.tab_employees.pdfTitle' ),
                    stateId: 'InSuiteAdminMojit-employeesTable',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    limit: 20,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.employee.readEmployeesForAdminOverview,
                    sortersLimit: 2,
                    columns: [
                        {
                            componentType: 'KoTableColumnCheckbox',
                            forPropertyName: 'checked',
                            label: ''
                        },
                        {
                            forPropertyName: 'type',
                            label: i18n( 'InSuiteAdminMojit.tab_employees.employeesTable.label.TYPE' ),
                            width: '80px',
                            renderer: function( meta ) {
                                var
                                    value = meta.value;

                                if( !value ) {
                                    return '';
                                }

                                return Y.doccirrus.schemaloader.translateEnumValue( 'i18n', value, Y.doccirrus.schemas.employee.types.Employee_E.list, value );
                            },
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.employee.types.Employee_E.list,
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            }
                        },
                        {
                            forPropertyName: 'title',
                            label: i18n( 'InSuiteAdminMojit.tab_employees.employeesTable.label.TITLE' ),
                            width: '7%',
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'lastname',
                            label: i18n( 'InSuiteAdminMojit.tab_employees.employeesTable.label.SURNAME' ),
                            width: '15%',
                            isSortable: true,
                            sortInitialIndex: 0,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'firstname',
                            label: i18n( 'InSuiteAdminMojit.tab_employees.employeesTable.label.FORENAME' ),
                            width: '15%',
                            isSortable: true,
                            sortInitialIndex: 1,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'employeeNo',
                            label: i18n( 'InSuiteAdminMojit.tab_employees.employeesTable.label.NUMBER' ),
                            width: '90px',
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'username',
                            label: i18n( 'InSuiteAdminMojit.tab_employees.employeesTable.label.USER' ),
                            width: '13%'
                        },
                        {
                            forPropertyName: 'roles',
                            label: i18n( 'role-schema.Role_T.value.i18n' ),
                            width: '15%',
                            visible: false,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var
                                    roles = meta.value;

                                if( !(Array.isArray( roles ) && roles.length) ) {
                                    return '';
                                }

                                return roles.join( ',<br/> ' );
                            }
                        },
                        {
                            forPropertyName: 'memberOf',
                            label: i18n( 'identity-schema.Identity_T.memberOf' ),
                            width: '15%',
                            renderer: function( meta ) {
                                if (!meta.value) {
                                    return "";
                                }
                                var
                                    groups = meta.value.map( function( g ) {
                                        return g.group;
                                    });

                                if( !(Array.isArray( groups ) && groups.length) ) {
                                    return '';
                                }

                                return groups.map( translateGroup).join( ',<br/> ' );
                            }
                        },
                        {
                            forPropertyName: 'locations.locname',
                            label: i18n( 'InSuiteAdminMojit.tab_employees.employeesTable.label.locname' ),
                            width: '180px',
                            visible: false,
                            renderer: function( meta ) {
                                var
                                    locations = meta.row.locations;

                                if( !(Array.isArray( locations ) && locations.length) ) {
                                    return '';
                                }

                                return locations.map( function(location) {
                                    return location.locname || '';
                                } ).join( ' / ' );
                            },
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'communications.value',
                            label: i18n( 'InSuiteAdminMojit.tab_employees.employeesTable.label.E_MAIL_TEL' ),
                            width: '35%',
                            renderer: function( meta ) {
                                var
                                    communications = meta.row.communications;

                                if( !(Array.isArray( communications ) && communications.length) ) {
                                    return '';
                                }

                                return communications.map( Y.doccirrus.schemas.person.getCommunicationLinkedWithUriScheme ).join( ' / ' );
                            },
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'asvTeamNumbers',
                            label: i18n( 'employee-schema.Employee_T.asvTeamNumbers.i18n' ),
                            width: '22%',
                            visible: false,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var
                                    specializations = meta.value;
                                return (specializations && specializations.join( ',<br/> ' )) || '';
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
                                }

                                return '';
                            },
                            pdfRenderer: function( meta ) {
                                var value = meta.value;
                                //  TODO: translateme, see of PDF charset has tick glyph
                                return ( value === 'ACTIVE' ) ? 'J' : 'N';
                            }
                        },
                        {
                            forPropertyName: 'fromLDAP',
                            label: i18n( 'InSuiteAdminMojit.tab_employees.employeesTable.label.fromLDAP' ),
                            width: '75px',
                            visible: false,
                            css: {'text-center': true},
                            renderer: function( meta ) {
                                var
                                    value = meta.value;

                                if( value ) {
                                    return '<span class="glyphicon glyphicon-ok"></span>';
                                }

                                return '';
                            },
                            pdfRenderer: function( meta ) {
                                var value = meta.value;
                                return ( value ) ? 'J' : 'N';
                            }
                        }
                    ],
                    onRowClick: function( meta ) {
                        var
                            isLink = meta.isLink,
                            data = meta.row;

                        if( isLink ) {
                            return false;
                        }

                        self.showEmployeeDetail( data );

                        return false;
                    }
                }
            } );

            self.deleteEmployeeDisabled = ko.computed( self.deleteEmployeeDisabledComputed, self );
            self.activateEmployeeDisabled = ko.computed( self.activateEmployeeDisabledComputed, self );
            self.deactivateEmployeeDisabled = ko.computed( self.deactivateEmployeeDisabledComputed, self );
            self.resetPasswordDisabled = ko.computed( self.resetPasswordDisabledComputed, self );
            //translations
            self.deleteEmployeeButtonI18n = ' ' + i18n( 'InSuiteAdminMojit.tab_employees.overview.button.DELETE' );
            self.enableEmployeeButtonI18n = ' ' + i18n( 'InSuiteAdminMojit.tab_employees.overview.button.ENABLE' );
            self.disableEmployeeButtonI18n = ' ' + i18n( 'InSuiteAdminMojit.tab_employees.overview.button.DISABLE' );
            self.newEmployeeButtonI18n = ' ' + i18n( 'InSuiteAdminMojit.tab_employees.overview.button.NEW' );
            self.resetPasswordButtonI18n = ' ' + i18n( 'InSuiteAdminMojit.tab_employees.overview.button.RESET_PASSWORD' );

        },
        /**
         * Forwards the User to the employee detail by using the Y.Router
         */
        showEmployeeDetail: function( employee ) {
            binder.router.save( '/employee/' + employee._id );
        },
        /**
         * Determines if the "createEmployee" action is disabled
         * @type {boolean}
         */
        createEmployeeDisabled: false,
        /**
         * Forwards the User to the employee detail to create one by using the Y.Router
         */
        createEmployee: function() {
            binder.router.save( '/employee/new' );
        },
        /**
         * Determines if the "deleteEmployee" action is disabled
         * @type {null|ko.computed}
         */
        deleteEmployeeDisabled: null,
        /**
         * Computes if the "deleteEmployee" action is disabled
         */
        deleteEmployeeDisabledComputed: function() {
            var
                self = this,
                checked = self.employeesTable
                    .getComponentColumnCheckbox()
                    .checked();

            return !checked.length;
        },
        /**
         * Delete an employee checked in "employeesTable" by confirmation of the User
         */
        deleteEmployee: function() {
            var
                self = this,
                checked = self.employeesTable
                    .getComponentColumnCheckbox()
                    .checked()
                    .map( function( item ) {
                        return item._id;
                    } );

            if( !checked.length ) {
                Y.doccirrus.DCWindow.notice( {
                    message: i18n( 'general.message.NO_SELECTION' )
                } );
            }
            else {

                Y.doccirrus.DCWindow.confirm( {
                    title: 'Hinweis',
                    message: Y.Lang.sub( i18n( 'employee-api.delete.confirm.message' ), {employeeCount: checked.length} ),
                    callback: function( result ) {

                        if( result.success ) {

                            Promise.resolve( Y.doccirrus.jsonrpc.api.employee
                                .delete( {
                                    query: {_id: {$in: checked}}
                                } ) )
                                .then( function( ) {
                                    self.employeesTable.reload();

                                    Y.doccirrus.DCSystemMessages.addMessage( {
                                        messageId: 'tab_employees-deleteEmployee',
                                        content: i18n( 'general.message.CHANGES_SAVED' )
                                    } );
                                } )
                                .catch( function( err ) {
                                    Y.doccirrus.DCWindow.notice( {
                                        message: Y.doccirrus.errorTable.getMessage( {
                                            code: err.code
                                        } )
                                    } );
                                } );

                        }

                    }
                } );

            }

        },
        /**
         * Determines if the "activateEmployee" action is disabled
         * @type {null|ko.computed}
         */
        activateEmployeeDisabled: null,
        /**
         * Computes if the "activateEmployee" action is disabled
         */
        activateEmployeeDisabledComputed: function() {
            var
                self = this,
                checked = self.employeesTable
                    .getComponentColumnCheckbox()
                    .checked();

            return !checked.length || !Y.Array.some( checked, function( item ) {
                    return item.status !== 'ACTIVE';
                } );
        },
        /**
         * Activates an employee checked in "employeesTable"
         */
        activateEmployee: function() {
            var
                self = this,
                checked = Y.Array
                    .filter( self.employeesTable
                        .getComponentColumnCheckbox()
                        .checked(), function( item ) {
                        return item.status !== 'ACTIVE';
                    } );

            if( !checked.length ) {
                Y.doccirrus.DCWindow.notice( {
                    message: i18n( 'general.message.NOT_MEET_CRITERIA' )
                } );
            }
            else {
                jQuery
                    .when.apply( jQuery, checked.map( function( item ) {
                        return Y.doccirrus.jsonrpc.api.employee.activateIdentity( item );
                    } ) )
                    .then( function() {
                        self.employeesTable.reload();

                        Y.doccirrus.DCSystemMessages.addMessage( {
                            messageId: 'tab_employees-activateIdentity',
                            content: i18n( 'general.message.CHANGES_SAVED' )
                        } );
                    } )
                    .fail( fail );
            }

        },
        /**
         * Determines if the "deactivateEmployee" action is disabled
         * @type {null|ko.computed}
         */
        deactivateEmployeeDisabled: null,
        /**
         * Computes if the "deactivateEmployee" action is disabled
         */
        deactivateEmployeeDisabledComputed: function() {
            var
                self = this,
                checked = self.employeesTable
                    .getComponentColumnCheckbox()
                    .checked();

            return !checked.length || !Y.Array.some( checked, function( item ) {
                    return item.status === 'ACTIVE';
                } );
        },
        /**
         * Deactivates an employee checked in "employeesTable"
         */
        deactivateEmployee: function() {
            var
                self = this,
                checked = Y.Array
                    .filter( self.employeesTable
                        .getComponentColumnCheckbox()
                        .checked(), function( item ) {
                        return item.status === 'ACTIVE';
                    } );

            if( !checked.length ) {
                Y.doccirrus.DCWindow.notice( {
                    message: i18n( 'general.message.NOT_MEET_CRITERIA' )
                } );
            }
            else {
                jQuery
                    .when.apply( jQuery, checked.map( function( item ) {
                        return Y.doccirrus.jsonrpc.api.employee.inactivateIdentity( item.identityData );
                    } ) )
                    .then( function() {
                        self.employeesTable.reload();

                        Y.doccirrus.DCSystemMessages.addMessage( {
                            messageId: 'tab_employees-inactivateIdentity',
                            content: i18n( 'general.message.CHANGES_SAVED' )
                        } );
                    } )
                    .fail( fail );
            }

        },
        /**
         * Determines if the "resetPassword" action is disabled
         * @type {null|ko.computed}
         */
        resetPasswordDisabled: null,
        /**
         * Computes if the "resetPassword" action is disabled
         */
        resetPasswordDisabledComputed: function() {
            var
                self = this,
                checked = self.employeesTable
                    .getComponentColumnCheckbox()
                    .checked();

            return !checked.length;
        },
        /**
         * Resets password for employees checked in "employeesTable"
         */
        resetPassword: function() {
            var
                self = this,

                checked = self.employeesTable
                    .getComponentColumnCheckbox()
                    .checked();

            if( !checked.length ) {
                return Y.doccirrus.DCWindow.notice( {
                    message: i18n( 'general.message.NOT_MEET_CRITERIA' )
                } );
            }

            Y.doccirrus.DCWindow.notice( {
                message: i18n( 'InSuiteAdminMojit.tab_employees.messages.RESET_PASSWORD_CONFIRMATION', {data: {numberOfEmployees: checked.length}} ),
                window: {
                    width: Y.doccirrus.DCWindow.SIZE_SMALL,
                    buttons: {
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                            {
                                label: i18n( 'DCWindow.BUTTONS.OK' ),
                                isDefault: true,
                                action: function( e ) {
                                    e.target.button.disable();
                                    this.close( e );

                                    jQuery
                                        .when.apply( jQuery, checked.map( function( item ) {
                                        return Y.doccirrus.jsonrpc.api.employee
                                            .doResetEmployeePw( {id: item._id} );
                                    } ) )
                                        .then( function() {
                                            self.employeesTable.reload();

                                            Y.doccirrus.DCSystemMessages.addMessage( {
                                                messageId: 'tab_employees-activateIdentity',
                                                content: i18n( 'general.message.CHANGES_SAVED' )
                                            } );
                                        } )
                                        .fail( fail );
                                }
                            }
                        ]
                    }
                }
            } );
        },
        /**
         * Defines if button for reset password under employees table will be visible
         *
         * @returns {null | Boolean}
         */
        isResetPasswordVisible: function() {
            return Y.doccirrus.auth.isAdminOrHigher();
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
                node: function() {
                    // for some weirdness this have to be a function
                    return node.getDOMNode();
                }
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
