/*
 * Copyright (c) 2012 Doc Cirrus GmbH
 * all rights reserved.
 */
/*global YUI, $, moment */

'use strict';

YUI.add( 'misWaitingRoomBinder', function( Y, NAME ) {

    var
        widthPx = 550,          //  pixels, carousel images, might move this to application.json
        heightPx = 280,         //  pixels, carousel images
        numImages = 5,          //  number of images in carousel, must match wr_carousel_edit

        //  below is not working for me as of 2013-08-07, strix
        //defaultImage = Y.doccirrus.infras.getPrivateURL( '/img/not-found.png' ),
        defaultImage = '/img/not-found.png',
        currentProfileSet;


    function handleError( obj, text, err ) {
        Y.log( 'ERROR: ' + JSON.stringify( err ) + ' -- ' + text, 'warn', NAME );
    }

    function loadCurrentProfileSet( id, callback ) {
        Y.log( '(Re)loading patient.', 'debug', NAME );

        $.ajax(
            {
                type: 'GET',
                xhrFields: {
                    withCredentials: true
                },
                url: Y.doccirrus.infras.getPrivateURL( '/r/intime/all' ),
                success: callback,
                error: handleError
            }
        );
    }

    function getProfileCallback( data ) {
        var
            failure;

        if( Array.isArray( data ) ) {
            if( data.length > 1 ) {
                failure = 'Data Set size is greater 1.';
            }
            currentProfileSet = data[0];
        } else {
            currentProfileSet = data;
        }

        if( data ) {
            Y.log( 'Successful REST load.', 'debug', NAME );
        } else {
            Y.log( 'ERROR' + failure, 'error', NAME );
        }
    }

    //   move from pug template due to jade version update (MOJ-5535)

    function startTheClock() {
        var pad = function(x) {
            return x < 10 ? '0'+x : x;
        };
        var ticktock = function() {
            var
                d = new Date(),
                h = pad( d.getHours() ),
                m = pad( d.getMinutes() ),
                timestring = [h,m].join(':'),
                datestring, mom;

                mom = moment();
                mom.lang('de');
                datestring = mom.format('LL');
                $("#date").html(datestring);
                $("#clock").html(timestring);
            };
        ticktock();
        setInterval(ticktock, 10000);
    }

    /**
     * Constructor for the patientBinderIndex class.
     *
     * @class patientBinderIndex
     * @constructor
     */
    Y.namespace( 'mojito.binders' )[NAME] = {

        /** using client side Jade so we need to announce who we are. */
        jaderef: 'MISMojit',

        /**
         * Binder initialization method, invoked after all binders on the page
         * have been constructed.
         */
        init: function( mojitProxy ) {
            this.mojitProxy = mojitProxy;
        },

        /**
         * The binder method, invoked to allow the mojit to attach DOM event
         * handlers.
         *
         * @param node {Node} The DOM node to which this mojit is attached.
         */
        bind: function( node ) {
            var
                that = this,
                jaderef = this.jaderef,
                profileId,
                last_no = '';

            defaultImage = Y.doccirrus.infras.getPrivateURL( '/img/not-found.png' );
            this.firstSlide = true;

            this.node = node;
            profileId = node.one( '#profileId' ).get( 'value' );

            // set year
            $( '#current_year' ).html( (new moment()).format( 'YYYY' ) );

            ///////// direct widget loaders

            function handleTemplateLoadResponse( err ) {
                if( err ) {
                    Y.log( 'ERROR loading pug template: ' + err, 'error', NAME );
                }
                //wr_scheduller
                $( '#wno_hidden' ).val( last_no );
                //wr_heading_edit
                if(currentProfileSet) {
                    $( '.setId' ).val( currentProfileSet._id );
                    $( '#headline' ).val( currentProfileSet.headline );
                    $( '#subheadline' ).val( currentProfileSet.subheadline );
                    $( '#subhead-preview' ).html( currentProfileSet.subheadline .substring( 0, 60 ) );
                    $( '#head-preview' ).html( currentProfileSet.headline.substring( 0, 32 ) );
                }
                $( '#myModal' ).modal();
            }

            function schedulerCb( data ) {
                var
                    result;
                Y.log( 'Successful REST load.', 'debug', NAME );
                result = {
                    last_no: '',
                    data: data
                };

                if( result.data && Array.isArray( result.data ) && result.data.length > 0 ) {
                    if( result.data[0].number !== 'Termin' ) {
                        last_no = result.data[0].number || '';
                    }
                } else {
                    last_no = '';
                }
                result.last_no = last_no || '';
                result.moment = moment;
                if( result ) {
                    YUI.dcJadeRepository.loadNodeFromTemplate(
                        'wr_scheduler',
                        jaderef,
                        result,
                        node.one( '#scheduler' ),
                        handleTemplateLoadResponse );
                }
            }

            function load_scheduler() {
                var filter = Y.doccirrus.utils.getFilter(),
                    url = '/r/calculateschedule/?action=calculateschedule&subaction=PACKED';
                if( filter && filter.location ){
                    $.ajax({
                        url: '/1/location?' + filter.location,
                        xhrFields: {
                            withCredentials: true
                        },
                        success: function( response ) {
                            var
                                data = response && response.data;
                            if ('string' === typeof data) {
                                data = JSON.parse(data);
                            }

                            $( '#subsubheading' ).text( data[0].locname );
                        },
                        error: function() {
                            // could not get location ... inform the user?
                        }
                    });
                    url += '&location=' + filter.location;
                }
                $.ajax(
                    {
                        type: 'GET',
                        xhrFields: {
                            withCredentials: true
                        },
                        url: Y.doccirrus.infras.getPrivateURL( url ),
                        success: schedulerCb,
                        error: handleError
                    }
                );
            }

            /*
             * event handlers
             */

            // only Admin is allowed to configure the waitingroom
            if (Y.doccirrus.auth.isAdmin()){
                // hover box effect
                $( '.hoverbox' ).hover( function() {
                    $( this ).addClass( "showbox" );
                }, function() {
                    $( this ).removeClass( "showbox" );
                } );

                // edit logo in modal
                $( '#logoarea' ).click( function() {
                    Y.log( 'Loading Logo Editor.', 'debug', NAME );
                    that.editcarousel('wr_logo_edit');
                } );

                // edit heading in modal
                $( '#head' ).click( function() {
                    loadCurrentProfileSet( profileId, function( resp ) {

                        if ('string' === typeof resp) {
                            resp = JSON.parse(resp);
                        }

                        getProfileCallback( resp );

                        YUI.dcJadeRepository.loadNodeFromTemplate(
                            'wr_heading_edit',
                            jaderef,
                            currentProfileSet,
                            node.one( '#upper' ),
                            handleTemplateLoadResponse );
                    } );

                } );

                // next number in modal
                $( '#wnoarea' ).click( function() {
                    YUI.dcJadeRepository.loadNodeFromTemplate(
                        'wr_nextnumber',
                        jaderef,
                        {},
                        node.one( '#upper' ),
                        handleTemplateLoadResponse );
                } );

                // carousel in modal
                $( '#carousel' ).click( function() { that.editcarousel('wr_carousel_edit'); } );
                $( '#btnEditCarousel').click( function() { that.editcarousel('wr_carousel_edit'); });
            }


            loadCurrentProfileSet( profileId, function afterLoad( data ) {

                if ('string' === typeof data) {
                    data = JSON.parse(data);
                }

                getProfileCallback( data );

                $( '#heading' ).text( currentProfileSet.headline );
                $( '#profileId' ).val( currentProfileSet._id );
                $( '#subheading').text( currentProfileSet.subheadline );

                that.intimeId = data[0]._id;
                that.reloadcarousel();
            } );

            startTheClock();

            //  reloads logo too
            load_scheduler();
        },

        /**
         *  Method to load the set of images attached to the carousel from media mojit
         *  assumes that.intimeId has been set to database ID of current profile set
         *
         */

        reloadcarousel: function() {
            var
                that = this,
                onLoadSuccess,
                onLoadFailure,
                content = '';

            /**
             *  Called when image metadata loaded from server
             *
             *  @param  imgSet    {String}    Or array of Media metadata objects
             */

            onLoadSuccess = function(imgSet) {
                var
                    i,
                    logoUrl,
                    waitUrl,
                    waitFor = 0,
                    isFirst = true;

                //  recently uncertain which we will get, string or array
                if ('string' === typeof imgSet) {
                    imgSet = JSON.parse(imgSet);
                }

                //  new style API
                imgSet = imgSet.data ? imgSet.data : imgSet;

                if (0 === imgSet.length) {
                    //  if no images, try again in 10 seconds
                    //  this is because of race condition on first load of intime object while attaching images
                    window.setTimeout(function(){ that.reloadcarousel(); }, 10000);
                }


                function hasCarouselImage(idx) {
                    var j;
                    for (j = 0; j < imgSet.length; j++) {
                        if ((imgSet[j].hasOwnProperty('label')) && (imgSet[j].label === 'carousel' + idx)) {
                            return true;
                        }
                    }
                    return false;
                }

                function findByLabel(label) {
                    var j;
                    for (j = 0; j < imgSet.length; j++) {
                        if ((imgSet[j].hasOwnProperty('label')) && (label === imgSet[j].label)) {
                            return imgSet[j];
                        }
                    }
                    return { 'source': defaultImage };
                }

                function addImage(idx) {
                    var
                        label = 'carousel' + idx,
                        mediaItem = findByLabel(label),
                        mediaUrl = Y.doccirrus.media.getMediaUrl( mediaItem, widthPx + 'x' + heightPx );

                    mediaUrl = Y.doccirrus.infras.getPrivateURL( mediaUrl );

                    //if (mediaItem.source === defaultImage) { return; }
                    waitFor++;

                    Y.log('Loading image ' + label + ' := ' + mediaUrl, 'debug', NAME);

                    $('<img />', { src: mediaUrl }).on('load', function(){
                        Y.log('fired onload carousel' + label, 'debug', NAME);

                        waitFor--;

                        if (0 === waitFor) {
                            Y.log('All carousel images loaded, starting carousel.');
                            $('#carousel').carousel({ to: 0, interval: 10000 });
                        }

                    }).appendTo('#divCarouselImg' + idx);


                    //$('#imgTest').append(' '
                    //    + '<b>carousel' + idx + '</b><br/>'
                    //    + '<small>' + mediaUrl + '</small><br/>'
                    //    + '<img src="' + mediaUrl + '" /><br/>'
                    //);

                }

                //$('#imgTest').html('');

                for (i = 0; i < numImages; i++) {

                    waitUrl = '/static/FormEditorMojit/assets/images/throbber.gif';
                    waitUrl = Y.doccirrus.infras.getPrivateURL( waitUrl );

                    if (true === hasCarouselImage(i)) {
                        content += ' <div class="' + (isFirst ? 'active ' : '') + 'item" id="divCarouselImg' + i + '"></div>';
                        isFirst = false;        //  first image is shown immediately, might not be 0
                    }
                }

                $( '#carousel' ).html('<div class="carousel-inner">' + content + '</div>');

                for (i = 0; i < numImages; i++) {
                    if (true === hasCarouselImage(i)) {
                        addImage(i);
                    }
                }

                //  add logo image
                logoUrl = findByLabel('logo');
                $( '#logo' ).attr( 'src', Y.doccirrus.infras.getPrivateURL( Y.doccirrus.media.getMediaUrl( logoUrl, '100x-1') ) );

            };

            onLoadFailure = function() {
                //  should never happen unless serious error with mediamojit, check application.json
                Y.log('Failed to load attachments, check application.json.', 'error', NAME);
            };

            $.ajax({
                data: { 'collection': 'intime', 'id': that.intimeId },
                type: 'GET',
                xhrFields: {
                    withCredentials: true
                },
                url: Y.doccirrus.infras.getPrivateURL( '/1/media/:list'),
                success: onLoadSuccess,
                error: onLoadFailure
            });

        },

        /**
         *  Show dialog for editing the carousel
         */

        editcarousel: function(jadeTemplate) {
            var
                that = this,
                profileId = $('#profileId').val();

            loadCurrentProfileSet( profileId, function( resp ) {

                if ('string' === typeof resp) {
                    resp = JSON.parse(resp);
                }

                var
                    firstRecord = resp[0],
                    intimeId = firstRecord._id.toString(),
                    targetNode = Y.one( '#upper' );

                targetNode.dcimages = {
                    'ownerCollection': 'intime',
                    'ownerId': intimeId
                };

                function onReloadProfile() {
                    Y.log('Dismissed edit carousel modal, reloading image set.', 'info', NAME);
                    //  we need to call /r/intime/all to regenerate images if all have been deleted
                    loadCurrentProfileSet( profileId, function onReloadIntime() {
                        that.reloadcarousel();
                    });
                }

                function onTemplateLoaded( err ) {
                    if( err ) {
                        Y.log( 'ERROR loading pug template: ' + err, 'error', NAME );
                    }

                    $( '#myModal' ).modal();
                    $( '#btnReload' ).off( 'click' ).on( 'click', onReloadProfile );
                    $( '#btnModalClose' ).off( 'click' ).on( 'click', onReloadProfile );
                }

                getProfileCallback( resp );

                YUI.dcJadeRepository.loadNodeFromTemplate(
                    jadeTemplate,
                    'MISMojit',
                    { 'collection': 'intime', 'id': intimeId },
                    targetNode,
                    onTemplateLoaded
                );
            } );
        }

    };

}, '0.0.1', {
    requires: [
        'event-mouseenter',
        'mojito-client',
        'mojito-rest-lib',
        'dcutils',
        'dcmedia'
    ]
} );
