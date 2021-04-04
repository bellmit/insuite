/*global YUI, ko,_, moment */

YUI.add( 'DCKimSignatureModal', function( Y, NAME ) {
        'use strict';

        var i18n = Y.doccirrus.i18n,
            TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
            KoViewModel = Y.doccirrus.KoViewModel,
            modalTitelI18n = i18n( 'InCaseMojit.KimSignatureModal.Title' ),
            signNowButtonI18n = i18n( 'InCaseMojit.KimSignatureModal.signNowButton' ),
            sendButtonI18n = i18n( 'InCaseMojit.KimSignatureModal.sendNowButton' ),
            CONFIRM_STOP_SIGNATURE_PROCESS = i18n( 'InCaseMojit.KimSignatureModal.CONFIRM_STOP_SIGNATURE_PROCESS' ),
            unwrap = ko.unwrap,
            catchUnhandled = Y.doccirrus.promise.catchUnhandled;

        function showError( err ) {
            _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
        }

        function KimSignatureModel() {
            KimSignatureModel.superclass.constructor.apply( this, arguments );
        }

        Y.extend( KimSignatureModel, KoViewModel.getBase(), {
            initializer: function() {
                var
                    self = this,
                    storedTiContext = Y.doccirrus.utils.localValueGet( 'KimSelectedTiContext' );

                function canBeSigned( activity ) {
                    return !activity.kimState || activity.kimState === 'NOT_SIGNED';
                }

                function areSigned( activity ) {
                    return activity.kimState === 'SIGNED';
                }

                self.isSigningDocuments = ko.observable( false );
                self.successfullySignedActivities = ko.observableArray();
                self.activitiesToSign = self.initialConfig.selectedActivities.filter( canBeSigned );
                self.signingProcessFinished = ko.observable( self.activitiesToSign.length === 0 );
                self.alreadySignedActivities = self.initialConfig.selectedActivities.filter( areSigned );
                self.activitiesCanNotBeSigned = self.initialConfig.selectedActivities.filter( function( activity ) {
                    return !canBeSigned( activity ) && !areSigned( activity );
                } );

                self.authTerminal = ko.observable( '' );
                self.documentsToSign = ko.observable( '' );
                self.infoSignatureProcess = ko.observable( '' );
                self.selectedTiContext = ko.observable( '' );
                self.tiContexts = ko.observableArray( self.initialConfig.tiContexts );

                // preselect tiContext from localStorage
                if (storedTiContext && self.tiContexts()){

                    self.tiContexts().forEach(function(el){

                        if (el.display === storedTiContext ){
                            self.selectedTiContext(el);
                        }
                    });
                }

                self.availableCards = ko.observableArray( [] );
                self.selectedCard = ko.observable( null );
                self.listDocumentsToBeSigned = ko.observableArray( self.createDocList( self.activitiesToSign ) );
                self.documentsHelpText = self.getDocumentHelpText();
                self.jobNumberInProgress = ko.observable();

                self.canSign = ko.computed( function() {
                    return Boolean( unwrap( self.selectedCard ) ) && !unwrap( self.isSigningDocuments ) && !unwrap( self.signingProcessFinished );
                } );

                self.canSend = ko.computed( function() {
                    return unwrap( self.signingProcessFinished );
                } );

                self.activitiesThatCanBeSend = ko.computed( function() {
                    return (unwrap( self.successfullySignedActivities ) || []).concat( self.alreadySignedActivities );
                } );

                self.signingProcessFinishedMessage = ko.computed( function() {
                    var signingProcessFinished = unwrap( self.signingProcessFinished ),
                        activitiesThatCanBeSend = unwrap( self.activitiesThatCanBeSend );
                    if( signingProcessFinished ) {
                        return i18n( 'InCaseMojit.KimSignatureModal.N_ACTIVITIES_CAN_BE_SEND', {data: {nActivities: activitiesThatCanBeSend.length}} );
                    }
                } );

                self.initTranslation();
                self.initCardSelection();

                Y.doccirrus.communication.once( {
                    event: 'signDocumentProcessFinished',
                    done: function( response ) {
                        var data = response && response.data && response.data[0],
                            jobNumber = unwrap( self.jobNumberInProgress );

                        if( !jobNumber || jobNumber !== (data && data.jobNumber) ) {
                            return;
                        }

                        self.signingProcessFinished( true );
                        self.isSigningDocuments( false );

                        if( data && data.status === 'OK' ) {
                            self.processSignResults( data.processedResults );
                        } else if( data && data.errors && data.errors.length ) {
                            self.logProcessInfo( {warnings: data.errors} );
                        } else {
                            self.infoSignatureProcess( 'ERROR' );
                        }

                    },
                    handlerId: 'signDocumentProcessFinishedListener'
                } );

            },
            initTranslation: function() {
                var
                    self = this;

                self.callingContextI18n = i18n( 'InCaseMojit.KimSignatureModal.callingContext' );
                self.cardI18n = i18n( 'InCaseMojit.KimSignatureModal.card' );
                self.documentsToSignI18n = i18n( 'InCaseMojit.KimSignatureModal.documentsToSign' );
                self.infoSignatureProcessI18n = i18n( 'InCaseMojit.KimSignatureModal.infoSignatureProcess' );
                self.noHBAWarningI18n = i18n( 'InCaseMojit.KimSignatureModal.NO_HBA_WARNING' );
            },
            initCardSelection: function() {
                var self = this,
                    storedSelectedCard = Y.doccirrus.utils.localValueGet( 'KimselectedCard' );

                self.addDisposable( ko.computed( function() {
                    var
                        selectedTiContext = ko.unwrap( self.selectedTiContext );

                    if( !selectedTiContext ) {
                        return;
                    }

                    Promise.resolve( Y.doccirrus.jsonrpc.api.timanager.getCardsForQes( selectedTiContext ) )
                        .then( function( result ) {
                            self.availableCards( result.data.map( function( card ) {
                                card.display = [card.CardHolderName, ['(', card.CardType, ')'].join( '' )].join( ' ' );
                                return card;
                            } ) );
                            // preselect selectedCard from localStorage
                            if (storedSelectedCard && self.availableCards()){
                                self.availableCards().forEach(function(el){

                                    if (el.display === storedSelectedCard ){
                                        self.selectedCard(el);
                                    }
                                });
                            }
                        } )
                        .catch( function( err ) {
                            _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                        } );
                } ).extend( {rateLimit: {timeout: 500, method: "notifyWhenChangesStop"}} ) );

                self.selectedCardInfo = ko.computed( function() {
                    var selectedCard = unwrap( self.selectedCard ),
                        pinStatus = selectedCard && selectedCard.pinOperationResult && selectedCard.pinOperationResult.PinStatus;

                    if( !pinStatus ) {
                        return null;
                    }

                    return Y.doccirrus.tiUtils.PinStatus[pinStatus];
                } );

                self.showNoQesWarning = ko.computed( function() {
                    var selectedCard = unwrap( self.selectedCard ),
                        CardType = selectedCard && selectedCard.CardType;
                    return CardType && CardType !== 'HBA';
                } );
            },
            processSignResults: function( results ) {
                var self = this,
                    activityInvalidMap = {},
                    log = 'OK\n',
                    successfullySignedActivities,
                    invalidActivityIds,
                    renderedResults = results.map( function( result ) {
                        var renderedErrors, renderedContentType,
                            matchedAttachedMedia = result.attachedMedia,
                            activity = result.activity;

                        if( !activity ) {
                            Y.log( 'activity not found for result ' + JSON.stringify( result ), 'info', NAME );
                            return;
                        }

                        if( !activityInvalidMap[activity._id] &&
                            (result.errors.length || ['OK', 'WARNING'].indexOf( result.status ) === -1) ) {

                            activityInvalidMap[activity._id] = true;
                        }

                        if( result.errors.length ) {
                            renderedErrors = ': ' + result.errors.map( function( warning ) {
                                return warning.message || Y.doccirrus.errorTable.getMessage( warning );
                            } );
                        }

                        renderedContentType = (matchedAttachedMedia && matchedAttachedMedia.contentType ? [' (', matchedAttachedMedia.contentType, ')'].join( '' ) : null);

                        return [result.status, ': ', self.renderActivity( activity ), renderedContentType, renderedErrors]
                            .filter( Boolean ).join( '' );
                    } ).filter( Boolean ).join( '\n' );

                invalidActivityIds = Object.keys( activityInvalidMap );
                successfullySignedActivities = self.activitiesToSign.filter( function( activityToSign ) {
                    return invalidActivityIds.indexOf( activityToSign._id );
                } );

                self.successfullySignedActivities( successfullySignedActivities );
                self.infoSignatureProcess( log + renderedResults );
            },
            getDocumentHelpText: function() {
                var self = this,
                    result = [];

                if( self.alreadySignedActivities.length ) {
                    result.push( i18n( 'InCaseMojit.KimSignatureModal.MORE_DOCUMENTS_WILL_BE_SENT', {data: {nDocs: self.alreadySignedActivities.length}} ) );
                }
                if( self.activitiesCanNotBeSigned.length ) {
                    result.push( i18n( 'InCaseMojit.KimSignatureModal.MORE_DOCUMENTS_WILL_BE_IGNORED', {data: {nDocs: self.activitiesCanNotBeSigned.length}} ) );
                }

                return result.join( '<br>' );
            },
            createDocList: function( selected ) {
                var self = this,
                    document = [],
                    res, n, i, doc, actTypeI18n;

                res = _.groupBy( selected, function( item ) {
                    return item.actType;
                } );
                for( const item in res ) {
                    if( res.hasOwnProperty( item ) ) {
                        actTypeI18n = Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', res[item][0].actType, 'i18n', 'k.A.' );

                        doc = {
                            document: res[item][0].actType,
                            documentText: actTypeI18n + ' (' + res[item].length + ')',
                            subDocuments: []
                        };
                        for( n = 0; n < res[item].length; n++ ) {
                            i = res[item][n];
                            doc.subDocuments.push( {
                                data: self.renderActivity( i )
                            } );
                        }

                        document.push( doc );
                    }
                }
                return document;
            },
            renderActivity: function( activity ) {
                return moment( activity.timestamp ).format( TIMESTAMP_FORMAT ) + ' ' + activity.content;
            },
            logProcessInfo: function( args ) {
                var self = this,
                    warnings = args.warnings || [],
                    processing = args.processing,
                    jobNumber = args.jobNumber,
                    renderedWarnings = warnings.map( function( warning ) {
                        return warning.message || Y.doccirrus.errorTable.getMessage( warning );
                    } ),
                    additionals = [];

                if( processing === false ) {
                    additionals.push( 'Signatur konnte nicht gestartet werden!' );
                }

                if( jobNumber ) {
                    additionals.push( 'Signaturprozess gestartet. Jobnummer: ' + jobNumber );
                }

                self.infoSignatureProcess( renderedWarnings.concat( additionals ).join( '\n' ) );
            },
            signActivities: function() {
                var self = this,
                    activityIds = self.activitiesToSign.map( function( act ) {
                        return act._id;
                    } ),
                    selectedCard = unwrap( self.selectedCard ),
                    cardHandle = selectedCard.CardHandle,
                    pinStatus = selectedCard.pinOperationResult.PinStatus,
                    requiredActionSmcb = selectedCard.CardType === 'SMC-B' && Y.doccirrus.tiUtils.requiredActionForPinStatus[pinStatus],
                    promise,
                    selectedTiContext = self.selectedTiContext(),
                    context = selectedTiContext.context;

                Y.doccirrus.utils.localValueSet('KimSelectedTiContext', selectedTiContext.display);
                Y.doccirrus.utils.localValueSet('KimselectedCard',selectedCard.display);

                self.isSigningDocuments( true );

                if( requiredActionSmcb ) {
                    promise = Y.doccirrus.modals.pinOperationModal.show( {
                        modalMessage: i18n( 'InTiMojit.pinOperationInitialMessage.' + requiredActionSmcb ).i18n,
                        methodToCall: requiredActionSmcb,
                        context: context,
                        CtId: selectedTiContext.CtId,
                        CardHandle: cardHandle
                    } );
                } else {
                    promise = Promise.resolve();
                }

                return promise.then( function() {
                    return Promise.resolve( Y.doccirrus.jsonrpc.api.tiQES.signDocuments( {
                        cardHandle: cardHandle,
                        context: context,
                        activityIds: activityIds
                    } ) )
                        .then( function( response ) {
                            var data = response.data;
                            if( data.warnings.length ) {
                                self.logProcessInfo( {warnings: data.warnings, processing: data.data.processing} );
                            }
                            if( !data.data.processing ) {
                                self.isSigningDocuments( false );
                                self.jobNumberInProgress( null );
                            } else {
                                self.jobNumberInProgress( data.data.jobNumber );
                                self.logProcessInfo( {processing: true, jobNumber: data.data.jobNumber} );
                            }
                        } )
                        .catch( function( err ) {
                            self.isSigningDocuments( false );
                            self.logProcessInfo( {warnings: [err], processing: false} );
                        } );
                } ).catch( catchUnhandled );
            },
            stopSigningProcess: function() {
                var
                    self = this,
                    isSigningDocuments = unwrap( self.isSigningDocuments );

                return new Promise( function( resolve, reject ) {
                    if( !isSigningDocuments ) {
                        resolve( 'STOPPED' );
                        return;
                    }
                    Y.doccirrus.DCWindow.confirm( {
                        message: CONFIRM_STOP_SIGNATURE_PROCESS,
                        callback: function( result ) {
                            var selectedTiContext = self.selectedTiContext(),
                                context = selectedTiContext.context,
                                jobNumber = unwrap( self.jobNumberInProgress );
                            if( result.success ) {
                                Promise.resolve( Y.doccirrus.jsonrpc.api.tiQES.stopSigningProcess( {
                                    context: context,
                                    jobNumber: jobNumber
                                } ) )
                                    .then( function( response ) {
                                        var result = response.data && response.data.Status && response.data.Status.Result;
                                        if( result === 'OK' ) {
                                            resolve( 'STOPPED' );
                                        } else {
                                            reject( response );
                                        }
                                    } )
                                    .catch( reject );
                                return;
                            }

                            resolve( 'NOT_STOPPED' );
                        }
                    } );
                } );
            }
        } );

        function KimSignatureModal() {
        }

        KimSignatureModal.prototype.show = function( selected ) {
            var template;

            Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                .renderFile( {path: 'InCaseMojit/views/KimSignatureModal'} )
            )
                .then( function( response ) {
                    template = response && response.data;
                    return Promise.resolve( Y.doccirrus.jsonrpc.api.ticontext.getConfigurationParameters() )
                        .then( function( res ) {

                            var tiContexts = (res && res.data || []),
                                unraveledTiContext = [],
                                i;

                            tiContexts.forEach( function( item ) {
                                var newElement;
                                for( i = 0; i < item.CtIds.length; i++ ) {
                                    newElement = _.cloneDeep( item );
                                    newElement.CtId = item.CtIds[i];
                                    newElement.CtName = item.CtNames[i];
                                    newElement.display = [item.context.MandantName, item.context.WorkplaceName, item.context.ClientSystemId, item.CtNames[i]].join( '/' );
                                    delete newElement.CtIds;
                                    delete newElement.CtNames;
                                    unraveledTiContext.push( newElement );
                                }
                            } );

                            return unraveledTiContext;
                        } );
                } )
                .then( function( tiContexts ) {
                    var
                        bodyContent = Y.Node.create( template ),
                        kimSignatureModel = new KimSignatureModel( {
                            tiContexts: tiContexts,
                            selectedActivities: selected
                        } ),
                        modal;

                    modal = new Y.doccirrus.DCWindow( {
                        className: 'DCWindow-Support',
                        bodyContent: bodyContent,
                        title: modalTitelI18n,
                        width: Y.doccirrus.DCWindow.SIZE_LARGE,
                        minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                        height: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                        minHeight: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                        type: 'info',
                        centered: true,
                        modal: true,
                        render: document.body,
                        buttons: {
                            header: [
                                {
                                    name: 'close',
                                    isDefault: true,
                                    action: function() {
                                        kimSignatureModel.stopSigningProcess().then( function( result ) {
                                            if( result === 'STOPPED' ) {
                                                Y.doccirrus.communication.off( 'signDocumentProcessFinished', 'signDocumentProcessFinishedListener' );
                                                modal.close();
                                            }
                                        } ).catch( showError );
                                    }
                                }],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                    action: function() {
                                        kimSignatureModel.stopSigningProcess().then( function( result ) {
                                            if( result === 'STOPPED' ) {
                                                Y.doccirrus.communication.off( 'signDocumentProcessFinished', 'signDocumentProcessFinishedListener' );
                                                modal.close();
                                            }
                                        } ).catch( showError );
                                    }
                                } ),
                                {
                                    label: signNowButtonI18n,
                                    name: 'SIGN',
                                    value: 'SIGN',
                                    isDefault: true,
                                    action: function() {
                                        kimSignatureModel.signActivities();
                                    }
                                },
                                {
                                    label: sendButtonI18n,
                                    name: 'SEND',
                                    value: 'SEND',
                                    action: function() {
                                        Y.doccirrus.modals.kimMessageOutboxModal.show( unwrap( kimSignatureModel.activitiesThatCanBeSend ).map( function( item ) {
                                            return item._id;
                                        } ) );
                                        modal.close();
                                    }
                                }
                            ]
                        }
                    } );

                    kimSignatureModel.addDisposable( ko.computed( function() {
                        if( !modal ) {
                            return;
                        }
                        var
                            canSign = kimSignatureModel.canSign(),
                            okBtn = modal.getButton( 'SIGN' ).button;
                        if( canSign ) {
                            okBtn.enable();
                        } else {
                            okBtn.disable();
                        }
                    } ) );
                    kimSignatureModel.addDisposable( ko.computed( function() {
                        if( !modal ) {
                            return;
                        }
                        var
                            canSend = kimSignatureModel.canSend(),
                            okBtn = modal.getButton( 'SEND' ).button;
                        if( canSend ) {
                            okBtn.enable();
                        } else {
                            okBtn.disable();
                        }
                    } ) );

                    ko.applyBindings( kimSignatureModel, bodyContent.getDOMNode() );
                } ).catch( catchUnhandled );
        };

        KimSignatureModal.prototype.decideToOpenSignOrSendModal = function( selectedActivities ) {
            var hasUnSignedActivities = selectedActivities.some( function( act ) {
                return act.kimState !== 'SIGNED';
            } );

            if( hasUnSignedActivities ) {
                Y.doccirrus.modals.kimSignatureModal.show( selectedActivities );
            } else {
                Y.doccirrus.modals.kimMessageOutboxModal.show( selectedActivities.map( function( item ) {
                    return item._id;
                } ) );
            }
        };

        Y.namespace( 'doccirrus.modals' ).kimSignatureModal = new KimSignatureModal();

    },
    '0.0.1',
    {
        requires: [
            'KoViewModel',
            'tiUtils',
            'PinOperationModal'
        ]
    }
);
