// Universal Subtitles, universalsubtitles.org
// 
// Copyright (C) 2010 Participatory Culture Foundation
// 
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
// 
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see 
// http://www.gnu.org/licenses/agpl-3.0.html.

goog.provide('mirosubs.startdialog.ToLanguages');

/**
 * @constructor
 * @param {Array.<string>} myLanguages Should already have non-recognized and duplicates removed.
 * @param {mirosubs.startdialog.VideoLanguages} videoLanguages
 * @param {int=} opt_initialLanguageState
 */
mirosubs.startdialog.ToLanguages = function(myLanguages, videoLanguages, opt_initialLanguageState) {
    this.myLanguages_ = myLanguages;
    this.videoLanguages_ = videoLanguages;
    this.initialLanguageState_ = opt_initialLanguageState || null;
    this.toLanguges_ = null;
    this.keyMap_ = null;
};

mirosubs.startdialog.ToLanguages.prototype.makeToLanguages_ = function() {
    var toLanguages = [];
    if (this.initialLanguageState_ && this.initialLanguageState_.LANGUAGE_PK){
        var initLang = new mirosubs.startdialog.ToLanguage(
            0, this.videoLanguages_.findForPK(this.initialLanguageState_.LANGUAGE_PK));
        if (initLang.LANGUAGE){
            toLanguages.push(initLang);
        }
    }
    var myLanguagesToLangs = [];

    goog.array.forEach(
        this.myLanguages_,
        function(l) {
            myLanguagesToLangs = goog.array.concat(
                myLanguagesToLangs, this.createMyLanguageToLangs_(l));
        },
        this);

    toLanguages = goog.array.concat(
        toLanguages,
        myLanguagesToLangs);
    var userLangsCount = toLanguages.length;
    this.addMissingVideoLangs_(toLanguages);
    this.addMissingLangs_(toLanguages);
    // we sort user langs differtly, so we split them
    var userLangs = goog.array.splice(toLanguages, 0, userLangsCount);
    // sort others on ranking alone
    goog.array.sort(
        toLanguages,
        function(a, b) {
            var compare = goog.array.defaultCompare(
                a.RANKING, b.RANKING);
            if (compare == 0)
                compare = goog.array.defaultCompare(
                    a.LANGUAGE_NAME, b.LANGUAGE_NAME);
            return compare;
        });
    goog.array.sort(
        userLangs,
        function(a, b) {
            var compare = goog.array.defaultCompare(
                a.RANKING, b.RANKING);
            if (compare == 0){
                if (a.VIDEO_LANGUAGE && b.VIDEO_LANGUAGE){
                    compare =  goog.array.defaultCompare(
                        b.VIDEO_LANGUAGE.PERCENT_DONE, a.VIDEO_LANGUAGE.PERCENT_DONE);
                    if (compare == 0){
                        compare = goog.array.defaultCompare(
                            a.LANGUAGE_NAME, b.LANGUAGE_NAME);
                    }
                }else{
                    compare = goog.array.defaultCompare(
                        a.LANGUAGE_NAME, b.LANGUAGE_NAME);
                }
            }
            return compare;
        });
    goog.array.insertArrayAt(toLanguages, userLangs, 0);
    return toLanguages;
};

mirosubs.startdialog.ToLanguages.prototype.getToLanguages = function() {
    if (!this.toLanguages_)
        this.toLanguages_ = this.makeToLanguages_();
    return this.toLanguages_;
};

mirosubs.startdialog.ToLanguages.prototype.forLangCode = function(langCode){
    return goog.array.find(this.getToLanguages(), function(o) {
        return o.LANGUAGE == langCode;
    });
};

mirosubs.startdialog.ToLanguages.prototype.forVideoLanguage = function(videoLanguage) {
    return goog.array.find(this.getToLanguages(), function(tl) {
        return tl.VIDEO_LANGUAGE && tl.VIDEO_LANGUAGE.PK == videoLanguage.PK;
    });
};

mirosubs.startdialog.ToLanguages.prototype.forKey = function(key) {
    if (!this.keyMap_) {
        this.keyMap_ = {};
        goog.array.forEach(
            this.getToLanguages(),
            function(tl) { this.keyMap_[tl.KEY] = tl; }, this);
    }
    return this.keyMap_[key];
};

