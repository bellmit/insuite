/**
 * User: sebastian.lara
 * Date: 11/04/19  13:35
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko, _*/



YUI.add( 'DCSolModal', function( Y, NAME ) {
        var LANG = Y.doccirrus.i18n.language;


        function DCSolModal(config, saveSoldata) {
            Y.log( 'Updating form with new activity _id', 'debug', NAME );
            this.config = config;
            this.saveSoldata = saveSoldata;

            this.init();
        }

        DCSolModal.prototype.init = function () {
            var self = this;

            Promise.resolve( Y.doccirrus.jsonrpc.api.jade.renderFile( {path: 'SolModalMojit/views/SolModal'} ) ).
                then( function( response ) {
                    return response && response.data;
                } )
                .then( function( template ) {
                    var ICON = this.config.icon || 'ICON_LIST',
                        SIZE,
                        aDCWindowResizeEvent,
                        bodyContent = Y.Node.create( template ),
                        confirmConfig = {
                            title:  _.get(this.config, 'confirm.title[' + LANG + ']', null),
                            message: _.get(this.config, 'confirm.message[' + LANG + ']', null),
                            callback: function( dialog ) {
                                if( dialog.success ) {
                                    this.closeModal();
                                }
                            }.bind(this),
                            window: {
                                width: 'medium'
                            }
                        },
                        CONFIRM_OK_BUTTON_LABEL = _.get(this.config, 'confirm.okBtnLabel[' + LANG + ']', null),
                        CONFIRM_CANCEL_BUTTON_LABEL = _.get(this.config, 'confirm.cancelBtnLabel[' + LANG + ']', null);

                    if ( CONFIRM_OK_BUTTON_LABEL ) {
                        confirmConfig.buttonOkConfig = {
                            label: CONFIRM_OK_BUTTON_LABEL
                        };
                    }

                     if ( CONFIRM_CANCEL_BUTTON_LABEL ) {
                         confirmConfig.buttonCancelConfig = {
                             label: CONFIRM_CANCEL_BUTTON_LABEL
                         };
                     }

                    this.modalConfig = {
                        id: 'DCSolModal',
                        bodyContent: bodyContent,
                        title: this.config.title[ LANG ],
                        icon: Y.doccirrus.DCWindow[ICON],
                        maximizable: true,
                        draggable: true,
                        resizeable: true,
                        modal: true,
                        centered: true,
                        render: document.body,
                        buttons: {
                            header: [
                                Y.doccirrus.DCWindow.getButton( 'close', {
                                    action: function() {
                                        if (this.solModified) {
                                            Y.doccirrus.DCWindow.confirm( confirmConfig );
                                        } else {
                                            this.closeModal();
                                        }
                                    }.bind(this)
                                }),
                                'maximize'
                            ],
                            footer: []
                        }
                    };

                    if (_.isPlainObject(this.config.size) && this.config.size.percentageSize) {
                        SIZE = this.config.size;
                        this.modalConfig.width = SIZE.width || 400;
                        this.modalConfig.height = SIZE.height || 400;
                        this.modalConfig.minHeight = 600;
                        this.modalConfig.minWidth = Y.doccirrus.DCWindow.SIZE_LARGE;

                        this.modalConfig.after = {
                            render: function() {
                                var
                                        modalBody = this,
                                        minHeight = modalBody.get( 'minHeight' ),

                                        modalBodyResizeHandler = function() {

                                            var
                                                    winHeight = Y.one( window ).get( 'winHeight' );
                                            if( !modalBody.resizeMaximized.get( 'maximized' ) ) {
                                                if( winHeight > minHeight ) {
                                                    modalBody.set( 'height', (window.innerHeight * (SIZE.height || 95)) / 100 );
                                                    modalBody.set( 'width', (window.innerWidth * (SIZE.width || 93)) / 100 );
                                                } else {
                                                    modalBody.set( 'width', window.innerWidth );
                                                    modalBody.set( 'height', window.innerHeight );
                                                }
                                                modalBody.set( 'centered', true );
                                            }
                                        };
                                aDCWindowResizeEvent = Y.one( window ).on( 'resize', modalBodyResizeHandler );
                                modalBodyResizeHandler();
                            },
                            destroy: function() {
                                if( aDCWindowResizeEvent ) {
                                    aDCWindowResizeEvent.detach();
                                }
                                ko.cleanNode( bodyContent.getDOMNode() );
                            }
                        };
                    } else if (_.isPlainObject(this.config.size)) {
                        SIZE = this.config.size;
                        this.modalConfig.width = SIZE.width || 400;
                        this.modalConfig.height = SIZE.height || 400;
                        this.modalConfig.minHeight = SIZE.minHeight || 600;
                    } else {
                        SIZE = this.config.size || 'SIZE_XLARGE';
                        this.modalConfig.width = Y.doccirrus.DCWindow[SIZE];
                        this.modalConfig.height = Y.doccirrus.DCWindow[SIZE];
                    }

                    this.solModal = new Y.doccirrus.DCWindow( this.modalConfig );

                    // Maximize modal handling based on localStorage
                    this.solModal.resizeMaximized.set('maximized', this.getLocalStorage('maximized') || false);
                    this.solModal.resizeMaximized.after('maximizedChange', this.onMaximizedChange.bind(this));

                    ko.applyBindings( {
                        notifyIframeBind: function($element) {
                            this.PostMessageConnection = Y.doccirrus.utils.getPostMessageConnectionInstance();

                            self.contentWindow = $element.contentWindow;

                            this.PostMessageConnection
                                .addListener(this.iframeConnectedListener.bind(this), 'CONNECTED')
                                .addListener(this.iframeModified.bind(this), 'SOL_MODIFIED')
                                .addListener(this.iframeGetDataToSave.bind(this), 'DATA_TO_SAVE')
                                .addListener(this.iframeCloseModal.bind(this), 'CLOSE_MODAL')
                                .setIframeWindow(this.config.iframeUrl, $element.contentWindow);
                        }.bind(this),
                        iframeUrl: this.config.iframeUrl
                    }, bodyContent.getDOMNode() );
                }.bind(this));
        };

        DCSolModal.prototype.iframeCloseModal = function(event) {
            if ( event.data.payload ) {
                this.closeModal();
            }
        };

        DCSolModal.prototype.closeModal = function() {
            this.PostMessageConnection.clean();
            this.solModal.close();
        };

        DCSolModal.prototype.iframeGetDataToSave = function(event) {
            this.saveSoldata(event.data.payload, function() {
                this.closeModal();
            }.bind(this));
        };

        DCSolModal.prototype.iframeConnectedListener = function() {
            // TODO: Add future needed functionality when the SolModal is connected
        };

        DCSolModal.prototype.iframeModified = function(event) {
            this.solModified = event.data.payload;
        };

        DCSolModal.prototype.getPostMessageConnection = function () {
            return this.PostMessageConnection;
        };

        /**
         * Set localStorage data associated the SOL modal
         * @param {String} propertyName
         * @param {*} value
         */
        DCSolModal.prototype.getLocalStorage = function ( propertyName ) {
            var
                localValue = Y.doccirrus.utils.localValueGet( 'SolModal' ),
                currentModalObject;

            if( '' !== localValue ) { // localValue seems to be unset
                localValue = JSON.parse( localValue );
                currentModalObject = _.find(localValue, { iframeUrl: this.config.iframeUrl }); // Find index of current solModal object
            }

            if (currentModalObject) {
                return currentModalObject[propertyName];
            }
        };

        /**
         * Set localStorage data associated the SOL modal
         * @param {String} propertyName
         * @param {*} value
         */
        DCSolModal.prototype.setLocalStorage = function ( propertyName, value ) {
            var
                localValue = Y.doccirrus.utils.localValueGet( 'SolModal' ),
                currentModalObjectIndex,
                currentModalObject;

            if( '' === localValue ) { // localValue seems to be unset
                localValue = [];
            } else {
                localValue = JSON.parse( localValue );
                currentModalObjectIndex = _.findIndex(localValue, { iframeUrl: this.config.iframeUrl }); // Find index of current solModal object
            }

            if (
                currentModalObjectIndex === -1 ||
                !currentModalObjectIndex && currentModalObjectIndex !== 0
            ) {
                currentModalObject = {}; // current solModal object seems to be unset
                currentModalObject[propertyName] = value;
                currentModalObject.iframeUrl = this.config.iframeUrl;
                localValue.push(currentModalObject);
            } else {
                currentModalObject = localValue[currentModalObjectIndex];
                currentModalObject[propertyName] = value;
                localValue.splice(currentModalObjectIndex, 1, currentModalObject);
            }

            Y.doccirrus.utils.localValueSet( 'SolModal', localValue );
        };

        DCSolModal.prototype.onMaximizedChange = function (yEvent) {
            this.setLocalStorage('maximized', yEvent.newVal);
        };

        Y.namespace( 'doccirrus.modals' )[NAME] = DCSolModal;
    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'DCWindowBootstrap',
            'doccirrus',
            'dcutils'
        ]
    }
);
