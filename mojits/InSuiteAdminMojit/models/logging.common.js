/**
 * User: dominik.liesfeld
 * Date: 2/23/21  11:43 AM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 *
 * for more details see: https://confluence.intra.doc-cirrus.com/display/SD/Log+Viewer and https://confluence.intra.doc-cirrus.com/display/SD/Terminal+-+Flexible+Log+Viewer
 */
/*global YUI*/
YUI.add( 'logging-common', function( Y, NAME ) {

        'use strict';

        var
            i18n = Y.doccirrus.i18n,
            /**
             * @description contains terminal commands for xterinal-api.server.js
             * @type {{command1: {regex: string, file: string, description: *}, command2: {regex: string, file: string, description: *}, command5: {regex: string, file: string, description: *}, command3: {regex: string, file: string, description: *}, command4: {regex: string, file: string, description: *}}}
             * @private
             */
            logCommands = {
                'command1':{
                    description: i18n('InSuiteAdminMojit.tab_system_terminal.commands.grep_error'),
                    regex: 'grep -E \'[0-9:] error:\'',
                    file: 'insuiteLogFile'
                },
                'command2':{
                    description: i18n('InSuiteAdminMojit.tab_system_terminal.commands.grep_warning'),
                    regex: 'grep -E \'[0-9:] warn:\'',
                    file: 'insuiteLogFile'
                },
                'command3':{
                    description: i18n('InSuiteAdminMojit.tab_system_terminal.commands.grep_all'),
                    regex: 'grep -E \'.*\'',
                    file: 'insuiteLogFile'
                },
                'command4':{
                    description: i18n('InSuiteAdminMojit.tab_system_terminal.commands.grep_timing_slow'),
                    regex: 'grep -E \'(TIMING|SLOW-API)\'',
                    file: 'insuiteLogFile'
                },
                'command5':{
                    description: i18n('InSuiteAdminMojit.tab_system_terminal.commands.grep_with_user_input'),
                    regex: 'grep -E',
                    file: 'insuiteLogFile',
                    filter: 'thread'
                }
            };

        Y.log( 'Loading logging.common','debug', NAME );


        Y.namespace( 'doccirrus' ).logging = {

            /* MANDATORY */
            name: NAME,

            commands: logCommands

        };


    },
    '0.0.1', {
        requires: [
            'doccirrus'
        ]
    }
);

