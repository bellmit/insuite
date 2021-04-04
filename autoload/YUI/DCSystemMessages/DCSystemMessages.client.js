/*jslint anon:true, nomen:true*/
/*global YUI, $, _ */
YUI.add( 'DCSystemMessages', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * Module provides system log capabilities to the user
     * @module DCSystemMessages
     * @requires view, handlebars, lazy-model-list
     */

    Y.namespace( 'doccirrus' );
    var
        i18n = Y.doccirrus.i18n,
        NAV_OFFSET_Y = 38,
        VIEWMODE_SWITCH = 978,
        CSS_LEVELS = {
            WARNING: 'alert-warning',
            INFO: 'alert-info',
            SUCCESS: 'alert-success',
            ERROR: 'alert-danger'
        },
        /**
         * determines the viewMode based on windows width
         * @returns {string} either 'full' or 'limited'
         */
        getViewMode = function() {
            // TODO: check position fixed supported ?
            return Y.one( window ).get( 'winWidth' ) > VIEWMODE_SWITCH ? 'full' : 'limited';
        };
    // Y.UA.touchEnabled
    /**
     * `static` class providing a system log to the user
     * @class DCSystemMessages
     * @constructor
     * @extends View
     * @example
     Y.doccirrus.DCSystemMessages.addMessage({
         messageId: 'myId',
         content: 'fooBar',
         level: 'WARNING' // INFO, SUCCESS, ERROR
     });
     */
    // TODO: this should be a mojit
    var DCSystemMessages = Y.Base.create( 'DCSystemMessages', Y.View, [], {
        /** @see Y.View.template */
        template: Y.Handlebars.compile( [
            '<div class="dc-SystemMessages-header">',
                '<strong class="dc-SystemMessages-title">' + i18n( 'DCSystemMessages.systemMessagesTitle' ) + ' <span class="dc-SystemMessages-count">({{messagesCount}})</span></strong>',
            '<span class="dc-SystemMessages-tools">',
            '<span class="dc-SystemMessages-tool dc-SystemMessages-tool-closeAll">' + i18n( 'DCSystemMessages.closeAll' ) + ' <span class="glyphicon glyphicon-remove"></span></span>',
            '<span class="dc-SystemMessages-tool dc-SystemMessages-tool-toggleListVisible {{{glyphicon}}}"></span>',
            '</span>',
            '</div>',
            '<div class="dc-SystemMessages-list">',
            '{{#messages}}<div class="alert alert-dismissable {{{alertClass}}}" data-messageId="{{messageId}}">',
            '<button type="button" class="close" aria-hidden="true">&times;</button>',
            '<div class="alert-text" style="white-space: pre-line;">{{{content}}}</div>',
            '</div>{{/messages}}',
            '</div>'
        ].join( "" ) ),
        //template: Y.Handlebars.compile(Y.one('#template').getHTML()),
        /** @see Y.View.events */
        events: {
            '.close': {
                click: 'close'
            },
            '.dc-SystemMessages-tool-toggleListVisible': {
                click: 'toggleListVisible'
            },
            '.dc-SystemMessages-tool-closeAll': {
                click: 'closeAll'
            }
        },
        /** @see Y.View.initializer */
        initializer: function() {
            var
                self = this,
                initialExpandedvalue = self.getLocalStorage('expanded');

            self._attachedSyncEvents = [
                self.get( 'viewModel' ).after( 'add', self._onViewModelAdd, self ),
                self.get( 'viewModel' ).after( 'add', self.render, self ),
                self.get( 'viewModel' ).after( 'reset', self.render, self ),
                self.get( 'viewModel' ).after( 'remove', self.render, self ),
                self.after( 'viewModeChange', self.render, self ),
                self.after( 'toggleListVisibleChange', self.render, self ),
                Y.one( window ).on( 'resize', self.checkViewMode, self ),
                Y.one( window ).on( 'resize', self.align, self ),
                Y.one( window ).on( 'scroll', self.align, self ),
                Y.one( window ).on( 'system-messages:expand', self._onExpand, self )
            ];
            $( window ).on( 'system-messages:expand', this._onExpand.bind(this) );

            if (initialExpandedvalue !== undefined) {
                self.set( 'toggleListVisible', initialExpandedvalue );
                self.set( 'systemMessagesCounterVisible', !initialExpandedvalue );
            }

        },
        /** @see Y.View.destructor */
        destructor: function() {
            Y.Array.invoke( this._attachedSyncEvents, 'detach' );
            this.get( 'viewModel' ).destroy();
            //this.get('container').remove(true);
        },
        /**
         * Set update listFilter, systemMessagesCounterVisible, toggleListVisible
         * set local storage for expanded
         * and render
         * @param event
         * @param data
         * @private
         */
        _onExpand: function ( event, data ) {
            this.set('listFilter', data.listFilter);

            this.set('systemMessagesCounterVisible', data.systemMessagesCounterVisible);

            this.set('toggleListVisible', data.toggleListVisible);
            this.setLocalStorage('expanded', data.toggleListVisible);

            this.render();
        },
        /**
         * render the template into container
         * @returns {DCSystemMessages}
         */
        render: function() {
            var container = this.get( 'container' ),
                classNames = this.get( 'classNames' ),
                toggleListVisible = this.get( 'toggleListVisible' );

            this.checkViewMode();
            container.setHTML( this._renderContents() );
            container.addClass( classNames );
            container.setAttribute( 'style', 'z-index: 99999;' );

            if(this.get('visibleMessages').length > 0 && toggleListVisible && !Y.doccirrus.commonutils.isFrameView() ) {
                container.show();
                this.align();
            } else {
                container.hide();
            }
            return this;
        },
        // TODO: on resize should recalculate height, because of possible long text in message
        /**
         * render the template and return the generated markup
         * @returns {HTML}
         * @private
         */
        _renderContents: function() {
            var classNames = ['dc-SystemMessages'],
                toggleListVisible = this.get( 'toggleListVisible' ),
                listFilter = this.get('listFilter'),
                systemMessagesCounterVisible = this.get('systemMessagesCounterVisible'),
                viewMode = this.get( 'viewMode' ),
                viewModel = this.get( 'viewModel' ),
                viewModelJSON = viewModel.toJSON(),
                messages,
                content;

            // handle container classNames
            if( toggleListVisible ) {
                classNames.push( 'dc-SystemMessages-list-visible' );
            } else {
                classNames.push( 'dc-SystemMessages-list-hidden' );
            }

            // handle template rendering
            messages = { messages: viewModelJSON, messagesCount: viewModel.size() };

            $( window ).trigger('system-messages:update', {
                visible: systemMessagesCounterVisible,
                messagesCounter: _.reduce(messages.messages, function (acc, message) {
                    if (message.level === 'SUCCESS') {
                        acc.success++;
                    }

                    if (message.level === 'INFO') {
                        acc.info++;
                    }

                    if (message.level === 'WARNING') {
                        acc.warning++;
                    }

                    if (message.level === 'ERROR') {
                        acc.danger++;
                    }

                    return acc;
                }, {
                    success: 0,
                    info: 0,
                    warning: 0,
                    danger: 0
                }),
                totalCount: messages.messagesCount
            });

            // Filter List by category if needed
            if (listFilter !== 'ALL') {
                messages.messages = messages.messages.filter(function (message) {
                    return message.level === listFilter;
                });

                messages.messagesCount = messages.messages.length;
            }

            // Additional behaviour when on mobile, shows only the first item
            switch( viewMode ) {
                case 'full' :
                    classNames.push( 'dc-SystemMessages-viewMode-full' );
                    break;
                case 'limited' :
                    classNames.push( 'dc-SystemMessages-viewMode-limited' );
                    // reduce stuff to show
                    messages.messages = messages.messages.filter(function( item, index ) {
                        return index === 0;
                    });
                    break;
            }

            this.set( 'classNames', classNames );

            this.set('visibleMessages', messages.messages);

            content = this.template( messages, {
                helpers: Y.merge( {
                    alertClass: function() {
                        var message = this,
                            level = message.level || '',
                            css = '';
                        if( level in CSS_LEVELS ) {
                            css = CSS_LEVELS[level];
                        }
                        return css;
                    },
                    glyphicon: function() {
                        var glyphicon;
                        if( toggleListVisible ) {
                            glyphicon = 'glyphicon-resize-small';
                        } else {
                            glyphicon = 'glyphicon-resize-full';
                        }
                        return 'glyphicon ' + glyphicon;
                    }
                }, Y.Handlebars.helpers )
            } );

            return content;
        },
        /**
         * aligns this component in viewport regarding viewMode
         */
        align: function() {
            // TODO: glitches on nav
            var
                yBody = Y.one( document.body ),
                container = this.get( 'container' ),
                docHeight = container.get( 'docHeight' ),
                containerRegion = container.get( 'region' ),
                viewportRegion = container.get( 'viewportRegion' ),
                viewMode = this.get( 'viewMode' ),
                docScrollY = container.get( 'docScrollY' ),
                navBarHeaderFixed = yBody.hasClass( 'body-NavBarHeader-fixed' ),
                navBarFooterFixed = yBody.hasClass( 'body-NavBarFooter-fixed' ),
                containerOffsetY,
                bottomOffsetY;

            switch( viewMode ) {
                case 'full' :
                    if (navBarHeaderFixed) {
                        containerOffsetY = docScrollY + NAV_OFFSET_Y;
                    }
                    else if( docScrollY <= NAV_OFFSET_Y ) {
                        containerOffsetY = NAV_OFFSET_Y;
                    } else {
                        containerOffsetY = docScrollY;
                    }
                    container.setY( containerOffsetY );
                    break;
                case 'limited' :
                    bottomOffsetY = (docScrollY + viewportRegion.height - containerRegion.height) - (docHeight - containerRegion.height - NAV_OFFSET_Y);
                    containerOffsetY = viewportRegion.height - containerRegion.height + docScrollY;
                    if( navBarFooterFixed ) {
                        containerOffsetY -= NAV_OFFSET_Y;
                    }
                    else if( bottomOffsetY > 0 ) {
                        containerOffsetY -= bottomOffsetY;
                    }
                    container.setY( containerOffsetY );
                    break;
            }
        },
        /**
         * calculate viewMode and test against the current viewMode,
         * if those differ the calculated is set
         */
        checkViewMode: function() {
            var viewMode = this.get( 'viewMode' ),
                viewModeCurrent = getViewMode();
            if( viewMode !== viewModeCurrent ) {
                this.set( 'viewMode', viewModeCurrent );
            }
        },
        /**
         *
         * @param {String} messageId
         * @returns {Object|null}
         */
        getModelByMessageId: function( messageId ) {
            return Y.Array.find( this.get( 'viewModel' ).toArray(), function( item ) {
                return messageId === item.messageId;
            } );
        },
        /**
         * close handler when close button is clicked
         * @param {Y.Event} event
         */
        close: function( event ) {
            var yMessage = event.target.ancestor( '.alert' ),
                messageId = yMessage.getData( 'messageId' );

            this.baseClose(messageId);
        },
        /**
         * base handler to close a message
         * @param messageId
         */
        baseClose: function ( messageId ) {
            var
                model = this.getModelByMessageId( messageId );

            Y.log( 'Message will be removed from socketevent collection, id: ' + messageId, 'debug', 'DCSystemMessages.client.js' );
            // Remove system message on active tab.
            this.removeMessage( messageId );
            // Send message to remove system message on all other tabs.
            Y.doccirrus.communication.sendMessageToMySession( {
                data: {
                    action: 'closeMessage',
                    messageId: messageId
                }
            } );

            // Custom event handler
            this.onClose( model );
        },
        /**
         * Calls onClose method of config. this points to message object inside onClose function;
         * @param {Object} view model
         */
        onClose: function( model ) {
            if( model && 'function' === typeof model.onClose ) {
                model.onClose();
            }
        },
        /**
         * toggles list display
         */
        toggleListVisible: function( /*event*/ ) {
            var
                self = this,
                newValue = !self.get( 'toggleListVisible' );

            self.set( 'systemMessagesCounterVisible', !newValue);
            self.set( 'toggleListVisible', newValue);
            self.setLocalStorage('expanded', newValue);
            self.align();
        },
        /**
         * close all messages
         */
        closeAll: function() {
            var
                viewModel = this.get( 'viewModel' ),
                listFilter = this.get('listFilter'),
                messages = viewModel._items;

            _.clone(messages).forEach(function (message) {
                if (listFilter === 'ALL' || listFilter === message.level) {
                    this.baseClose(message.messageId);
                }
            }.bind(this));
        },
        /**
         * on viewModel add handler
         * @param {Y.Event} event
         * @private
         */
        _onViewModelAdd: function( event ) {
            var self = this,
                model = event.model,
                hasTimeout = Y.Object.owns( model, '_removeTimeout' ),
                delay = ( hasTimeout ? model._removeTimeout : 6000),
                shouldRemove = ('INFO' === model.level || hasTimeout);
            // remove by timeout
            if( shouldRemove && delay > 0 ) {
                setTimeout( function() {
                    var record = self.getModelByMessageId( model.messageId );
                    if( record ) {
                        self.get( 'viewModel' ).remove( record );
                    }
                }, delay );
            }
        },
        /**
         * Adds a message to this viewModel.
         * If level is INFO the message will be removed after the default value in ms or by a provided "_removeTimeout" delay.
         * @param {Object} config
         * @param {String} config.messageId id of message
         * @param {String} config.content text to display
         * @param {Function} [config.onClose] is called after message is closed
         * @param {Number} [config._removeTimeout] timeout in ms to remove message for any "level" ( if value is "0" message won't be removed )
         * @param {String} [config.level=INFO] either INFO, SUCCESS, WARNING, ERROR
         */
        addMessage: function( config ) {
            var viewModel = this.get( 'viewModel' );
            if( !config.messageId ) {
                config.messageId = viewModel._generateClientId();
            }
            viewModel.add( Y.merge( {
                "level": "INFO", clientId: config.messageId,
                "practiceId": "", "practiceName": "", "contentUrl": "",
                "state": "NEW", "channel": "WEB", "patientId": ""
            }, config ) );
        },
        /**
         * removes a message from this viewModel
         * @param {String|Object} message either id of message or the message object
         */
        removeMessage: function( message ) {
            var id = ('string' === typeof message ? message : message.messageId),
                record = this.getModelByMessageId( id );
            if( record ) {
                this.get( 'viewModel' ).remove( record );
            }
        },
        /**
         * Get localStorage data associated to SystemMessages
         * @param {String} propertyName
         * @param {*} value
         */
        getLocalStorage: function ( propertyName ) {
            var
                localStorageData = Y.doccirrus.utils.localValueGet( 'SystemMessages' ),
                data;

            if( localStorageData ) { // localValue seems to be unset
                data = JSON.parse( localStorageData );
            } else {
                data = {};
            }

            return data[propertyName];
        },
        /**
         * Set localStorage data associated to SystemMessages
         * @param {String} propertyName
         * @param {*} value
         */
        setLocalStorage: function ( propertyName, value ) {
            var
                localStorageData = Y.doccirrus.utils.localValueGet( 'SystemMessages' ),
                data;

            if( '' === localStorageData ) { // localValue seems to be unset
                data = {};
            } else {
                data = JSON.parse( localStorageData );
            }

            data[propertyName] = value;

            Y.doccirrus.utils.localValueSet( 'SystemMessages', data );
        }
    }, {
        ATTRS: {
            /**
             * a valueFn have to be provided for subclasses
             * @see Y.View.ATTRS.container
             * @attribute container
             * @type HTMLElement|Node|String
             * @default Y.Node.create(this.containerTemplate)
             * @writeOnce
             */
            container: {
                valueFn: function() {
                    return Y.Node.create( this.containerTemplate );
                },
                writeOnce: true
            },
            /**
             * @attribute viewModel
             * @type Y.LazyModelList
             * @default Y.LazyModelList
             */
            viewModel: {
                lazyAdd: false,
                setter: function( value ) {
                    if( value instanceof Y.LazyModelList ) {
                        return value;
                    }
                    return new Y.LazyModelList( value );
                },
                valueFn: function() {
                    return new Y.LazyModelList();
                }
            },
            /**
             * @attribute viewMode
             * @type String
             * @default 'full'|'limited'
             */
            viewMode: {
                lazyAdd: false,
                valueFn: getViewMode
            },
            /**
             * @attribute classNames
             * @type Array
             * @default 'dc-SystemMessages'
             */
            classNames: {
                lazyAdd: false,
                value: 'dc-SystemMessages',
                setter: function( value ) {
                    var array = Y.Lang.isArray( value ) ? value : value.split( ' ' ),
                        string = Y.Lang.isString( value ) ? value : array.join( ' ' );
                    this.get( 'container' ).setAttribute( 'class', string );
                    return array;
                }
            },
            /**
             * @attribute toggleListVisible
             * @type Boolean
             * @default true
             */
            toggleListVisible: {
                lazyAdd: false,
                value: true
            },
            /**
             * @attribute visibleMessages
             * @type Array
             * @default []
             */
            visibleMessages: {
                lazyAdd: false,
                value: []
            },
            /**
             * @attribute listFilter
             * @type String
             * @default 'ALL'
             */
            listFilter: {
                lazyAdd: false,
                value: 'ALL'
            },
            /**
             * @attribute systemMessagesCounterVisible
             * @type String
             * @default 'ALL'
             */
            systemMessagesCounterVisible: {
                lazyAdd: false,
                value: false
            }
        }
    } );
    /**
     * @property DCSystemMessages
     * @type {DCSystemMessages}
     * @for doccirrus
     * @static
     */
    Y.doccirrus.DCSystemMessages = new DCSystemMessages();
    // just render where we are required
    Y.once( 'load', function() {
        Y.doccirrus.DCSystemMessages.render().get( 'container' ).appendTo( document.body );
    } );

}, '0.0.1', {
    lang: ['en', 'de', 'de-ch'],
    requires: [
        'doccirrus',
        'dcutils',
        'view',
        'handlebars',
        'lazy-model-list'
    ]/*,
     TODO: check https://yuilibrary.com/yui/docs/api/classes/Loader.html#property_skin
     "skinnable": true*/
} );
