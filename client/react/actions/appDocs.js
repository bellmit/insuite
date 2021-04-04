/**
 * User: nicolas.pettican
 * Date: 15.01.20  14:08
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

export const actionList = {
    INIT_SOLS: 'INIT_SOLS',
    ADD_IFRAME_URL_TO_SOL: 'ADD_IFRAME_URL_TO_SOL',
    GET_DOCS_FROM_APP_SUCCESS: 'GET_DOCS_FROM_APP_SUCCESS',
    GET_DOCS_FROM_APP_FAILED: 'GET_DOCS_FROM_APP_FAILED',
    SINGLE_SOL_LOADING: 'SINGLE_SOL_LOADING',
    CHANGE_CURRENT_TAB: 'CHANGE_CURRENT_TAB'
};

export function getDocsForApp( args ) {
    const
        {Y, solName} = args,
        i18n = Y.doccirrus.i18n,
        getSolDocumentationProm = Y.doccirrus.jsonrpc.api.appreg.getSolDocumentation;

    return async function( dispatch ) {

        dispatch( {
            type: actionList.SINGLE_SOL_LOADING,
            payload: {
                solName
            }
        } );

        if( solName ) {
            getSolDocumentationProm( {query: {solName}} )
                .done( ( response ) => {
                    const
                        // meta = response.meta,
                        {mdDoc, mdChangelog} = response.data;
                    dispatch( {
                        type: actionList.GET_DOCS_FROM_APP_SUCCESS,
                        payload: {solName, mdDoc, mdChangelog}
                    } );
                } )
                .fail( ( error ) => {
                    return dispatch( {
                        type: actionList.GET_DOCS_FROM_APP_FAILED,
                        payload: {solName, error, i18n}
                    } );
                } );
        }
    };
}

export function initSolsDocs( args ) {
    const
        {solsList, Y} = args,
        i18n = Y.doccirrus.i18n;

    return function( dispatch ) {
        dispatch( {
            type: actionList.INIT_SOLS,
            payload: {solsList, i18n}
        } );
    };
}

export function addIFrameURLToSol( args ) {
    const {url, solName} = args;
    return function( dispatch ) {
        dispatch( {
            type: actionList.ADD_IFRAME_URL_TO_SOL,
            payload: {url, solName}
        } );
    };
}

export function changeView( args ) {
    const {tabId, solName} = args;
    return function( dispatch ) {
        dispatch( {
            type: actionList.CHANGE_CURRENT_TAB,
            payload: {
                solName,
                currentTabName: tabId
            }
        } );
    };
}