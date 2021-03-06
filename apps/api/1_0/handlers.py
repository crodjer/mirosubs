# Universal Subtitles, universalsubtitles.org
# 
# Copyright (C) 2010 Participatory Culture Foundation
# 
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.
# 
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
# 
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see 
# http://www.gnu.org/licenses/agpl-3.0.html.

from videos.models import Video, SubtitleVersion, SubtitleLanguage
from django.contrib.auth.models import User
from apps.auth.models import CustomUser

from piston.handler import BaseHandler, AnonymousBaseHandler
from piston.utils import rc
from piston.utils import decorator, FormValidationError
from api import validate
from django.contrib.sites.models import Site
from forms import GetVideoForm, AddSubtitlesForm, UpdateSubtitlesForm
from django.utils import simplejson as json
from widget.srt_subs import GenerateSubtitlesHandler
from django.http import HttpResponse
from django.shortcuts import get_object_or_404

from apps.videos.templatetags.subtitles_tags import complete_indicator

class VideoHandler(BaseHandler):
    """
    API handler for Video.
    """
    
    allowed_methods = ('GET',)
    fields = ('title', 'description', 'video_id', 'thumbnail', 'created', 
              'allow_community_edits', 'allow_video_urls_edit', 'homepage', 
              'duration', 'video_url', 'is_subtitled', 'language')
    model = Video
    
    @classmethod
    def resource_uri(cls, video):
        return ('api:0.1:video_handler', [video.video_id])
    
    @classmethod
    def video_url(self, obj):
        return obj.get_video_url()
    
    @classmethod
    def thumbnail(self, obj):
        return obj.get_thumbnail()
    
    @classmethod
    def homepage(self, obj):
        site = Site.objects.get_current()
        return 'http://%s%s' % (site.domain, obj.get_absolute_url())
    
    @validate(GetVideoForm, 'GET')    
    def read(self, request, video_id=None):
        """
        Get video by video_id(JVoMAa3kaWzq)
        <em>curl "http://127.0.0.1:8000/api/1.0/video/JVoMAa3kaWzq/?username=admin&password=admin"</em>
        
        Get video by url. It will be created if does not exist.
        Authentication IS required. If video does not exist and you are 
        authenticated - you will be saved as creator for this video.
        <em>curl "http://127.0.0.1:8000/api/1.0/video/?username=admin&password=admin" -d 'video_url=http://www.youtube.com/watch?v=oOOve811tMY' -G</em>
        
        Response format is JSON by default. You can set format with <b>"format"</b>
        parameter in URL, like <em>'http://127.0.0.1:8000/api/1.0/video/JVoMAa3kaWzq/?format=xml'</em>
        or <em>'http://127.0.0.1:8000/api/1.0/video/JVoMAa3kaWzq/?format=yaml'</em>        
        """
        video = None
        
        if video_id:
            try:
                video = self.queryset(request).get(video_id=video_id)
            except Video.DoesNotExist:
                pass
        else:
            video = request.form.save()
            if request.form.created:
                video.user = request.user
                video.save()

        if not video:
            return rc.NOT_FOUND
        else:
            return video
    
    def test_update(self, request, video_id):
        """
        <em>curl "http://127.0.0.1:8000/api/1.0/video/0zaZ2GPv3o9m/?username=admin&password=admin" -F 'title=new-title' -X 'PUT'</em>
        """
        
        try:
            video = self.queryset(request).get(video_id=video_id)
        except Video.DoesNotExist:
            return rc.NOT_FOUND
        
        return video

