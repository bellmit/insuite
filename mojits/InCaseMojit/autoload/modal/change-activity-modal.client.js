/**
 * User: pi
 * Date: 29/09/15  13:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko, moment, _ */

'use strict';

YUI.add( 'DCChangeActivityModal', function( Y, NAME ) {
        var
            i18n = Y.doccirrus.i18n,
            Disposable = Y.doccirrus.KoViewModel.getDisposable(),
            ActivityModel = Y.doccirrus.KoViewModel.getConstructor( 'ActivityModel' ),
            MODAL_TITLE,
            SCHEIN_ERROR = i18n( 'InCaseMojit.change_activity_modal_clientJS.text.SCHEIN_ERROR' ),
            COPY_OLD_TREATMENTS = i18n( 'InCaseMojit.change_activity_modal_clientJS.text.COPY_OLD_TREATMENTS' ),
            MOVEMENT_NOT_ALLOWED = i18n( 'InCaseMojit.movetocasefolder-modalJS.messages.MOVEMENT_NOT_ALLOWED' );

        function showErrorOnCopy( oldActivities ) {
            Y.doccirrus.DCWindow.notice( {
                message: oldActivities ? COPY_OLD_TREATMENTS : MOVEMENT_NOT_ALLOWED
            } );
        }

        function ChangeActivityModel( data ) {
            ChangeActivityModel.superclass.constructor.call( this, data );
        }

        Y.extend( ChangeActivityModel, Disposable, {
            initializer: function ChangeActivityModel_initializer( data ) {
                var
                    self = this;

                self.initChangeActivity( data );
            },
            /**
             * Initializes changeActivity model
             * @param {Object} data
             * @param {Array} data.activities
             */
            initChangeActivity: function( data ) {
                var
                    self = this,
                    timestamp = '',
                    locationId = '',
                    employeeId = '',
                    KoViewModel = Y.doccirrus.KoViewModel,
                    currentDate = true === data.currentDate,
                    copy = true === data.copy,
                    currentCaseFolder = data && data.currentCaseFolder;

                self.textMainI18n = i18n('InCaseMojit.change_activity_modal_clientJS.text.MAIN');
                self.cheinSelectedI18n = i18n('InCaseMojit.change_activity_modal_clientJS.text.SCHEIN_SELECTED');
                self.placeholderTimestampI18n = i18n('InCaseMojit.casefile_detail.placeholder.TIMESTAMP');
                self.selectFolderI18n = i18n('InCaseMojit.change_activity_modal_clientJS.text.SELECT');

                self.actionCopy = copy;

                self.caseFolders = data.caseFolders;
                self.currentCaseFolderId = currentCaseFolder && currentCaseFolder._id;
                self.currentCaseFolderImported = currentCaseFolder && currentCaseFolder.imported;
                self.hasLabData = data.activities.some( function( item ) {
                    return 'LABDATA' === item.actType;
                });

                self.disableCaseFolder = function( $data ) {
                    var
                        moveAllowed = Y.doccirrus.schemas.casefolder.movementAllowed( data.activities, $data ),
                        currentCaseFolder = ( $data._id === self.currentCaseFolderId ),
                        isImported = data && data.currentCaseFolder && !data.currentCaseFolder.imported,
                        additionalType = data && data.currentCaseFolder && Y.doccirrus.schemas.casefolder.additionalTypes.ERROR !== data.currentCaseFolder.additionalType,
                        additionalTypeQuotation = data && data.currentCaseFolder && Y.doccirrus.schemas.casefolder.additionalTypes.QUOTATION !== data.currentCaseFolder.additionalType;
                    return !moveAllowed || (!copy && currentCaseFolder) || ( data && data.currentCaseFolder && !( isImported || additionalType ) ) || ( self.hasLabData && 'PREPARED' === $data.type ) || ( !additionalTypeQuotation && 'PREPARED' === $data.type );
                };

                self.findFirstToSelect = function( caseFolders, currentCaseFolderId ) {
                    var found;
                    caseFolders.some( function( casefolder ) {
                        if( currentCaseFolderId === casefolder._id && !self.disableCaseFolder( casefolder ) ) {
                            found = casefolder._id;
                            return true;
                        }
                    } );
                    return found;
                };

                self.selected = ko.observable( self.findFirstToSelect( self.caseFolders, self.currentCaseFolderId ) );

                self.selectedObj = ko.computed( function() {
                    var found,
                        selectedId = self.selected();
                    if( self.caseFolders && self.caseFolders.length ) {
                        self.caseFolders.some( function( caseFolder ) {
                            if( caseFolder._id === selectedId ) {
                                found = caseFolder;
                                return true;
                            }
                        } );
                    }
                    return found;
                }.bind( self ) ); //eslint-disable-line no-extra-bind

                self.amount = data && data.activities && data.activities.length || 0;
                if( self.actionCopy ) {
                    MODAL_TITLE = i18n( 'InCaseMojit.change_activity_modal_clientJS.title.MODAL_TITLE_COPY' );
                } else {
                    MODAL_TITLE = i18n( 'InCaseMojit.change_activity_modal_clientJS.title.MODAL_TITLE' );
                }

                if( currentDate ) {
                    timestamp = new Date();
                    timestamp = ko.utils.peekObservable( timestamp.toISOString() );
                } else {
                    timestamp = data.activities[0] && ko.utils.peekObservable( data.activities[0].timestamp );
                }
                locationId = data.activities[0] && ko.utils.peekObservable( data.activities[0].locationId );
                employeeId = data.activities[0] && ko.utils.peekObservable( data.activities[0].employeeId );
                self.activitiesId = [];
                self.isScheinSelected = false;
                self.fromCasefolder = data.activities[0] && ko.utils.peekObservable( data.activities[0].caseFolderId );
                data.activities.forEach( function( activity ) {
                    if( timestamp !== activity.timestamp && !currentDate ) {
                        timestamp = '';
                    }
                    if( locationId !== activity.locationId ) {
                        locationId = '';
                    }
                    if( employeeId !== activity.employeeId ) {
                        employeeId = '';
                    }
                    if( Y.doccirrus.schemas.activity.isScheinActType( activity.actType ) ) {
                        self.isScheinSelected = true;
                    }
                    self.activitiesId.push( activity._id );
                } );

                self.timestamp = ko.observable( timestamp );
                self.timestamp.readOnly = ko.observable( false );
                self.locationId = ko.observable();
                self.employeeId = ko.observable();

                if( moment( timestamp ).isAfter() ) {
                    self.timestamp( moment( new Date() ).toISOString() );
                    self.timestamp.readOnly( true );
                }

                self.locationList = [];

                self.employeeList = KoViewModel.utils.createAsync( {
                    cache: self,
                    initialValue: [],
                    jsonrpc: {
                        fn: Y.doccirrus.jsonrpc.api.employee.read,
                        params: ko.computed( function() {
                            var
                                locationId = self.locationId();
                            return {
                                query: {
                                    type: 'PHYSICIAN',
                                    'locations._id': locationId
                                },
                                options: {
                                    sort: {
                                        lastname: 1
                                    }
                                }

                            };
                        } )
                    },
                    converter: function( response ) {
                        var data = response.data || [],
                            employeeFromActivityFound = data.some( function(el){ return el._id === employeeId; } );
                        self.employeeId( employeeFromActivityFound ? employeeId : data[0] && data[0]._id );
                        return data;
                    }
                } );

                Y.doccirrus.jsonrpc.api.location.read( {
                        options: {
                            sort: {
                                locname: 1
                            }
                        }
                    } )
                    .done( function( response ) {
                        var
                            data = response && response.data,
                            locationFromActivityFound;
                        if( data.length ) {
                            data.forEach( function( location ) {
                                self.locationList.push( location );
                            } );
                            locationFromActivityFound = self.locationList.some( function(el){ return el._id === locationId; } );
                            self.locationId( locationFromActivityFound ? locationId : self.locationList[0]._id );
                        }

                    } );

                self.initSelect2Employee();
                self.initSelect2Location();

            },

            /**
             * Updates batch of activities
             */
            save: function(copy) {
                var
                    self = this,
                    locationId = self.locationId(),
                    employeeId = self.employeeId(),
                    timestamp = self.timestamp(),
                    activitiesId = self.activitiesId,
                    selected = self.selected(),
                    completed = 0,
                    fields = [],
                    promise,
                    title = copy ? i18n('InCaseMojit.casefile_browserJS.menu.activityCopy') : i18n('InCaseMojit.change_activity_modal_clientJS.title.MODAL_TITLE'),
                    data = {
                        locationId: locationId,
                        employeeId: employeeId,
                        timestamp: moment( timestamp ).format( 'YYYY-MM-DD 00:00:00' )
                    },
                    errorList = [];

                if( copy ) {
                    fields.push( 'caseFolderId' );
                    data.caseFolderId = selected;
                }

                //  if copying to a difference casefolder then we will need to call a different API
                if ( copy && self.fromCasefolder !== selected ) {
                    return self.copyToDifferentCaseFolder();
                }

                if( locationId ) {
                    fields.push( 'locationId' );
                }
                if( employeeId ) {
                    fields.push( 'employeeId' );
                }
                if( timestamp ) {
                    fields.push( 'timestamp' );
                }

                function finishProgress() {
                    Y.doccirrus.comctl.clearModal();
                    Y.doccirrus.communication.off('activty.PROCESSED_ONE');
                }

                function updateProgress() {
                    var progressHtml = Y.doccirrus.comctl.makeProgressBar( completed++, activitiesId.length );
                    Y.doccirrus.comctl.setModal( title, progressHtml, false );
                }

                Y.doccirrus.communication.on( {
                    event: 'activty.PROCESSED_ONE',
                    handlerId: 'changActivities',
                    done: function success(message) {
                        (message && message.data || []).forEach( function(el){
                           if(el && el.error){
                               errorList.push(el.error);
                           }
                        });
                        updateProgress();
                    }
                } );

                Y.log( 'Copying activites in same casefolder: ' + JSON.stringify( activitiesId ), 'debug', NAME );

                promise = new Promise( function( resolve, reject ) {
                    Y.doccirrus.comctl.setModal( title, '<div id="divCopyMultiple"></div>', false, null, function(){
                        Y.doccirrus.jsonrpc.api.activity.updateBatch( {
                            query: {
                                activitiesId: activitiesId
                            },
                            data: data,
                            fields: fields,
                            copy: copy || false,
                            fromImported: self.currentCaseFolderImported || false
                        } ).done( function( response ) {
                            var
                                data = response.data;
                            if (errorList.length > 0) {
                                reject(errorList);
                            } else {
                                resolve( data );
                            }
                        } ).fail( function( error ) {
                            if (errorList.length > 0) {
                                reject(errorList);
                            } else {
                                reject(error);
                            }
                        } ).always(function(){
                            finishProgress();
                        } );
                    } );
                } );

                return promise;
            },

            /**
             *  When copying to a different casefolder, use CaseFolder API (manage links, check medication properties)
             *  @return {Promise}
             */

            copyToDifferentCaseFolder: function() {

                var
                    self = this,
                    locationId = self.locationId(),
                    employeeId = self.employeeId(),
                    timestamp = self.timestamp(),
                    activitiesId = self.activitiesId,
                    query = {
                        caseFolderId: self.selected(),
                        activityIds: activitiesId
                    },
                    fields = [],
                    promise,

                    errorList = [];

                Y.log( 'Copying to new casefolder: ' + query.caseFolderId, 'debug', NAME );

                //  construct query

                if( locationId ) {
                    query.locationId = locationId;
                }

                if( employeeId ) {
                    query.employeeId = employeeId;
                    fields.push( 'employeeId' );
                }

                if( timestamp ) {
                    query.timestamp = timestamp;
                    fields.push( 'timestamp' );
                }

                //  wrap the deferred in a promise?

                promise = new Promise( function( resolve, reject ) {
                    Y.doccirrus.jsonrpc.api.casefolder.copyActivitiesToCaseFolder( {
                        query: query,
                        noBlocking: true
                    } ).done( function( response ) {
                        var
                            data = response.data;
                        if (errorList.length > 0) {
                            reject(errorList);
                        } else {
                            resolve( data );
                        }
                    } ).fail( function( error ) {
                        if (errorList.length > 0) {
                            reject(errorList);
                        } else {
                            reject(error);
                        }
                    } ).always(function(){
                        Y.log( 'Finished move between casefolders ', 'debug', NAME );

                        //  should pop a system message here
                        Y.doccirrus.DCSystemMessages.addMessage( {
                            messageId: 'change-activity-modal-CopySuccess',
                            content: i18n( 'general.message.CHANGES_SAVED' ) + ' (' + activitiesId.length + ')'
                        } );
                    } );

                } );

                return promise;
            },

            /**
             * Initializes select2 for employee
             * @method initSelect2Employee
             */
            initSelect2Employee: function() {
                var
                    self = this;
                self.select2Employee = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            var
                                employeeId = ko.unwrap( self.employeeId );
                            return employeeId;
                        },
                        write: function( $event ) {
                            self.employeeId( $event.val );
                        }
                    } ) ),
                    select2: {
                        width: '100%',
                        placeholder: i18n( 'activity-schema.Activity_T.employeeName.i18n' ),
                        data: function() {
                            return {
                                results: self.employeeList().map( function( employee ) {
                                    return {
                                        id: employee._id,
                                        text: employee.lastname + ', ' + employee.firstname
                                    };
                                } )
                            };
                        }
                    }
                };

            },
            /**
             * Initializes select2 for location
             * @method initSelect2Location
             */
            initSelect2Location: function() {
                var
                    self = this;
                self.select2Location = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            var
                                locationId = ko.unwrap( self.locationId );
                            return locationId;
                        },
                        write: function( $event ) {
                            var
                                employeeId = ko.utils.peekObservable( self.employeeId ),
                                keepEmployeeId = false;
                            self.locationId( $event.val );
                            if( employeeId && $event.added && $event.added.data && $event.added.data.employees ) {
                                keepEmployeeId = $event.added.data.employees.some( function( employee ) {
                                    return employeeId === employee._id;
                                } );
                            }
                            if( !keepEmployeeId ) {
                                self.employeeId( null );
                            }
                        }
                    } ) ),
                    select2: {
                        width: '100%',
                        placeholder: i18n( 'activity-schema.Activity_T.locationId.i18n' ),
                        data: function() {
                            return {
                                results: self.locationList.map( function( location ) {
                                    return {
                                        id: location._id,
                                        text: location.locname,
                                        data: location
                                    };
                                } )
                            };
                        }
                    }
                };

            }
        } );

        function ChangeActivityModal() {

        }

        ChangeActivityModal.prototype.showDialog = function( data, callback ) {

            function show() {
                var
                    modal,
                    node = Y.Node.create( '<div></div>' ),
                    changeActivityModel = new ChangeActivityModel( data || {} ),
                    templateButton;

                function doneCb() {
                    modal.close();
                    if( 'function' === typeof callback ) {
                        callback();
                    }

                }

                function failCb( error ) {
                    var
                        message,
                        err = {},
                        i;
                    if( Array.isArray( error ) ) {
                        err.code = 18002;
                        message = Y.doccirrus.errorTable.getMessage( err );
                        message += '<ul class="error-list">';
                        error.forEach( function( item ) {
                            for( i = 0; i < data.activities.length; i++ ) {
                                if( item.activityId === data.activities[i]._id ) {
                                    message += "<li class='error-list-item'>" + Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', data.activities[i].actType, 'i18n', 'k.A.' ) + ' ' +
                                               data.activities[i].code + ' ' +
                                               ActivityModel.renderContentAsHTML( data.activities[i] ) + "</li>";
                                }
                            }
                        } );
                        message += '</ul>';
                    } else if( 18002 === error.code ) {
                        message = SCHEIN_ERROR;
                    } else {
                        message = Y.doccirrus.errorTable.getMessage( error );
                    }
                    Y.doccirrus.DCWindow.notice( {
                        type: 'error',
                        message: message,
                        window: {width: 'medium'}
                    } );
                    if( 'function' === typeof callback ) {
                        callback();
                    }
                }
                if (changeActivityModel.actionCopy) {
                    templateButton = Y.doccirrus.DCWindow.getButton( 'OK', {
                        label: 'Kopieren ( ' + changeActivityModel.amount + ' )',
                        isDefault: true,
                        action: function() {
                            modal.close();
                            var newCaseFolder = changeActivityModel.selectedObj(),
                                currentCaseFolder = data.currentCaseFolder,
                                differentCaseFolder = newCaseFolder._id !== currentCaseFolder._id;
                            if(  data.mirror && !Y.doccirrus.schemas.casefolder.movementAllowed( data.activities, newCaseFolder ) ) {
                                 return showErrorOnCopy();
                            }
                            if(
                                (!differentCaseFolder || Y.doccirrus.schemas.casefolder.movementAllowed( data.activities, newCaseFolder )) ||
                                Y.doccirrus.schemas.casefolder.additionalTypes.ERROR === data.currentCaseFolder.additionalType ||
                                data.currentCaseFolder.imported
                            ) {
                                changeActivityModel.save(true).then( doneCb ).catch( failCb );

                            } else {
                                showErrorOnCopy();
                            }
                        }
                    } );
                } else {
                    templateButton = Y.doccirrus.DCWindow.getButton( 'SAVE', {
                        isDefault: true,
                        action: function() {
                            changeActivityModel.save(false).then( doneCb ).catch( failCb );
                        }
                    } );
                }

                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'change_activity_modal',
                    'InCaseMojit',
                    {},
                    node,
                    function() {
                        modal = new Y.doccirrus.DCWindow( {
                            className: ( changeActivityModel.actionCopy ) ? 'DCWindow-ActivitiesCopy' : 'DCWindow-ActivitiesEdit',
                            bodyContent: node,
                            title: MODAL_TITLE,
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                            centered: true,
                            modal: true,
                            render: document.body,
                            buttons: {
                                header: ['close'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                    templateButton
                                ]
                            }
                        } );
                        modal.set( 'focusOn', [] );

                        ko.applyBindings( changeActivityModel, node.getDOMNode().querySelector( '#changeActivityModel' ) );
                    }
                );
            }

            //reverse order of checked activities
            if(data.activities && data.activities.length){
                data.activities = _.sortBy( data.activities, 'timestamp' );
            }

            show();

        };
        Y.namespace( 'doccirrus.modals' ).changeActivityModal = new ChangeActivityModal();

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'DCWindow',
            'doccirrus',
            'KoViewModel'
        ]
    }
);
