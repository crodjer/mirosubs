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

/**
 * @fileoverview Meant to be used in mirosubs.finishfaildialog.Dialog. 
 *    Corresponds to 'error' state of that dialog.
 */

goog.provide('mirosubs.finishfaildialog.ErrorPanel');

/**
 * @constructor
 */
mirosubs.finishfaildialog.ErrorPanel = function(logger) {
    goog.ui.Component.call(this);
    this.logger_ = logger;
};
goog.inherits(mirosubs.finishfaildialog.ErrorPanel, goog.ui.Component);

mirosubs.finishfaildialog.ErrorPanel.prototype.createDom = function() {
    mirosubs.finishfaildialog.ErrorPanel.superClass_.createDom.call(this);
    var $d = goog.bind(this.getDomHelper().createDom, this.getDomHelper());
    this.errorReportContainer_ = $d('div', 'error-report');
    goog.dom.append(
        this.errorReportContainer_,
        $d('p', null, 'Sending error report to server...'));
    this.downloadSubsLink_ = 
        $d('a', {'href': '#'}, 'Download your subtitles to save your work.');
    this.downloadErrorReportLink_ =
        $d('a', {'href': '#'}, 'Send error report.');
    goog.dom.append(
        this.getElement(),
        $d('p', null, 'We failed to save your subtitles. Don\'t worry, your work is not lost.'),
        this.errorReportContainer_,
        $d('p', null, this.downloadSubsLink_));
    this.startUpload_();
};

mirosubs.finishfaildialog.ErrorPanel.prototype.enterDocument = function() {
    mirosubs.finishfaildialog.ErrorPanel.superClass_.enterDocument.call(this);
    this.getHandler()
        .listen(
            this.downloadSubsLink_, 'click',
            this.downloadSubsClicked_)
        .listen(
            this.downloadErrorReportLink_, 'click',
            this.sendErrorReportClicked_);
};

mirosubs.finishfaildialog.ErrorPanel.prototype.downloadSubsClicked_ = function(e) {
    e.preventDefault();
    mirosubs.finishfaildialog.CopyDialog.showForSubs(
        this.logger_.getJsonSubs());
};

mirosubs.finishfaildialog.ErrorPanel.prototype.sendErrorReportClicked_ = function(e) {
    e.preventDefault();
    mirosubs.finishfaildialog.CopyDialog.showForErrorLog(
        this.logger_.getContents());
};

mirosubs.finishfaildialog.ErrorPanel.prototype.startUpload_ = function() {
    var that = this;
    mirosubs.Rpc.call(
        'log_session',
        { 'draft_pk': this.logger_.getDraftPK(),
          'log': this.logger_.getContents() },
        function(response) {
            that.uploadSucceeded_();
        },
        function() {
            that.uploadFailed_();
        });
};

mirosubs.finishfaildialog.ErrorPanel.prototype.uploadSucceeded_ = function() {
    goog.dom.removeChildren(this.errorReportContainer_);
    goog.dom.append(
        this.errorReportContainer_,
        this.getDomHelper().createDom(
            'p', null, 'Error report successfully sent.'));
};

mirosubs.finishfaildialog.ErrorPanel.prototype.uploadFailed_ = function() {
    goog.dom.removeChildren(this.errorReportContainer_);
    var $d = goog.bind(this.getDomHelper().createDom, this.getDomHelper());
    goog.dom.append(
        this.errorReportContainer_,
        $d('p', null, 
           'This is embarrassing. We weren\'t able to save the error report. It would really help out if you could email it to us.'),
        $d('p', null, this.downloadErrorReportLink_));
};
