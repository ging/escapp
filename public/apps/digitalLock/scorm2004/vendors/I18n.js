import {GLOBAL_CONFIG} from '../config/config.js';
import {LOCALES} from '../config/locales.js';

let default_locale;
let locale;

export function init(){
  // Set default locale
  if((typeof GLOBAL_CONFIG.available_locales !== "undefined") && (GLOBAL_CONFIG.available_locales instanceof Array) && (GLOBAL_CONFIG.available_locales.length > 0)){
    default_locale = GLOBAL_CONFIG.available_locales[0]; // Default language
  } else {
    default_locale = "en";
  }

  // Set locale
  if(isValidLanguage(GLOBAL_CONFIG.locale)){
    locale = GLOBAL_CONFIG.locale;
  } else {
    let uL = getUserLanguage();
    if(isValidLanguage(uL)){
      locale = uL;
    } else {
      locale = default_locale;
    }
  }
}

function getUserLanguage(){
  // Locale in URL
  let urlParams = readURLparams();
  if(isValidLanguage(urlParams.locale)){
    return urlParams.locale;
  }
  // Browser language
  let browserLang = (navigator.language || navigator.userLanguage);
  if(isValidLanguage(browserLang)){
    return browserLang;
  }
  return undefined;
}

function readURLparams(){
  let params = {};
  try {
    let location = window.location;
    if(typeof location === "undefined"){
      return params;
    }
    let URLparams = location.search;
    URLparams = URLparams.substr(1, URLparams.length - 1);
    let URLparamsArray = URLparams.split("&");
    for(let i = 0; i < URLparamsArray.length; i++){
      try {
        let paramData = URLparamsArray[i].split("=");
        if(typeof paramData[1] === "string"){
          params[paramData[0]] = paramData[1];
        }
      } catch (e){}
    }
  } catch (e){}

  return params;
}

function isValidLanguage(language){
  return ((typeof language === "string") && (["en", "es"].indexOf(language) !== -1));
}

export function getTrans(s, params){
  // First language
  if((typeof LOCALES[locale] !== "undefined") && (typeof LOCALES[locale][s] === "string")){
    return getTransWithParams(LOCALES[locale][s], params);
  }

  // Default language
  if((locale !== default_locale) && (typeof LOCALES[default_locale] !== "undefined") && (typeof LOCALES[default_locale][s] === "string")){
    return getTransWithParams(LOCALES[default_locale][s], params);
  }

  return undefined;
}

/*
 * Replace params (if they are provided) in the translations keys. Example:
 * // "i.dtest"	: "Download #{name}",
 * // getTrans("i.dtest", {name: "SCORM package"}) -> "Download SCORM package"
 */
function getTransWithParams(trans, params){
  if(typeof params !== "object"){
    return trans;
  }

  for(let key in params){
    let stringToReplace = "#{" + key + "}";
    if(trans.indexOf(stringToReplace) !== -1){
      trans = replaceAll(trans, stringToReplace, params[key]);
    }
  }

  return trans;
}

function replaceAll(string, find, replace){
  return string.replace(new RegExp(find.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), replace);
}