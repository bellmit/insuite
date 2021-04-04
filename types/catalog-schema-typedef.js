/**
 * @module catalogSchema
 */

/**
 * @typedef {Object} module:catalogSchema.communicationsObj
 * @property {String} type - 
 * @property {Boolean} preferred - 
 * @property {String} value - 
 * @property {String} note - 
 * @property {Boolean} signaling - 
 * @property {Boolean} confirmed - 
 * @property {Boolean} confirmNeeded - 
 */


/**
 * @typedef {Object} module:catalogSchema.addressesObj
 * @property {String} street - 
 * @property {String} houseno - 
 * @property {String} zip - 
 * @property {String} city - 
 * @property {String} postbox - 
 * @property {String} kind - 
 * @property {String} country - 
 * @property {String} countryCode - 
 * @property {String} receiver - 
 * @property {String} payerType - 
 * @property {String} addon - 
 * @property {String} talk - 
 * @property {String} title - 
 * @property {String} firstname - 
 * @property {String} nameaffix - 
 * @property {String} middlename - 
 * @property {String} lastname - 
 * @property {String} cantonCode - 
 */


/**
 * @typedef {Object} module:catalogSchema.catalog
 * @property {String} level - 
 * @property {String} l1 - 
 * @property {String} seq - 
 * @property {String} chapter - 
 * @property {String} chapterPart - 
 * @property {String} chapterText - 
 * @property {String} unifiedSeq - 
 * @property {String} title - 
 * @property {String} infos - 
 * @property {String} unit - 
 * @property {String} value - 
 * @property {String} city - 
 * @property {String} zip - 
 * @property {String} sign - 
 * @property {String} country - 
 * @property {String} origin - 
 * @property {String} schluessel - 
 * @property {String} plz - 
 * @property {String} bz - 
 * @property {String} kvName - 
 * @property {String} arKey - 
 * @property {String} arName - 
 * @property {String} bzKey - 
 * @property {String} bzName - 
 * @property {String} vknr - 
 * @property {String} iknr - 
 * @property {Boolean} abrechnungs_ik - 
 * @property {String} ktab - 
 * @property {String} name - 
 * @property {String} sortierungsname - 
 * @property {String} kurzname - 
 * @property {String} suchname - 
 * @property {Array.<String>} ortssuchnamen - 
 * @property {String} gebuehrenordnung - 
 * @property {String} kostentraegergruppe - 
 * @property {String} kostentraegergruppeId - 
 * @property {String} abrechnungsstelle - 
 * @property {String} abrechnungsbereich - 
 * @property {Mixed} abrechnungsbereiche - 
 * @property {String} kv - 
 * @property {Date} kt_gueltigkeit_start - 
 * @property {Date} kt_gueltigkeit_end - 
 * @property {Date} ik_gueltigkeit_start - 
 * @property {Date} ik_gueltigkeit_end - 
 * @property {Date} ktab_gueltigkeit_start - 
 * @property {Date} ktab_gueltigkeit_end - 
 * @property {Date} gueltigkeit_start - 
 * @property {Date} gueltigkeit_end - 
 * @property {String} existenzbeendigung_vk - 
 * @property {String} existenzbeendigung_q - 
 * @property {Array.<String>} unzkv - 
 * @property {Mixed} kvValue - 
 * @property {String} kvKey - 
 * @property {String} kvType - 
 * @property {String} kvSU - 
 * @property {String} kvAB - 
 * @property {String} kvKTAB - 
 * @property {String} bsnr - 
 * @property {String} parentBsnr - 
 * @property {String} lanr - 
 * @property {Array.<String>} lanrList - 
 * @property {Array.<String>} bsnrList - 
 * @property {String} key - 
 * @property {String} kvcaType - 
 * @property {String} kvcaAddress - 
 * @property {String} version - 
 * @property {Object} functions - 
 * @property {String} prefixG - 
 * @property {String} omimG - 
 * @property {String} genName - 
 * @property {String} genStatus - 
 * @property {String} prefixP - 
 * @property {String} omimP - 
 * @property {String} desc - 
 * @property {String} pmk - 
 * @property {String} nachfolge_iknr - 
 * @property {String} name2 - 
 * @property {String} ik_unidav - 
 * @property {String} mail_unidav - 
 * @property {String} d2d_id_unidav - 
 * @property {String} pzn - 
 * @property {String} herstellerId - 
 * @property {String} artikelNo - 
 * @property {String} herstellerName - 
 * @property {String} bezeichnung - 
 * @property {String} hmvNo - 
 * @property {String} menge - 
 * @property {String} mengeneinheit - 
 * @property {String} darreichungsForm - 
 * @property {String} apoek - 
 * @property {String} mwst - 
 * @property {Array.<module:catalogSchema.addressesObj>} addresses - 
 * @property {Array.<module:catalogSchema.communicationsObj>} communications - 
 * @property {String} group - 
 * @property {String} groupTherapy - 
 * @property {Mixed} prices - 
 * @property {Array.<String>} messages - 
 * @property {Date} start - 
 * @property {Date} end - 
 * @property {String} catalog - 
 * @property {Mixed} u_extra - 
 * @property {String} catalogShort - 
 * @property {String} treatmentCategory - 
 * @property {Boolean} catalogExtension - 
 * @property {String} code - 
 * @property {String} text - 
 */