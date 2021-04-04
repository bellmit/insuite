/**
 * User: pi
 * Date: 09/11/15   09:50
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global  fun:true, $ , moment */
fun = function _fn( Y/*, NAME */) {
    'use strict';

    var
        node_ref,
        infoDiv,
        i18err_id,
        i18err_msg,
        currentTimer,
        tock,
        timeleft = 0,
        waitno,
        praxid,
        hasAlert,
        email,
        mobile,
        tiav,
        syncInterval,
        practiceBrandDiv,
        firstReceivedTime,
        commonData;

    function validate() {
        var
            valid = Y.doccirrus.utils.isNodeDCValid( node_ref );

        if( valid ) {
            $( '#btnSend' ).removeClass( 'disabled' );
        } else {
            $( '#btnSend' ).addClass( 'disabled' );
        }

        return valid;
    }

    function setParams( data ) {
        //set change event to sync local storage
        $( '#praxid' ).off('change.localStorage').on('change.localStorage', function(){
            commonData.setPrac( $( this ).val() );
        });
        $( '#waitno' ).off('change.localStorage').on('change.localStorage', function(){
            commonData.setNumber( $( this ).val() );
        });


        // always allow setting of customer No
        if( data && data.prac ) {
            $( '#praxid' ).val( data.prac );
            $( '#waitno' ).focus();
        }
        // only set ticket if practice was also set and return true only if
        // both are set.
        if( data && data.number && data.prac ) {
            $( '#waitno' ).val( data.number );
            return true;
        }
        return false;
    }

    function collapseSettingsPart( hide, toggle ) {
        if( toggle ) {
            $( '#settings_panel' ).toggle();
        } else if( hide ) {
            $( '#settings_panel' ).hide();
        } else {
            $( '#settings_panel' ).show();
        }
    }

    //function handleParams() {
    //    if( setParams() ) {
    //        if( validate() ) {
    //            $( '#btnSend' ).click();
    //        }
    //    }
    //}

    function initWaitingTimeTab() {
        var
            btnE = $( '#btnSend' ),
            idE = $( '#praxid' );

        btnE.addClass( 'disabled' );

        $( '#wantsAlert' ).click( function( e ) {
            validate();
            if( e.currentTarget.checked ) {
                $( '#alertfields' ).removeClass( 'hide' );
                setTimeout( function code() {
                    $( '#email' ).focus();
                    $( '#btnSend' ).text( 'Anzeigen & Benachrichtigen' );
                }, 1000 );
            }
            else {
                $( '#alertfields' ).addClass( 'hide' );
                btnE.text( 'Anzeigen' );
                btnE.click(); //refresh db
            }
        } );

        idE.on( 'keyup', separateKeyupFromValidation( keyHandlerOnReturn ) );
        $( '#waitno' ).on( 'keyup', separateKeyupFromValidation( keyHandlerOnReturn ) );
        $( '#email' ).on( 'keyup', separateKeyupFromValidation( keyHandlerOnReturn ) );
        $( '#mobile' ).on( 'keyup', separateKeyupFromValidation( keyHandlerOnReturn ) );
        idE.focus();

        //handleParams();
    }

    function beforeLoad() {
        $( '#waitingtimeAnimation' ).fadeTo( 10, 0.5 );
        $( '#top_content' ).spin();
    }

    function afterLoad( duration ) {
        // 1. set timeout
        setTimeout( function stopAfter() {
            $( '#top_content' ).spin( false );
            $( '#waitingtimeAnimation' ).fadeTo( 10, 1 );
        }, 200 || duration );
        // 2. collapse the settings panel
        collapseSettingsPart( true );
    }

    function btnSendCallback() {
        var
            allParams = Y.doccirrus.utils.processForm( node_ref );

        beforeLoad();
        if( validate() ) {
            allParams.date = Date.now();
            allParams.wantsAlert = $( '#wantsAlert' ).is( ':checked' );
            loadWaitingtime();
        }
    }

    function settingsClickCallback() {
        collapseSettingsPart( true, true );
    }

    /**
     * MOJ-116
     * sharpen validation on client and server side
     * allow only numbers for praxID (1-8 digits) and waitno (1-5 digits)
     * after praxID and waitno was entered, return will trigger sendbtn
     * appropriate handling if alert checkbox was checked
     */
    function keyHandlerOnReturn( e ) {
        if( e.keyCode === 13 ) {
            $( '#btnSend' ).click();
        }
    }

    function separateKeyupFromValidation( keyhandler ) {
        var
            f_keyhandler = keyhandler,
            f_validate = validate;

        return function callback( e ) {
            f_validate();
            f_keyhandler( e );
        };
    }

    function updateCircles() {
        var
            i,
            circlesFilled = ( moment.duration( timeleft ).hours() > 0 ) ? 6 : Math.floor( ( moment.duration( timeleft ).minutes() ) / 10 ),
            listCircles = $( '.resp-quad-list li' ).removeClass( 'circle-timeleft' );

        for( i = 1; i < 7 && i < (circlesFilled + 1); i++ ) {
            $( listCircles[i] ).addClass( 'circle-timeleft' );
        }
    }

    function getLocationHTMLString( location ) {
        var
            html;
        html = '<ul class="list-unstyled">' +
               '<li>' + location.locname + '</li>' +
               '<li>' + location.street + ' ' + location.houseno + '</li>' +
               '<li>' + location.zip + ' ' + location.city + '</li>' +
               '</ul>';
        return html;
    }

    function handleWaitingtime( data ) {
        var buffer = 180,//seconds
            timeReceived,
            message = '';

        if( 'err' === data.status ) {
            data = data ? data.data || data : data; // sometimes it is data.data
            data = data || {waitText: 'Unbekannter Fehler.', subtext: 'Bitte versuchen Sie es erneut.'};
            message = data.waitText;
            if( data.subtext ) {
                message += '<br/>' + data.subtext;
            }
            Y.doccirrus.DCWindow.notice( {
                type: 'error',
                message: message
            });

            commonData.setNumber( '' );
            collapseSettingsPart();
            tick( true );
            $( '#waitno' ).val( '' );
            return;
        }

        if( data.wait ) {
            timeReceived = moment.duration( data.wait, 'minutes' );
        }
        if( data.location ) {
            //insert location info
            practiceBrandDiv.html( getLocationHTMLString( data.location ) );
        }
        if( data.calltime ) {
            timeReceived = 0;
        }
        //check if time differs from displayed timeleft
        if( ( ( timeReceived - firstReceivedTime ) > buffer ||
            ( timeReceived - firstReceivedTime ) < ( -1 * buffer ) ) || !firstReceivedTime ) {
            timeleft = timeReceived;
            tick();
            afterLoad();
        }
        updateCircles();
        if( !firstReceivedTime ) {
            firstReceivedTime = timeReceived;
            syncInterval = setInterval( function() {
                loadWaitingtime();
            }, 1000 * 60 );
        }
    }

    function loadWaitingtime() {
        var
            tail, myUrl;
        waitno = $( '#waitno' ).val();
        praxid = $( '#praxid' ).val();
        hasAlert = $( '#wantsAlert' ).is( ':checked' );
        email = $( '#email' ).val();
        mobile = $( '#mobile' ).val();
        tiav = $( '#timeinadvance' ).val();
        tail = '&wantsAlert=' + hasAlert + '&email=' + email + '&mobile=' + mobile + '&timeinadvance=' + tiav;
        myUrl = '/r/p_receivewaitingtime/?action=p_receivewaitingtime&query=waitno,' + waitno + ',praxid,' + praxid + tail;
        Y.doccirrus.ajax.send( {
            type: 'GET',
            url: myUrl,
            success: handleWaitingtime
        } );
    }

    function tick( stop ) {
        var interval = 1000;
        if( tock !== undefined ) {
            clearInterval( tock );
        }
        if( stop ) {
            clearInterval( syncInterval );
            return;
        }
        tock = setInterval( function() {
            timeleft = moment.duration( timeleft - interval, 'milliseconds' );
            if( timeleft.seconds() === 0 ) {
                updateCircles();
            }
            if( timeleft.asMilliseconds() <= 0 ) {
                this.window.clearInterval( tock );
                this.window.clearInterval( syncInterval );
                $( '#timeleft' ).text( '0:00' );
                $( '#timeleftText' ).text( 'Bitte kommen Sie jetzt zur Praxis.' );
            } else {
                $( '#timeleft' ).text( Math.floor( moment.duration( timeleft ).asMinutes() ) + ':' +
                                       ( ( moment.duration( timeleft ).seconds() < 10 ) ? '0' : '' ) + moment.duration( timeleft ).seconds() );
            }
        }, interval );
    }

    function initPage( node ) {
        $( '#btnSend' ).click( btnSendCallback );
        $( '#settings_title' ).click( settingsClickCallback );

        if( setParams( commonData ) ) {
            collapseSettingsPart( true );
        }

        infoDiv = node.one( '#infoview' );
        i18err_id = 'System Fehler: _id nicht vorhanden';
        i18err_msg = 'Ihre Änderungen konnten nicht gespeichert werden, VPRC ist nicht erreicbar.';
        currentTimer = -1;
        node_ref = node;

        waitno = $( '#waitno' ).val();
        praxid = $( '#praxid' ).val();
        hasAlert = $( '#wantsAlert' ).is( ':checked' );
        email = $( '#email' ).val();
        mobile = $( '#mobile' ).val();
        tiav = $( '#timeinadvance' ).val();
        practiceBrandDiv = $( '#practiceBrand' );

        initWaitingTimeTab();
        beforeLoad();

        if( waitno && praxid ) {
            // need to kick off the process.
            loadWaitingtime();
        }
    }

    return {
        /**
         * Default function to setup -- automatically used by Jade Loader
         *
         * @param node   NB: The node MUST have an   id   attribute.
         */
        registerNode: function( node, key, options ) {
            commonData = options.binder.commonData;
            initPage( node );
        },
        deregisterNode: function() {
        }
    };
};
