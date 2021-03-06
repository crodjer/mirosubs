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

goog.provide('mirosubs.subtitle.Logger');

/**
 * @constructor
 */
mirosubs.subtitle.Logger = function(draftPK) {
    this.logs_ = [goog.json.serialize({
        'date': mirosubs.dateString(),
        'draft_pk': draftPK })];
    this.totalSize_ = 0;
    this.sizeExceeded_ = false;
    this.draftPK_ = draftPK;
    this.jsonSubs_ = null;
};

mirosubs.subtitle.Logger.MAX_SIZE = 4 * 1024 * 1024; // 4 mb

mirosubs.subtitle.Logger.prototype.logSave = 
    function(subIDPackets, success, opt_response) 
{
    try {
        if (subIDPackets.length == 0)
            return;
        if (this.totalSize_ > mirosubs.subtitle.Logger.MAX_SIZE && 
            !this.sizeExceeded_) {
            this.sizeExceeded_ = true;
            this.logs_.push({
                'time': mirosubs.dateString(),
                'sizeExceeded': true
            });
        }
        var serialized = goog.json.serialize({
            'time': mirosubs.dateString(),
            'packets': subIDPackets,
            'success': success,
            'response': (opt_response || null) });
        this.logs_.push(serialized);
        this.totalSize_ += serialized.length;
    }
    catch (e) {
        // honey badger don't care
    }
};

mirosubs.subtitle.Logger.prototype.getContents = function() {
    return '[' + this.logs_.join(',') + ']';
};

mirosubs.subtitle.Logger.prototype.getDraftPK = function() {
    return this.draftPK_;
};

mirosubs.subtitle.Logger.prototype.getJsonSubs = function() {
     return goog.array.map(this.jsonSubs_,
                    mirosubs.subtitle.EditableCaption.adjustUndefinedTiming );
};

mirosubs.subtitle.Logger.prototype.setJsonSubs = function(subs) {
    this.jsonSubs_ = subs;
};
