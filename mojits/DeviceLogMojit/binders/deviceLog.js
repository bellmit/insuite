/*jslint anon:true, sloppy:true, nomen:true*/

/* global YUI, ko, moment */
YUI.add( 'DeviceLogMojitBinder', function( Y, NAME ) {
    "use strict";
    var
        i18n = Y.doccirrus.i18n,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        KoViewModel = Y.doccirrus.KoViewModel;

    var mimeMap = {
        'application/pdf': '.pdf',
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'video/quicktime': '.mov',
        'video/mp4': '.mp4'
    };

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

    function onFail( error ) {
        if( typeof error === "string" ) {
            // Should never go here. Keeping this as last resort
            Y.doccirrus.DCWindow.notice( {
                type: 'error',
                message: error || 'Undefined error',
                window: {
                    width: Y.doccirrus.DCWindow.SIZE_SMALL
                }
            } );
        } else if(error && error.code === "115028" ) {
            // Means deviceLog cannot be reverted from the activity because the activity cannot be changed in its current state
            Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display', "info" );
        } else {
            Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
        }
    }
    
    function BinderViewModel( config ) {
        BinderViewModel.superclass.constructor.call( this, config );
    }

    Y.extend( BinderViewModel, KoViewModel.getDisposable(), {
        overviewTable: null,
        detailsElement: null,

        initializer: function BinderViewModel_initializer() {
            var self = this;

            self.detailsElement = document.getElementById( "deviceLogDetailEntry" );

            self.viewPortBtnI18n = Y.doccirrus.DCBinder.viewPortBtnI18n;
            self.titleTextI18n = i18n( 'DeviceLogMojit.title.text' );
            
            if ( window.location.hash.length > 1 ) {
                Y.doccirrus.jsonrpc.api.devicelog.read( {
                    query: {
                        _id: window.location.hash.substr( 1 )
                    }
                } ).done( function( res ) {
                    if ( res.data && res.data[0] ) {
                        self.showDetails( res.data[0] );
                    }
                } ).fail( self.clearDetails );
            }
            
            self.initOverviewTable();
        },
        defaultCellClick: function ( meta ) {
            var data = meta.row;
            if( data ) {
                this.showDetails( data );
            }
            return false;
        },

        initOverviewTable: function BinderViewModel_initOverviewTable() {
            var
                self = this;
                
            self.overviewTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    formRole: 'casefile-ko-insuite-table',
                    pdfTitle: i18n( 'DeviceLogMojit.title.text' ),
                    stateId: 'DeviceLogMojit-overviewTable',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.devicelog.read,
                    selectMode: 'none',
                    columns: [
                        {
                            forPropertyName: 'timestamp',
                            label: i18n( 'patienttransfer-schema.PatientTransfer_T.timestamp.i18n' ),
                            title: i18n( 'patienttransfer-schema.PatientTransfer_T.timestamp.i18n' ),
                            width: '9%',
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                            renderer: function TabOverviewViewModel_overviewTable_renderer_timestamp( meta ) {
                                var
                                    value = meta.value;

                                if( value ) {
                                    return moment( value ).format( 'DD.MM.YYYY HH:mm' );
                                } else {
                                    return '';
                                }
                            },
                            onCellClick: self.defaultCellClick.bind( self )
                        },
                        {
                            forPropertyName: 'created',
                            label: i18n( 'patienttransfer-schema.PatientTransfer_T.created.i18n' ),
                            title: i18n( 'patienttransfer-schema.PatientTransfer_T.created.i18n' ),
                            width: '7%',
                            isSortable: true,
                            sortInitialIndex: 0,
                            direction: 'DESC',
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                            renderer: function TabOverviewViewModel_overviewTable_renderer_created( meta ) {
                                var
                                    value = meta.value;

                                if( value ) {
                                    return moment( value ).format( 'DD.MM.YYYY HH:mm' );
                                } else {
                                    return '';
                                }
                            },
                            onCellClick: self.defaultCellClick.bind( self )
                        },
                        {
                            forPropertyName: 'patientName',
                            label: i18n( 'devicelog-schema.DeviceLog_T.patientName.i18n' ),
                            title: i18n( 'devicelog-schema.DeviceLog_T.patientName.i18n' ),
                            width: '10%',
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var data = meta.row;

                                if(meta.value && data.activityId) {
                                    return Y.Lang.sub('<a href="{href}" target="_blank">{text}</a>', {
                                        text: meta.value,
                                        href: Y.doccirrus.utils.getUrl( 'inCaseMojit' ) + '#/activity/' + data.activityId + "/section/documentform"
                                    });
                                } else if( meta.value ) {
                                    return meta.value;
                                } else {
                                    return null;
                                }
                            },
                            onCellClick: self.defaultCellClick.bind( self )
                        },
                        {
                            forPropertyName: 'user.name',
                            label: i18n( 'patienttransfer-schema.PatientTransfer_T.user.i18n' ),
                            title: i18n( 'patienttransfer-schema.PatientTransfer_T.user.i18n' ),
                            isFilterable: true,
                            isSortable: true,
                            width: '10%',
                            renderer: function( meta ) {
                                var data = meta.row,
                                    user = data.user;

                                if( user && user.length ) {
                                    return user[user.length - 1].name;
                                } else {
                                    return '';
                                }
                            },
                            onCellClick: self.defaultCellClick.bind( self )
                        },
                        {
                            forPropertyName: 'fileName',
                            label: i18n( 'GdtLogMojit.gdtLogSchema.fileNameText' ),
                            title: i18n( 'GdtLogMojit.gdtLogSchema.fileNameText' ),
                            isFilterable: true,
                            isSortable: true,
                            visible: false,
                            width: '6%',
                            renderer: function( meta ) {
                                var
                                    fileName = meta.value;

                                if( fileName ) {
                                    return fileName;
                                } else {
                                    return '';
                                }
                            },
                            onCellClick: self.defaultCellClick.bind( self )
                        },
                        {
                            forPropertyName: 'fileHash',
                            label: i18n( 'GdtLogMojit.gdtLogSchema.fileHashText' ),
                            title: i18n( 'GdtLogMojit.gdtLogSchema.fileHashText' ),
                            isFilterable: true,
                            isSortable: true,
                            visible: false,
                            width: '8%',
                            renderer: function( meta ) {
                                var
                                    fileHash = meta.value;

                                if( fileHash ) {
                                    return fileHash;
                                } else {
                                    return '';
                                }
                            },
                            onCellClick: self.defaultCellClick.bind( self )
                        },
                        {
                            forPropertyName: 'deviceId',
                            label: i18n( 'GdtLogMojit.gdtLogSchema.flowTitle' ),
                            title: i18n( 'GdtLogMojit.gdtLogSchema.flowTitle' ),
                            isFilterable: true,
                            isSortable: true,
                            visible: false,
                            width: '7%',
                            renderer: function( meta ) {
                                var
                                    flowTitle = meta.value;

                                if( flowTitle ) {
                                    return flowTitle;
                                } else {
                                    return '';
                                }
                            },
                            onCellClick: self.defaultCellClick.bind( self )
                        },
                        {
                            forPropertyName: 'attachedMedia',
                            label: i18n( 'devicelog-schema.DeviceLog_T.attachedMedia.i18n' ),
                            title: i18n( 'devicelog-schema.DeviceLog_T.attachedMedia.i18n' ),
                            isSortable: false,
                            isFilterable: false,
                            width: '7%',
                            renderer: function( meta ) {
                                return meta.value.length;
                            },
                            onCellClick: self.defaultCellClick.bind( self )
                        },
                        {
                            forPropertyName: 'status',
                            label: i18n( 'patienttransfer-schema.PatientTransfer_T.status.i18n' ),
                            title: i18n( 'patienttransfer-schema.PatientTransfer_T.status.i18n' ),
                            width: '8%',
                            isSortable: true,
                            isFilterable: true,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.inpacslog.types.Status_E.list,
                                optionsText: '-de',
                                optionsValue: 'val'
                            },
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            renderer: function( meta ) {
                                var
                                    status = meta.value;

                                return Y.doccirrus.schemaloader.getEnumListTranslation( 'inpacslog', 'Status_E', status, 'i18n', '' );
                            },
                            onCellClick: self.defaultCellClick.bind( self )
                        },
                        {
                            forPropertyName: '',
                            label: i18n( 'InpacsLogMojit.tabInpacsLogOverview.assign' ),
                            title: i18n( 'InpacsLogMojit.tabInpacsLogOverview.assign' ),
                            width: '7%',
                            isFilterable: false,
                            isSortable: false,
                            renderer: function( meta ) {
                                if( meta.row.status !== 'PROCESSED' ) {
                                    return Y.Lang.sub( '<button class="btn btn-xs btn-primary">{title}</button>', {title: i18n( 'InpacsLogMojit.tabInpacsLogOverview.assignRow')} );
                                }
                            },
                            onCellClick: function( meta ) {
                                var diceLogEntry;
                                if( meta.row && meta.row.status !== 'PROCESSED' ) {
                                    diceLogEntry = meta.row;
                                    Y.doccirrus.modals.patientAndActivitySelect.showDialog( diceLogEntry,
                                        function( result ) {
                                            if( result.success ) {
                                                self.clearDetails();
                                                self.overviewTable.reload();
                                            }
                                        }
                                    );
                                }

                                return false;
                            }
                        },
                        {
                            forPropertyName: '',
                            label: i18n( 'InpacsLogMojit.tabInpacsLogOverview.revert' ),
                            title: i18n( 'InpacsLogMojit.tabInpacsLogOverview.revert' ),
                            width: '7%',
                            isFilterable: false,
                            isSortable: false,
                            renderer: function( meta ) {
                                if( meta.row.status === 'PROCESSED' ) {
                                    return Y.Lang.sub( '<button class="btn btn-xs btn-primary">{title}</button>', {title: i18n( 'InpacsLogMojit.tabInpacsLogOverview.revertRow' )} );
                                }
                            },
                            onCellClick: function( meta ) {
                                if( meta.row && meta.row.status === 'PROCESSED' ) {
                                    showConfirmBox('warn', i18n( 'DeviceLogMojit.messages.revertDeviceLogConfirm' ), function() {
                                        var
                                            deviceLogEntry = meta.row;

                                        Y.doccirrus.jsonrpc.api.devicelog.revertDeviceLogEntryFromActivity( {
                                            data: {
                                                deviceLogId: deviceLogEntry._id
                                            }
                                        } )
                                        .then( function( result ) {
                                            if( result && result.data === "SUCCESSFUL" ) {
                                                self.clearDetails();
                                                self.overviewTable.reload();
                                            }
                                        } )
                                        .fail( onFail );
                                    });
                                }

                                return false;
                            }
                        }
                    ],
                    getCssRow: function( $context, css ) {
                        css[$context.$data.status === 'UNPROCESSED' ? 'text-danger' : 'text-success'] = true;
                    }
                }
            } );
        },
        
        clearDetails: function() {
            if ( this.detailsElement ) {
                while( this.detailsElement.firstChild ) {
                    this.detailsElement.removeChild( this.detailsElement.firstChild );
                }
                window.location = window.location.origin + window.location.pathname + "#";
            }
        },
        showDetails: function( data ) {
            var self = this,
                assignButton,
                patLink,
                type,
                link,
                img;
            
            self.clearDetails();
            window.location = window.location.origin + window.location.pathname + '#' + data._id;
            
            var info = document.createElement( "div" );
            info.setAttribute( "class", "panel panel-default" );

            var infoHead = document.createElement( "div" );
            infoHead.setAttribute( "class", "panel-heading" );
            infoHead.appendChild( document.createTextNode( i18n( 'activity-schema.Activity_T.attachments.i18n' ) + " (" ) );
            if ( data.deviceId ) {
                infoHead.appendChild( document.createTextNode(data.deviceId + ", " ) );
            }
            if ( data.patientName ) {
                if ( data.activityId ) {
                    patLink = document.createElement( "a" );
                    patLink.setAttribute( "href", "/incase#/activity/"+data.activityId + "/section/documentform" );
                    patLink.setAttribute( "target", "_blank" );
                    patLink.appendChild( document.createTextNode( data.patientName ) );
                    infoHead.appendChild( patLink );
                } else {
                    infoHead.appendChild( document.createTextNode( data.patientName ) );
                }
                infoHead.appendChild( document.createTextNode( ", " ) );
            }
            infoHead.appendChild( document.createTextNode( moment( data.timestamp ).format( "DD.MM.YYYY HH:mm" ) + ")" ) );
            
            var infoClose = document.createElement( "i" );
            infoClose.setAttribute( "class", "pull-right fa fa-lg fa-close" );
            infoClose.setAttribute( "style", "margin-top: 3px; cursor: pointer" );
            infoClose.onclick = self.clearDetails.bind( self );
            infoHead.appendChild( infoClose );
            
            info.appendChild( infoHead );

            var infoBody = document.createElement( "div" );
            infoBody.setAttribute( "class", "panel-body" );

            if ( data.attachedMedia ) {
                data.attachedMedia.forEach( function( media ) {
                    if (media.mediaId && media.contentType) {
                        type = media.contentType.toUpperCase().replace( /\//g, "_" );
                        link = document.createElement( "a" );
                        link.setAttribute( "href", "/media/" + media.mediaId + "_original." + type + ( mimeMap[media.contentType] || "" ) );
                        link.setAttribute( "target", "_blank" );
                        
                        img = document.createElement( "img" );
                        img.setAttribute( "style", "vertical-align: bottom; border: none; width: 48px; height: 48px; background: no-repeat center url('/static/DocCirrus/assets/images/ajax-loader-menu.gif')" );
                        img.setAttribute( "src", "/media/"+media.mediaId+"_48x48.IMAGE_JPEG.jpg" );
                        img.onerror = function() {
                            var loadError = document.createElement( "i" );
                            loadError.setAttribute( "class", "fa fa-warning" );
                            loadError.setAttribute( "style", "margin: 4px; padding: 6px; border: 2px solid lightgrey; border-radius: 8px; font-size: 24px; color: lightgrey;" );

                            infoBody.insertBefore( loadError, link );
                            infoBody.removeChild( link );
                        };
                        link.appendChild( img );
                        
                        infoBody.appendChild( link );
                    }
                });

                if ( "UNPROCESSED" === data.status ) {
                    infoBody.appendChild( document.createElement( "br" ) );
                    infoBody.appendChild( document.createElement( "br" ) );
    
                    assignButton = document.createElement( "button" );
                    assignButton.setAttribute( "class", "btn btn-xs btn-primary" );
                    assignButton.appendChild( document.createTextNode( i18n( 'DeviceLogMojit.buttons.match' ) ) );
                    assignButton.onclick = function() {
                        Y.doccirrus.modals.patientAndActivitySelect.showDialog( data,
                            function( result ) {
                                if( result.success ) {
                                    self.clearDetails();
                                    self.overviewTable.reload();
                                }
                            }
                        );
                    };
                    infoBody.appendChild( assignButton );
                }
            }
            info.appendChild( infoBody );
            self.detailsElement.appendChild( info );
        },
        toggleFullScreenHandler() {
            Y.doccirrus.DCBinder.toggleFullScreen();
        }
    } );

    Y.namespace( 'mojito.binders' )[NAME] = {

        jaderef: 'DeviceLogMojit',

        init: function( mojitProxy ) {
            this.mojitProxy = mojitProxy;
        },
        
        bind: function( node ) {
            var
            self = this;
            Y.doccirrus.DCBinder.initToggleFullScreen();

            Y.doccirrus.NavBarHeader.setActiveEntry( 'deviceLog' );

            self.node = node;

            self.binderViewModel = new BinderViewModel();
            ko.applyBindings( self.binderViewModel, node.getDOMNode() );
        }
    };

}, '0.0.1', {
    requires: [
        'oop',
        'router',
        'mojito-client',
        "DCBinder",
        'dcerrortable',
        'JsonRpcReflection-doccirrus',
        'KoUI-all',
        'intl',
        'mojito-intl-addon',
        'KoViewModel',
        'dcpatientandactivityselect',
        'inpacslog-schema'
    ]
} );
