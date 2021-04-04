/*
 *  Show details and timeline of a labdata finding (other versions on the same day, sequence of
 *  partial findings, etc)
 *
 *  @author: strix
 *  @date: 2018/05/10
 */

/*eslint prefer-template:0, strict:0 */
/*global YUI */

'use strict';

YUI.add( 'labdatafindingmodal', function( Y ) {
        var
            i18n = Y.doccirrus.i18n,
            CONFIRM = i18n( 'general.button.CONFIRM' );

        function show( data ) {
            var
                node = Y.Node.create( '<div></div>' ),
                bodyHtml = getModalContentHtml(),

                btnOk =  {
                    isDefault: true,
                    label: CONFIRM,
                    // disabled: true,
                    action: onBtnOkClick
                },

                modalOptions = {
                    className: 'DCWindow-LabdataFinding',
                    bodyContent: node,
                    title: data.date + ' ' + data.type,
                    maximizable: false,
                    icon: Y.doccirrus.DCWindow.ICON_INFO,
                    width: Y.doccirrus.DCWindow.SIZE_LARGE,
                    minHeight: 200,
                    minWidth: Y.doccirrus.DCWindow.SIZE_SMALL,
                    centered: true,
                    focusOn: [],
                    modal: false,               //  allow opening more than one finding to compare side by side
                    render: document.body,
                    buttons: {
                    header: ['close'],
                        footer: [
                            //Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                            Y.doccirrus.DCWindow.getButton( 'OK', btnOk )
                        ]
                    }
                },

                modal;

            YUI.dcJadeRepository.loadNodeFromTemplate(
                'labdataFinding_modal',
                'InCaseMojit',
                data,
                node,
                onTemplateLoaded
            );

            function onTemplateLoaded() {
                modal = new Y.doccirrus.DCWindow( modalOptions );
                node.setHTML( bodyHtml );
            }

            function onBtnOkClick() {
                modal.close();
            }

            //  utility to format activities / findings

            function getModalContentHtml() {
                var html = '', i;

                for ( i = 0; i < data.activities.length; i++ ) {
                    html = html + getActivityDetailHtml( data.activities[i] );
                }

                return html;
            }

            function getActivityDetailHtml( activity ) {
                var
                    html,
                    ldtVersion = activity._ldtVersion || 'ldt20',
                    l_extra = activity.l_extra || [],
                    //  TODO: ldt3 transaction split
                    labTextSections = Y.doccirrus.labdata.utils.splitTransactionsLdt2( activity ),
                    labTextSection,
                    i;

                //  legacy activities may not have findings as a sequence or transactions
                if ( !Array.isArray( l_extra ) && activity.l_extra ) {
                    l_extra = [ activity.l_extra ];
                }

                l_extra = l_extra.reverse();

                //  title
                html = '<h3>' +
                    Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', activity.actType, 'i18n', '' ) + ' ' +
                    Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'ActStatus_E', activity.status, 'i18n', '' ) + ' / ' +
                    ldtVersion +
                    '</h3>\n';

                //  subtitle
                if ( activity.labRequestId ) {
                    html = html +
                        '<h4>' +
                        i18n( 'activity-schema.Labor_T.labRequestId.i18n' ) + ': ' +
                        activity.labRequestId + ' (' + activity.l_extra.length + ')' +
                        '</h4>\n';
                }

                if ( activity.userContent ) {
                    html = html + '<p>' + activity.userContent + '</p>\n';
                }

                for ( i = 0; i < l_extra.length; i++ ) {
                    labTextSection = labTextSections[i] ? labTextSections[i] : { sections: {} };
                    html = html + getSequentialFindingHtml( l_extra[i], labTextSection, ldtVersion );
                }

                return html;
            }

            //  TODO: test with LDT3

            function getSequentialFindingHtml( findings, textSections, ldtVersion ) {
                //  TODO: translateme
                var
                    tableHtml = '',
                    findingHtml = '<pre>.</pre>',
                    testId,
                    simplifiedTest,
                    parts,
                    i;

                if ( textSections.header ) {
                    for ( i = 0; i < textSections.header.length; i++ ) {
                        parts = textSections.header[i].trim().split( ':', 2 );
                        //tableHtml = tableHtml + textSections.header[i] + '<br/>';

                        if ( 2 === parts.length && '' !== parts[1] ) {
                            tableHtml = tableHtml + '<tr><td>' + parts[0].trim() + '</td><td>' + parts[1].trim() + '</td></tr>';
                        }

                    }
                }

                if ( '' !== tableHtml ) {
                    tableHtml = '<table width="100%" border="1px">' + tableHtml + '</table>';
                }



                if ( findings.testId && Array.isArray( findings.testId ) )  {
                    for ( i = 0; i < findings.testId.length; i++ ) {
                        testId = findings.testId[i];

                        //  run through labdata finding utils
                        if ( testId.head === data.type ) {

                            findingHtml = '<br/><pre>' + getTextSectionHead( textSections, testId.head ) + '</pre><br/>';

                            if ( 'ldt20' === ldtVersion ) {
                                simplifiedTest = Y.doccirrus.forms.labdata.expandSingleTestResult( findings, testId );
                                findingHtml = findingHtml + Y.doccirrus.labdata.utils.makeFindingValueCellLdt2( simplifiedTest, false );
                            }

                            if ( ldtVersion && ldtVersion.startsWith( 'ldt3' ) ) {
                                simplifiedTest = Y.doccirrus.forms.labdata.expandSingleTestResultLdt3( findings, ldtVersion, testId );
                                findingHtml = findingHtml + Y.doccirrus.labdata.utils.makeFindingValueCellLdt3( simplifiedTest, false );
                            }

                            findingHtml = findingHtml + '<hr/>';
                            //findingHtml = findingHtml + '<hr/><pre>' + JSON.stringify( testId, undefined, 2 ) + '</pre><hr/>';
                        }
                    }
                }

                return tableHtml + findingHtml + '<br/>';
            }

            function getTextSectionHead( textSections, head ) {
                var snippet = '';
                if ( textSections.sections.hasOwnProperty( head ) ) {
                    snippet = textSections.sections[ head ];
                }
                return snippet;
            }

        }

        Y.namespace( 'doccirrus.modals' ).labdataFinding = {
            show: show
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'dcpartnertable',
            'dccallermodal'
        ]
    }
);