class SubtitleHandler(BaseHandler):
    
    allowed_methods = ('POST', 'GET',)
    anonymous = 'AnonymousSubtitleHandler'
    
    def read(self, request):
        """
        Return subtitles for video.
        
        Send in request:
        <b>video_url:</b> video url
        <b>video_id:</b> video id
        <b>language:</b> language of video
        <b>language_id:</b> id of language, you can get this from AnonymousSubtitleLanguagese
        <b>revision:</b> revision of subtitles
        <b>sformat</b>: format of subtitles(srt, ass, ssa, ttml, sbv)
        
        If language_id is not provided, you get the most completed subtitles for language.
        
        By default format of response is 'plain', so you get raw subtitles content in response.
        If 'sformat' exists in request - format will be 'django'. 
        If 'callback' exists in request - format will be 'json'.
        
        curl http://127.0.0.1:8000/api/1.0/subtitles/ -d 'video_url=http://www.youtube.com/watch?v=YMBdMtbth0o' -G
        curl http://127.0.0.1:8000/api/1.0/subtitles/ -d 'video_url=http://www.youtube.com/watch?v=YMBdMtbth0o' -d 'callback=callback' -G
        curl http://127.0.0.1:8000/api/1.0/subtitles/ -d 'video_url=http://www.youtube.com/watch?v=YMBdMtbth0o' -d 'sformat=srt' -G
        curl http://127.0.0.1:8000/api/1.0/subtitles/ -d 'video_url=http://www.youtube.com/watch?v=YMBdMtbth0o' -d 'sformat=srt' -G
        curl http://127.0.0.1:8000/api/1.0/subtitles/ -d 'video_id=7Myc2QAeBco9' -G 
        """
        video_url = request.GET.get('video_url')
        language_code = request.GET.get('language')
        language_pk = request.GET.get("language_id")
        
        revision = request.GET.get('revision')
        sformat = request.GET.get('sformat')
        video_id = request.GET.get('video_id')

        if not video_url and not video_id:
            return rc.BAD_REQUEST
        
        if video_id:
            try:
                video = Video.objects.get(video_id=video_id)
            except Video.DoesNotExist:
                return rc.NOT_FOUND
        else:
            video, created = Video.get_or_create_for_url(video_url)
            
            if not video:
                return rc.NOT_FOUND

        if not sformat:
            output = [s.for_json() for s in video.subtitles(version_no=revision,
                                                            language_code = language_code,
                                                            language_pk= language_pk)]
            return output
        else:    
            handler = GenerateSubtitlesHandler.get(sformat)
            
            if not handler:
                return rc.BAD_REQUEST
            
            subtitles = [s.for_generator() for s in video.subtitles(version_no=revision,
                                                                    language_code = language_code,
                                                                    language_pk= language_pk)]
    
            h = handler(subtitles, video)
            return HttpResponse(unicode(h))
    

    @validate(AddSubtitlesForm, 'POST')    
    def create(self, request):
        """
        Add subtitles for video.
        
        Send in request:
        <b>video:</b> video_id
        <b>video_language:</b> language of video
        <b>language:</b> language of subtitles
        <b>format</b>: format of subtitles(srt, ass, ssa, ttml, sbv)
        <b>subtitles</b>: subtitles(max size 256kB. Can be less, not tested with big content)
        
        <em>curl "http://127.0.0.1:8000/api/1.0/subtitles/?username=admin&password=admin" -d 'video=0zaZ2GPv3o9m' -d 'video_language=en' -d 'language=ru' -d 'format=srt' -d 'subtitles=1%0A00:00:01,46 --> 00:00:03,05%0Atest'</em>
        """
        request.form.save()
        return rc.ALL_OK


class UpdateSubtitleHandler(BaseHandler):
    
    allowed_methods = ( 'POST', "PUT")
    anonymous = 'AnonymousSubtitleHandler'

    def update(self, request):
        """
        Updates subtitles for video.
        
        Send in request:
        <b>language_id:</b> id of language, you can get this from AnonymousSubtitleLanguagese
        <b>format</b>: format of subtitles(srt, ass, ssa, ttml, sbv)
        <b>subtitles</b>: subtitles(max size 256kB. Can be less, not tested with big content)
        
        <em>curl -i -X PUT "http://mirosubs.example.com:8000/api/1.0/subtitles/languages/update/?username=xxx&password=xxx" -d "language_id=24980" -d 'format=srt' -d 'subtitles=1%0A00:00:01,46 --> 00:00:03,05%0Atestme -some'</em>

        """
        ds = request.REQUEST
        sl = get_object_or_404(SubtitleLanguage, pk=ds['language_id'])

        form = UpdateSubtitlesForm(user=request.user.customuser, data=ds)
        if form.is_valid():
            form.save(sl)
            return rc.CREATED
        raise FormValidationError(form) 

    def create(self, request):
        # Piston has some bugs with 'format' as a parameter and
        # put requests. So the test client needs to issue a post, not
        # a put request, this is just a workaroung for that
        # normal web clientes can issue a http PUT request as expected
        return self.update(request)
    
class AnonymousSubtitleHandler(AnonymousBaseHandler, SubtitleHandler):
    pass
    
class SubtitleLanguagesHandler(BaseHandler):
    
    allowed_methods = ('GET',)
    anonymous = 'AnonymousSubtitleLanguages'
    
    def read(self, request):
        """
        Return inforamiton about avilable subtitles languages.
        
        Send in request:
        <b>video url:</b> video_url
        <b>video id:</b> video_id
        
        curl http://127.0.0.1:8000/api/1.0/subtitles/languages/ -d 'video_id=7Myc2QAeBco9' -G
        <pre>[
            {
                "id": 12,
                "code": "it", 
                "name": "Italian", 
                "is_original": true
            }
        ]</pre>
        """
        
        video_url = request.GET.get('video_url')
        video_id = request.GET.get('video_id')
        
        if not video_url and not video_id:
            return rc.BAD_REQUEST
        
        if video_id:
            try:
                video = Video.objects.get(video_id=video_id)
            except Video.DoesNotExist:
                return rc.NOT_FOUND
        else:
            video, created = Video.get_or_create_for_url(video_url)
            
            if not video:
                return rc.NOT_FOUND
        
        output = []
        
        for item in video.subtitlelanguage_set.all():
            output.append({
                'id': item.id,
                'code': item.language,
                'name': item.get_language_display(),
                'is_original': item.is_original,
                "completion": complete_indicator(item)
            })
            
        return output
    
class AnonymousSubtitleLanguages(AnonymousBaseHandler, SubtitleLanguagesHandler):
    pass
