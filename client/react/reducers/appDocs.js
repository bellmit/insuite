/**
 * User: nicolas.pettican
 * Date: 15.01.20  14:10
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

import {actionList} from '../actions/appDocs';

const
    initialSolDocState = ( i18n ) => ({
        isLoading: true,
        currentTabName: 'configuration',
        configurationURL: '',
        mdDoc: i18n( 'AppTokenMojit.AppAccessManager.text.MD_DOCS_DEFAULT' ),
        mdChangelog: i18n( 'AppTokenMojit.AppAccessManager.text.MD_CHANGELOG_DEFAULT' )
    }),
    failedSolDocState = ( i18n ) => ({
        isLoading: false,
        mdDoc: i18n( 'AppTokenMojit.AppAccessManager.text.MD_DOCS_FAILED' ),
        mdChangelog: i18n( 'AppTokenMojit.AppAccessManager.text.MD_CHANGELOG_FAILED' ),
        currentTabName: 'configuration',
        configurationURL: ''
    }),
    initialState = {
        sols: {},
        solNames: [],
        isLoading: false,
        obtainedDocs: []
    };

export default function appDocsReducer( state = initialState, action ) {
    let payload;
    switch( action.type ) {

        case actionList.INIT_SOLS:
            payload = action.payload || {};
            if( payload.solsList.length ) {
                let solNames = payload.solsList.map( ( solName ) => solName.toLowerCase() );
                let sols = solNames.reduce( ( acc, solName ) => {
                    acc[solName.toLowerCase()] = initialSolDocState( payload.i18n );
                    return acc;
                }, {} );
                return {
                    ...state,
                    sols,
                    solNames,
                    isLoading: false
                };
            }

        case actionList.SINGLE_SOL_LOADING:
            payload = action.payload || {};
            if( payload.solName && state.solNames.includes( payload.solName ) ) {
                return {
                    ...state,
                    sols: {
                        ...state.sols,
                        [payload.solName]: {
                            ...state.sols[payload.solName],
                            isLoading: true
                        }
                    }
                };
            }

        case actionList.GET_DOCS_FROM_APP_SUCCESS:
            payload = action.payload || {};
            if( payload.solName && state.solNames.includes( payload.solName ) ) {
                return {
                    ...state,
                    obtainedDocs: [...state.obtainedDocs, payload.solName],
                    sols: {
                        ...state.sols,
                        [payload.solName]: {
                            ...state.sols[payload.solName],
                            mdDoc: payload.mdDoc || state.sols[payload.solName].mdDoc,
                            mdChangelog: payload.mdChangelog || state.sols[payload.solName].mdChangelog,
                            isLoading: false
                        }
                    }
                };
            }

        case actionList.GET_DOCS_FROM_APP_FAILED:
            payload = action.payload || {};
            if( payload.solName && state.solNames.includes( payload.solName ) ) {

                return {
                    ...state,
                    sols: {
                        ...state.sols,
                        [payload.solName]: {
                            ...state.sols[payload.solName],
                            mdDoc: failedSolDocState.mdDoc,
                            mdChangelog: failedSolDocState.mdChangelog,
                            isLoading: false,
                            obtained: false
                        }
                    }
                };
            }

        case actionList.CHANGE_CURRENT_TAB:
            payload = action.payload || {};
            if( payload.solName && state.solNames.includes( payload.solName ) ) {
                return {
                    ...state,
                    sols: {
                        ...state.sols,
                        [payload.solName]: {
                            ...state.sols[payload.solName],
                            currentTabName: payload.currentTabName
                        }
                    }
                };
            }

        case actionList.ADD_IFRAME_URL_TO_SOL:
            payload = action.payload || {};
            if( payload.url && payload.solName ) {
                return {
                    ...state,
                    sols: {
                        ...state.sols,
                        [payload.solName]: {
                            ...state.sols[payload.solName],
                            configurationURL: payload.url
                        }
                    }
                };
            }

        default:
            return state;
    }
}