mirosubs.startdialog.ToLanguages.prototype.addMissingVideoLangs_ = function(toLanguages) {
    var pkSet = new goog.structs.Set(
        goog.array.map(
            goog.array.filter(
                toLanguages, 
                function(tl) {  
                    return !!tl.VIDEO_LANGUAGE;
                }),
            function(tl) {
                return tl.VIDEO_LANGUAGE.PK;
            }));
    this.videoLanguages_.forEach(
        function(vl) {
            if (!pkSet.contains(vl.PK))
                toLanguages.push(new mirosubs.startdialog.ToLanguage(11, vl));
        });
};

mirosubs.startdialog.ToLanguages.prototype.addMissingLangs_ = function(toLanguages) {
    var langSet = new goog.structs.Set(
        goog.array.map(
            toLanguages,
            function(tl) { return tl.LANGUAGE; }));
    goog.array.forEach(
        mirosubs.languages,
        function(l) {
            if (!langSet.contains(l[0]))
                toLanguages.push(new mirosubs.startdialog.ToLanguage(11, null, l[0]));
        });
};

mirosubs.startdialog.ToLanguages.prototype.createMyLanguageToLangs_ = function(lang) {
    var toLangs = [];
    var videoLanguages = this.videoLanguages_.findForLanguage(lang);
    if (!videoLanguages.length)
        videoLanguages = [null];
    goog.array.forEach(
        videoLanguages,
        function(vl) {
            toLangs.push(this.createMyLanguageToLang_(vl, lang));
        }, 
        this);
    return toLangs;
};

/**
 * @param {?mirosubs.startdialog.VideoLanguage} videoLanguage Can be null.
 * @param {string} lang language code
 */
mirosubs.startdialog.ToLanguages.prototype.createMyLanguageToLang_ = function(videoLanguage, lang) {
    var toLang = null;
    if (toLang = this.createNonEmptyDepToLang_(videoLanguage, true, 1))
        return toLang;
    else if (toLang = this.createEmptyToLang_(videoLanguage, lang))
        return toLang;
    else if (toLang = this.createIncompleteIndToLang_(videoLanguage))
        return toLang;
    else
        return new mirosubs.startdialog.ToLanguage(10, videoLanguage, lang);
};

mirosubs.startdialog.ToLanguages.prototype.createNonEmptyDepToLang_ = 
    function(videoLanguage, partial, ranking) 
{
    if (videoLanguage && videoLanguage.isDependentAndNonempty(partial)) {
        var fromLanguages = [];
        for (var i = 0; i < this.myLanguages_.length; i++) {
            var possiblyFromLanguages =
                this.videoLanguages_.findForLanguage(this.myLanguages_[i]);
            fromLanguages = goog.array.concat(
                fromLanguages,
                goog.array.map(
                    possiblyFromLanguages,
                    function(l) { 
                        return videoLanguage.canBenefitFromTranslation(l); 
                    }));
        }
        if (fromLanguages.length > 0)
            return new mirosubs.startdialog.ToLanguage(
                ranking, videoLanguage);
    }
    return null;
};

mirosubs.startdialog.ToLanguages.prototype.createEmptyToLang_ = function(videoLanguage, lang) {
    if (!videoLanguage || videoLanguage.isEmpty()) {
        var fromLanguages = [];
        for (var i = 0; i < this.myLanguages_.length; i++) {
            var possiblyFromLanguages = 
                this.videoLanguages_.findForLanguage(this.myLanguages_[i]);
            fromLanguages = goog.array.concat(
                fromLanguages,
                goog.array.map(
                    possiblyFromLanguages,
                    function(l) { return l.isDependable(); }));
        }
        if (fromLanguages.length > 0)
            return new mirosubs.startdialog.ToLanguage(
                2, videoLanguage, lang);
    }
    return null;
};

mirosubs.startdialog.ToLanguages.prototype.createIncompleteIndToLang_ = function(videoLanguage) {
    if (videoLanguage && !videoLanguage.DEPENDENT && !videoLanguage.IS_COMPLETE)
        return new mirosubs.startdialog.ToLanguage(3, videoLanguage);
    return null;
}
