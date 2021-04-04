/*jslint anon:true, nomen:true*/
/*global YUI, ko, $*/

'use strict';

YUI.add( 'DCWindowBootstrap', function( Y/*, NAME*/ ) {

    var
        i18n = Y.doccirrus.i18n,
        KoUI = Y.doccirrus.KoUI;

    Y.namespace( 'Plugin', 'doccirrus' );

    /** @class DCWindowBootstrap
     * @extends Panel
     * @constructor
     */
    function DCWindowBootstrap() {
        var self = this;
        self.config = arguments[0];

        if( typeof self.config.width === 'string' ) {
            switch( self.config.width.toLowerCase() ) {
                case 'small' :
                    self.config.width = Y.doccirrus.DCWindowBootstrap.SIZE_SMALL + "px";
                    break;
                case 'medium' :
                    self.config.width = Y.doccirrus.DCWindowBootstrap.SIZE_MEDIUM + "px";
                    break;
                case 'large' :
                    self.config.width = Y.doccirrus.DCWindowBootstrap.SIZE_LARGE + "px";
                    break;
                case 'xlarge' :
                    self.config.width = Y.doccirrus.DCWindowBootstrap.SIZE_XLARGE + "px";
                    break;
            }
        }

        self.config.templateModal = self.config.templateModal || '<div class="modal fade" id="modal" tabindex="-1" data-bind="with: config" role="dialog" style="z-index: 3000;" aria-hidden="true">' +
                                                                 '<div class="modal-dialog" role="document", data-bind="style: {width: width}">' +
                                                                 '<div class="modal-content">' +
                                                                 '<div class="modal-header">' +
                                                                 '<span data-bind="foreach: buttons.header" style="position:absolute; top:15px; right: 15px;">' +
                                                                 '<span style="margin-left: 5px" data-bind="template: $data.template"></span>' +
                                                                 '</span>' +
                                                                 '<div class="modal-title">' +
                                                                 '<span class="modal-title-icon" data-bind="attr: {class: icon}"></span>' +
                                                                 '&nbsp;' +
                                                                 '<strong class="modal-title-text font-weight-bold" data-bind="text: title"></strong>' +
                                                                 '</div>' +
                                                                 '</div>' +
                                                                 '<div class="modal-body" data-bind="html: bodyContent"></div>' +
                                                                 '<div class="modal-footer" data-bind="foreach: buttons.footer">' +
                                                                 '<span style="margin-left: 5px" data-bind="template: $data.template"></span>' +
                                                                 '</div>'+
                                                                 '</div>' +
                                                                 '</div>' +
                                                                 '</div>';
        $(self.config.render).append(self.config.templateModal);
        $('#modal').modal({
            keyboard: false,
            show: true,
            backdrop: 'static'
        }).on('hidden.bs.modal', function () {
            this.remove();
        });
    }
    var KoComponentManager = KoUI.KoComponentManager;
    DCWindowBootstrap.SIZE_SMALL = 320;
    DCWindowBootstrap.SIZE_MEDIUM = 460;
    DCWindowBootstrap.SIZE_LARGE = 600;
    DCWindowBootstrap.SIZE_XLARGE = 900;
    DCWindowBootstrap.ICON_SEARCH = 'fa fa-search';
    DCWindowBootstrap.ICON_LIST = 'fa fa-list';
    DCWindowBootstrap.ICON_EDIT = 'fa fa-pencil';
    DCWindowBootstrap.ICON_INFO = 'fa fa-hand-o-right';
    DCWindowBootstrap.ICON_SUCCESS = 'fa fa-check';
    DCWindowBootstrap.ICON_WARN = 'fa fa-bullhorn';
    DCWindowBootstrap.ICON_ERROR = 'fa fa-ban';
    DCWindowBootstrap.ICON_QUESTION = 'fa fa-question-circle';
    DCWindowBootstrap.BUTTONS = {
        close: {
            label: '',
            name: 'close',
            value: 'close',
            action: 'close',
            section: 'header',
            template: '<button type="button" />',
            classNames: 'glyphicon glyphicon-remove close'
        },
        maximize: {
            label: '',
            name: 'maximize',
            value: 'maximize',
            action: function() {
                var rM = this.resizeMaximized;
                if( rM ) {
                    rM.set( 'maximized', !rM.get( 'maximized' ) );
                }
            },
            section: 'header',
            template: '<button type="button" />',
            classNames: 'glyphicon glyphicon-chevron-up close'
        },

        OK: {
            label: i18n( 'DCWindow.BUTTONS.OK' ),
            name: 'OK',
            value: 'OK',
            action: 'close'
        },
        CANCEL: {
            label: i18n( 'DCWindow.BUTTONS.CANCEL' ),
            name: 'CANCEL',
            value: 'CANCEL',
            action: 'close'
        },
        CLOSE: {
            label: i18n( 'DCWindow.BUTTONS.CLOSE' ),
            name: 'CLOSE',
            value: 'CLOSE',
            action: 'close'
        },
        YES: {
            label: i18n( 'DCWindow.BUTTONS.YES' ),
            name: 'Yes',
            value: 'Yes',
            action: 'close'
        },
        NO: {
            label: i18n( 'DCWindow.BUTTONS.NO' ),
            name: 'No',
            value: 'No',
            action: 'close'
        },
        SELECT: {
            label: i18n( 'DCWindow.BUTTONS.SELECT' ),
            name: 'SELECT',
            value: 'SELECT',
            action: 'close'
        },
        EDIT: {
            label: i18n( 'DCWindow.BUTTONS.EDIT' ),
            name: 'EDIT',
            value: 'EDIT',
            action: 'close'
        },
        SAVE: {
            label: i18n( 'DCWindow.BUTTONS.SAVE' ),
            name: 'SAVE',
            value: 'SAVE',
            action: 'close'
        },
        DISCARD: {
            label: i18n( 'DCWindow.BUTTONS.DISCARD' ),
            name: 'DISCARD',
            value: 'DISCARD',
            action: 'close'
        },
        BACK: {
            label: i18n( 'DCWindow.BUTTONS.BACK' ),
            name: 'BACK',
            value: 'BACK',
            action: 'close'
        },
        DELETE: {
            label: i18n( 'DCWindow.BUTTONS.DELETE' ),
            name: 'DELETE',
            value: 'DELETE',
            action: 'close'
        }
    };
    DCWindowBootstrap.getButton = function( key, apply ) {
        var newButton = Y.mix( apply || {}, DCWindowBootstrap.BUTTONS[key] );
        return newButton;
    };

    DCWindowBootstrap.dialog = function(config) {
        config = config || {};
        config.window = config.window || {};
        return DCWindowBootstrap.notice( config );
    };

    DCWindowBootstrap.notice = function(config) {
        config = config || {};
        config.callback = config.callback || function() {
            };
        config.window = config.window || {};

        var type = config.type || 'info', // info, success, warn, error
            message = config.message || '',
            icon = config.icon || '',
            title = config.title,
            windowConfig,
            callback = config.callback,
            callbackArgs = {
                success: false,
                data: null,
                action: null
            };

        if( !title ) {
            switch( type ) {
                case 'info':
                    title = i18n( 'DCWindow.notice.title.info' );
                    break;
                case 'success':
                    title = i18n( 'DCWindow.notice.title.success' );
                    break;
                case 'warn':
                    title = i18n( 'DCWindow.notice.title.warn' );
                    break;
                case 'error':
                    title = i18n( 'DCWindow.notice.title.error' );
                    break;
            }
        }

        if( !icon ) {
            switch( type ) {
                case 'info':
                    icon = Y.doccirrus.DCWindowBootstrap.ICON_INFO;
                    break;
                case 'success':
                    icon = Y.doccirrus.DCWindowBootstrap.ICON_SUCCESS;
                    break;
                case 'warn':
                    icon = Y.doccirrus.DCWindowBootstrap.ICON_WARN;
                    break;
                case 'error':
                    icon = Y.doccirrus.DCWindowBootstrap.ICON_ERROR;
                    break;
            }
        }

        windowConfig = Y.aggregate( {
            bodyContent: message,
            title: title,
            icon: icon,
            width: 'small',
            visible: true,
            centered: true,
            buttons: {
                OK: KoComponentManager.createComponent( {
                    componentType: 'KoButton',
                    componentConfig: {
                        name: 'ok',
                        text: DCWindowBootstrap.BUTTONS.OK.label,
                        option: 'PRIMARY',
                        click: function() {
                            callbackArgs.success = true;
                            callback.call( this, callbackArgs );
                            $('#modal').modal('hide');
                        }
                    }
                } )
            },
            render: document.body
        }, config.window, true );

        windowConfig.templateModal = '<div class="modal fade" id="modal" tabindex="-1" role="dialog" data-bind="with: config" style="z-index: 3000;" aria-hidden="true">' +
                                     '<div class="modal-dialog" role="document">' +
                                     '<div class="modal-content">' +
                                     '<div class="modal-header">' +
                                     '<button type="button" class="close glyphicon glyphicon-remove" data-dismiss="modal" aria-label="Close"></button>' +
                                     '<div class="modal-title">' +
                                     '<span class="modal-title-icon" data-bind="attr: {class: icon}"></span>' +
                                     '&nbsp;' +
                                     '<strong class="modal-title-text font-weight-bold" data-bind="text: title"></strong>' +
                                     '</div>' +
                                     '</div>' +
                                     '<div class="modal-body" data-bind="text: bodyContent"></div>' +
                                     '<div class="modal-footer" data-bind="template: buttons.OK.template">' +
                                     '</div>'+
                                     '</div>' +
                                     '</div>' +
                                     '</div>';
        ko.applyBindings(new DCWindowBootstrap( windowConfig ), document.querySelector( '#modal' ));
    };

    DCWindowBootstrap.confirm = function( config ) {
        config = config || {};
        config.callback = config.callback || function() {
            };
        config.window = config.window || {};

        var
            message = config.message || i18n( 'general.message.ARE_YOU_SURE' ),
            icon = config.icon || '',
            title = config.title,
            callback = config.callback,
            callbackArgs = {
                success: false,
                data: null,
                action: null
            },
            windowConfig;

        if( !title ) {
            title = i18n( 'DCWindow.confirm.title' );
        }

        if( !icon ) {
            icon = Y.doccirrus.DCWindowBootstrap.ICON_QUESTION;
        }

        windowConfig = Y.aggregate( {
            bodyContent: message,
            title: title,
            icon: icon,
            buttons: {
                CANCEL: KoComponentManager.createComponent( {
                    componentType: 'KoButton',
                    componentConfig: {
                        name: 'cancel',
                        text: DCWindowBootstrap.BUTTONS.CANCEL.label,
                        click: function() {
                            $('#modal').modal('hide');
                        }
                    }
                } ),
                OK: KoComponentManager.createComponent( {
                    componentType: 'KoButton',
                    componentConfig: {
                        name: 'ok',
                        text: DCWindowBootstrap.BUTTONS.OK.label,
                        option: 'PRIMARY',
                        click: function() {
                            callbackArgs.success = true;
                            callback.call( this, callbackArgs );
                            $('#modal').modal('hide');
                        }
                    }
                } )
            },
            render: document.body
        }, config.window, true );

        windowConfig.templateModal = '<div class="modal fade" id="modal" tabindex="-1" role="dialog" data-bind="with: config" aria-hidden="true" style="z-index: 3000;">' +
                                     '<div class="modal-dialog" role="document">' +
                                     '<div class="modal-content">' +
                                     '<div class="modal-header">' +
                                     '<button type="button" class="close glyphicon glyphicon-remove" data-dismiss="modal" aria-label="Close"></button>' +
                                     '<div class="modal-title">' +
                                     '<span class="modal-title-icon" data-bind="attr: {class: icon}"></span>' +
                                     '&nbsp;' +
                                     '<strong class="modal-title-text font-weight-bold" data-bind="text: title"></strong>' +
                                     '</div>' +
                                     '</div>' +
                                     '<div class="modal-body" data-bind="text: bodyContent"></div>' +
                                     '<div class="modal-footer">' +
                                     '<span data-bind="template: buttons.CANCEL.template"></span>' +
                                     '<span style="margin-left: 5px" data-bind="template: buttons.OK.template"></span>' +
                                     '</div>'+
                                     '</div>' +
                                     '</div>' +
                                     '</div>';
        ko.applyBindings(new DCWindowBootstrap( windowConfig ), document.querySelector( '#modal' ));
    };
    /**
     * @property DCWindowBootstrap
     * @for doccirrus
     * @type {DCWindowBootstrap}
     */
    Y.doccirrus.DCWindowBootstrap = DCWindowBootstrap;

}, '0.0.1', {
    lang: ['en', 'de', 'de-ch'],
    requires: [
        'oop',
        'doccirrus',
        'KoUI',
        'classnamemanager',
        'panel', 'lazy-model-list', 'transition', 'widget-anim',
        'dd-plugin', 'dd-constrain',
        'resize-plugin', 'resize-constrain'
    ]/*,
     TODO: check https://yuilibrary.com/yui/docs/api/classes/Loader.html#property_skin
     "skinnable": true*/
} );
