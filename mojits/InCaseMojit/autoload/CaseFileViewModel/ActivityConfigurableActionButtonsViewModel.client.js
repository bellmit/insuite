/*global YUI, ko, _, moment */
YUI.add( 'ActivityConfigurableActionButtonsViewModel', function( Y, NAME ) {
    'use strict';

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n,
        peek = ko.utils.peekObservable,
        unwrap = ko.unwrap,
        notice = Y.doccirrus.DCWindow.notice;

    /**
     * @constructor
     * @class ActivityConfigurableActionButtonsViewModel
     */
    function ActivityConfigurableActionButtonsViewModel() {
        ActivityConfigurableActionButtonsViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ActivityConfigurableActionButtonsViewModel, KoViewModel.getDisposable(), {
        /** @protected */
        initializer: function() {
            var
                self = this;
            self.initObservables();
            self.initActivityConfigurableActionButtonsViewModel();
        },
        /** @protected */
        destructor: function() {
            var
                self = this;

            self.destroyActivityConfigurableActionButtonsViewModel();
        },
        buttons: null,
        initObservables: function() {
            var self = this;
            self.buttons = ko.observableArray( [] );
        },
        initActivityConfigurableActionButtonsViewModel: function() {
            var
                self = this;
            self.createButtons();
        },
        destroyActivityConfigurableActionButtonsViewModel: function() {
            var
                self = this;
            self.destroyButtons();
        },
        createButtons: function() {
            var self = this;
            Y.doccirrus.jsonrpc.api.actionbutton.read( { noBlocking: true, query: {userId: Y.doccirrus.auth.getUserId()}} ).done( function( result ) {
                if (!self.buttons) { return; }

                self.buttons( _.sortBy( result.data, 'order' ) );
            } ).fail( function( err ) {
                Y.log( 'Could not load Action Buttons data: ' + err, 'error', NAME );
            } );
        },
        destroyButtons: function() {
            var
                self = this;

            if( self.buttons ) {
                self.buttons.removeAll();
                self.buttons = null;
            }
        },
        buttonClickHandler: function( data, item ) {
            var currentPatient = peek( data.get( 'currentPatient' ) ),
                extraData = item.action.extraData,
                flowId = item.action._id,
                newActivityConfig = {},
                aCaseFileViewModel = KoViewModel.getViewModel( 'CaseFileViewModel' ),
                activitiesTable = aCaseFileViewModel.activitiesTable,
                checkedActivities = aCaseFileViewModel.activitiesTable.getComponentColumnCheckbox().checked(),
                queryTemplates,
                uriTemplateRegex = /{{(.*?)}}/g,
                uri,
                regExp,
                canRedirect = true,
                isActivitySelected,
                isQueryTemplate,
                doctorSelectValueParts,
                activityData;

            function showError( errText, error ) {
                notice( {
                    type: 'error',
                    message: error ? (errText + ': ' + (error.stack || error)) : errText
                } );
            }

            /**
             * Opens the Sol modal with the necessary query params
             *
             * @param {Object} args
             * @param {Object} args.solModalUrl
             * @param {Object} args.item
             * @param {String} args.activityId
             * @returns {Y.doccirrus.modals.DCSolModal}
             */
            function openSolModal( args ) {
                var
                    solModalUrl = args.solModalUrl || {},
                    item = args.item || {},
                    activityId = args.activityId,
                    activityIdList = args.activityIdList,
                    url = solModalUrl.pathname + solModalUrl.search;

                if( activityIdList ) {
                    url = url + (solModalUrl.search ? '&activityIdList=' : '?activityIdList=') + activityIdList.join( ',' );
                } else if( activityId ) {
                    url = url + (solModalUrl.search ? '&activityId=' : '?activityId=') + activityId;
                }

                return new Y.doccirrus.modals.DCSolModal( {
                    iframeUrl: url,
                    title: {
                        de: item.name,
                        en: item.name
                    },
                    icon: 'ICON_LIST',
                    size: {
                        width: 95,
                        height: 93,
                        percentageSize: true
                    }

                }, function( data, cb ) {
                    cb();
                } );
            }

            /**
             * Obtains the employeeId and locationId of the doctor
             * from the doctor select dropdown in ActivityCaseFoldersViewModel
             * related to MOJ-10029
             *
             * @returns {{locationId: string, employeeId: *}|{locationId: *, employeeId: *}}
             */
            function getEmployeeAndLocationId() {
                var
                    currentDoctorValue = unwrap( aCaseFileViewModel.activityCaseFoldersViewModel )
                                         && unwrap( aCaseFileViewModel.activityCaseFoldersViewModel ).doctorSelect2Config
                                         && unwrap( aCaseFileViewModel.activityCaseFoldersViewModel ).doctorSelect2Config.val(),
                    doctorSelectValueParts,
                    employeeId,
                    locationId;

                if( !currentDoctorValue ) {
                    return {
                        employeeId: '',
                        locationId: ''
                    };
                }

                doctorSelectValueParts = currentDoctorValue.split( '-' );
                employeeId = doctorSelectValueParts[0];
                locationId = doctorSelectValueParts[1];

                return {
                    employeeId: employeeId,
                    locationId: locationId
                };
            }

            /**
             * Creates a simple activity via de activity api
             * @param {Object} item
             * @retuns {Promise}
             */
            function createSimpleActivity( item ) {
                doctorSelectValueParts = getEmployeeAndLocationId(item);
                activityData = {
                    patientId: peek( currentPatient._id ),
                    caseFolderId: currentPatient.caseFolderCollection.getActiveTab()._id,
                    timestamp: moment(),
                    userContent: '',
                    status: 'CREATED',
                    actType: item.actType,
                    subType: item.subType,
                    locationId: doctorSelectValueParts.locationId || '',
                    employeeId: doctorSelectValueParts.employeeId || '',
                    employeeName: '' // there might be a way to get it from here, for now it's handled by the server
                };

                return Promise.resolve( Y.doccirrus.jsonrpc.api.activity.createSimpleActivity( {
                    activityData: activityData,
                    activeCaseFolder: currentPatient.caseFolderCollection.getActiveTab()
                } ) );
            }

            /**
             * Replaces the query templates with the desired values
             * can also just remove the query templates of activities when removeActivityData is passed
             * can also add the data of an activity that is passed as arg.extraActivityData instead
             * @param {Object} args
             * @param {Object} args.URL
             * @param {Object} args.extraActivityData
             * @param {Object} args.removeActivityData
             * @returns {String} URL
             */
            function createURLFromTemplate( args ) {
                var
                    URL = args.URL,
                    extraActivityData = args.extraActivityData,
                    removeActivityData = args.removeActivityData,
                    queries;

                queries = queryTemplates.map( function( template ) {
                    var
                        properties,
                        _template = template.replace( new RegExp( /{|}/, 'g' ), "" );

                    properties = _template.split( "." );
                    if( properties[0] === 'input' ) {
                        properties.splice( 0, 1 );
                    }

                    return {
                        template: template,
                        properties: properties
                    };
                } );

                queries.forEach( function( query ) {
                    var
                        selectedValue,
                        prIndex,
                        value;

                    if( !canRedirect ) {
                        return;
                    }

                    switch( query.properties[0] ) {
                        case 'caseFolder':
                            selectedValue = currentPatient.caseFolderCollection.getActiveTab();
                            if( !currentPatient.caseFolderCollection.getActiveTab() ) {
                                showError( i18n( 'InCaseMojit.activityConfigurableActionButtonsViewModel_clientJS.messages.SELECT_CASEFOLDER' ) );
                                canRedirect = false;
                                return;
                            }
                            break;
                        case 'user':
                            selectedValue = Y.doccirrus.auth.getUser();
                            break;
                        case 'patient':
                            selectedValue = currentPatient;
                            break;
                        case 'activity':
                            // for the solModal logic - removes the activity params
                            if( removeActivityData ) {
                                regExp = new RegExp( '\\?\\w+\\=(' + query.template + ')' );

                                if( regExp.test( URL ) ) {
                                    URL = URL.replace( regExp, '?' );
                                    return;
                                }

                                regExp = new RegExp( '\\&\\w+\\=(' + query.template + ')' );
                                URL = URL.replace( regExp, '' );
                                return;
                            }
                            // for the solModal logic - adds the incoming activity data
                            if( extraActivityData ) {
                                selectedValue = extraActivityData;
                                break;
                            }
                            if( !checkedActivities.length || checkedActivities.length > 1 ) {
                                showError( i18n( 'InCaseMojit.activityConfigurableActionButtonsViewModel_clientJS.messages.SELECT_ACTIVITY' ) );
                                canRedirect = false;
                                return;
                            }
                            selectedValue = checkedActivities[0];
                            break;
                        default:
                            showError( i18n( 'InCaseMojit.activityConfigurableActionButtonsViewModel_clientJS.messages.WRONG_URI_TEMPLATE' ) );
                            canRedirect = false;
                            return;
                    }

                    for( prIndex = 1; prIndex < query.properties.length; prIndex++ ) {
                        value = selectedValue[query.properties[prIndex]];
                        selectedValue = typeof value === 'function' ? value() : value;
                        if( Array.isArray( selectedValue ) ) {
                            if( query.properties[prIndex] === 'addresses' ) {
                                selectedValue = selectedValue.find( function( address ) {
                                    var kind = typeof address.kind === 'function' ? address.kind() : address.kind;
                                    return kind === "OFFICIAL";
                                } );
                            } else {
                                selectedValue = value[0];
                            }
                            selectedValue = typeof selectedValue === 'function' ? selectedValue() : selectedValue;
                        }
                    }

                    URL = URL.replace( query.template, selectedValue );
                } );

                URL = URL.replace( /\?&/, '?' );

                return URL;
            }

            if( item.action && item.action.flowType ) {
                return Y.doccirrus.utils.getCustomLocationAndEmployee( currentPatient )
                    .then( function( result ) {
                        Y.doccirrus.jsonrpc.api.flow.execute( {
                            query: {
                                _id: flowId
                            },
                            data: {
                                sourceQuery: {
                                    _id: unwrap( currentPatient._id )
                                },
                                extraData: extraData,
                                selectedCasefolderId: unwrap( currentPatient.activeCaseFolderId ),
                                activeCaseFolderTab: currentPatient.caseFolderCollection.getActiveTab(),
                                customLocation: result && result.customLocation,
                                customEmployee: result && result.customEmployee,
                                lastSchein: result && result.lastSchein,
                                selectedActivities: checkedActivities
                            }
                        } ).done( function( res ) {
                            if( res && res.data ) {
                                Y.doccirrus.DCSystemMessages.addMessage( {
                                    messageId: 'selectFlow-done',
                                    content: i18n( 'flow-api.FLOW_SUCCESS' )
                                } );
                            } else {
                                Y.doccirrus.DCSystemMessages.addMessage( {
                                    messageId: 'selectFlow-done',
                                    content: i18n( 'flow-api.FLOW_ERROR' ) + " no media Object generated.",
                                    level: 'WARNING'
                                } );
                            }

                        } ).fail( function( error ) {
                            Y.log( "triggerFlow failed: " + error );
                            Y.doccirrus.DCSystemMessages.addMessage( {
                                messageId: 'selectFlow-done',
                                content: i18n( 'flow-api.FLOW_ERROR' ) + (error && error.data ? ": " + error.data : ""),
                                level: 'WARNING'
                            } );
                        } );
                    } );
            }

            if( 'form' === item.action._id ) {
                if( item.formData ) {
                    newActivityConfig = {
                        'formId': item.formData.formId,
                        'formVersion': ''
                    };
                }
                return Y.doccirrus.inCaseUtils.createActivity( {
                    actType: item.actType,
                    newActivityConfig: newActivityConfig
                } );
            }

            if( 'upload' === item.action._id
                       || 'camera' === item.action._id
                       || 'scan' === item.action._id ) {
                return Y.doccirrus.inCaseUtils.createActivity( {
                    actType: item.actType,
                    newActivityConfig: {
                        'pressButton': item.action._id
                    }
                } );
            }

            if( 'uri' === item.action._id || 'solModal' === item.action._id ) {
                uri = item.uri;

                if( uri[0] === "_" && uri[uri.length - 1] === "_" ) {
                    uri[0] = "";
                    uri[uri.length - 1] = "";
                }

                queryTemplates = item.uri.match( uriTemplateRegex );
                isQueryTemplate = Boolean( queryTemplates && queryTemplates.length );
                isActivitySelected = Boolean( checkedActivities && checkedActivities.length );
            }

            if( canRedirect && 'uri' === item.action._id ) {
                if( isQueryTemplate ) {
                    uri = createURLFromTemplate( {
                        URL: uri
                    } );
                }
                if( uri.indexOf( 'http' ) === 0 || uri.indexOf( 'https' ) === 0 ) {
                    return window.open( uri );
                }
                return window.open( uri, '_self' );
            }

            // solModal flow has several cases
            if( canRedirect && 'solModal' === item.action._id ) {

                // case #1 multiple checked activities
                if( isActivitySelected && checkedActivities.length > 1 ) {

                    // case #2 checked activities + query template
                    if( isQueryTemplate ) {
                        uri = createURLFromTemplate( {
                            URL: uri,
                            removeActivityData: true
                        } );
                    }

                    return openSolModal( {
                        solModalUrl: new URL( uri ),
                        item: item,
                        activityIdList: checkedActivities.map( function( activity ) {
                            return activity._id;
                        } )
                    } );
                }

                // case #3 single checked activity + query template
                if( isActivitySelected && checkedActivities.length === 1 && isQueryTemplate ) {
                    uri = createURLFromTemplate( {
                        URL: uri
                    } );
                    return openSolModal( {
                        solModalUrl: new URL( uri ),
                        item: item
                    } );
                }

                // case #4 single checked activity + no query template
                if( isActivitySelected && checkedActivities.length === 1 ) {
                    return openSolModal( {
                        activityId: checkedActivities[0]._id,
                        solModalUrl: new URL( uri ),
                        item: item
                    } );
                }

                // case #5 no checked activities
                if( !isActivitySelected ) {

                    // case #6 no actType selected in action button config
                    if( !item.actType ) {
                        if( isQueryTemplate ) {
                            uri = createURLFromTemplate( {
                                URL: uri
                            } );
                        }

                        return openSolModal( {
                            solModalUrl: new URL( uri ),
                            item: item
                        } );
                    }

                    createSimpleActivity( item )
                        .then( function( result ) {

                            activitiesTable.reload();

                            // case #7 no checked activities + no query template
                            if( !isQueryTemplate ) {
                                return ({data: {activity: {_id: result.data}}});
                            }

                            // case #8 no checked activities + query template
                            return Promise.resolve( Y.doccirrus.jsonrpc.api.activity.getActivityForFrontend( {
                                query: {
                                    _id: result.data
                                }
                            } ) );
                        } )
                        .then( function( result ) {

                            // case #7 no checked activities + no query template
                            if( !isQueryTemplate ) {
                                return openSolModal( {
                                    activityId: result.data.activity._id,
                                    solModalUrl: new URL( uri ),
                                    item: item
                                } );
                            }

                            // case #8 no checked activities + query template
                            uri = createURLFromTemplate( {
                                URL: uri,
                                extraActivityData: result.data.activity
                            } );

                            return openSolModal( {
                                solModalUrl: new URL( uri ),
                                item: item
                            } );
                        } )
                        .catch( function( err ) {
                            return showError(
                                i18n( 'InCaseMojit.activityConfigurableActionButtonsViewModel_clientJS.messages.ERROR_CREATING_ACTIVITY' ) + ' ' + item.actType,
                                err.message
                            );
                        } );
                }
            }
        }
    }, {
        NAME: 'ActivityConfigurableActionButtonsViewModel',
        ATTRS: {
            binder: {
                valueFn: function() {
                    return Y.doccirrus.utils.getMojitBinderByType( 'InCaseMojit' ) || Y.doccirrus.utils.getMojitBinderByType( 'MirrorPatientMojit' );
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

    KoViewModel.registerConstructor( ActivityConfigurableActionButtonsViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'dcutils',
        'dcauth',
        'activity-schema',
        'casefolder-schema',
        'DCSolModal'
    ]
} );
